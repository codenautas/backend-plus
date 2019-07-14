/// <reference path="./in-backend-plus.d.ts" />
"use strict";

var backendPlus = {};

/** @type {(()=>void)|null} */
var logWhy = null; // require('why-is-node-running') // should be your first require

var timeStartBackendPlus = new Date();

var express = require('express');
//var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multiparty = require('multiparty');
var Path = require('path');
var useragent = require('express-useragent');
var numeral = require('numeral');
var MiniTools = require('mini-tools');
MiniTools.globalOpts.serveErr.propertiesWhiteList=['message','detail','code','table','constraint','name','severity'];
var crypto = require('crypto');
var serveContent = require('serve-content');
var pg = require('pg-promise-strict');
var SessionFileStore = require('session-file-store');
var memorystore = require('memorystore');
var jsToHtml=require('js-to-html');
var html=jsToHtml.html;
const escapeStringRegexp = require('escape-string-regexp');
var packagejson = require(process.cwd()+'/package.json');
var stackTrace = require('stack-trace');
var locatePath = require('locate-path');
var jsYaml = require('js-yaml');

var likeAr = require('like-ar');

var regexpDistCheck=/(^|[/\\])dist[/\\]/

pg.easy = true;
pg.debug.pool=true; // TODO: quitar. Esto está buscando un code leak
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
var isLowerIdent = bestGlobals.isLowerIdent;

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

/** 
  * @param {string} text
  * @return {string}
  */
function md5(text){
    return crypto.createHash('md5').update(text).digest('hex');
}

//

/**
 * @typedef {{name: string; path?:string; fileName?: string; source?: string; tableGenerator?:()=>void; title?:string; mixin?:any[]}} TableItem
 */

class AppBackend{
    constructor(){
        let be = this;
        /** @type {any} */
        this.config={};
        /** @type {{path:string}[]} */
        this.appStack=[];
        /** @type {{message:string; fun:()=>void}[]} */
        this.shootDownCallbackList=[];
        if(!this.rootPath){
            console.log('ATENCIÓN hay que poner be.rootPath antes de llamar a super()');
            this.rootPath=Path.resolve(__dirname,'..');
        }
        console.log('rootPath',this.rootPath);
        var trace = stackTrace.get();
        trace.forEach(function(callSite){
            var path = callSite.getFileName();
            if(path && !path.startsWith('internal/')){
                path = Path.dirname(path);
                if(path!='.'){
                    be.appStack.unshift({path});
                }
            }
        });
        this.defaultMethod='post';
        this.app = express();
        this.clearCaches();
        this.tableStructures = {};
        this.configStaticConfig();
        this.getTables().forEach(
            // TODO: quitar, no debería hacer falta poner esto acá
            /**
             * @param {TableItem|string} tableItemOrString
             */
            function(tableItemOrString){
                var generatedDef;
                /** @type {TableItem} */
                var tableItem;
                if(typeof tableItemOrString==='string'){
                    tableItem = {name: tableItemOrString};
                }else{
                    tableItem = tableItemOrString;
                }
                if(tableItem.mixin){
                    generatedDef = be.tableMixin(tableItem.mixin[0],tableItem.mixin[1],{
                        name:tableItem.name,
                        title:tableItem.title
                    });
                }else if(tableItem.tableGenerator){
                    generatedDef = tableItem.tableGenerator;
                }else{
                    tableItem = changing({name: tableItem.name, fileName: tableItem.name}, tableItem);
                    tableItem = changing({source: (tableItem.path||be.rootPath+'/server')+'/table-'+tableItem.fileName+'.js'}, tableItem);
                    if(!tableItem.source){
                        throw new Error('Need source for tableItem.name:'+tableItem.name);
                    }else{
                        generatedDef = require(tableItem.source);
                        if(!(generatedDef instanceof Function)){
                            generatedDef=generatedDef[tableItem.name];
                            var contextForDump=be.getContextForDump();
                            var tableDef = generatedDef(contextForDump);
                            if(!tableDef.adapted){
                                generatedDef = function(generatedDef){
                                    /** @param {bp.Context} context  */
                                    return function (context){
                                        return be.tableDefAdapt(generatedDef(context), context);
                                    }
                                }(generatedDef);
                            }
                        }
                    }
                }
                be.tableStructures[tableItem.name] = generatedDef;
            }
        );
        /** @type {null|()=>Promise<void>} */
        this.shootDownBackend = null;
        /** @type {bp.Server} */
        // @ts-ignore
        this.server = null;
    }
    clearCaches(){
        this.caches={
            procedures:{}
        }
    }
}
AppBackend.prototype.configStaticConfig = function configStaticConfig(){
    this.setStaticConfig(`
        login:
          plus:
            successRedirect: /menu
            successReturns: true
            store: {}
            loginForm:
              autoLogin: true
            chPassUrlPath: /chpass
          activeClausule: true
          lockedClausule: false
          messages:
            userOrPassFail: username or password error
            lockedFail: user account is locked
            inactiveFail: user account is marked as inactive
        keepAlive: 1800
        log: 
          db:
            until: 2001-01-01 00:00
            last-error: false
            on-demand: false
        server:
          base-url: ''
          skins:
            "":
              local-path: for-client
        client-setup: 
          skin: ""
          lang: en
          version: 1.0
        install:
          dump:
            db:
              host: localhost
              extensions: []
            scripts:
              parts-order: []
              post-adapt: []
        devel:
          delay: false
        imports:
          allow-plain-xls: false
    `);
}
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
        checkingConstraints:'checking constraints',
        cellOfA1DoesNotExists:'cell of A1 does not exists',
        columnDoesNotExistInTable:'column $1 does not exist in table',
        dependences:'dependences',
        fileReaded:'file readed',
        files:'files',
        importColumnDoesNotHasColumnName:'column $1 does not has a string value',
        insertingRows:'inserting rows',
        lackOfBackendPlusInImport:'lack of #backend-plus signal in A1 or imports.allow-plain-xls in local-config',
        line:'line',
        missingPrimaryKeyValues:'missing primary key values',
        primarKeyCantBeNull4:'primary key field "$1" can not be #NULL',
        spreadsheetProcessed:'spread sheet processed',
        unkownHashValue4Import:'unknown # code in value import',
        updatingDb:'updating database',
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
        checkingConstraints:'verificando las restricciones',
        cellOfA1DoesNotExists:'no hay valor en la celda A1',
        columnDoesNotExistInTable:'la column $1 no existe en la tabla',
        dependences:'dependencias',
        fileReaded:'archivo leído',
        files:'archivos',
        importColumnDoesNotHasStringValue:'la column $1 no valor de texto',
        insertingRows:'insertando registros',
        lackOfBackendPlusInImport:'falta la señal #backend-plus en la celda A1 o la opción imports.allow-plain-xls en local-config',
        line:'linea',
        missingPrimaryKeyValues:'faltan valores en los campos de la clave principal',
        primarKeyCantBeNull4:'el campo "$1" de la clave principal no puede ser #NULL',
        spreadsheetProcessed:'hoja de datos procesada',
        unkownHashValue4Import:'código # desconocido en la importación de un valor',
        updatingDb:'actualizando la base de datos',
        versions:'versiones',
    }
};

/**
 * @param {Express.Session} session
 */
