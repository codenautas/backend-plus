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
var serveContent = require('serve-content');
var pg = require('pg-promise-strict');
pg.easy = true;
var readYaml = require('read-yaml-promise');

var fs = require('fs-promise');

var bestGlobals = require('best-globals');
var coalesce = bestGlobals.coalesce;
var changing = bestGlobals.changing;

var myOwn = require('../for-client/my-things.js');

var typeStore = require('type-store');

var json4all = require('json4all');

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
            plus:{
                successRedirect:'/menu',
            },
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

AppBackend.prototype.exts = {
    img: ['jpg', 'png', 'jpeg', 'ico'],
    normal: ['', 'js', 'html', 'css', 'jpg', 'jpeg', 'png', 'ico']
};

AppBackend.prototype.start = function start(opts){
    var be = this;
    if(be.addPublicServices){
        console.log("================================");
        console.log("Deprecated: be.addPublicServices");
        console.log("Ya no usamos be.addPublicServices, debería funcionar comentando esa función");
        process.exit(1);
    };
    [Path.resolve(this.rootPath,'client'), Path.join(__dirname,'../for-client')].forEach(function(pathName){
        Promise.all(['index.js', 'index.html', 'index.jade', 'index.css', 'index.styl'].map(function(fileName){
            return fs.access(pathName+'/'+fileName,fs.constants.F_OK).then(function(){
                throw new Error(fileName+" must doesn't exists in private path: "+pathName);
            },function(err){
                if(err.code!=='ENOENT'){
                    console.log("error",err);
                    console.log(" controling not existence of", fileName,'in path',pathName);
                    throw err;
                }
            });
        })).catch(function(err){
            console.log("==============================================");
            console.log("ERROR controling not index.* in privates paths");
            console.log(err);
            process.exit();
        })
    });
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
        be.clientSetup = {config: be.config["client-setup"]};
        verboseStartup=!be.config.server["silent-startup"];
    }).then(function(){
        if(!be.config.db){
            throw new Error("backend-plus: No db in config");
        }
        if(be.config.db.motor!='postgresql'){
            throw new Error("backend-plus: Motor not recongnized: "+be.config.db.motor);
        }
        be.db = pg;
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
    }).then(function(){
        return pg.connect(be.config.db).then(function(client){
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
        mainApp.use(be.config.server["base-url"]+'/unlogged',serveContent(Path.join(be.rootPath,'unlogged'),{allowedExts:be.exts.normal}));
        be.addUnloggedServices(mainApp, be.config.server["base-url"]);
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
        be.clientSetup.procedures = defs;
        be.app.get('/client-setup',MiniTools.serveJson(be.clientSetup));
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

AppBackend.prototype.addUnloggedServices = function addUnloggedServices(mainApp, baseUrl){
    mainApp.use(baseUrl, serveContent('./node_modules/lodash', {allowedExts:'js'}));
    mainApp.use(baseUrl, serveContent('./node_modules/require-bro/lib', {allowedExts:'js'}));
    mainApp.use(baseUrl, serveContent('./node_modules/dialog-promise/lib', {allowedExts:['js','css']}));
    mainApp.use(baseUrl, serveContent('./node_modules/js-to-html', {allowedExts:'js'}));
    // mainApp.use(baseUrl, serveContent('./node_modules/login-plus/for-client', {allowedExts:'js'}));
    mainApp.use(baseUrl, serveContent('./node_modules/ajax-best-promise/bin', {allowedExts:'js'}));
    mainApp.use(baseUrl, serveContent('./node_modules/json4all', {allowedExts:'js'}));
    mainApp.use(baseUrl, serveContent('./node_modules/js-yaml/dist', {allowedExts:'js'}));
    mainApp.use(baseUrl, serveContent('./node_modules/typed-controls/lib', {allowedExts:'js'}));
    mainApp.use(baseUrl, serveContent('./node_modules/best-globals', {allowedExts:'js'}));
    mainApp.use(baseUrl, serveContent('./node_modules/regexplicit', {allowedExts:'js'}));
    mainApp.use(baseUrl, serveContent('./node_modules/castellano/lib', {allowedExts:'js'}));
    mainApp.use(baseUrl, serveContent('./node_modules/big.js', {allowedExts:'js'}));
    mainApp.use(baseUrl, serveContent('./node_modules/type-store', {allowedExts:'js'}));
    mainApp.use(baseUrl, serveContent('./node_modules/pikaday', {allowedExts:'js'}));
}

AppBackend.prototype.addLoggedServices = function addLoggedServices(){
    var be = this;
    this.app.use(serveContent(Path.resolve(this.rootPath,'client'),{allowedExts:be.exts.normal}));
    this.app.use(serveContent(Path.join(__dirname,'../for-client'),{allowedExts:be.exts.normal}));
    this.app.use('/img',serveContent(Path.join(__dirname,'../for-client/img'), {allowedExts:be.exts.img}));
    this.app.use('/keep-alive', function(req, res, next){
        if(new Date().getTime() - req.session.lastNonKeepAlive > be.config.login.keepAlive*1000){
            req.logout();
            res.clearCookie(options.name);
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
    /*
    if(logo){
        this.app.use(serveContent(logo.path,{allowedExts:['png','ico','jpeg','jpg']}));
    }
    */
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

AppBackend.prototype.tableMixin = require('./table-mixin.js');

var typeDb={ // pasar a type-store
    integer: 'integer',
    number: 'numeric',
    date: 'date',
    boolean: 'boolean',
    text: 'text'
};

for(var typeName in typeStore.type){
    typeDb[typeName]=typeStore.type[typeName].typeDbPg;
}

AppBackend.prototype.dumpDbCreateDatabase = function dumpDbCreateDatabase(){
    var be = this;
    var db=be.db;
    var lines=[];
    lines.push("create user "+db.quoteObject(be.config.db.user)+" password "+db.quoteText(be.config.db.password)+";");
    lines.push("create database "+db.quoteObject(be.config.db.database)+" owner "+db.quoteObject(be.config.db.user)+";");
    lines.push("\\c "+db.quoteObject(be.config.db.database));
    return fs.writeFile('local-db-dump-create-db.sql', lines.join('\n')+'\n');
}

AppBackend.prototype.dumpDbTables = function dumpDbTables(){
    var be = this;
    var db=be.db;
    var lines=[];
    var dataText=[];
    var fkLines=[];
    lines.push("set role to "+be.config.db.user+";");
    lines.push("drop schema if exists "+be.config.db.schema+' cascade;');
    lines.push("create schema "+be.config.db.schema+';');
    lines.push("set search_path = "+be.config.db.schema+';');
    lines.push('');
    /*eslint guard-for-in: 0*/
    /*eslint no-loop-func: 0*/
    /*jshint loopfunc:true */
    var contextForDump={be:be, forDump:true, user:{}};
    contextForDump.user[be.config.login.userFieldName]='!dump';
    contextForDump.user[be.config.login.rolFieldName]='admin';
    for(var tableName in be.tableStructures){
        var tableDef=be.tableStructures[tableName](contextForDump);
        lines.push('create table '+db.quoteObject(tableDef.name)+' (');
        var fields=[];
        tableDef.fields.forEach(function(fieldDef){
            var fieldType=typeDb[fieldDef.typeName]||'"'+fieldDef.typeName+'"';
            if(fieldDef.sizeByte==4){
                fieldType = 'integer';
            }
            fields.push('  '+db.quoteObject(fieldDef.name)+' '+fieldType+(fieldDef.typeName.nullable?' NOT NULL':''));
        });
        lines.push(fields.join(', \n'));
        if(tableDef.primaryKey){
            lines.push(', primary key ('+tableDef.primaryKey.map(function(name){ return db.quoteObject(name); }).join(', ')+')');
        }
        lines.push(');');
        tableDef.foreignKeys.map(function(fk){
            fkLines.push('alter table '+db.quoteObject(tableDef.name)+' add foreign key ('+
                fk.fields.map(function(pair){ return db.quoteObject(pair.source); }).join(', ')+
                ') references '+db.quoteObject(fk.references)+' ('+
                fk.fields.map(function(pair){ return db.quoteObject(pair.target); }).join(', ')+
                ') on update cascade;'
            );
        });
        lines.push('');
    }
    return Promise.all(Object.keys(be.tableStructures).map(function(tableName){
        return fs.readFile('install/'+tableName+'.tab', {encoding:'UTF8'}).then(function(content){
            var lines=content.split(/\r?\n/)
                .map(function(line){ return line.split('|'); })
                .filter(function(line){
                    return line.length>1 || line.length==1 && line[0].trim();
                });
            if(lines.length>1){
                var rows=lines.slice(1);
                var dataString="insert into "+db.quoteObject(tableName)+" ("+
                    lines[0].map(db.quoteObject).join(', ')+
                    ') values\n'+
                    rows.map(function(line){
                        return "("+line.map(function(value){
                            return value==''?'null':db.quoteText(value);
                        }).join(', ')+")"
                    }).join(',\n')+';\n';
                dataText.push(dataString);
            }
        }).catch(function(err){
            if(err.code!=='ENOENT'){
                throw err;
            }
            console.log(err);
            console.log(err.stack);
        });
    })).then(function(){
        return fs.writeFile('local-db-dump.sql', 
            lines.join('\n')+
            '\n\n-- DATA\n'+
            dataText.join('\n')+
            '\n\n-- FKs\n'+
            fkLines.join('\n')
        );
    });
};

AppBackend.prototype.dumpDb = function dumpDb(){
    return Promise.all([
        this.dumpDbCreateDatabase(),
        this.dumpDbTables()
    ]);
};

backendPlus.AppBackend = AppBackend;

module.exports = backendPlus;