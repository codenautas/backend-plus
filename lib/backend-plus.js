"use strict";

var backendPlus = {};

var timeStartBackendPlus = new Date();

var express = require('express');
var cookieParser = require('cookie-parser');
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
var jsToHtml=require('js-to-html');
var html=jsToHtml.html;
const escapeStringRegexp = require('escape-string-regexp');

var likeAr = require('like-ar');

pg.easy = true;
pg.setAllTypes();
/*
pg.log=function log(m){
    console.log(m);
}
// */

var readYaml = require('read-yaml-promise');

var fs = require('fs-promise');

var bestGlobals = require('best-globals');
var coalesce = bestGlobals.coalesce;
var changing = bestGlobals.changing;

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
        if(tableItem.mixin){
            be.tableStructures[tableItem.name] = be.tableMixin(tableItem.mixin[0],tableItem.mixin[1],{
                name:tableItem.name,
                title:tableItem.title
            });
        }else{
            if(typeof tableItem==='string'){
                tableItem = {name: tableItem};
            }
            tableItem = changing({name: tableItem.name, fileName: tableItem.name}, tableItem);
            tableItem = changing({source: (tableItem.path||be.rootPath+'/server')+'/table-'+tableItem.fileName+'.js'}, tableItem);
            be.tableStructures[tableItem.name] = require(tableItem.source);
        }
    });
}

AppBackend.prototype.rootPath=Path.resolve(__dirname,'..');

AppBackend.exposes={};

AppBackend.prototype.messages={
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
        importColumnDoesNotHasColumnName:'column $1 does not has a string value',
        missingPrimaryKeyValues:'missing primary key values',
    }
};

AppBackend.prototype.messages.es={
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
        importColumnDoesNotHasStringValue:'la column $1 no valor de texto',
        missingPrimaryKeyValues:'faltan valores en los campos de la clave principal',
    }
};

var sessionStores={
    file: SessionFileStore
}

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
            skin:""
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
    this.close = function close(){
        return new Promise(function(resolve,reject){
            be.server.close(function(err){
                if(err){
                    reject(err);
                }else{
                    resolve();
                }
            });
        });
    };
    return Promise.resolve().then(function(){
        return MiniTools.readConfig(be.configList(),opts.readConfig);
    }).then(function(config){
        be.config = config;
        if(be.config.login.plus.store["module-name"]){
            be.config.login.plus.store.module = sessionStores[be.config.login.plus.store["module-name"]]
        }
        be.config.install.dump.db["owner4special-scripts"]=coalesce(be.config.install.dump.db["owner4special-scripts"],be.config.install.dump.db.owner)
        be.clientSetup = {config: be.config["client-setup"]};
        verboseStartup=!be.config.server["silent-startup"];
        serveContent.logAll = be.config.log["serve-content"];
        MiniTools.logServe =  be.config.log["serve-content"];
        if(be.clientSetup.config.lang in be.messages){
            be.messages = be.messages[be.clientSetup.config.lang];
        }
    }).then(function(){
        if(!be.config.db){
            throw new Error("backend-plus: No db in config");
        }
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
                var paramsDb=((req||{}).session||{}).dbParams||be.config.db;
                return pg.connect(paramsDb).then(function(client){
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
        mainApp = express();
        mainApp.use(cookieParser());
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
                console.log('REQ',req.method,req.protocol,req.hostname,req.originalUrl,'from:',req.ip);
                next();
            });
        }
        mainApp.use(useragent.express());
        mainApp.use(function(req,res,next){
            req.useragent.shortDescription = (be._Browsers[req.useragent.browser]||{short:req.useragent.browser}).short+req.useragent.version.split('.')[0];
            req.machineId = be.getMachineId(req);
            next();
        });
        if(be.config.server["kill-9"]){
            /*eslint global-require: 0 */
            var kill9 = require('kill-9');
            mainApp.use(be.config.server["base-url"], kill9(be.config.server["kill-9"]));
        }
        be.addUnloggedServices(mainApp, be.config.server["base-url"]);
        if(be.config.login){
            mainApp.loginPlusManager = new loginPlus.Manager();
            be.config.login.plus.baseUrl = coalesce(be.config.login.plus.baseUrl, be.config.server["base-url"], '/');
            be.config.login.plus.userFieldName = be.config.login.plus.userFieldName || be.config.login.userFieldName;
            if(verboseStartup){
                console.log('-------------------');
                console.log('be.config.login', be.config.login);
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
                            "SELECT  "+be.db.quoteObjectList(be.config.login.infoFieldList)+
                                ", "+be.config.login.activeClausule+" as active "+
                                ", "+be.config.login.lockedClausule+" as locked "+
                            "  FROM  "+(be.config.login.schema?be.db.quoteObject(be.config.login.schema)+'.':'')
                                      +be.db.quoteObject(be.config.login.table)+
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
            if(be.config["client-setup"].menu===true){
                clientSetup=changing(clientSetup, be.getMenu(context));
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
                Promise.resolve().then(function(){
                    if(procedureDef.roles && procedureDef.roles.indexOf(req.user.rol)<0){
                        throw changing(new Error("Not allowed"), {status:"403"});
                    }
                    var params={};
                    var files=[];
                    var source=procedureDef.method=='post'?(
                        procedureDef.files?'fields':'body'
                    ):'query';
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
                            console.log('undefined in',procedureDef,'for',req[source]);
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
                }).catch(MiniTools.serveErr(req,res));
            });
        });
    });
};