function MemoryPerodicallySaved(session){
    var MemoryStoreConstructor = memorystore(session);
    class MemoryDevelConstructor extends MemoryStoreConstructor{
        /**
         * @param {memorystore.MemoryConsOpts} opts
         */
        constructor(opts){
            super(opts);
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
                var errorsToShow=4;
                // TODO: hangs the server in devel mode
                setInterval(function(){
                    try{
                        fs.writeFile(fileName,json4all.stringify(store.store.dump()));
                    }catch(err){
                        if(errorsToShow-->0){
                            console.log('error saving local-sessions.dump');
                            console.log(err);
                            console.log(err.stack);
                        }
                    }
                },dumpEverySeconds*1000);
            });
        }
    }
    return MemoryDevelConstructor;
}

var sessionStores={
    file: SessionFileStore,
    memory: memorystore,
    memoryDevel: MemoryPerodicallySaved,
    "memory-saved": MemoryPerodicallySaved,
}

/**
 * @param {string} text 
 */
AppBackend.prototype.jsonPass = function jsonPass(text){
    return JSON.stringify(text,null,'    ').replace(/\n(.*".*(pass|clave|secret).*":\s*").*(",?)\n/gi,'\n$1********$3\n');
};

AppBackend.prototype.setStaticConfig = function setStaticConfig(defConfigYamlString){
    var be=this;
    this.staticConfig=this.staticConfig||{};
    this.staticConfig=changing(this.staticConfig,jsYaml.load(defConfigYamlString));
    var controlNotSet=['db.password', 'kill-9.master-pass', 'login.plus.secret'];
    controlNotSet.forEach(function(attrs){
        var attrList=attrs.split('.');
        var value=be.staticConfig;
        while(attrList.length && value && typeof value == "object"){
            value=value[attrList.shift()];
        }
        if(value != null){
            console.log('configuración insegura del servidor, no debe especificarse en modo estatico:',attrs);
            throw Error('insecure config')
        }
    })
}

AppBackend.prototype.configList = function configList(){
    var list=[this.staticConfig];
    if(!this.staticConfig["client-setup"].title && fs.existsSync(this.rootPath+'/def-config.yaml')){
        console.log('DEPRECATED!!!!!!')
        console.error('ERROR el def-config hay que ponerlo dentro de staticConfig');
        console.log('DEPRECATED!!!!!!')
        console.error('DEPRECATED!!!!!!')
        console.log('DEPRECATED!!!!!!')
        console.error('DEPRECATED!!!!!!')
        list.push(this.rootPath+'/def-config.yaml')
    };
    list.push(this.rootPath+'/local-config');
    list.push(process.env.BACKEND_PLUS_LOCAL_CONFIG||{});
    return list;
};

/**
 * @param {bp.Request} req
 */
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

AppBackend.prototype.isAdmin = function isAdmin(reqOrContext){
    var be = this;
    return reqOrContext && reqOrContext.user && reqOrContext.user[be.config.login.rolFieldName] == 'admin';
}

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
    normal: ['', 'js', 'map', 'html', 'css', 'jpg', 'jpeg', 'png', 'ico', 'gif', 'appcache', 'manifest']
};

/**
 * @param {null|{testing?:boolean}} opts
 */
