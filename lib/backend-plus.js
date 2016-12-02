"use strict";

var backendPlus = {};

var timeStartBackendPlus = new Date();

var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Path = require('path');
var useragent = require('express-useragent');
var numeral = require('numeral');
var MiniTools = require('mini-tools');
var Promises = require('best-promise');
var crypto = require('crypto');
var extensionServeStatic = require('extension-serve-static');
var pg = require('pg-promise-strict');
pg.easy = true;
var readYaml = require('read-yaml-promise');

var fs = require('fs-promise');

var bestGlobals = require('best-globals');
var coalesce = bestGlobals.coalesce;
var changing = bestGlobals.changing;

var myOwn = require('../for-client/my-things.js');

var loginPlus = require('login-plus');

function md5(text){
    return crypto.createHash('md5').update(text).digest('hex');
}

function AppBackend(){
    this.defaultMethod='post';
    this.app = express();
}

AppBackend.exposes={};

AppBackend.prototype.configList = function configList(){
    return [{
        login:{
            plus:{},
            activeClausule:'true',
            lockedClausule:'false',
            messages:{
                userOrPassFail:'username or password error',
                lockedFail:'user account is locked',
                inactiveFail:'user account is marked as inactive'
            },
            keepAlive:1800
        }, 
        log:{}, 
        server:{"base-url":''}
    }];
};

AppBackend.prototype.getMachineId = function getMachineId(req){
    var be = this;
    var ip = req.connection.remoteAddress;
    var ipParts = ip.split('.');
    var prefix = (be.config.server["ip-replacer"]||{})[ipParts.slice(0,3).join('.')];
    if(prefix){
        return prefix+ipParts[3];
    }
    var iSame = 0;
    var serverIpParts=req.socket.address().address.split('.');
    while(iSame<ipParts.length && ipParts[iSame] === serverIpParts[iSame]){ iSame++; }
    return ipParts.slice(iSame).join('.')||'local';
}

AppBackend.prototype._Browsers = {
    Edge:      'Ed',
    Konqueror: 'Kq',
    Chromium:  'Chmm',
    Chrome:    'Ch',
    Safari:    'Sf',
    IE:        'IE',
    Opera:     'Op',
    Firefox:   'FF',
};