AppBackend.prototype.addUnloggedServices = function addUnloggedServices(mainApp, baseUrl){
    var be=this;
    var baseLib = baseUrl+'/lib';
    mainApp.use(baseLib, serveContent('./node_modules/lodash', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/require-bro/lib', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/dialog-promise/lib', {allowedExts:['js','css']}));
    mainApp.use(baseUrl+'/css', serveContent('./node_modules/dialog-promise/lib', {allowedExts:['css']}));
    mainApp.use(baseLib, serveContent('./node_modules/js-to-html', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/ajax-best-promise/bin', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/lazy-some', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/like-ar', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/json4all', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/js-yaml/dist', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/typed-controls/lib', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/best-globals', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/regexplicit', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/castellano/lib', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/big.js', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/type-store', {allowedExts:'js'}));
    // mainApp.use(baseLib, serveContent('./node_modules/xlsx/dist', {allowedExts:'js'}));
    mainApp.use(baseLib, serveContent('./node_modules/xlsx-style/dist', {allowedExts:'js'}));
    mainApp.use(baseUrl+'/pikaday', serveContent('./node_modules/pikaday', {allowedExts:'js'}));
    // ----------------------------------------------------
    var skin=be.config['client-setup'].skin;
    var title=be.config['client-setup'].formTitle;
    var skinUrl=(skin?skin+'/':'');
    var optsGenericForFiles={
        allowedExts:be.exts.normal,
        jade:{
            skin:skin, 
            skinUrl:skinUrl,
            formTitle:title,
            msgs:be.messages.unlogged
        },
    }
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
        mainApp.use(baseUrl+(skin?'/'+skin:''),serveContent(pathToNodeModulesSkin,optsGenericForFiles));
    });
    unloggedPaths.forEach(function(path){
        var pathToNodeModulesSkin=Path.join(path, 'unlogged');
        mainApp.use(baseUrl,serveContent(pathToNodeModulesSkin,optsGenericForFiles));
    });
};

AppBackend.prototype.clientModules = function clientModules(req){
    var be=this;
    var scriptList=[
        {src:'lib/js-yaml.js'                                       },
        {src:'lib/xlsx.core.min.js'                                 },
        {src:'lib/require-bro.js'                                   },
        {src:'lib/lazy-some.js'                                     },
        {src:'lib/like-ar.js'                                       },
        {src:'lib/best-globals.js'                                  },
        {src:'lib/json4all.js'                                      },
        {src:'lib/postgres-interval4client.js'                      },
        {src:'lib/dialog-promise.js'                                },
        {src:'lib/js-to-html.js'                                    },
        {src:'pikaday/pikaday.js'                                   },
        {src:'lib/big.js'                                           },
        {src:'lib/type-store.js'                                    },
        {src:'lib/typed-controls.js'                                },
        {src:'lib/ajax-best-promise.js'                             },
        {src:'my-things.js'                                         },
        {src:'my-skin.js'                                           },
        {src:'my-tables.js'                                         },
        {src:'my-inform-net-status.js'                              },
    ];
    if(req){
        var browInfo = be._Browsers[req.useragent.browser];
        console.log('xxxxxxxxxxxxxxxx brow ',browInfo,req.useragent,(req.useragent.version||'0').split('.')[0],(req.useragent.version||'0').split('.')[0]<browInfo.polly)
        if(!browInfo || browInfo.polly===true || (req.useragent.version||'0').split('.')[0]<browInfo.polly){
            scriptList.unshift({src:'lib/polyfills-bro.js'})
        }
    }
    if(be.config["client-setup"].menu===true){
        scriptList.push({src:'my-menu.js'});
    }
    if(be.config["client-setup"].lang==='es'){
        scriptList.push({src:'lib/cliente-en-castellano.js'});
    }
    scriptList.push({src:'menu.js'});
    return {scripts:scriptList};
}