AppBackend.prototype.start = function start(opts){
    var be = this;
    [Path.resolve(this.rootPath,'client'), Path.join(__dirname,'../for-client')].forEach(function(pathName){
        Promise.all(['index.js', 'index.html', 'index.jade', 'index.css', 'index.styl'].map(function(fileName){
            if(!fs.constants){
                // @ts-ignore
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
    /** @type {Express.Application} */
    var mainApp;
    /** @type {boolean} */
    var verboseStartup;
    opts = opts || {};
    if(opts.testing){
        /** @type {()=>Express.Application} */
        // @ts-ignore : only for testing */
        this.getMainApp = function getMainApp(){ return mainApp; };
    }
    this.shootDownBackend = function shootDownBackend(){
        console.log('shooting down:');
        return new Promise(function(resolve,reject){
            console.log('*','express server');
            be.server.close(/** @param {Error} err */function(err){
                if(err){
                    reject(err);
                }else{
                    resolve();
                }
            });
        }).then(async function(){
            while(be.shootDownCallbackList.length){
                var nextCallback=be.shootDownCallbackList.pop();
                if(nextCallback!=null){
                    console.log('*',nextCallback.message);
                    await nextCallback.fun();
                }
            }
        }).then(function(){
            console.log('pg pool balance',pg.poolBalanceControl());
            // @ts-ignore al hacer shootDown ya no hay mainApp. 
            mainApp = null;
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
                    var storeModule = sessionStores[sessionStoreName];
                    be.config.login.plus.store.module = storeModule;
                }
                be.config.install.dump.db.owner=coalesce(be.config.install.dump.db.owner,be.config.db.user);
                be.config.install.dump.db["owner4special-scripts"]=coalesce(be.config.install.dump.db["owner4special-scripts"],be.config.install.dump.db.owner)
                be.config.install.dump.db["user4special-scripts"]=coalesce(be.config.install.dump.db["user4special-scripts"],be.config.db.user)
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
                        console.log(err.context);
                        console.log(err.stack);
                    }).then(function(){
                        /*eslint no-process-exit: 0 */
                        process.exit(0);
                    });
                }
            }).then(function(){
                if(be.config.log.db['last-error'] || be.config.devel || be.config.log.db['on-demand']){
                    if(be.config.devel || be.config.log.db['on-demand']){
                        be.setLog=function(opts){
                            const LOG_MINUTES = 5; // minutes
                            if(opts.until){
                                try{
                                    var ti=bestGlobals.timeInterval.iso(opts.until)
                                    be.config.log.db.until = bestGlobals.datetime.now().add(ti);
                                }catch(err){
                                    try{
                                        be.config.log.db.until = bestGlobals.datetime.iso(opts.until);
                                    }catch(err2){
                                        console.log('invalid log-until format. Setting '+LOG_MINUTES+' minutes');
                                    }
                                }
                            }else{
                                be.config.log.db.until = bestGlobals.datetime.now().add({ms:LOG_MINUTES*60*1000}); // LOG_MIN minutes
                            }
                            be.config.log.db.results=!!opts.results && !/^(0|false|f|no|n|нет|н)$/i.test(opts.results);
                        }
                        be.setLog({until:be.config.log.db.until});
                        var logWaiter=Promise.resolve(); // para mandar todo en orden
                        console.log('SQL: log all until',be.config.log.db.until.toYmdHms())
                        pg.log = function logAll(message, type){
                            if(bestGlobals.datetime.now()<=be.config.log.db.until){
                                logWaiter=logWaiter.then(function(){
                                    if(be.config.log.db.results || !(type=='ROW' || type=='RESULT' || type=='QUERY-A' || type=='QUERY-P')){
                                        fs.appendFile('./local-log-all.sql','-- '+(type||'')+'\n'+message+'\n');
                                    }
                                })
                            }else{
                                pg.logLastError(message, type);
                            }
                        }
                    }else{
                        pg.log = pg.logLastError;
                    }
                    pg.log.inFileName = 'last-pg-error-local.sql'
                    pg.logLastError.inFileName = 'last-pg-error-local.sql'
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
                        return doThisWithDbClient.call(be, client /*,req?*/).then(function(result){
                            client.done();
                            return result;
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
                            return Promise.resolve().then(function(){
                                return doThisWithDbTransaction.call(be, client /*,req?*/);
                            }).then(function(result){
                                return client.query("COMMIT").execute().then(function(){
                                    return result;
                                });
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
    }).then(async function(){
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
                if(!/keep-alive.json$/.test(req.originalUrl) || be.config.log.req['keep-alive']){
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
        var unloggedApp = await be.addProcedureServices(true);
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
                name: 'bp'+(packagejson.name+be.config.server["base-url"]||Math.random())+'-connect.sid',
                cookie:{
                    path: be.config.server["base-url"]||'/',
                }
            }});
            mainApp.loginPlusManager.init(mainApp,changing(be.config.login.plus,{
                schrödinger:function(){
                    mainApp.use(be.config.server["base-url"], unloggedApp);
                    be.addSchrödingerServices(mainApp, be.config.server["base-url"]);
                }
            }));
            be.shootDownCallbackList.push({
                message:'login-plus manager',
                fun:function(){
                    mainApp.loginPlusManager.closeManager();
                }
            });
            mainApp.loginPlusManager.setValidatorStrategy(
                function(req, username, password, done) {
                    var client;
                    if(be.config.login["double-dragon"]){
                        req.session.dbParams = changing(be.config.db, {user:username, password});
                    }
                    be.getDbClient(req).then(function(cli){
                        client = cli;
                        var infoFieldList=be.config.login.infoFieldList||(be.config.login.rolFieldName?[be.config.login.userFieldName,be.config.login.rolFieldName]:[be.config.login.userFieldName]);
                        return client.query(
                            "SELECT  "+be.db.quoteIdentList(infoFieldList)+
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
        if(be.config["client-setup"].menu===true){
            var menuDef=be.getMenu({rol:'admin', be});
            controlMenuDefinition(menuDef.menu);
        }
        mainApp.use(be.config.server["base-url"],be.app);
    }).then(function(){
        if(verboseStartup){
            console.log('listening on',be.config.server.port,be.config.server["base-url"]);
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

AppBackend.prototype.postConfig = function postConfig(){
    this.fieldDomain={};
};

AppBackend.prototype.getContext = function getContext(req){
    var be = this;
    return {
        be, user:req.user, session:req.session, 
        username:req.user && req.user[be.config.login.userFieldName], 
        machineId:req.machineId, 
        navigator:(req.userAgent||{}).shortDescription||'?'
    };
}


/** @param {boolean} forUnlogged */
AppBackend.prototype.addProcedureServices = function addProcedureServices(forUnlogged){ 
    var be = this;
    if(forUnlogged){
        var app = express();
    }else{
        var app = be.app;
    }
    return this.getProcedures().then(function(defs){
        defs.forEach(function(def){
            if(!def.isCompleted){
                be.procedureDefCompleter(def);
            }
        })
        /** @type { {[key:string]:bp.procedureDef} } */
        be.procedure = be.procedure||{};
        be.procedures = defs;
        be.clientSetup.procedure = be.procedure;
        app.get('/client-setup',function(req, res, next){
            if(forUnlogged && req.user){ 
                // este pedido es para unlogged y está logueado, va al próximo
                next();
            }else{
                var clientSetup = be.getClientSetupForSendToFrontEnd(req);
                MiniTools.serveJson(clientSetup)(req, res, next);
            }
        });
        if(!be.proceduresPrepared){
            be.proceduresPrepared=true;
            // esto es preparación, debe correrse una sola vez
            be.procedures.forEach(function(procedureDef){
                if(be.procedure[procedureDef.action]){
                    console.log('REDEFINED procedure',procedureDef.action);
                }
                be.procedure[procedureDef.action] = procedureDef;
            });
        }
        likeAr(be.procedure).forEach(function(procedureDef){
            if( (!forUnlogged) !== (!procedureDef.unlogged)){
                return;
            }
            procedureDef.parameters.forEach(function(paramDef){
                if(paramDef.enconding==='plain' && procedureDef.multipart){
                    throw new Error("plain enconding in parameters not allowed in multipart procedure"+procedureDef.action);
                }
            });
            if(!isLowerIdent(procedureDef.action)){
                console.error('**** DEPRECATED ***** procedureDef action '+JSON.stringify(procedureDef.action)+' must be a Lower Ident');
            }
            app[procedureDef.method]('/'+procedureDef.action, async function(req, res, next){
                var getDatetimeString = function getDatetimeString(){
                    return datetime.now().toPlainString()
                }
                var initDatetimeString = getDatetimeString();
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
                        var value = undecodedValue===undefined?undecodedValue:myOwn.encoders[paramDef.encoding].parse(undecodedValue);
                        if(undecodedValue===undefined){
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
                var processBitacora = async function(hasError, status){
                    var params = getParams();
                    var defInsertBitacoraElement = {
                        procedure_name : procedureDef.action,
                        parameters_definition: JSON.stringify(procedureDef.parameters),
                        parameters: JSON.stringify(params),
                        username: context.username,
                        machine_id: context.machineId,
                        navigator: context.navigator,
                        init_date: initDatetimeString,
                    };
                    var getFinalStatusBitacoraElement = function getFinalStatusBitacoraElement(){
                        return { 
                            end_date: getDatetimeString(), 
                            end_status: status, 
                            has_error: hasError
                        }
                    }
                    if(procedureDef.bitacora.always){
                        if(lastBitacoraInsertedId){
                            await be.inTransaction(req, async function(client){
                                var updateConditions = { id: lastBitacoraInsertedId };
                                await client.query(updateUpdateSQL(getFinalStatusBitacoraElement(), 'bitacora', updateConditions)).execute();
                            });
                        }else{
                            await be.inTransaction(req, async function(client){
                                var result = await client.query(generateInsertSQL(defInsertBitacoraElement)).fetchUniqueRow();
                                lastBitacoraInsertedId = result.row.id;
                            });
                        }
                    }else if(hasError && procedureDef.bitacora.error){
                        await be.inTransaction(req,async function(client){
                            var insertElement = changing(defInsertBitacoraElement, getFinalStatusBitacoraElement());
                            await client.query(generateInsertSQL(insertElement)).execute();
                        });
                    }
                    //tengo configurada otra tabla para guardar el resultado de la bitacora y tengo la pk de esa tabla
                    if(procedureDef.bitacora.targetTable && procedureDef.bitacora.targetTableUpdateFieldsCondition){
                        var targetTableUpdateFieldsCondition = procedureDef.bitacora.targetTableUpdateFieldsCondition || ['init_date','end_date','has_error', 'end_status'];
                        var updateElement = {};
                        var updateConditions = {};
                        var params = getParams();
                        if(status){
                            //terminó ejecucion
                            updateElement[procedureDef.bitacora.targetTableBitacoraFields.end_date] = getDatetimeString(); 
                            updateElement[procedureDef.bitacora.targetTableBitacoraFields.end_status] = status;
                            updateElement[procedureDef.bitacora.targetTableBitacoraFields.has_error] = hasError;
                        }else{
                            //empezó ejecucion
                            updateElement[procedureDef.bitacora.targetTableBitacoraFields.init_date] = initDatetimeString; 
                        }
                        await be.inTransaction(req,async function(client){
                            targetTableUpdateFieldsCondition.forEach(function(field){
                                updateConditions[field] = params[field];
                            });
                            await client.query(updateUpdateSQL(updateElement, procedureDef.bitacora.targetTable, updateConditions)).execute();
                        })
                    }
                }
                var processCoreFunction = function(){
                    return Promise.resolve().then(function(){
                        if(procedureDef.roles && procedureDef.roles.indexOf(req.user[be.config.login.rolFieldName])<0){
                            throw changing(new Error("Not allowed"), {status:"403"});
                        }
                        var files=[];
                        var params=getParams();
                        if(procedureDef.files){
                            if(procedureDef.cacheable){
                                console.error('DEPRECATE procedure cacheable with files');
                                procedureDef.cacheable=false;
                            }
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
                        if(procedureDef.progress!==false){
                            context.informProgress=function informProgress(progressInfo){
                                var progress2send={};
                                if(progressInfo instanceof Error){
                                    MiniTools.globalOpts.serveErr.propertiesWhiteList.forEach(function(attr){
                                        progress2send[attr] = progressInfo[attr];
                                    });
                                }else{
                                    progress2send=progressInfo;
                                }
                                // console.log('informProgress J',JSON.stringify(progress2send));
                                // console.log('informProgress J',json4all.stringify(progress2send));
                                // console.log('informProgress',progress2send);
                                res.write(JSON.stringify({progress:progress2send})+"\n");
                            };
                        }
                        context.cookies = req.cookies;
                        if(procedureDef.setCookies){
                            context.setCookie = function(name, value, opts){
                                res.cookie(name, value, opts)
                            }
                        }
                        res.append('Content-Type', 'application/octet-stream');
                        return Promise.resolve().then(function(){
                            var thisCache;
                            if(procedureDef.cacheable){
                                console.log('VERIFICANDO LA INFO CACHEADA ',procedureDef.action);
                                var jsonParams = JSON.stringify(params);
                                thisCache = be.caches.procedures[jsonParams];
                                if(!thisCache){
                                    thisCache = be.caches.procedures[jsonParams] = {timestamp:new Date().getTime()};
                                }
                                if(thisCache.result !== undefined){
                                    console.log('SIRVIENDO LA INFO CACHEADA ',procedureDef.action)
                                    return thisCache.result;
                                }
                            }
                            return be.inTransaction(req, function(client){
                                context.client=client;
                                return procedureDef.coreFunction(context, params, files);
                            }).then(function(result){
                                if(thisCache){
                                    thisCache.result = result;
                                    thisCache.timestamp = new Date().getTime();
                                }
                                return result;
                            });
                        }).then(function(result){
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
                                if(procedureDef.progress!==false){
                                    res.write('--\n');
                                }
                                res.end(result);
                            }
                        });
                    });
                }
                var lastBitacoraInsertedId = null;
                try{
                    await processBitacora(null,null);
                    await processCoreFunction();
                    await processBitacora(false, 'OK');
                }catch(err){
                    await processBitacora(true, err.message);
                    if(procedureDef.progress!==false){
                        var error = {};
                        MiniTools.globalOpts.serveErr.propertiesWhiteList.forEach(function(attrName){
                            if(attrName in err || err[attrName]){
                                error[attrName]=err[attrName];
                            }
                        });
                        res.write(JSON.stringify({error:error})+"\n");
                        res.end();
                    }else{
                        MiniTools.serveErr(req,res,next)(err);
                    }
                };
            });
        });
        return app;
    });
};

/** @param {bp.Context} context */
AppBackend.prototype.getMenu = function getMenu(context){
    return { menu:[] };
}

function controlMenuDefinition(menuContent){
    var somethingWrong='';
    menuContent.forEach(function(menu){
        if(!isLowerIdent(menu.name)){
            somethingWrong=JSON.stringify(menu.name);
            console.error('*** DEPRECATED *** The menu item name: '+JSON.stringify(menu.name)+' must be a Lower Ident');
        }
        if(menu.label && /\b[A-Z][a-z]+\b/.test(menu.label)){
            console.log('** DEPRECATED ** The menu item label: '+JSON.stringify(menu.label)+' must be a in lower case');
        }
    })
    if(somethingWrong){
        throw new Error('The menu item name: '+somethingWrong+' must be a Lower Ident');
    }
}

AppBackend.prototype.getClientSetupForSendToFrontEnd = function getClientSetupForSendToFrontEnd(req){
    var be=this;
    var clientSetup=changing(be.clientSetup, {username:req.user && req.user[be.config.login.userFieldName]});
    var context=be.getContext(req);
    clientSetup.useragent = req.useragent;
    if(be.config["client-setup"].menu===true){
        var menuDef=be.getMenu(context);
        controlMenuDefinition(menuDef.menu);
        clientSetup=changing(clientSetup, be.getVisibleMenu(menuDef, context));
    }
    clientSetup.procedures = likeAr(be.clientSetup.procedure).filter(function(procedureDef){
        return !procedureDef.roles || procedureDef.unlogged || req.user && procedureDef.roles.indexOf(req.user[be.config.login.rolFieldName])>=0;
    }).array();
    return clientSetup;
};

function require_resolve(moduleName){
    var resolved;
    try{
        resolved = require.resolve(moduleName);
    }catch(err){
        var packageJson = fs.readJsonSync(Path.join(process.cwd(),'node_modules',moduleName,'package.json'));
        resolved = Path.join(process.cwd(),'node_modules',moduleName,packageJson.main)
        if(!fs.existsSync(resolved)){
            throw err;
        }
    }
    return resolved;
}

function resolve_module_dir(moduleName,path){
    var baseDir;
    if(packagejson.name==moduleName){
        baseDir=Path.join(process.cwd(), packagejson.main);
    }else{
        baseDir=require_resolve(moduleName);
    }
    return Path.join(Path.dirname(baseDir),path||'');
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
            flash:req && req.flash()||{},
            username:req && req.user?req.user[be.config.login.userFieldName]:''
        },
    });
}

AppBackend.prototype.addUnloggedServices = function addUnloggedServices(mainApp, baseUrl){
    var be=this;
    be.clientIncludesCompleted(null).filter(x => x.module).forEach(function (moduleDef) {
        let baseLib = baseUrl + '/' + (moduleDef.path ? moduleDef.path : moduleDef.type == 'js'? 'lib': 'css');
        try {
            var allowedExts=(moduleDef.type=='js'?['js','map']:moduleDef.type);
            mainApp.use(baseLib, serveContent(resolve_module_dir(moduleDef.module, moduleDef.modPath), { allowedExts }));
            if(moduleDef.ts){
                if(typeof moduleDef.ts === "object"){
                    console.log('serve:',baseUrl+ '/' + moduleDef.ts.url, resolve_module_dir(moduleDef.module, moduleDef.ts.path));
                    mainApp.use(baseUrl+ '/' + moduleDef.ts.url, serveContent(resolve_module_dir(moduleDef.module, moduleDef.ts.path), { allowedExts: 'ts' }));
                }else{
                    mainApp.use(baseUrl+ '/' + moduleDef.ts, serveContent(resolve_module_dir(moduleDef.module, moduleDef.modPath).replace(Path.sep+'lib'+Path.sep,Path.sep+'src'+Path.sep), { allowedExts: 'ts' }));
                    mainApp.use(baseUrl+ '/lib/' + moduleDef.ts, serveContent(resolve_module_dir(moduleDef.module, moduleDef.modPath).replace(Path.sep+'client'+Path.sep,Path.sep+'src'+Path.sep+'client'), { allowedExts: 'ts' }));
                }
            }
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
    var dist=regexpDistCheck.test(packagejson.main)?'dist/':'';
    var unloggedPaths=[];
    unloggedPaths.push(Path.join(Path.resolve(be.rootPath),dist));
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
            // { type: 'js', module: 'xlsx', modPath: 'dist', file: 'xlsx.core.min.js' },
            // { type: 'js', module: 'xlsx', modPath: 'dist', file: 'xlsx.full.min.js' },
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
            { type: 'js', module: 'sql-tools' },
            // { type: 'js' , module: 'regexplicit'},
            { type: 'js', file: 'my-localdb.js', modPath:'src/for-client', ts:'src/for-client'},
            { type: 'js', file: 'my-websqldb.js', modPath:'src/for-client', ts:'src/for-client'},
            { type: 'js', file: 'my-ajax.js', path:'.', modPath:'unlogged/for-client' },
            { type: 'js', file: 'my-things.js' },
            { type: 'js', file: 'my-skin.js' },
            { type: 'js', file: 'my-tables.js' },
            { type: 'js', file: 'my-inform-net-status.js' },
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
            list.push({ type: 'js', file: 'my-menu.js' });
        }
        if(clientConfig.lang==='es'){
            list.push({ type: 'js', module: 'castellano' });
        }
    }
    return list;
}

AppBackend.prototype.clientIncludesCompleted = function clientIncludesCompleted(req, hideBEPlusInclusions) {
    let list = this.clientIncludes(req, hideBEPlusInclusions);
    var rPaths={paths:[process.cwd()]};
    return list.map(inclusion =>{
        var filename = inclusion.file? inclusion.file: (inclusion.module? Path.basename(require_resolve(inclusion.module,rPaths)): '');
        return changing({
            src: inclusion.type == 'js' ? ((inclusion.path ? inclusion.path : 'lib') + '/' + (inclusion.file ? inclusion.file : filename)) : '',
            href: inclusion.type == 'css' ? ((inclusion.path ? inclusion.path : 'css') + '/' + (inclusion.file ? inclusion.file : (inclusion.module + '.css'))) : ''
        }, inclusion);
    });
}

AppBackend.prototype.clientModules = function clientModules(req, hideBEPlusInclusions) {
    return { scripts: this.clientIncludesCompleted(req, hideBEPlusInclusions).filter(x => x.type == 'js').map(mod => {return { src: mod.src }})};
}

/**
 * @param {string} tableName 
 * @param {(tableDef:typesOpe.TableDefinition, context?:TableContext)=>void} appenderFunction
 */
AppBackend.prototype.appendToTableDefinition = function appendToTableDefinition(tableName, appenderFunction){
    var previousDefiniterFunction=this.getTableDefinition[tableName]
    if(previousDefiniterFunction==null){
        throw new Error(tableName+" does not exists in getTableDefinition")
    }
    this.getTableDefinition[tableName]=function(context){
        var defTable=previousDefiniterFunction(context);
        defTable.fields          =defTable.fields          ||[];
        defTable.foreignKeys     =defTable.foreignKeys     ||[];
        defTable.softForeignKeys =defTable.softForeignKeys ||[];
        defTable.detailTables    =defTable.detailTables    ||[];
        defTable.constraints     =defTable.constraints     ||[];
        defTable.sql             =defTable.sql             ||{};
        appenderFunction(defTable, context)
        return defTable;
    }
}


AppBackend.prototype.prepareGetTables = function prepareGetTables(){
}

AppBackend.prototype.getTables = function getTables(){
    var be=this;
    this.getTableDefinition=this.getTableDefinition||{};
    var tables=[];
    tables.push({path: __dirname + '/tables', name:'bitacora'});
    var gridBuffer = be.staticConfig['client-setup']['grid-buffer'];
    var offlineMode = gridBuffer && (gridBuffer === 'idbx' || gridBuffer === 'wsql');
    if(offlineMode){
        tables.push({path: __dirname + '/tables', name:'tokens'});
        tables.push({path: __dirname + '/tables', name:'locks'});
    }
    this.prepareGetTables();
    return tables.concat(
        likeAr(this.getTableDefinition).map(function(tableDef, tableName){
            if(!tableDef || typeof tableDef !=="function"){
                throw new Error("ERROR: tableDef of "+JSON.stringify(tableName)+" is not a function")
            }
            return {name:tableName, tableGenerator:function(context){
                return be.tableDefAdapt(tableDef(context), context);
            }};
        }).array()
    );
}

AppBackend.prototype.csss = function csss(hideBEPlusInclusions){
    return this.clientIncludesCompleted(null, hideBEPlusInclusions).filter(x => x.type == 'css').map(x => x.href);
};

AppBackend.prototype.mainPage = function mainPage(req, offlineMode){
    var be=this;
    var attr={lang: be.config["client-setup"].lang};
    var viewportAttrs=null;
    if(offlineMode && req && req.user){
        attr.manifest="ext/app.manifest";
    }
    var viewportContent=[];
    viewportContent.push('width=' + be.config["client-setup"]["deviceWidthForMobile"] || 'device-width');
    var clientSetup = be.config["client-setup"];
    if(clientSetup["initial-scale"]){
        viewportContent.push('initial-scale=' + clientSetup["initial-scale"])
    }
    if(clientSetup["minimum-scale"]){
        viewportContent.push('minimum-scale=' + clientSetup["minimum-scale"])
    }
    if(clientSetup["maximum-scale"]){
        viewportContent.push('maximum-scale=' + clientSetup["maximum-scale"])
    }
    if(clientSetup["user-scalable"]){
        viewportContent.push('user-scalable=' + clientSetup["user-scalable"])
    }
    viewportAttrs={name:"viewport", content:viewportContent.join(', ')};
    var cssList = be.csss();
    if(offlineMode){
        cssList.push('css/offline-mode.css');
    }
    return html.html(attr,[
        html.head([
            html.title(be.config["client-setup"].title),
            html.meta({charset:"utf-8"}),
            viewportAttrs?html.meta(viewportAttrs):null,
            html.link({href: "img/logo-128.png", rel: "shortcut icon", type: "image/png"}),
            html.link({href: "img/logo.png", rel: "icon", type: "image/png"}),
            html.link({href: "img/logo.png", rel: "apple-touch-icon"}),
            html.meta({name:"format-detection", content:"telephone=no"}),
            html.meta({name:"apple-mobile-web-app-status-bar-style", content:"black"}),
            html.meta({name:"apple-mobile-web-app-capable", content:"yes"}),
            html.meta({name:"mobile-web-app-capable", content:"yes"}),
            html.meta({name:"mobile-web-app-status-bar-style", content:"black"}),
            // html.meta({name:'viewport', content:'user-scalable=no, width=768'})
        ].concat(cssList.map(function(css){
            return html.link({href: css, rel: "stylesheet"});
        })).concat(cssList.map(function(css){
            var skin=be.config['client-setup'].skin;
            var skinUrl=(skin?skin+'/':'');
            return skin?html.link({href: skinUrl+css, rel: "stylesheet"}):null;
        }))),
        html.body({'app-version':packagejson.version},[
            html.div({id: "total-layout"}, [
                html.img({class:"main-loading", src: "img/main-loading.gif"}),
                html.div(be.messages.unlogged.loading),
                req.useragent.os=='iOS'&&req.useragent.version.split('.')[0]<9?html.div(`La versión del dispositivo ${req.useragent.version} no es compatible`):null
            ]),
            html.div({id: "total-scripts"}, be.clientModules(req).scripts.map(function(scriptDef){
                return html.script(scriptDef);
            }).concat([html.script({src:'client/menu.js'})]))
        ]),
    ]);
}

AppBackend.prototype.addSchrödingerServices = function addSchrödingerServices(mainApp,baseUrl){
    var be=this;
    mainApp.get(baseUrl,function(req, res){
        /*
        'url,originalUrl,path,query'.split(',').forEach(function(name){
            console.log('req.'+name,req[name]);
        });
        */
        if(!req.isAuthenticated || !req.isAuthenticated()){
            res.redirect(Path.posix.join(baseUrl,mainApp.loginPlusManager.opts.noLoggedUrlPath));
        }else{
            res.redirect(Path.posix.join(baseUrl,mainApp.loginPlusManager.opts.successRedirect));
        }
    });
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
            return MiniTools.serveText(be.mainPage(req, false).toHtmlDoc(),'html')(req,res,next);
        });
        var gridBuffer = be.config['client-setup']['grid-buffer'];
        var offlineMode = gridBuffer && (gridBuffer === 'idbx' || gridBuffer === 'wsql');
        if(offlineMode){
            be.app.get('/ext', function(req,res,next){
                return MiniTools.serveText(be.mainPage(req, true).toHtmlDoc(),'html')(req,res,next);
            });
        }
    }
    be.app.get('/clear-cache', function(req, res){
        if(be.isAdmin(req)){
            be.clearCaches();
            res.end('cache cleared')
        }else{
            res.end(403,'FORBIDEN')
        }
    })
    be.app.get('/lib/my-skin.js',MiniTools.serveText(`
        "use strict";
        myOwn.path.img='${imgUrl}';
        myOwn.appName='${packagejson.name}${be.config.server["base-url"]}';
        myOwn.clientVersion='${be.config["client-setup"].version}';
        window.addEventListener('load', function(){
            document.body.setAttribute('my-skin', '${skin}')
        });
    `, 'application/javascript'));
    be.app.use(slashSkin,serveContent(Path.join(be.config.server.skins[skin]['local-path'],skin),{allowedExts:be.exts.img.concat(['css'])}));
    be.app.use(slashSkin,serveContent(Path.join(be.rootPath,'skins',skin),{allowedExts:be.exts.img.concat(['css'])}));
    var dist=regexpDistCheck.test(packagejson.main)?'dist/':'';
    [Path.resolve(be.rootPath,dist+'client'), Path.join(__dirname,'../for-client')].forEach(function(path){
        be.app.use(function(req,res,next){
            return serveContent(path,be.optsGenericForFiles(req))(req,res,next);
        });
        be.app.use('/client', function(req,res,next){
            return serveContent(path,be.optsGenericForFiles(req))(req,res,next);
        });
        be.app.use('/lib', function(req,res,next){
            return serveContent(path,be.optsGenericForFiles(req))(req,res,next);
        });
    });
    [
        {client:'client'    , path:Path.resolve(be.rootPath,'src/client'     )},
        {client:'for-client', path:Path.resolve(__dirname,'../src/for-client')},
    ].forEach(function(info){
        var path=info.path;
        be.app.use('/src/'+info.client, function(req,res,next){
            return serveContent(path,changing(be.optsGenericForFiles(req),{allowedExts:['ts']}))(req,res,next);
        });
    });
    be.app.use('/img',serveContent(Path.join(__dirname,'../for-client/img'), optsGenericForImg));
    be.app.use('/img',serveContent(Path.join(Path.dirname(require_resolve('dialog-promise')),'../img'), optsGenericForImg));
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
    be.app.use('/keep-alive.json', function(req, res, next){
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
    be.app.get('/--version',function(req,res,next){
        var info=[
            html.h1(be.messages.server.versions),
            html.h3([packagejson.name,' ',packagejson.version]),
        ];
        Promise.resolve().then(function(){
            if(be.isAdmin(req)){
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
    if(be.config.log.db['on-demand']){
        be.app.get('/--log-db',function(req,res,next){
            var info=html.pre('not logging');
            Promise.resolve().then(function(){
                if(be.isAdmin(req)){
                    if(be.setLog){
                        be.setLog(req.query);
                        info=[
                            html.h1('log'),
                            html.pre('until: '+be.config.log.db.until.toYmdHms()),
                            html.pre('results: '+be.config.log.db.results)
                        ];
                    }
                }
            }).then(function(){
                MiniTools.serveText(html.body(info).toHtmlDoc({title:'loggin'}),'html')(req,res);
            }).catch(MiniTools.serveErr(req,res,next));
        });
    }
    be.app.use(function(req,res,next){
        // req != '/keep-alive.json'
        req.session.lastNonKeepAlive = new Date().getTime();
        next();
    });
    var logo=this.config.logo;
};

AppBackend.prototype.getContextForDump = function getContextForDump(){
    var be=this;
    var contextForDump={be:be, forDump:true, user:{}};
    if(be.config.login){
        contextForDump.user[be.config.login.userFieldName]='!dump';
        contextForDump.user[be.config.login.rolFieldName]='admin';
    }
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
        var targetTableUpdateFieldsCondition = procedureDef.bitacora.targetTableUpdateFieldsCondition || ['init_date','end_date','has_error', 'end_status'];
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
    procedureDef.isCompleted=true;
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
    if(procedureDef.bitacora.always || procedureDef.bitacora.error){
        procedureDef.bitacora=changing({
            targetTable:'bitacora',
            targetTableBitacoraFields: {end_date: 'end_date', end_status: 'end_status', has_error: 'has_error'}
        },procedureDef.bitacora);
        this.validateBitacora(procedureDef);
    }
    return procedureDef;
};

AppBackend.prototype.getProcedures = function getProcedures(){
    return Promise.resolve(require('./procedures-table.js'));
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
    if(!be.config.db.password){
        throw new Error('Lack of config.db.password in local-config');
    }
    lines.push("create user "+db.quoteIdent(be.config.db.user)+" password "+db.quoteLiteral(be.config.db.password)+";");
    lines.push("create database "+db.quoteIdent(be.config.db.database)+" owner "+owner+";");
    lines.push("grant connect, temporary on database "+db.quoteIdent(be.config.db.database)+" to "+db.quoteIdent(be.config.db.user)+";");
    lines.push("\\c "+db.quoteIdent(be.config.db.database));
    return fs.writeFile('local-db-dump-create-db.sql', lines.join('\n')+'\n');
};

AppBackend.prototype.dumpFkConstraint = function dumpFkConstraint(fk, tableDef, forced){
    var db=this.db;
    var sourceFieldList=fk.fields.map(function(pair){ return db.quoteIdent(pair.source); }).join(', ');
    var targetFieldList=fk.fields.map(function(pair){ return db.quoteIdent(pair.target); }).join(', ');
    var consName=db.quoteIdent(fk.consName?fk.consName:(tableDef.alias||tableDef.sql.tableName)+' '+(fk.alias||fk.references)+' REL');
    var clause =
        'constraint '+consName+' '+
        'foreign key ('+sourceFieldList+') '+
        'references '+db.quoteIdent(fk.references)+' ('+targetFieldList+') '+
        (forced?' on update no action on delete no action':(fk.onDelete?' on delete '+fk.onDelete:'')+' on update cascade'+(fk.initiallyDeferred?' initially deferred':''));
    return {consName, clause, sourceFieldList};
}

AppBackend.prototype.dumpDbSchemaPartial = function dumpDbSchemaPartial(partialTableStructures, opts = {}){
    var complete = opts.complete;
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
    var searchPathline=[];
    var lines=[];
    var dataText=[];
    var fkLines=[];
    var indexLines=[];
    var consLines=[];
    var enanceLines=[];
    var functionLines=[];
    var enancePart='';
    var user=be.config.db.user;
    var owner=be.config.install.dump.db.owner||be.config.db.user;
    if(!isLowerIdent(user)){
        throw new Error("user malformed name")
    }
    if(!isLowerIdent(owner)){
        throw new Error("owner malformed name")
    }
    var schema=db.quoteIdent(be.config.db.schema);
    linesCreate.push("set role to "+owner+";");
    linesCreate.push("drop schema if exists "+schema+' cascade;');
    linesCreate.push("create schema "+schema+';');
    linesCreate.push("grant usage on schema "+schema+' to '+user+';');
    if(be.config.install.dump["admin-can-create-tables"]){
        linesCreate.push("grant create on schema "+schema+' to '+user+';');
    }
    linesCreate.push('');

    searchPathline.push("set search_path = "+schema+';');
    searchPathline.push("set client_encoding = 'UTF8';");
    searchPathline.push('');
    /*eslint guard-for-in: 0*/
    /*eslint no-loop-func: 0*/
    /*jshint loopfunc:true */
    var contextForDump=be.getContextForDump();
    for(var tableName in partialTableStructures){
        try{
            var tableDef=partialTableStructures[tableName](contextForDump);
            if(!tableDef.adapted){
                tableDef=be.tableDefAdapt(tableDef);
            }
            var fieldsForSequences=[];
            if(tableDef.sql.isTable){
                lines.push('create table '+db.quoteIdent(tableDef.sql.tableName)+' (');
                var fields=[];
                tableDef.fields.forEach(function(fieldDef){
                    if(!fieldDef.clientSide && fieldDef.inTable!==false && !(tableDef.sql.fields[fieldDef.name]||{}).expr || fieldDef.inTable){
                        var fieldType=typeDb[fieldDef.typeName]||'"'+fieldDef.typeName+'"';
                        if(fieldDef.sizeByte==4){
                            fieldType = 'integer';
                        }
                        fields.push(
                            '  '+db.quoteIdent(fieldDef.name)+
                            ' '+(fieldDef.dataLength?(fieldType=='text'?'varchar':fieldType)+'('+fieldDef.dataLength+')':fieldType)+
                            (fieldDef.defaultValue!=null?' default '+db.quoteLiteral(fieldDef.defaultValue):'')+
                            (fieldDef.defaultDbValue!=null?' default '+fieldDef.defaultDbValue:'')
                        );
                        if(fieldDef.typeName==='text' && !fieldDef.allowEmptyText){
                            consLines.push(
                                'alter table '+db.quoteIdent(tableDef.sql.tableName)+
                                ' add constraint '+db.quoteIdent(fieldDef.name+"<>''")+
                                ' check ('+db.quoteIdent(fieldDef.name)+"<>'');"
                            );
                        }
                        if(fieldDef.options){
                            consLines.push(
                                'alter table '+db.quoteIdent(tableDef.sql.tableName)+
                                ' add constraint '+db.quoteIdent(fieldDef.name+" invalid option")+
                                ' check ('+db.quoteIdent(fieldDef.name)+
                                    ` in (${fieldDef.options.map(opt=>db.quoteLiteral(opt.option===undefined?opt:opt.option))}) );`
                            );
                        }
                        if(fieldDef.nullable===false){
                            consLines.push(
                                'alter table '+db.quoteIdent(tableDef.sql.tableName)+
                                ' alter column '+db.quoteIdent(fieldDef.name)+' set not null;'
                            );
                        }
                    }
                    if(fieldDef.sequence.name){
                        fieldsForSequences.push(fieldDef);
                    }
                });
                lines.push(fields.join(', \n'));
                if(tableDef.primaryKey){
                    lines.push(', primary key ('+tableDef.primaryKey.map(function(name){ return db.quoteIdent(name); }).join(', ')+')');
                    if(!opts.skipEnance && !tableDef.sql.skipEnance){
                        enanceLines.push(
                            'PERFORM enance_table('+db.quoteLiteral(tableDef.sql.tableName)+','+db.quoteLiteral(
                                tableDef.primaryKey.join(',')
                            )+');'
                        );
                    }
                }
                lines.push(');');
                //TODO: REFACTOR: Hacerlo mas sencillo
                // este codigo se encarga de convertir a rights de sql nuestros propios rights
                // por ej (import -> [insert, update]) 
                var allows = tableDef.allow;
                var appToSqlRights = {'import': ['insert', 'update'], 'export': ['select'], 'deleteAll': ['delete']};
                [ 'import', 'export', 'deleteAll'].filter(function(right){
                    return allows[right];
                }).forEach(function(right){
                    appToSqlRights[right].forEach(function(sqlRight){
                        allows[sqlRight] = true;
                    })
                });
                var sqlRights = ['select', 'insert', 'update', 'delete'].filter(function(right){
                    return allows[right];
                });
                if(tableDef.sql.isReferable){
                    sqlRights.push('references')
                }
                sqlRights=sqlRights.join(', ')
                if(sqlRights){
                    lines.push('grant '+sqlRights+' on '+db.quoteIdent(tableDef.sql.tableName)+' to '+user+';');
                }
                if (user != owner){
                    lines.push('grant all on '+db.quoteIdent(tableDef.sql.tableName)+' to '+owner+';');
                }
                tableDef.foreignKeys.map(function(fk){
                    var { clause:fullClause, sourceFieldList } = be.dumpFkConstraint(fk, tableDef);
                    var indexName=db.quoteIdent(sourceFieldList.replace(/[ "]/g,'')+' 4 '+tableDef.sql.tableName+' IDX');
                    if(indexName.length>63){
                        indexName=db.quoteIdent(fk.consName?fk.consName+' IDX':(tableDef.alias||tableDef.sql.tableName)+' '+fk.references+' IDX');
                    }
                    indexLines.push('create index '+indexName+' ON '+db.quoteIdent(tableDef.sql.tableName)+' ('+sourceFieldList+');');
                    fkLines.push('alter table '+db.quoteIdent(tableDef.sql.tableName)+
                        ' add '+fullClause+';'
                    );
                });
                if(tableDef.sql.constraintsDeferred){
                    var fkEnabling=tableDef.foreignKeys.filter(fk=>fk.forceDeferrable).map(function(fk){
                        var {consName, clause:clauseFalse} = be.dumpFkConstraint(fk, tableDef, false);
                        return `
                        if enable then
                            ALTER TABLE ${be.db.quoteIdent(tableDef.tableName)} ADD ${clauseFalse};
                        else
                            ALTER TABLE ${be.db.quoteIdent(tableDef.tableName)} DROP constraint ${consName};
                        end if;
                        `
                    });
                    if(fkEnabling.length){
                        functionLines.push(
                            `create or replace function ${be.db.quoteIdent(`${tableDef.tableName}_toggle_consts`)}(enable boolean) returns text
                            language plpgsql security definer as \n$BODY$\nbegin`+fkEnabling.join('')+' return $$ok$$;\nend;\n$BODY$;\n'
                        );
                    }
                }
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
                    lines.push("CREATE SEQUENCE "+db.quoteIdent(sequence.name)+" START "+db.quoteInteger(sequence.firstValue||1)+";");
                    lines.push(
                        "ALTER TABLE "+db.quoteIdent(tableName)+
                        " ALTER COLUMN "+db.quoteIdent(fieldDef.name)+
                        (sequence.prefix==null
                        ?" SET DEFAULT nextval("+db.quoteLiteral(sequence.name)+"::regclass);"
                        :" SET DEFAULT ("+db.quoteLiteral(sequence.prefix)+" || nextval("+db.quoteLiteral(sequence.name)+"::regclass)::text);"
                        )
                    );
                    lines.push('GRANT USAGE, SELECT ON SEQUENCE '+db.quoteIdent(sequence.name)+' TO '+user+';');
                });
                lines.push('');
            }
        }catch(err){
            err.context=(err.context||'')+'dumping structure of table '+tableName+' \n ';
            throw err;
        }
    }
    var enancePart= 'do $SQL_ENANCE$\n begin\n' + enanceLines.join('\n')+'\n' + 'end\n$SQL_ENANCE$;';
    var someNotFound=false;
    return Promise.all(Object.keys(partialTableStructures).map(function(tableName){
        // TODO: buscar
        return locatePath([Path.join('local-install',tableName+'.tab')].concat(
            be.appStack.map(function(stackNode){
                return Path.join(stackNode.path,'../install',tableName+'.tab').replace(regexpDistCheck,'$1');
            })
        )).then(function(theTableFileName){
            if(theTableFileName==undefined){
                var err = new Error('not found');
                err.code='ENOENT'
                throw err;
            }
            return fs.readFile(theTableFileName, {encoding:'UTF8'}).then(function(content){
                return {path:Path.relative(process.cwd(),theTableFileName),content};
            });
        }).then(function({path,content}){
            dataText.push("\n-- table data: "+path);
            var lines;
            var rows;
            var tableDef=partialTableStructures[tableName](contextForDump);
            var filterField=function(fieldName){
                var defField=tableDef.field[fieldName];
                if(!defField){
                    throw new Error('field '+fieldName+' does no exists in .tab for '+tableName+' in '+path);
                }
                return defField.inTable!==false && (!defField.clientSide || defField.serverSide);
            }
            var filterField2=function(_,fieldName){
                return filterField(fieldName);
            }
            if(/[-[]/.test(content[0])){
                lines = jsYaml.load(content);
                lines.forEach(function(line){
                    var dataString="insert into "+db.quoteIdent(tableName)+" ("+
                        likeAr(line).filter(filterField2).keys().map(db.quoteIdent).join(', ')+
                        ') values ('+
                        likeAr(line).filter(filterField2).map(function(value){
                            return db.quoteNullable(value);
                        }).join(', ')+");\n";
                    dataText.push(dataString);
                });
                rows=lines;
            }else{
                var lines=content.split(/\r?\n/)
                    .filter(line => !(/^[-| ]*$/.test(line)) )
                    .map(line => line.split('|').map(item => item.trimRight()) )
                    .filter(line => line.length>1 || line.length==1 && line[0].trim() );
                if(lines.length>1){
                    rows=lines.slice(1);
                    var dataString="insert into "+db.quoteIdent(tableName)+" ("+
                        lines[0].filter(filterField).map(db.quoteIdent).join(', ')+
                        ') values\n'+
                        rows.map(function(line){
                            return "("+line.filter(function(_,i){ return filterField(lines[0][i]);}).map(function(value){
                                return value===''?'null':db.quoteNullable(value);
                            }).join(', ')+")";
                        }).join(',\n')+';\n';
                    dataText.push(dataString);
                }
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
            .concat(be.config.install.dump.scripts['prepare'])
            .concat(be.config.install.dump.scripts['post-adapt'])
            .map(function(fileName){
                return fs.readFile(be.rootPath+'/install/'+fileName, {encoding:'UTF8'}).catch(function(err){
                    if(err.code!='ENOENT'){
                        throw err;
                    }
                    return '-- no '+fileName+'\n';
                }).then(function(content){
                    return '-- '+fileName+'\n'+content;
                });
            })
        );
    }).then(function(texts){
        var prepareList=(be.config.install.dump.scripts['prepare']||[]);
        var mainSql=(
            (complete? linesCreate.join('\n'): '')+
            (complete? searchPathline.join('\n'): '')+
            (complete? '\n\n--prepare.sql\n'+ texts[0]+'\n\n' :'' )+
            (complete? texts.slice(3,3+prepareList.length).join('\n\n')+'\n\n' : '' )+
            lines.join('\n')+
            (complete? ('\n\n-- pre-ADAPTs\n'+texts[1]+'\n\n') : '' )+
            (complete? ('\n\n-- DATA\n'+ dataText.join('\n')) : '' )+ 
            (complete? ('\n\n-- ADAPTs\n'+ texts[2]+'\n\n') : '' )+
            '\n-- conss\n' + consLines.join('\n')+
            '\n-- FKs\n' + fkLines.join('\n')+
            '\n-- index\n' + indexLines.join('\n')+
            '\n-- functions\n' + functionLines.join('\n')+
            (complete? texts.slice(3+prepareList.length).join('\n\n')+'\n\n' : '' )+
            (complete? (be.config.install.dump.enances==='inline'?enancePart:'') :'')
        ).replace(/\uFEFF/g /*inner BOM replacing*/,'\n\n').replace(
            new RegExp(escapeStringRegexp(db.quoteIdent(be.config.install.dump.db["owner4special-scripts"])),'g'),
            db.quoteIdent(be.config.install.dump.db.owner)
        ).replace(
            new RegExp(escapeStringRegexp(db.quoteIdent(be.config.install.dump.db["user4special-scripts"])),'g'),
            db.quoteIdent(be.config.db.user)
        );
        if(be.config.install.dump.db["apply-generic-user-replaces"]){
            mainSql=mainSql.replace(/((\bto\s|=)\s*"?)\w+(_user\b)/ig, "$1"+user);
            mainSql=mainSql.replace(/((\bto\s|=)\s*"?)\w+(_owner\b)/ig, "$1"+owner);
        }
        return {mainSql,enancePart};
    });
}

AppBackend.prototype.dumpDbSchema = async function dumpDbSchema(){
    var be = this;
    var {mainSql,enancePart} = await be.dumpDbSchemaPartial(be.tableStructures, {complete:true})
    mainSql=be.config.install.dump.db.extensions.map(function(extension){
        return {
            gist: "create extension if not exists btree_gist;"
        }[extension];
    }).join('\n')+mainSql;
    await fs.writeFile('local-db-dump.sql', mainSql);
    if(be.config.install.dump.enances==='file'){
        await fs.writeFile('local-db-dump-enances.sql', enancePart);
    }
};

AppBackend.prototype.queryValuesOfUniqueRow = function queryValuesOfUniqueRow(context, defTable, pkValues){
    var be=this;
    return context.client.query(
        "SELECT "+defTable.sql.select.join(', ')+
        " FROM "+defTable.sql.from.replace(/\/\*\{insertIfNotUpdate:[^}]*\}\*\//gm,' true ')+
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
    if(!this.fieldDomain){
        this.fieldDomain={};
    }
    return Promise.all([
        this.dumpDbCreateDatabase(),
        this.dumpDbSchema()
    ]);
};

backendPlus.AppBackend = AppBackend;
backendPlus.require_resolve = require_resolve;

module.exports = backendPlus;