AppBackend.prototype.start = function start(opts){
    var be = this;
    var mainApp;
    var verboseStartup;
    opts = opts || {};
    if(opts.testing){
        this.getMainApp = function getMainApp(){ return mainApp; };
    }
    this.close = function close(){
        return Promises.make(function(resolve,reject){
            be.server.close(function(err){
                if(err){
                    reject(err);
                }else{
                    resolve();
                }
            });
        });
    };
    return Promises.start(function(){
        return MiniTools.readConfig(be.configList(),opts.readConfig);
    }).then(function(config){
        be.config = config;
        verboseStartup=!be.config.server["silent-startup"];
    }).then(function(){
        // var startTS = new Date(); // comentada por no usada
        return be.config.db && pg.connect(be.config.db).then(function(client){
            be.db = pg;
            if(!be.db.quoteObjectList){
                be.db.quoteObjectList = function quoteObjectList(ObjectList){
                    return ObjectList.map(function(objectName){ return be.db.quoteObject(objectName); }).join(',');
                };
            }
            if(!be.db.quoteText){
                be.db.quoteText=function(anyTextData){
                    if(typeof anyTextData!=="string"){
                        throw new Error("not text data");
                    }
                    return "'"+anyTextData.replace(/'/g,"''")+"'";
                };
            }
            if(verboseStartup){
                console.log('db-connected',changing(be.config.db,{password:undefined},changing.options({deletingValue:undefined})));
            }
            return client;
        }).then(function(client){
            return client.query("SELECT current_timestamp as cts").fetchUniqueRow();
        }).then(function(data){
            // var endTS = new Date(); // comentada por no usada
            if(verboseStartup){
                console.log('NOW in Database',data.row.cts);
            }
            be.getDbClient = function getDbClient(req){
                return pg.connect(be.config.db).then(function(client){
                    var dbAppName=req?(
                        ((req.user||{})[be.config.login.userFieldName]||'!logged')+
                        ' '+(req.machineId||'?')+
                        ' '+(((req.useragent)||{}).shortDescription||'?')
                    ):'!app local internal';
                    return client.query(
                        "SET application_name = "+be.db.quoteText(dbAppName)
                    ).execute().then(function(){
                        var search_path = be.config.db.search_path || [be.config.db.schema];
                        if(search_path.length>0){
                            return client.query("set SEARCH_PATH TO "+be.db.quoteObjectList(search_path)).execute().then(function(){
                                return client;
                            });
                        }else{
                            return client;
                        }
                    });
                });
            };
            // be.getDbClient.returns=be.Client;
        });
    }).then(function(){
        if(be.config.server["kill-9"]){
            /*eslint global-require: 0 */
            var kill9 = require('kill-9');
            be.app.use(kill9(be.config.server["kill-9"]));
        }
    }).then(function(){
        if(process.argv[2]=='--dump-db'){
            be.dumpDb().then(function(){
                console.log('db struct dumped');
            }).catch(function(err){
                console.log(err);
                console.log(err.stack);
            }).then(function(){
                /*eslint no-process-exit: 0 */
                process.exit(0);
            });
        }
        mainApp = express();
        mainApp.use(cookieParser());
        mainApp.use(bodyParser.urlencoded({extended:true}));
        if(be.config.log.req){
            mainApp.use(function(req,res,next){
                console.log('REQ',req.method,req.protocol,req.hostname,req.originalUrl,'from:',req.ip);
                next();
            });
        }
        mainApp.use(useragent.express());
        mainApp.use(function(req,res,next){
            req.useragent.shortDescription = (be._Browsers[req.useragent.browser]||req.useragent.browser)+req.useragent.version.split('.')[0];
            req.machineId = be.getMachineId(req);
            next();
        });
        mainApp.use(be.config.server["base-url"]+'/unlogged',extensionServeStatic(Path.join(be.rootPath,'unlogged'),{staticExtensions:['js','hmtl','css','png','jpg','jpeg']}));
        be.addPublicServices(mainApp, be.config.server["base-url"]);
        if(be.config.login){
            mainApp.loginPlusManager = new loginPlus.Manager();
            be.config.login.plus.baseUrl = coalesce(be.config.login.plus.baseUrl, be.config.server["base-url"], '/');
            be.config.login.plus.userFieldName = be.config.login.plus.userFieldName || be.config.login.userFieldName;
            if(verboseStartup){
                console.log('-------------------');
                console.log('be.config.login', be.config.login);
            }
            mainApp.loginPlusManager.init(mainApp,be.config.login.plus);
            mainApp.loginPlusManager.setValidatorStrategy(
                function(req, username, password, done) {
                    var client;
                    be.getDbClient(req).then(function(cli){
                        client = cli;
                        return client.query(
                            "SELECT  "+be.db.quoteObjectList(be.config.login.infoFieldList)+
                                ", "+be.config.login.activeClausule+" as active "+
                                ", "+be.config.login.lockedClausule+" as locked "+
                            "  FROM  "+be.db.quoteObject(be.config.login.table)+
                            "  WHERE "+be.db.quoteObject(be.config.login.userFieldName)+" = $1 "+
                            "    AND "+be.db.quoteObject(be.config.login.passFieldName)+" = $2 ",
                            [username, md5(password+username)]
                        ).fetchOneRowIfExists();
                    }).then(function(data){
                        if(data.rowCount==1){
                            if(!data.row.active){
                                done(null,false,{message:be.config.login.messages.inactiveFail});
                            }else if(data.row.locked){
                                done(null,false,{message:be.config.login.messages.lockedFail});
                            }else{
                                done(null, data.row);
                            }
                        }else{
                            done(null,false,{message:be.config.login.messages.userOrPassFail});
                        }
                    }).then(function(){
                        client.done();
                    }).catch(function(err){
                        client.done();
                        throw err;
                    }).catch(function(err){
                        console.log('login error',err);
                        console.log(err.stack);
                        done(new Error('internal login error'));
                    });
                }
            );
            mainApp.loginPlusManager.setPasswordChanger(
                function(req, username, oldPassword, newPassword, done) {
                    var client;
                    be.getDbClient(req).then(function(cli){
                        client = cli;
                        return client.query(
                            "UPDATE "+be.db.quoteObject(be.config.login.table)+
                            "  SET "+be.db.quoteObject(be.config.login.passFieldName)+" = $3 "+
                            "  WHERE "+be.db.quoteObject(be.config.login.userFieldName)+" = $1 "+
                            "    AND "+be.db.quoteObject(be.config.login.passFieldName)+" = $2 "+
                            "  RETURNING 1 as ok",
                            [username, md5(oldPassword+username.toLowerCase()), md5(newPassword+username.toLowerCase())]
                        ).fetchOneRowIfExists();
                    }).then(function(result){
                        if(result.rowCount){
                            done(null,true);
                        }else{
                            done(null,false,{message: 'old password does not matchs or username is not longer valid'});
                        }
                    }).catch(function(err){
                        console.log('error changing pass',err);
                        console.log('stack',err.stack);
                    }).catch(done);
                }
            );
            be.addLoggedServices();
        }
        be.app.use(function(err,req,res,next){
            console.log('******************', next);
            console.log(err);
            MiniTools.serveErr(req, res)(err);
        });
        return be.addProcedureServices();
    }).then(function(){
        return Promises.make(function(resolve, reject){
            try{
                be.server = mainApp.listen(be.config.server.port, resolve);
            }catch(err){
                reject(err);
            }
        });
    }).then(function(){
        return be.postConfig();
    }).then(function(){
        mainApp.use(be.config.server["base-url"],be.app);
    }).then(function(){
        if(verboseStartup){
            console.log('listening on',be.config.server.port);
        }
        if(be.config.server.port == null){
            console.log('backend-plus: Lack of mandatory server.port in config');
            throw new Error('backend-plus: Lack of mandatory server.port in config');
        }
        be.timeReadyBackendPlus = new Date();
        if(verboseStartup){
            console.log('READY',numeral((be.timeReadyBackendPlus-timeStartBackendPlus)/1000).format("0.0"),'s elapsed');
        }
    }).catch(function(err){
        console.log('ERROR',err.stack || err);
        console.log('backend-plus: start up canceled');
        process.exit(-1);
    });
};

AppBackend.prototype.rootPath = './';

AppBackend.prototype.postConfig = function postConfig(){};

AppBackend.prototype.addProcedureServices = function addProcedureServices(){
    var be = this;
    be.app.get('/data',function(req, res){ res.end('esto'); });
    return this.getProcedures().then(function(defs){
        be.procedure = be.procedure||[];
        be.procedures = defs;
        be.app.get('/def-procedures',MiniTools.serveJson(be.procedures));
        be.procedures.forEach(function(procedureDef){
            be.procedure[procedureDef.action] = procedureDef;
            be.app[procedureDef.method]('/'+procedureDef.action, function(req, res){
                var params={};
                var source=procedureDef.method=='post'?'body':'query';
                procedureDef.parameters.forEach(function(paramDef){
                    var undecodedValue = req[source][paramDef.name];
                    var value = myOwn.encoders[paramDef.encoding].parse(undecodedValue);
                    if(value===undefined){
                        if('defValue' in paramDef){
                            value = paramDef.defValue;
                        }else{
                            throw new Error("internal procedure "+procedureDef.action+" error: lack of mandatory paramater "+paramDef.name);
                        }
                    }
                    params[paramDef.name] = value;
                });
                var context={
                    be, user:req.user, session:req.session, 
                    username:req.user[be.config.login.userFieldName], machineId:req.machineId, 
                    navigator:(req.userAgent||{}).shortDescription||'?'
                };
                return Promises.start(function(){
                    return be.getDbClient(req);
                }).then(function(client){
                    context.client=client;
                    return procedureDef.coreFunction(context, params);
                }).catch(function(err){
                    context.client.done();
                    throw err;
                }).then(function(result){
                    context.client.done();
                    if(result===undefined){
                        console.log('undefined in',procedureDef,'for',req[source]);
                        throw new Error("Bad return value in procedure. Undefined detected.");
                    }
                    try{
                        result = myOwn.encoders[procedureDef.encoding].stringify(result);
                    }catch(err){
                        throw err;
                    }
                    res.end(result);
                }).catch(MiniTools.serveErr(req,res));
            });
        });
    });
};

AppBackend.prototype.addPublicServices = function addLoggedServices(mainApp, baseUrl){
    mainApp.use(baseUrl, extensionServeStatic('./node_modules/lodash', {staticExtensions:'js'}));
    mainApp.use(baseUrl, extensionServeStatic('./node_modules/require-bro/lib', {staticExtensions:'js'}));
    mainApp.use(baseUrl, extensionServeStatic('./node_modules/dialog-promise/lib', {staticExtensions:['js','css']}));
    mainApp.use(baseUrl, extensionServeStatic('./node_modules/js-to-html', {staticExtensions:'js'}));
    mainApp.use(baseUrl, extensionServeStatic('./node_modules/login-plus/for-client', {staticExtensions:'js'}));
    mainApp.use(baseUrl, extensionServeStatic('./node_modules/ajax-best-promise/bin', {staticExtensions:'js'}));
    mainApp.use(baseUrl, extensionServeStatic('./node_modules/json4all', {staticExtensions:'js'}));
    mainApp.use(baseUrl, extensionServeStatic('./node_modules/js-yaml/dist', {staticExtensions:'js'}));
    mainApp.use(baseUrl, extensionServeStatic('./node_modules/typed-controls/lib', {staticExtensions:'js'}));
    mainApp.use(baseUrl, extensionServeStatic('./node_modules/best-globals', {staticExtensions:'js'}));
    mainApp.use(baseUrl, extensionServeStatic('./node_modules/regexplicit', {staticExtensions:'js'}));
    mainApp.use(baseUrl, extensionServeStatic('./node_modules/castellano/lib', {staticExtensions:'js'}));
}

AppBackend.prototype.addLoggedServices = function addLoggedServices(){
    var be = this;
    this.app.use(MiniTools.serveJade(Path.resolve(this.rootPath,'client'),true));
    this.app.use(MiniTools.serveStylus(Path.resolve(this.rootPath,'client'),true));
    this.app.use(MiniTools.serveStylus(Path.join(__dirname,'../for-client'),true));
    this.app.use(extensionServeStatic(Path.resolve(this.rootPath,'client'),{staticExtensions:'js'}));
    this.app.use(extensionServeStatic(Path.join(__dirname,'../for-client'),{staticExtensions:['js','css','styl','jade','html']}));
    this.app.use('/img',extensionServeStatic(Path.join(__dirname,'../for-client/img'), {staticExtensions:['png','jpg','jpeg']}));
    this.app.use('/keep-alive', function(req, res, next){
        if(new Date().getTime() - req.session.lastNonKeepAlive > be.config.login.keepAlive*1000){
            req.logout();
            return next();
        }else{
            res.send(Math.random().toString());
        }
    });
    this.app.use(function(req,res,next){
        // req != '/keep-alive'
        req.session.lastNonKeepAlive = new Date().getTime();
        next();
    });
    var logo=this.config.logo;
    if(logo){
        this.app.use(extensionServeStatic(logo.path,{staticExtensions:'png'}));
    }
};

AppBackend.prototype.procedureDefCompleter = function procedureDefCompleter(procedureDef){
    procedureDef.method=procedureDef.method||this.defaultMethod;
    procedureDef.encoding=procedureDef.encoding||'JSON4all';
    procedureDef.parameters.forEach(function(paramDef){
        paramDef.encoding=paramDef.encoding||'JSON4all';
    });
    return procedureDef;
};

AppBackend.prototype.getProcedures = function getProcedures(){
    return Promises.resolve(require('./procedures-table.js').map(this.procedureDefCompleter, this));
};

AppBackend.prototype.tableDefAdapt = require('./table-def-adapt.js');

var typeDb={
    integer: 'integer',
    number: 'numeric',
    date: 'date',
    boolean: 'boolean',
    text: 'text'
};

AppBackend.prototype.dumpDb = function dumpDb(){
    var be = this;
    var db=be.db;
    var lines=[];
    var fkLines=[];
    lines.push("drop schema if exists "+be.config.db.schema+' cascade;');
    lines.push("create schema "+be.config.db.schema+';');
    lines.push("set search_path = "+be.config.db.schema+';');
    lines.push('');
    /*eslint guard-for-in: 0*/
    /*eslint no-loop-func: 0*/
    /*jshint loopfunc:true */
    for(var tableName in be.tableStructures){
        var tableDef=be.tableStructures[tableName]({be:be, forDump:true, user:{usu_rol:'admin'}});
        lines.push('create table '+db.quoteObject(tableDef.name)+' (');
        var fields=[];
        tableDef.fields.forEach(function(fieldDef){
            var fieldType=typeDb[fieldDef.typeName]||'"'+fieldDef.typeName+'"';
            if(fieldDef.sizeByte==4){
                fieldType = 'integer';
            }
            fields.push('  '+db.quoteObject(fieldDef.name)+' '+fieldType+' '+(fieldDef.typeName.nullable?'NOT NULL ':''));
        });
        lines.push(fields.join(', \n'));
        if(tableDef.primaryKey){
            lines.push(', primary key ('+tableDef.primaryKey.map(function(name){ return db.quoteObject(name); }).join(', ')+')');
        }
        lines.push(');');
        (tableDef.foreignKeys||[]).map(function(fk){
            fkLines.push('alter table '+db.quoteObject(tableDef.name)+' add foreign key ('+
                fk.fields.map(function(pair){ return db.quoteObject(pair.source); }).join(', ')+
                ') references '+db.quoteObject(fk.references)+' ('+
                fk.fields.map(function(pair){ return db.quoteObject(pair.target); }).join(', ')+
                ');'
            );
        });
        lines.push('');
    }
    return fs.writeFile('local-db-dump.sql', 
        lines.join('\n')+
        '\n\n-- FKs\n'+
        fkLines.join('\n')
    );
};

backendPlus.AppBackend = AppBackend;

module.exports = backendPlus;