AppBackend.prototype.getTables = function getTables(){
    return [];
}

AppBackend.prototype.csss = function csss(){
    return [
        "css/dialog-promise.css",
        "css/my-things.css"     ,
        "css/my-tables.css"     ,
        "css/my-menu.css"       ,
        "css/pikaday.css"       ,
    ];
};

AppBackend.prototype.mainPage = function mainPage(req){
    var be=this;
    return html.html({lang: "en"}, [
        html.head([
            html.title(be.config["client-setup"].title),
            html.meta({charset:"utf-8"}),
            html.link({href: "img/logo-128.png", rel: "shortcut icon", type: "image/png"}),
            html.link({href: "img/logo.png", rel: "apple-touch-icon"}),
        ].concat(be.csss().map(function(css){
            return html.link({href: css, rel: "stylesheet"});
        })).concat(be.csss().map(function(css){
            var skin=be.config['client-setup'].skin;
            var skinUrl=(skin?skin+'/':'');
            return skin?html.link({href: skinUrl+css, rel: "stylesheet"}):null;
        }))),
        html.body([
            html.div({id: "total-layout"}, [
                html.img({class:"main-loading", src: "main-loading.gif"}),
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
    var optsGenericForAll={};
    if(!be.config.devel || be.config.devel['cache-content']){
        optsGenericForAll.cacheControl=true;
        optsGenericForAll.maxAge=1000*60*60*24*15;
    }
    var optsGenericForFiles = function optsGenericForFiles(req){
        return changing(optsGenericForAll,{
            allowedExts:be.exts.normal,
            jade:{
                skin:skin, 
                skinUrl:skinUrl,
                msgs: changing(be.messages.unlogged, be.messages.logged),
                modules:be.clientModules(),
                lang:be.config["client-setup"].lang
            },
        });
    }
    var optsGenericForImg=changing(optsGenericForAll,{
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
            return serveContent(path,optsGenericForFiles(req))(req,res,next);
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
    be.app.use(function(req,res,next){
        // req != '/keep-alive'
        req.session.lastNonKeepAlive = new Date().getTime();
        next();
    });
    var logo=this.config.logo;
};

AppBackend.prototype.procedureDefCompleter = function procedureDefCompleter(procedureDef){
    procedureDef.withFastWindow=procedureDef.withFastWindow||true;
    procedureDef.method=procedureDef.method||this.defaultMethod;
    procedureDef.encoding=procedureDef.encoding||'JSON4all';
    procedureDef.parameters.forEach(function(paramDef){
        paramDef.encoding=paramDef.encoding||'JSON4all';
    });
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

for(var typeName in typeStore.type){
    typeDb[typeName]=typeStore.type[typeName].typeDbPg;
}

AppBackend.prototype.dumpDbCreateDatabase = function dumpDbCreateDatabase(){
    var be = this;
    var db=be.db;
    var lines=[];
    var owner=db.quoteObject(be.config.install.dump.db.owner||be.config.db.user);
    if(be.config.install.dump.db.password){
        throw new Error("password must not be setted in config");
    }
    if(be.config.install.dump.db.owner!=be.config.db.user){
        lines.push("create user "+owner+" nologin;");
    }
    lines.push("create user "+db.quoteObject(be.config.db.user)+" password "+db.quoteText(be.config.db.password)+";");
    lines.push("create database "+db.quoteObject(be.config.db.database)+" owner "+owner+";");
    lines.push("grant connect, temporary on database "+db.quoteObject(be.config.db.database)+" to "+db.quoteObject(be.config.db.user)+";");
    lines.push("\\c "+db.quoteObject(be.config.db.database));
    return fs.writeFile('local-db-dump-create-db.sql', lines.join('\n')+'\n');
};

AppBackend.prototype.dumpDbSchema = function dumpDbSchema(){
    var be = this;
    var db=be.db;
    var lines=[];
    var dataText=[];
    var fkLines=[];
    var enanceLines=[];
    var admin=db.quoteObject(be.config.db.user);
    var owner=db.quoteObject(be.config.install.dump.db.owner||be.config.db.user);
    var schema=db.quoteObject(be.config.db.schema);
    lines.push("set role to "+owner+";");
    lines.push("drop schema if exists "+schema+' cascade;');
    lines.push("create schema "+schema+';');
    lines.push("grant usage on schema "+schema+' to '+admin+';');
    lines.push("set search_path = "+schema+';');
    lines.push('');
    /*eslint guard-for-in: 0*/
    /*eslint no-loop-func: 0*/
    /*jshint loopfunc:true */
    var contextForDump={be:be, forDump:true, user:{}};
    contextForDump.user[be.config.login.userFieldName]='!dump';
    contextForDump.user[be.config.login.rolFieldName]='admin';
    for(var tableName in be.tableStructures){
        var tableDef=be.tableStructures[tableName](contextForDump);
        if(tableDef.sql.isTable){
            lines.push('create table '+db.quoteObject(tableDef.name)+' (');
            var fields=[];
            tableDef.fields.forEach(function(fieldDef){
                if(!fieldDef.clientSide && fieldDef.inTable!==false || fieldDef.inTable){
                    var fieldType=typeDb[fieldDef.typeName]||'"'+fieldDef.typeName+'"';
                    if(fieldDef.sizeByte==4){
                        fieldType = 'integer';
                    }
                    fields.push(
                        '  '+db.quoteObject(fieldDef.name)+
                        ' '+fieldType+
                        (fieldDef.nullable===false?' NOT NULL':'')+
                        (fieldDef.defaultValue!=null?' default '+db.quoteText(fieldDef.defaultValue):'')
                    );
                }
            });
            lines.push(fields.join(', \n'));
            if(tableDef.primaryKey){
                lines.push(', primary key ('+tableDef.primaryKey.map(function(name){ return db.quoteObject(name); }).join(', ')+')');
                enanceLines.push(
                    'select enance_table('+db.quoteText(tableDef.name)+','+db.quoteText(
                        tableDef.primaryKey.join(',')
                    )+');'
                );
            }
            lines.push(');');
            var rights=['select', 'insert', 'update', 'delete'].filter(function(right){
                return tableDef.allow[right];
            }).join(', ');
            if(rights){
                lines.push('grant '+rights+' on '+db.quoteObject(tableDef.name)+' to '+admin+';');
            }
            tableDef.foreignKeys.map(function(fk){
                fkLines.push('alter table '+db.quoteObject(tableDef.name)+' add foreign key ('+
                    fk.fields.map(function(pair){ return db.quoteObject(pair.source); }).join(', ')+
                    ') references '+db.quoteObject(fk.references)+' ('+
                    fk.fields.map(function(pair){ return db.quoteObject(pair.target); }).join(', ')+
                    ') '+(fk.onDelete?' on delete '+fk.onDelete:'')+
                    ' on update cascade'+(fk.initiallyDeferred?' initially deferred':'')+
                    ';'
                );
            });
            lines.push(tableDef.sql.postCreateSqls);
            lines.push('');
        }
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
                            return value===''?'null':db.quoteText(value);
                        }).join(', ')+")";
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
            '\n\n--prepare.sql'+
            texts[0]+'\n\n'+
            lines.join('\n')+
            '\n\n-- pre-ADAPTs\n'+
            texts[1]+'\n\n'+
            '\n\n-- DATA\n'+
            dataText.join('\n')+
            '\n\n-- ADAPTs\n'+
            texts[2]+'\n\n'+
            '-- FKs\n'+
            fkLines.join('\n')+
            texts.slice(3).join('\n\n')+'\n\n' 
        ).replace(/\uFEFF/g,'\n\n').replace(
            new RegExp(escapeStringRegexp(db.quoteObject(be.config.install.dump.db["owner4special-scripts"])),'g'),
            db.quoteObject(be.config.install.dump.db.owner)
        ));
    }).then(function(){
        return fs.writeFile('local-db-dump-enances.sql', enanceLines.join('\n\n'));
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