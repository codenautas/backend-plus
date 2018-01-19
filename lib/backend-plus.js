"use strict";

var backendPlus = {};

var logWhy = null // require('why-is-node-running') // should be your first require


var timeStartBackendPlus = new Date();

var express = require('express');
//var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multiparty = require('multiparty');
var Path = require('path');
var useragent = require('express-useragent');
var numeral = require('numeral');
var MiniTools = require('mini-tools');
MiniTools.serveErr.propertiesWhiteList=['detail','code','table','constraint'];
var crypto = require('crypto');
var serveContent = require('serve-content');
var pg = require('pg-promise-strict');
var SessionFileStore = require('session-file-store');
var MemoryStore = require('memorystore');
var jsToHtml=require('js-to-html');
var html=jsToHtml.html;
const escapeStringRegexp = require('escape-string-regexp');
var packagejson = require(process.cwd()+'/package.json');

var likeAr = require('like-ar');

pg.easy = true;
pg.setAllTypes();
/*
pg.log=function log(m){
    console.log(m);
}
// */

var readYaml = require('read-yaml-promise');

var fs = require('fs-extra');

var bestGlobals = require('best-globals');
var coalesce = bestGlobals.coalesce;
var changing = bestGlobals.changing;
var datetime = bestGlobals.datetime;

var myOwn = require('../for-client/my-things.js');


var typeStore = require('type-store');
var json4all = require('json4all');

var loginPlus = require('login-plus');
var dashDashDir=Array.prototype.indexOf.call(process.argv,'--dir')



if(dashDashDir>0){
    console.log('--dir',process.argv[dashDashDir+1]);
    process.chdir(process.argv[dashDashDir+1]);
    console.log('cwd',process.cwd());
}

function md5(text){
    return crypto.createHash('md5').update(text).digest('hex');
}

function AppBackend(){
    var be = this;
    if(!be.rootPath){
        console.log('ATENCIÓN hay que poner be.rootPath antes de llamar a super()');
    }
    console.log('rootPath',this.rootPath);
    be.defaultMethod='post';
    be.app = express();
    be.tableStructures = {};
    be.getTables().forEach(function(tableItem){
        var generatedDef;
        if(tableItem.mixin){
            generatedDef = be.tableMixin(tableItem.mixin[0],tableItem.mixin[1],{
                name:tableItem.name,
                title:tableItem.title
            });
        }else if(tableItem.tableGenerator){
            generatedDef = tableItem.tableGenerator;
        }else{
            if(typeof tableItem==='string'){
                tableItem = {name: tableItem};
            }
            tableItem = changing({name: tableItem.name, fileName: tableItem.name}, tableItem);
            tableItem = changing({source: (tableItem.path||be.rootPath+'/server')+'/table-'+tableItem.fileName+'.js'}, tableItem);
            generatedDef = require(tableItem.source);
        }
        be.tableStructures[tableItem.name] = generatedDef;
    });
}

AppBackend.prototype.rootPath=Path.resolve(__dirname,'..');

AppBackend.exposes={};
AppBackend.prototype.i18n={messages:{}};

AppBackend.prototype.messages=
AppBackend.prototype.i18n.messages.en={
    unlogged:{
        login:{
            title: "log in",
            username: "username",
            password: "password",
            button: "Sign In"
        },
        loading:'loading',
    },
    logged:{
        login:{
                title: "log in",
                username: "username",
                password: "password",
                button: "Sign In"
        },
        chpass:{
                title: 'change password',
                username: 'Username',
                oldPassword:'Old password',
                newPassword:'New password',
                repPassword:'Reenter password',
                button:'Change',
        },
        fileUploaded:'file uploaded',
        unkownExt:'unkown file extension'
    },
    server:{
        columnDoesNotExistInTable:'column $1 does not exist in table',
        dependences:'dependences',
        files:'files',
        importColumnDoesNotHasColumnName:'column $1 does not has a string value',
        missingPrimaryKeyValues:'missing primary key values',
        versions:'versions',
    }
};

AppBackend.prototype.i18n.messages.es={
    unlogged:{
        login:{
            title: "entrada",
            username: "usuario",
            password: "clave",
            button: "Entrar"
        },
        loading:'cargando',
    },
    logged:{
        chpass:{
                title: 'cambio de clave',
                username: 'usuario',
                oldPassword:'clave anterior',
                newPassword:'nueva clave',
                repPassword:'repetir nueva clave',
                button:'Cambiar',
        },
        fileUploaded:'archivo subido',
        unkownExt:'extensión de archivo desconocida'
    },
    server:{
        columnDoesNotExistInTable:'la column $1 no existe en la tabla',
        dependences:'dependencias',
        files:'archivos',
        importColumnDoesNotHasStringValue:'la column $1 no valor de texto',
        missingPrimaryKeyValues:'faltan valores en los campos de la clave principal',
        versions:'versiones',
    }
};

function MemoryDevel(session){
    var MemoryStoreConstructor = MemoryStore(session);
    var MemoryDevelConstructor = function MemoryDevelConstructor(opts){
        MemoryStoreConstructor.call(this, opts)
        var store=this;
        var fileName='sessions/local-sessions.dump';
        Promise.resolve().then(function(){
            return fs.mkdir('sessions').then(function(){
                console.log('sessions dir created');
            },function(err){
                if(err.code!='EEXIST'){
                    console.log('ERROR in mkdir sessions');
                    console.log(err.code);
                    console.log(err);
                    process.exit(1);
                }
            });
        }).then(function(){
            return fs.writeFile('sessions/local-start','running since '+new Date(), {encoding:'utf8'});
        }).then(function(){
            return fs.stat(fileName);
        }).then(function(stats){
            if(new Date().getTime() - stats.mtimeMs > 15*60*1000){
                console.log('Sessions is 15 minutes old or more');
            }else{
                return fs.readFile(fileName, {encoding:'utf8'}).then(function(content){
                    console.log('fs.readFile', content);
                    store.store.load(json4all.parse(content));
                });
            }
        },function(err){
            console.log('No sessions stored for reabsorve');
        }).catch(function(err){
            console.log('ERROR REABSORVING sessions');
            console.log(err);
        }).then(function(){
            var dumpEverySeconds=4;
            console.log('dumping sessions every',dumpEverySeconds,'seconds');
            setInterval(function(){
                fs.writeFile(fileName,json4all.stringify(store.store.dump()));
            },4*dumpEverySeconds);
        });
    }
    MemoryDevelConstructor.prototype = Object.create(MemoryStoreConstructor.prototype);
    MemoryDevelConstructor.prototype.constructor = MemoryDevelConstructor;
    return MemoryDevelConstructor;
}

var sessionStores={
    file: SessionFileStore,
    memory: MemoryStore,
    memoryDevel: MemoryDevel
}

AppBackend.prototype.jsonPass = function jsonPass(text){
    return JSON.stringify(text,null,'    ').replace(/\n(.*".*(pass|clave|secret).*":\s*").*(",?)\n/gi,'\n$1********$3\n');
};

AppBackend.prototype.configList = function configList(){
    return [{
        login:{
            plus:{
                successRedirect:'/menu',
                store:{
                    // module:SessionFileStore,
                }
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
        server:{
            "base-url":'',
            skins:{
                "":{
                    "local-path":"for-client"
                }
            }
        },
        "client-setup":{
            skin:"",
            lang:"en"
        },
        install:{
            dump:{
                db:{},
                scripts:{
                    "post-adapt":[]
                }
            }
        },
        devel:{
            delay:false
        }
    }, this.rootPath+'/def-config', this.rootPath+'/local-config', process.env.BACKEND_PLUS_LOCAL_CONFIG||{}];
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
};

AppBackend.prototype._Browsers = {
    Edge:      {short:'Ed'  , minVer:14  , polly:true},
    Konqueror: {short:'Kq'  , minVer:null, polly:true},
    Chromium:  {short:'Chmm', minVer:49  , polly:58  },
    Chrome:    {short:'Ch'  , minVer:49  , polly:58  },
    Safari:    {short:'Sf'  , minVer:9   , polly:9   },
    IE:        {short:'IE'  , minVer:11  , polly:true},
    Opera:     {short:'Op'  , minVer:null, polly:true},
    Firefox:   {short:'FF'  , minVer:52  , polly:52  },
};

AppBackend.prototype.exts = {
    img: ['jpg', 'png', 'jpeg', 'ico', 'gif'],
    normal: ['', 'js', 'html', 'css', 'jpg', 'jpeg', 'png', 'ico', 'gif']
};

AppBackend.prototype.start = function start(opts){
    var be = this;
    if(be.addPublicServices){
        console.log("================================");
        console.log("Deprecated: be.addPublicServices");
        console.log("Ya no usamos be.addPublicServices, debería funcionar comentando esa función");
        process.exit(1);
    }
    [Path.resolve(this.rootPath,'client'), Path.join(__dirname,'../for-client')].forEach(function(pathName){
        Promise.all(['index.js', 'index.html', 'index.jade', 'index.css', 'index.styl'].map(function(fileName){
            if(!fs.constants){
                fs.constants = fs;
            }
            return fs.access(pathName+'/'+fileName,fs.constants.F_OK).then(function(){
                throw new Error(fileName+" must not exists in private path: "+pathName);
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
        });
    });
    var mainApp;
    var verboseStartup;
    opts = opts || {};
    if(opts.testing){
        this.getMainApp = function getMainApp(){ return mainApp; };
    }
    this.shootDownBackend = function shootDownBackend(){
        return new Promise(function(resolve,reject){
            be.server.close(function(err){
                if(err){
                    reject(err);
                }else{
                    resolve();
                }
            });
        }).then(function(){
            logWhy && logWhy();
        });
    };
    return Promise.resolve().then(function(){
        return MiniTools.readConfig(be.configList(),opts.readConfig).catch(function(err){
            console.log("be: error reading or merging config");
            throw err;
        });
    }).then(function(config){
        be.config = config;
        be.clientSetup = {config: be.config["client-setup"]};
        if(config.nodb){
            console.log("server without database");
        }else{
            return Promise.resolve().then(function(){
                var sessionStoreName=be.config.server["session-store"];
                if(sessionStoreName){
                    if(config.devel && sessionStores[sessionStoreName+'Devel']){
                        sessionStoreName+='Devel';
                    }
                    be.config.login.plus.store.module = sessionStores[sessionStoreName];
                }
                be.config.install.dump.db.owner=coalesce(be.config.install.dump.db.owner,be.config.db.user);
                be.config.install.dump.db["owner4special-scripts"]=coalesce(be.config.install.dump.db["owner4special-scripts"],be.config.install.dump.db.owner)
                verboseStartup=!be.config.server["silent-startup"];
                serveContent.logAll = be.config.log["serve-content"];
                MiniTools.logServe =  be.config.log["serve-content"];
                if(be.clientSetup.config.lang in be.i18n.messages){
                    be.messages = be.i18n.messages[be.clientSetup.config.lang];
                }
            }).then(function(){
                if(be.config.db.motor!='postgresql'){
                    throw new Error("backend-plus: Motor not recongnized: "+be.config.db.motor);
                }
                be.db = pg;
            }).then(function(){
                if(Array.prototype.indexOf.call(process.argv,'--dump-db')>=0){
                    return be.dumpDb().then(function(){
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
                if(be.config.db['log-last-error'] || be.config.devel){
                    pg.log = pg.logLastError;
                    pg.log.inFileName = 'last-pg-error-local.sql'
                }
                be.getDbClient = function getDbClient(req){
                    var paramsDb=((req||{}).session||{}).dbParams||be.config.db;
                    return pg.connect(paramsDb).then(function(client){
                        var dbAppName=req?(
                            ((req.user||{})[be.config.login.userFieldName]||'!logged')+
                            ' '+(req.machineId||'?')+
                            ' '+(((req.useragent)||{}).shortDescription||'?')
                        ):'!app local internal';
                        return client.query(
                            "SET application_name = "+be.db.quoteLiteral(dbAppName)
                        ).execute().then(function(){
                            var search_path = be.config.db.search_path || [be.config.db.schema];
                            if(search_path.length>0){
                                return client.query("set SEARCH_PATH TO "+be.db.quoteIdentList(search_path)).execute().then(function(){
                                    return client;
                                });
                            }else{
                                return client;
                            }
                        });
                    });
                };
                be.inDbClient = function inDbClient(req, doThisWithDbClient){
                    var be=this;
                    return be.getDbClient(req).then(function(client){
                        return doThisWithDbClient.call(be, client /*,req?*/).then(function(){
                            client.done();
                        }, function(err){
                            if(client && typeof client.done === "function"){
                                client.done();
                            }
                            throw err;
                        });
                    });
                };
                be.inTransaction = function inTransaction(req, doThisWithDbTransaction){
                    var be = this;
                    return this.inDbClient(req, function(client/*,req?*/){
                        return client.query("BEGIN TRANSACTION").execute().then(function(){
                            return doThisWithDbTransaction.call(be, client /*,req?*/).then(function(result){
                                return client.query("COMMIT").execute().then(function(){return result;});
                            }).catch(function(err){
                                return client.query("ROLLBACK").execute().then(function(){
                                    throw err;
                                },function(err2){
                                    console.log("Error in database when trying to "+procedureDef.action,err," Error trying to rollback ",err2);
                                    throw err;
                                });
                            });
                        });
                    });
                }
                return be.inDbClient(null, function(client){
                    if(verboseStartup){
                        console.log(
                            'db-connected',
                            be.jsonPass(be.config.db)
                        );
                    }
                    return client.query("SELECT current_timestamp as cts").fetchUniqueRow().then(function(data){
                        // var endTS = new Date(); // comentada por no usada
                        if(verboseStartup){
                            console.log('NOW in Database',data.row.cts);
                        }
                    });
                });
                return pg.connect(be.config.db).then(function(client){
                    if(verboseStartup){
                        console.log(
                            'db-connected',
                            be.jsonPass(be.config.db)
                        );
                    }
                    return client;
                }).then(function(client){
                    return client.query("SELECT current_timestamp as cts").fetchUniqueRow().then(function(data){
                        // var endTS = new Date(); // comentada por no usada
                        if(verboseStartup){
                            console.log('NOW in Database',data.row.cts);
                        }
                        client.done();
                    });
                });
            });
        }
    }).then(function(){
        if(!be.config.nologin){
            return Promise.all([
                fs.stat('unlogged/login.jade').then(function(){
                    throw new Error('login.jade must be in client dir not in unlogged');
                },function(){ /*OK, login.jade must not be here */ }),
                fs.stat('client/login.jade').then(function(){
                    return Path.resolve(be.rootPath,'client/login');
                },function(){ 
                    return Path.join(__dirname,'../for-client/login');
                }).then(function(loginFile){
                    be.config.login.plus.loginPageServe=function(req,res,next){
                        return MiniTools.serveJade(loginFile,be.optsGenericForFiles(req).jade)(req,res,next);
                    };
                })
            ]);
        }
    }).then(function(){
        mainApp = express();
        //mainApp.use(cookieParser());
        mainApp.use(bodyParser.urlencoded({extended:true, limit: '50mb'}));
        mainApp.use(function(req,res,next){
            if((req.headers['content-type']||'').match(/^multipart\/form-data/)){
                var form = new multiparty.Form();
                form.parse(req, function(err, fields, files) {
                    req.multipartErr=err;
                    req.fields=fields;
                    req.files=files;
                    next(err);
                });
            }else{
                next();
            }
        });
        if(be.config.log.req){
            mainApp.use(function(req,res,next){
                if(!/keep-alive$/.test(req.originalUrl) || be.config.log.req['keep-alive']){
                    console.log('REQ',req.method,req.protocol,req.hostname,req.originalUrl,'from:',req.ip);
                }
                next();
            });
        }
        mainApp.use(useragent.express());
        mainApp.use(function(req,res,next){
            be.seenBrowsers=be.seenBrowsers||{};
            if(be.config.devel){
                var jsonBro = req.useragent.source;
                if(!(jsonBro in be.seenBrowsers)){
                    be.seenBrowsers[jsonBro]={first:new Date(), times:0};
                }
            }
            req.useragent.shortDescription = (be._Browsers[req.useragent.browser]||{short:req.useragent.browser}).short+(req.useragent.version||'0').split('.')[0];
            req.machineId = be.getMachineId(req);
            if(be.config.devel){
                be.seenBrowsers[jsonBro].last=new Date();
                be.seenBrowsers[jsonBro].short=req.useragent.shortDescription;
                if(!be.seenBrowsers[jsonBro].times){
                    fs.writeFile('local-browsers',JSON.stringify(be.seenBrowsers,null,'    ')).catch(function(err){
                    });
                    be.seenBrowsers[jsonBro].times++;
                }
            }
            next();
        });
        if(be.config.server["kill-9"]){
            /*eslint global-require: 0 */
            var kill9 = require('kill-9');
            mainApp.use(be.config.server["base-url"], kill9(be.config.server["kill-9"]));
        }
        be.addUnloggedServices(mainApp, be.config.server["base-url"]);
        if(be.config.nologin){
            console.log("server without login");
        }else{
            mainApp.loginPlusManager = new loginPlus.Manager();
            be.config.login.plus.baseUrl = coalesce(be.config.login.plus.baseUrl, be.config.server["base-url"], '/');
            be.config.login.plus.userFieldName = be.config.login.plus.userFieldName || be.config.login.userFieldName;
            if(verboseStartup){
                console.log('-------------------');
                console.log(
                    'be.config.login', 
                    be.jsonPass(be.config.login)
                );
            }
            be.config.login.plus=changing(be.config.login.plus,{session:{
                name: 'bp'+be.config.server["base-url"]+'-connect.sid',
                cookie:{
                    path: be.config.server["base-url"]||'/',
                }
            }});
            mainApp.loginPlusManager.init(mainApp,changing(be.config.login.plus,{
                schrödinger:function(){
                    be.addSchrödingerServices(mainApp, be.config.server["base-url"]);
                }
            }));
            mainApp.loginPlusManager.setValidatorStrategy(
                function(req, username, password, done) {
                    var client;
                    if(be.config.login["double-dragon"]){
                        req.session.dbParams = changing(be.config.db, {user:username, password});
                    }
                    be.getDbClient(req).then(function(cli){
                        client = cli;
                        return client.query(
                            "SELECT  "+be.db.quoteIdentList(be.config.login.infoFieldList)+
                                ", "+be.config.login.activeClausule+" as active "+
                                ", "+be.config.login.lockedClausule+" as locked "+
                            "  FROM  "+(be.config.login.schema?be.db.quoteIdent(be.config.login.schema)+'.':'')
                                      +be.db.quoteIdent(be.config.login.table)+
                            "  WHERE "+be.db.quoteIdent(be.config.login.userFieldName)+" = $1 "+
                            "    AND "+be.db.quoteIdent(be.config.login.passFieldName)+" = $2 ",
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
                        if(client && typeof client.done === "function"){
                            client.done();
                        }
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
                            "UPDATE "+be.db.quoteIdent(be.config.login.table)+
                            "  SET "+be.db.quoteIdent(be.config.login.passFieldName)+" = $3 "+
                            "  WHERE "+be.db.quoteIdent(be.config.login.userFieldName)+" = $1 "+
                            "    AND "+be.db.quoteIdent(be.config.login.passFieldName)+" = $2 "+
                            "  RETURNING 1 as ok",
                            [username, md5(oldPassword+username.toLowerCase()), md5(newPassword+username.toLowerCase())]
                        ).fetchOneRowIfExists();
                    }).then(function(result){
                        client.done();
                        if(result.rowCount){
                            done(null,true);
                        }else{
                            done(null,false,{message: 'old password does not matchs or username is not longer valid'});
                        }
                    }).catch(function(err){
                        if(client && client.done){
                            client.done();
                        }
                        console.log('error changing pass',err);
                        console.log('stack',err.stack);
                        throw err;
                    }).catch(done);
                }
            );
            if(be.config.devel.delay){
                mainApp.use(function(req,res,next){
                    if(/^[^.]*$/.test(req.path)){
                        bestGlobals.sleep(be.config.devel.delay/2+Math.random()*be.config.devel.delay).then(next);
                    }else{
                        next();
                    }
                });
            }
            be.addLoggedServices();
        }
        be.app.use(function(err,req,res,next){
            console.log('******************', next);
            console.log(err);
            MiniTools.serveErr(req, res)(err);
        });
        return be.addProcedureServices();
    }).then(function(){
        return new Promise(function(resolve, reject){
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

AppBackend.prototype.rootPath = process.cwd();

AppBackend.prototype.postConfig = function postConfig(){};

AppBackend.prototype.getContext = function getContext(req){
    var be = this;
    return {
        be, user:req.user, session:req.session, 
        username:req.user[be.config.login.userFieldName], machineId:req.machineId, 
        navigator:(req.userAgent||{}).shortDescription||'?'
    };
}
    
AppBackend.prototype.addProcedureServices = function addProcedureServices(){
    var be = this;
    be.app.get('/data',function(req, res){ res.end('esto'); });
    return this.getProcedures().then(function(defs){
        be.procedure = be.procedure||{};
        be.procedures = defs;
        be.clientSetup.procedures = defs;
        be.app.get('/client-setup',function(req, res, next){
            var clientSetup=changing(be.clientSetup, {username:req.user[be.config.login.userFieldName]});
            var context=be.getContext(req);
            clientSetup.useragent = req.useragent;
            if(be.config["client-setup"].menu===true){
                clientSetup=changing(clientSetup, be.getVisibleMenu(be.getMenu(context),context));
            }
            clientSetup.procedures = be.clientSetup.procedures.filter(function(procedureDef){
                return !procedureDef.roles || procedureDef.roles.indexOf(req.user.rol)>=0;
            });
            MiniTools.serveJson(clientSetup)(req, res, next);
        });
        be.procedures.forEach(function(procedureDef){
            be.procedure[procedureDef.action] = procedureDef;
            procedureDef.parameters.forEach(function(paramDef){
                if(paramDef.enconding==='plain' && procedureDef.multipart){
                    throw new Error("plain enconding in parameters not allowed in multipart procedure"+procedureDef.action);
                }
            });
            be.app[procedureDef.method]('/'+procedureDef.action, function(req, res){
                var initDatetime = datetime.now();
                var context=be.getContext(req);
                var getSource = function(){
                    var source=procedureDef.method=='post'?(
                            procedureDef.files?'fields':'body'
                        ):'query';
                    return source;
                }
                var getParams = function(){
                    var source = getSource();
                    var params={};
                    procedureDef.parameters.forEach(function(paramDef){
                        var undecodedValue = req[source][paramDef.name];
                        var value = myOwn.encoders[paramDef.encoding].parse(undecodedValue);
                        if(value===undefined){
                            if(paramDef.defaultSpecial === 'currentYear'){
                                value = new Date().getFullYear();
                            }else if('defaultValue' in paramDef){
                                value = paramDef.defaultValue;
                            }else{
                                throw new Error("internal procedure "+procedureDef.action+" error: lack of mandatory paramater "+paramDef.name);
                            }
                        }
                        if(source==='fields' && false){
                            if(value.length!==1){
                                throw new Error("internal procedure "+procedureDef.action+" error: non unique paramater "+paramDef.name+" in multipart");
                            }
                            value=value[0];
                        }
                        params[paramDef.name] = value;
                    });
                    return params;
                }
                var generateInsertSQL = function(insertElement){
                    var cleanKeys = [];
                    var cleanValues = [];
                    for (var key in insertElement) {
                        cleanKeys.push(be.db.quoteIdent(key));
                        // if(typeof(insertElement[key]) !== 'string'){ //TODO: revisar si hace falta ahora que ponesmo quoteLiteral
                        //     insertElement[key] = insertElement[key].toString();    
                        // }
                        cleanValues.push(be.db.quoteLiteral(insertElement[key]));    
                    }
                    var sql =  "INSERT INTO bitacora ("+cleanKeys.join(',')+") VALUES ("+ cleanValues.join(',')+") returning id";
                    return sql;
                }
                var updateUpdateSQL = function(updateElement, tableName, updateConditions){
                    var keyValues = [];
                    for (var key in updateElement) {
                        // if(typeof(updateElement[key]) !== 'string'){ //TODO: revisar si hace falta ahora que ponesmo quoteLiteral
                        //     updateElement[key] = updateElement[key].toString();    
                        // }
                        keyValues.push(be.db.quoteIdent(key) + " = " + be.db.quoteLiteral(updateElement[key]));
                    }
                    var sql =  "UPDATE " + be.db.quoteIdent(tableName) + " SET " + keyValues.join(',') + " WHERE ";
                    var keyValues = [];
                    for (var key in updateConditions) {
                        // if(typeof(updateConditions[key]) !== 'string'){ //TODO: revisar si hace falta ahora que ponesmo quoteLiteral
                        //     updateConditions[key] = updateConditions[key].toString();    
                        // }
                        keyValues.push(be.db.quoteIdent(key) + " = " + be.db.quoteLiteral(updateConditions[key]));
                    };
                    sql =  sql + keyValues.join(' AND ');
                    return sql;
                }
                var processBitacora = function(hasError, status){
                    var endDatetime = datetime.now();
                    return Promise.resolve().then(function(){
                        var params = getParams();
                        var defInsertElement = {
                            procedure_name : procedureDef.action,
                            parameters_definition: JSON.stringify(procedureDef.parameters),
                            parameters: JSON.stringify(params),
                            username: context.username,
                            machine_id: context.machineId,
                            navigator: context.navigator,
                            init_date: initDatetime.toPlainString(),
                        };
                        if(procedureDef.bitacora.always){
                            var client;
                            if(lastBitacoraInsertedId){
                                return be.getDbClient(req).then(function(cli){
                                    client = cli;
                                    var updateElement = { 
                                        end_date: endDatetime.toPlainString(),
                                        end_status: status,
                                        has_error: hasError
                                    };
                                    var updateConditions = { id: lastBitacoraInsertedId };
                                    cli.query(updateUpdateSQL(updateElement, 'bitacora', updateConditions)).execute();
                                }).then(function(){
                                    client.done();
                                });
                            }else{
                                return be.getDbClient(req).then(function(cli){
                                    client = cli;
                                    return cli.query(generateInsertSQL(defInsertElement)).fetchUniqueRow();
                                }).then(function(result){
                                    lastBitacoraInsertedId = result.row.id;
                                }).then(function(){
                                    client.done();
                                });
                            }
                        }else{
                            if(hasError && procedureDef.bitacora.error){
                                var client;
                                return be.getDbClient(req).then(function(cli){
                                    client = cli;
                                    var insertElement = changing(defInsertElement, { 
                                        end_date: endDatetime.toPlainString(), 
                                        end_status: status, 
                                        has_error: hasError
                                    });
                                    cli.query(generateInsertSQL(insertElement)).execute();
                                }).then(function(){
                                    client.done();
                                });
                            }
                        }
                    }).then(function(){
                        if(procedureDef.bitacora.targetTable){
                            if(status){
                                var client;
                                return be.getDbClient(req).then(function(cli){
                                    var params = getParams();
                                    client = cli;
                                    var updateElement = {};
                                    updateElement[procedureDef.bitacora.targetTableBitacoraFields.end_date] = endDatetime.toPlainString(); 
                                    updateElement[procedureDef.bitacora.targetTableBitacoraFields.end_status] = status;
                                    updateElement[procedureDef.bitacora.targetTableBitacoraFields.has_error] = hasError;
                                    var updateConditions = {};
                                    procedureDef.bitacora.targetTableUpdateFieldsCondition.forEach(function(field){
                                        updateConditions[field] = params[field];
                                    });
                                    cli.query(updateUpdateSQL(updateElement, procedureDef.bitacora.targetTable, updateConditions)).execute();
                                }).then(function(){
                                    client.done();
                                });
                            }else{
                                var client;
                                return be.getDbClient(req).then(function(cli){
                                    var params = getParams();
                                    client = cli;
                                    var updateElement = {};
                                    updateElement[procedureDef.bitacora.targetTableBitacoraFields.init_date] = initDatetime.toPlainString(); 
                                    var updateConditions = {};
                                    procedureDef.bitacora.targetTableUpdateFieldsCondition.forEach(function(field){
                                        updateConditions[field] = params[field];
                                    });
                                    cli.query(updateUpdateSQL(updateElement, procedureDef.bitacora.targetTable, updateConditions)).execute();
                                }).then(function(){
                                    client.done();
                                });
                            }
                        }
                    });
                }
                var processCoreFunction = function(){
                    return Promise.resolve().then(function(){
                        if(procedureDef.roles && procedureDef.roles.indexOf(req.user.rol)<0){
                            throw changing(new Error("Not allowed"), {status:"403"});
                        }
                        var files=[];
                        var params=getParams();
                        if(procedureDef.files){
                            for(var name in req.files){
                                files = files.concat(req.files[name]);
                            }
                            if(
                                'minCount' in procedureDef.files && files.length<procedureDef.files.minCount &&
                                'count' in procedureDef.files && files.length<procedureDef.files.count
                            ){
                                throw new Error("internal procedure "+procedureDef.action+" error: receiving less than "+procedureDef.files.minCount+" files");
                            }
                            if(
                                'maxCount' in procedureDef.files && files.length<procedureDef.files.maxCount &&
                                'count' in procedureDef.files && files.length<procedureDef.files.count
                            ){
                                throw new Error("internal procedure "+procedureDef.action+" error: receiving less than "+procedureDef.files.minCount+" files");
                            }
                        }
                        var context=be.getContext(req);
                        if(procedureDef.progress){
                            context.informProgress=function informProgress(message){
                                // res.write(JSON.stringify({progress:{message}})+"\n");
                            };
                        }
                        return Promise.resolve().then(function(){
                            return be.getDbClient(req);
                        }).then(function(client){
                            context.client=client;
                            return context.client.query("BEGIN TRANSACTION").execute();
                        }).then(function(){
                            'query,body,fields'.split(',').forEach(function(label){
                            });
                            return procedureDef.coreFunction(context, params, files);
                        }).then(function(result){
                            return context.client.query("COMMIT").execute().then(function(){return result;});
                        }).catch(function(err){
                            return context.client.query("ROLLBACK").execute().then(function(){
                                context.client.done();
                                throw err;
                            },function(err2){
                                context.client.done();
                                console.log("Error in database when trying to "+procedureDef.action,err," Error trying to rollback ",err2);
                                throw err;
                            });
                        }).then(function(result){
                            context.client.done();
                            if(result===undefined){
                                console.log('undefined in',procedureDef,'for',req[getSource()]);
                                throw new Error("Bad return value in procedure. Undefined detected.");
                            }
                            if(procedureDef.encoding==='download'){
                                res.download(result.path, result.fileName);
                            }else{
                                try{
                                    result = myOwn.encoders[procedureDef.encoding].stringify(result);
                                }catch(err){
                                    throw err;
                                }
                                res.end(result);
                            }
                        });
                    });
                }
                var lastBitacoraInsertedId = null;
                Promise.resolve().then(function(){
                    return processBitacora(null,null);
                }).then(processCoreFunction).then(function(){
                    return processBitacora(false, 'OK');
                }).catch(function(err){
                    processBitacora(true, err.message);
                    MiniTools.serveErr(req,res)(err);
                });
            });
        });
    });
};

function resolve_module_dir(moduleName,path){
    return Path.join(Path.dirname(require.resolve(moduleName)),path||'');
}

AppBackend.prototype.optsGenericForFiles = function optsGenericForFiles(req){
    var be = this;
    var title=be.config['client-setup'].formTitle;
    var skin=be.config['client-setup'].skin;
    var skinUrl=(skin?skin+'/':'');
    return changing(be.optsGenericForAll||{},{
        allowedExts:be.exts.normal,
        jade:{
            skin:skin, 
            skinUrl:skinUrl,
            formTitle:title,
            msgs:changing(be.messages.unlogged, req && req.user?be.messages.logged:{}),
            modules:req && req.user?be.clientModules():[],
            lang:be.config["client-setup"].lang,
            flash:req && req.flash()||{}
        },
    });
}

AppBackend.prototype.addUnloggedServices = function addUnloggedServices(mainApp, baseUrl){
    var be=this;
    be.clientIncludesCompleted().filter(x => x.module).forEach(function (moduleDef) {
        let baseLib = baseUrl + '/' + (moduleDef.path ? moduleDef.path : moduleDef.type == 'js'? 'lib': 'css');
        try {
            mainApp.use(baseLib, serveContent(resolve_module_dir(moduleDef.module, moduleDef.modPath), { allowedExts: moduleDef.type }));
        } catch (error) {
            console.error('ERROR: No se pudo servir el módulo ' + moduleDef.module);
            throw error;
        }
    })

    // ----------------------------------------------------
    var skin=be.config['client-setup'].skin;
    var skinUrl=(skin?skin+'/':'');
    var optsGenericForFilesUnlogged=be.optsGenericForFiles(); 
    var skinPaths=[Path.join(be.rootPath,'skins')];
    if(be.config.server.skins[skin]['local-path']){
        skinPaths=skinPaths.concat(be.config.server.skins[skin]['local-path']).map(function(path){
            return Path.join(path,skin);
        });
    }else{
        console.log("No skin local-path for "+skin);
        process.exit(1);
    }
    var unloggedPaths=[];
    unloggedPaths.push(Path.resolve(be.rootPath));
    if(Path.join(__dirname,'..')!=Path.resolve(be.rootPath)){
        unloggedPaths.push(Path.join(__dirname,'..'));
    }
    skinPaths.concat(unloggedPaths).forEach(function(path){
        var pathToNodeModulesSkin=Path.join(path, 'unlogged');
        mainApp.use(baseUrl+(skin?'/'+skin:''),serveContent(pathToNodeModulesSkin,optsGenericForFilesUnlogged));
    });
    unloggedPaths.forEach(function(path){
        var pathToNodeModulesSkin=Path.join(path, 'unlogged');
        mainApp.use(baseUrl,serveContent(pathToNodeModulesSkin,optsGenericForFilesUnlogged));
    });
};

AppBackend.prototype.getVisibleMenu = function getVisibleMenu(menu, context){
    return menu;
};

AppBackend.prototype.clientIncludes = function clientIncludes(req, hideBEPlusInclusions) {
    var list = [];
    if (!hideBEPlusInclusions) {
        list = [
            { type: 'js', module: 'js-yaml', modPath: 'dist', file: 'js-yaml.js' },
            { type: 'js', module: 'xlsx-style', modPath: 'dist', file: 'xlsx.core.min.js' },
            { type: 'js', module: 'require-bro' },
            { type: 'js', module: 'lazy-some' },
            { type: 'js', module: 'like-ar' },
            { type: 'js', module: 'best-globals' },
            { type: 'js', module: 'json4all' },
            { type: 'js', module: 'dialog-promise', path: 'dialog-promise' },
            { type: 'css', module: 'dialog-promise', path: 'dialog-promise' },
            { type: 'js', module: 'js-to-html' },
            { type: 'js', module: 'moment', path: 'moment/min' },
            { type: 'js', module: 'pikaday', path: 'pikaday' },
            { type: 'css', module: 'pikaday', path: 'pikaday', modPath: 'css' },
            { type: 'js', module: 'big.js' },
            { type: 'js', module: 'type-store' },
            { type: 'js', module: 'typed-controls' },
            { type: 'js', module: 'ajax-best-promise' },
            // { type: 'js' , module: 'regexplicit'},
            { type: 'js', src: 'my-things.js' },
            { type: 'js', src: 'my-skin.js' },
            { type: 'js', src: 'my-tables.js' },
            { type: 'js', src: 'my-inform-net-status.js' },
            { type: 'css', file: "my-things.css" },
            { type: 'css', file: "my-tables.css" },
            { type: 'css', file: "my-menu.css" },
        ];
        var browInfo=req && this._Browsers[req.useragent.browser]||{polly:true};
        if(!req || browInfo.polly === true || (req.useragent.version || '0').split('.')[0] < browInfo.polly){
            list.unshift({ type: 'js', src: 'lib/polyfills-bro.js' })
        }
        var clientConfig = this.config["client-setup"];
        if(clientConfig.menu === true){
            list.push({ type: 'js', src: 'my-menu.js' });
        }
        if(clientConfig.lang==='es'){
            list.push({ type: 'js', module: 'castellano' });
        }
        list.push({ type: 'js', src: 'menu.js' });
    }
    return list;
}

AppBackend.prototype.clientIncludesCompleted = function clientIncludesCompleted(req, hideBEPlusInclusions) {
    let list = this.clientIncludes(req, hideBEPlusInclusions);
    return list.map(inclusion =>{
        var filename = inclusion.file? inclusion.file: (inclusion.module? Path.basename(require.resolve(inclusion.module)): '');
        return changing({
            src: inclusion.type == 'js' ? ((inclusion.path ? inclusion.path : 'lib') + '/' + (inclusion.file ? inclusion.file : filename)) : '',
            href: inclusion.type == 'css' ? ((inclusion.path ? inclusion.path : 'css') + '/' + (inclusion.file ? inclusion.file : (inclusion.module + '.css'))) : ''
        }, inclusion);
    });
}

AppBackend.prototype.clientModules = function clientModules(req, hideBEPlusInclusions) {
    return { scripts: this.clientIncludesCompleted(req, hideBEPlusInclusions).filter(x => x.type == 'js').map(mod => {return { src: mod.src }})};
}

AppBackend.prototype.getTables = function getTables(){
    var bitacora = {path: __dirname + '/tables', name:'bitacora'};
    return [bitacora];
}

AppBackend.prototype.csss = function csss(hideBEPlusInclusions){
    return this.clientIncludesCompleted(null, hideBEPlusInclusions).filter(x => x.type == 'css').map(x => x.href);
};

AppBackend.prototype.offLine = function offLine(req){
    return false;
}

AppBackend.prototype.mainPage = function mainPage(req){
    var be=this;
    var attr={lang: be.config["client-setup"].lang};
    if(be.offLine() && req && req.user){
        attr.manifest=be.offLine().manifestName;
    }
    return html.html(attr,[
        html.head([
            html.title(be.config["client-setup"].title),
            html.meta({charset:"utf-8"}),
            html.link({href: "img/logo-128.png", rel: "shortcut icon", type: "image/png"}),
            html.link({href: "img/logo.png", rel: "icon", type: "image/png"}),
            html.link({href: "img/logo.png", rel: "apple-touch-icon"}),
            html.meta({name:"format-detection", content:"telephone=no"}),
            /*
            html.meta({name:"apple-mobile-web-app-status-bar-style", content:"black"}),
            html.meta({name:"apple-mobile-web-app-capable", content:"yes"}),
            */
            // html.meta({name:'viewport', content:'user-scalable=no, width=768'})
        ].concat(be.csss().map(function(css){
            return html.link({href: css, rel: "stylesheet"});
        })).concat(be.csss().map(function(css){
            var skin=be.config['client-setup'].skin;
            var skinUrl=(skin?skin+'/':'');
            return skin?html.link({href: skinUrl+css, rel: "stylesheet"}):null;
        }))),
        html.body({'app-version':packagejson.version},[
            html.div({id: "total-layout"}, [
                html.img({class:"main-loading", src: "img/main-loading.gif"}),
                html.div(be.messages.unlogged.loading)
            ]),
            html.div({id: "total-scripts"}, be.clientModules(req).scripts.map(function(scriptDef){
                return html.script(scriptDef);
            }))
        ]),
    ]);
}

AppBackend.prototype.addSchrödingerServices = function addSchrödingerServices(mainApp,baseUrl){
    mainApp.use(baseUrl,function(req,res,next){
        next();
    })
};

AppBackend.prototype.addLoggedServices = function addLoggedServices(){
    var be = this;
    var skin=be.config['client-setup'].skin;
    var skinUrl=(skin?skin+'/':'');
    var slashSkin=(skin?'/'+skin:'');
    var imgUrl=skinUrl+'img/';
    be.optsGenericForAll={};
    if(!be.config.devel || be.config.devel['cache-content']){
        be.optsGenericForAll.cacheControl='private';
        be.optsGenericForAll.maxAge=1000*60*60*24*15;
    }
    var optsGenericForImg=changing(be.optsGenericForAll,{
        allowedExts:be.exts.img,
    });
    if(be.config["client-setup"].menu){
        be.app.get('/menu',function(req,res,next){
            return MiniTools.serveText(be.mainPage(req).toHtmlDoc(),'html')(req,res,next);
        });
    }
    be.app.get('/my-skin.js',MiniTools.serveText(`
        "use strict";
        myOwn.path.img='${imgUrl}';
        window.addEventListener('load', function(){
            document.body.setAttribute('my-skin', '${skin}')
        });
    `, 'application/javascript'));
    be.app.use(slashSkin,serveContent(Path.join(be.config.server.skins[skin]['local-path'],skin),{allowedExts:be.exts.img.concat(['css'])}));
    be.app.use(slashSkin,serveContent(Path.join(be.rootPath,'skins',skin),{allowedExts:be.exts.img.concat(['css'])}));
    [Path.resolve(be.rootPath,'client'),Path.join(__dirname,'../for-client')].forEach(function(path){
        be.app.use(function(req,res,next){
            return serveContent(path,be.optsGenericForFiles(req))(req,res,next);
        });
    });
    be.app.use('/img',serveContent(Path.join(__dirname,'../for-client/img'), optsGenericForImg));
    if(be.config.log.session){
        be.app.use(function(req, res, next){
            console.log(new Date().getTime(),req.session,new Date().getTime() - req.session.lastNonKeepAlive > be.config.login.keepAlive*1000?'LOGOUT':'stay-in',req.cookies);
            try{
                console.log(new Date().getTime() - req.session.lastNonKeepAlive, new Date(req.session.cookie._expires).getTime() - new Date().getTime())
            }catch(e){
            }
        next();
        });
    }
    be.app.use('/keep-alive', function(req, res, next){
        try{
            if(new Date().getTime() - req.session.lastNonKeepAlive > be.config.login.keepAlive*1000){
                req.logout();
                // res.clearCookie(options.name);
                return next();
            }else{
                res.send(Math.random().toString());
            }
        }catch(err){
            console.log(err);
            console.log(err.stack);
            throw err;
        }
    });
    be.app.use('/--version',function(req,res,next){
        var info=[
            html.h1(be.messages.server.versions),
            html.h3([packagejson.name,' ',packagejson.version]),
        ];
        Promise.resolve().then(function(){
            if(req.user.rol=='admin' || req.user.rol=='boss'){
                info=info.concat([
                    html.h2(be.messages.server.dependences),
                    html.ul(
                        likeAr(packagejson.dependencies).map(function(version, name){
                            return html.li([name,': ',version])
                        }).array()
                    )
                ])
                return Promise.all(
                    ['def-config.yaml', 'local-config.yaml', 'package.json', 'last-pg-error-local.sql']
                    .map(function(fileName){
                        return fs.stat(fileName).then(function(stat){
                            return html.li([fileName, ': ', stat.size/* , ' ', bestGlobals.datetime.ms(stat.mtime.getMilliseconds()).toYmdHms()*/ ]);
                        },function(err){
                            return html.li([fileName, ': ', err.messages]);
                        });
                    })
                ).then(function(htmls){
                    info = info.concat([
                        html.h2(be.messages.server.files),
                        html.ul(htmls)
                    ]);
                    info = info.concat([
                        html.h2('process'),
                        html.ul(
                            ['title','version','execPath','platform','arch'].map(function(attr){
                                return html.li([attr,': ',process[attr]]);
                            })
                        )
                    ]);
                });
            }
        }).then(function(){
            MiniTools.serveText(html.body(info).toHtmlDoc({title:'version'}),'html')(req,res);
        }).catch(MiniTools.serveErr(req,res,next));
    });
    be.app.use(function(req,res,next){
        // req != '/keep-alive'
        req.session.lastNonKeepAlive = new Date().getTime();
        next();
    });
    var logo=this.config.logo;
};

AppBackend.prototype.getContextForDump = function getContextForDump(){
    var be=this;
    var contextForDump={be:be, forDump:true, user:{}};
    contextForDump.user[be.config.login.userFieldName]='!dump';
    contextForDump.user[be.config.login.rolFieldName]='admin';
    return contextForDump;
};

AppBackend.prototype.validateBitacora = function validateBitacora(procedureDef){
    var be = this;
    if(procedureDef.bitacora.targetTable in be.tableStructures){
        var contextForDump=be.getContextForDump();
        var tableDefFields = be.tableStructures[procedureDef.bitacora.targetTable](contextForDump).fields;
        var targetTableBitacoraFields = procedureDef.bitacora.targetTableBitacoraFields;
        for (var fieldForSearch in targetTableBitacoraFields) {
            var searchResult = tableDefFields.find(function findByName(field) { 
                return field.name === targetTableBitacoraFields[fieldForSearch];
            });
            if(!searchResult){
                throw Error("Bitacora bad definition in core function '" + procedureDef.action + "', targetTableBitacoraField '" + targetTableBitacoraFields[fieldForSearch] + "' not exists in table '" + procedureDef.bitacora.targetTable + "'.");
            }
        }
        var targetTableUpdateFieldsCondition = procedureDef.bitacora.targetTableUpdateFieldsCondition;
        if(targetTableUpdateFieldsCondition){  
            if(targetTableUpdateFieldsCondition.length == 0){
                throw Error("Bitacora bad definition in core function '" + procedureDef.action + "', targetTableUpdateFieldsCondition must to be defined for table '" + procedureDef.bitacora.targetTable + "'.");
            }
            targetTableUpdateFieldsCondition.forEach(function(fieldName){
                var searchResult = tableDefFields.find(function findByName(field) { 
                    return field.name === fieldName;
                });
                if(!searchResult){
                    throw Error("Bitacora bad definition in core function '" + procedureDef.action + "', targetTableUpdateFieldsCondition '" + fieldName + "' not exists in table '" + procedureDef.bitacora.targetTable + "'.");
                }
            });
        }else{
            throw Error("Bitacora bad definition in core function '" + procedureDef.action + "', targetTableUpdateFieldsCondition '" + fieldName + "' is null for table '" + procedureDef.bitacora.targetTable + "'.");
        }
    }else{
        throw Error("Bitacora bad definition in core function '" + procedureDef.action + "'. '" + procedureDef.bitacora.targetTable + "' table defined in TargetTable not exists.");
    }
    return true;
};

AppBackend.prototype.procedureDefCompleter = function procedureDefCompleter(procedureDef){
    procedureDef.withFastWindow=procedureDef.withFastWindow||true;
    procedureDef.method=procedureDef.method||this.defaultMethod;
    procedureDef.encoding=procedureDef.encoding||'JSON4all';
    procedureDef.resultOk=procedureDef.resultOk||'showText';
    procedureDef.resultErr=procedureDef.resultErr||'showError';
    procedureDef.resultClass=procedureDef.resultClass||'result-div';
    procedureDef.parameters.forEach(function(paramDef){
        paramDef.encoding=paramDef.encoding||'JSON4all';
    });
    procedureDef.bitacora = procedureDef.bitacora || {always: false, error: false};
    if(procedureDef.bitacora.targetTable){
        var targetTableBitacoraFields = procedureDef.bitacora.targetTableBitacoraFields || {end_date: 'end_date', end_status: 'end_status', has_error: 'has_error'};
        procedureDef.bitacora.targetTableBitacoraFields = targetTableBitacoraFields; 
        this.validateBitacora(procedureDef);
    }
    return procedureDef;
};

AppBackend.prototype.getProcedures = function getProcedures(){
    return Promise.resolve(require('./procedures-table.js').map(this.procedureDefCompleter, this));
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
var test=typeStore.typerFrom
for(var typeName in typeStore.type){
    typeDb[typeName]= typeStore.typerFrom({typeName}).typeDbPg;
    //typeDb[typeName]=typeStore.type[typeName].typeDbPg;
}

AppBackend.prototype.dumpDbCreateDatabase = function dumpDbCreateDatabase(){
    var be = this;
    var db=be.db;
    var lines=[];
    var owner=db.quoteIdent(be.config.install.dump.db.owner||be.config.db.user);
    if(be.config.install.dump.db.password){
        throw new Error("password must not be setted in config");
    }
    if(be.config.install.dump.db.owner!=be.config.db.user){
        lines.push("create user "+owner+" nologin;");
    }
    lines.push("create user "+db.quoteIdent(be.config.db.user)+" password "+db.quoteLiteral(be.config.db.password)+";");
    lines.push("create database "+db.quoteIdent(be.config.db.database)+" owner "+owner+";");
    lines.push("grant connect, temporary on database "+db.quoteIdent(be.config.db.database)+" to "+db.quoteIdent(be.config.db.user)+";");
    lines.push("\\c "+db.quoteIdent(be.config.db.database));
    return fs.writeFile('local-db-dump-create-db.sql', lines.join('\n')+'\n');
};

AppBackend.prototype.dumpDbSchema = function dumpDbSchema(){
    var be = this;
    var db=be.db;
    db.quoteInteger = function quoteInteger(integerValue){
        // TODO: Cambiar esta ubicación provisoria. Pasarlo a pg-promise-strict
        if(!/^\d+$/.test(integerValue.toString())){
            throw new Error('not an integer in quoteInteger');
        }
        return integerValue;
    };
    var linesCreate=[];
    var lines=[];
    var dataText=[];
    var fkLines=[];
    var consLines=[];
    var enanceLines=[];
    var enancePart='';
    var admin=db.quoteIdent(be.config.db.user);
    var owner=db.quoteIdent(be.config.install.dump.db.owner||be.config.db.user);
    var schema=db.quoteIdent(be.config.db.schema);
    linesCreate.push("set role to "+owner+";");
    linesCreate.push("drop schema if exists "+schema+' cascade;');
    linesCreate.push("create schema "+schema+';');
    linesCreate.push("grant usage on schema "+schema+' to '+admin+';');
    linesCreate.push("set search_path = "+schema+';');
    linesCreate.push('');
    /*eslint guard-for-in: 0*/
    /*eslint no-loop-func: 0*/
    /*jshint loopfunc:true */
    var contextForDump=be.getContextForDump();
    for(var tableName in be.tableStructures){
        var tableDef=be.tableStructures[tableName](contextForDump);
        var fieldsForSequences=[];
        if(tableDef.sql.isTable){
            lines.push('create table '+db.quoteIdent(tableDef.name)+' (');
            var fields=[];
            tableDef.fields.forEach(function(fieldDef){
                if(!fieldDef.clientSide && fieldDef.inTable!==false || fieldDef.inTable){
                    var fieldType=typeDb[fieldDef.typeName]||'"'+fieldDef.typeName+'"';
                    if(fieldDef.sizeByte==4){
                        fieldType = 'integer';
                    }
                    fields.push(
                        '  '+db.quoteIdent(fieldDef.name)+
                        ' '+fieldType+
                        (fieldDef.nullable===false?' NOT NULL':'')+
                        (fieldDef.defaultValue!=null?' default '+db.quoteLiteral(fieldDef.defaultValue):'')
                    );
                }
                if(fieldDef.sequence.name){
                    fieldsForSequences.push(fieldDef);
                }
            });
            lines.push(fields.join(', \n'));
            if(tableDef.primaryKey){
                lines.push(', primary key ('+tableDef.primaryKey.map(function(name){ return db.quoteIdent(name); }).join(', ')+')');
                enanceLines.push(
                    'select '+db.quoteLiteral(tableDef.name)+' as table_name,'+
                        ' enance_table('+db.quoteLiteral(tableDef.name)+','+db.quoteLiteral(
                        tableDef.primaryKey.join(',')
                    )+') as result '
                );
            }
            lines.push(');');
            var rights=['select', 'insert', 'update', 'delete'].filter(function(right){
                return tableDef.allow[right];
            }).join(', ');
            if(rights){
                lines.push('grant '+rights+' on '+db.quoteIdent(tableDef.name)+' to '+admin+';');
            }
            tableDef.foreignKeys.map(function(fk){
                fkLines.push('alter table '+db.quoteIdent(tableDef.name)+' add constraint '+' '+
                    db.quoteIdent(fk.consName?fk.consName:tableDef.name+' '+fk.references+' REL ')+' '+
                    'foreign key ('+
                    fk.fields.map(function(pair){ return db.quoteIdent(pair.source); }).join(', ')+
                    ') references '+db.quoteIdent(fk.references)+' ('+
                    fk.fields.map(function(pair){ return db.quoteIdent(pair.target); }).join(', ')+
                    ') '+(fk.onDelete?' on delete '+fk.onDelete:'')+
                    ' on update cascade'+(fk.initiallyDeferred?' initially deferred':'')+
                    ';'
                );
            });
            tableDef.constraints.map(function(cons){
                var sql;
                switch(cons.constraintType){
                case 'unique': 
                    sql='unique ('+cons.fields.map(function(field){ return db.quoteIdent(field); }).join(', ')+')';
                break;
                case 'check': 
                    sql='check ('+cons.expr+')';
                break;
                default:
                    throw new Error('constraintType not implemented: '+cons.constraintType);
                }
                consLines.push(
                    'alter table '+db.quoteIdent(tableDef.tableName)+' add '+
                    (cons.consName?'constraint '+db.quoteIdent(cons.consName)+' ':'')+
                    sql+';'
                );
            });
            lines.push(tableDef.sql.postCreateSqls);
            lines.push('');
            fieldsForSequences.forEach(function(fieldDef) {
                var sequence = fieldDef.sequence;
                lines.push("CREATE SEQUENCE "+db.quoteIdent(sequence.name)+" START "+db.quoteInteger(sequence.firstValue)+";");
                lines.push(
                    "ALTER TABLE "+db.quoteIdent(tableName)+
                    " ALTER COLUMN "+db.quoteIdent(fieldDef.name)+
                    (sequence.prefix==null
                    ?" SET DEFAULT nextval("+db.quoteLiteral(sequence.name)+"::regclass);"
                    :" SET DEFAULT ("+db.quoteLiteral(sequence.prefix)+" || nextval("+db.quoteLiteral(sequence.name)+"::regclass)::text);"
                    )
                );
                lines.push('GRANT USAGE, SELECT ON SEQUENCE '+db.quoteIdent(sequence.name)+' TO '+admin+';');
            });
            lines.push('');
        }
    }
    var enancePart=enanceLines.join('\n UNION ')+';\n';
    var someNotFound=false;
    return Promise.all(Object.keys(be.tableStructures).map(function(tableName){
        return fs.readFile(be.rootPath+'/install/'+tableName+'.tab', {encoding:'UTF8'}).then(function(content){
            var lines=content.split(/\r?\n/)
                .map(function(line){ return line.split('|'); })
                .filter(function(line){
                    return line.length>1 || line.length==1 && line[0].trim();
                });
            if(lines.length>1){
                var rows=lines.slice(1);
                var dataString="insert into "+db.quoteIdent(tableName)+" ("+
                    lines[0].map(db.quoteIdent).join(', ')+
                    ') values\n'+
                    rows.map(function(line){
                        return "("+line.map(function(value){
                            return value===''?'null':db.quoteNullable(value);
                        }).join(', ')+")";
                    }).join(',\n')+';\n';
                dataText.push(dataString);
            }
        }).catch(function(err){
            if(err.code=='ENOENT'){
                if(!be.config.install.dump["skip-content"]){
                    console.log('skipping content for','install/'+tableName+'.tab');
                    someNotFound=true;
                }
            }else{
                throw err;
            }
        });
    })).then(function(){
        if(someNotFound){
            console.log('silence "skipping content" messages in "local-config.yaml".install.dump.skip-content=true');
        }
        return Promise.all(
            ['prepare.sql','pre-adapt.sql','adapt.sql']
            .concat(be.config.install.dump.scripts['post-adapt'])
            .map(function(fileName){
                return fs.readFile('install/'+fileName, {encoding:'UTF8'}).catch(function(err){
                    if(err.code!='ENOENT'){
                        throw err;
                    }
                    return '-- no '+fileName+'\n';
                });
            })
        );
    }).then(function(texts){
        return fs.writeFile('local-db-dump.sql', (
            linesCreate.join('\n')+
            '\n\n--prepare.sql'+
            texts[0]+'\n\n'+
            lines.join('\n')+
            '\n\n-- pre-ADAPTs\n'+
            texts[1]+'\n\n'+
            '\n\n-- DATA\n'+
            dataText.join('\n')+
            '\n\n-- ADAPTs\n'+
            texts[2]+'\n\n'+
            '-- conss\n'+
            consLines.join('\n')+
            '-- FKs\n'+
            fkLines.join('\n')+
            texts.slice(3).join('\n\n')+'\n\n'+
            (be.config.install.dump.enances==='inline'?enancePart:'')
        ).replace(/\uFEFF/g,'\n\n').replace(
            new RegExp(escapeStringRegexp(db.quoteIdent(be.config.install.dump.db["owner4special-scripts"])),'g'),
            db.quoteIdent(be.config.install.dump.db.owner)
        ));
    }).then(function(){
        if(be.config.install.dump.enances==='file'){
            return fs.writeFile('local-db-dump-enances.sql', enancePart);
        }
    });
};

AppBackend.prototype.queryValuesOfUniqueRow = function queryValuesOfUniqueRow(context, defTable, pkValues){
    var be=this;
    return context.client.query(
        "SELECT "+defTable.sql.select.join(', ')+
        " FROM "+defTable.sql.from+
        " WHERE "+defTable.primaryKey.map(function(fieldName, i){
            return be.db.quoteIdent(defTable.alias)+'.'+be.db.quoteIdent(fieldName)+" = $"+(i+1);
        }).join(" AND "),
        defTable.primaryKey.map(function(fieldName, i){
            return pkValues[fieldName];
        })
    ).fetchUniqueRow().then(function(result){
        return result;
    });
};


AppBackend.prototype.dumpDb = function dumpDb(){
    return Promise.all([
        this.dumpDbCreateDatabase(),
        this.dumpDbSchema()
    ]);
};

backendPlus.AppBackend = AppBackend;

module.exports = backendPlus;