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
var packagejson = require(process.cwd()+'/package.json');
var stackTrace = require('stack-trace');
var locatePath = require('@upgraded/locate-path');
var jsYaml = require('js-yaml');
var nodemailer = require('nodemailer');
var os = require('os');

var likeAr = require('like-ar');

var regexpDistCheck=/(^|[/\\])dist[/\\]/
var regexpDistReplacer=/(^|[/\\])dist[/\\](?:[^/\\]+[/\\])*([^/\\]*inst[^/\\]*[/\\][^/\\]*$)/

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
var fsP = require('fs/promises');

var bestGlobals = require('best-globals');
var coalesce = bestGlobals.coalesce;
var changing = bestGlobals.changing;
var datetime = bestGlobals.datetime;
var splitRawRowIntoRow = bestGlobals.splitRawRowIntoRow;
const escapeRegExp = bestGlobals.escapeRegExp;
var isLowerIdent = bestGlobals.isLowerIdent;

var myOwn = require('../for-client/my-things.js');

var typeStore = require('type-store');
var json4all = require('json4all');
var XLSX = require('xlsx');

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

var dist=regexpDistCheck.test(packagejson.main)?'dist/':'';

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
        this.shutdownCallbackList=[];
        this.sessionStores={
            file: SessionFileStore,
            memory: memorystore,
            memoryDevel: BindMemoryPerodicallySaved(this),
            "memory-saved": BindMemoryPerodicallySaved(this),
        }
        if(!this.rootPath){
            console.log('ATENCIÓN hay que poner be.rootPath antes de llamar a super()');
            this.rootPath=Path.resolve(__dirname,'..');
        }
        console.log('rootPath',this.rootPath);
        var trace = stackTrace.get();
        trace.forEach(function(callSite){
            var path = callSite.getFileName();
            if(path && !path.startsWith('internal/') && !path.startsWith('node:internal/')){
                path = Path.dirname(path);
                if(path!='.' && path != be.appStack[0]?.path){
                    be.appStack.unshift({path});
                }
            }
        });
        this.defaultMethod='post';
        this.app = express();
        this.clearCaches();
        this.tableStructures = {};
        this.configStaticConfig();
        /** @type {null|()=>Promise<void>} */
        this.shutdownBackend = null;
        /** @type {bp.Server} */
        // @ts-ignore
        this.server = null;
    }
    esJavascript(type){
        return ['js','mjs'].includes(type)
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
          unloggedLandPage: /not-logged-in
          plus:
            successRedirect: /menu
            successReturns: true
            store: {}
            loginForm:
              autoLogin: true
            chPassUrlPath: /chpass
          activeClausule: true
          lockedClausule: false
        keepAlive: 1800
        data:
          transformers:
            text: keepAll
        db:
          motor: postgresql
          min-version: 12
          fkOnUpdate: cascade
          max: 50
        log: 
          db:
            until: 2001-01-01 00:00
            last-error: false
            on-demand: false
        server:
          base-url: ''
          bitacoraSchema: his
          bitacoraTableName: bitacora
          skins:
            "":
              local-path: for-client
          bin: {}
        client-setup: 
          skin: ""
          lang: en
          version: 1.0
          inherit-fields-mode: display-fk
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
            button: "Sign In",
            forget: "Forgot your password?",
            userOrPassFail: "username or password error",
            lockedFail: "user account is locked",
            inactiveFail: "user account is marked as inactive",
            internalError: "internal error",
            passTooShort: "pass too short (minimum length $1)",
            passDoesntMatch: "pass doesn't match"
        },
        newPassword:{
            button: "Reset password",
            email: "Email",
            invalidMail: "invalid email",
            mailSubject: "Password Reset Request",
            mailHtml: `You told us you forgot your password. If you really did, click here to choose a new one:

            <a href=""></a>

            If you didn’t mean to reset your password, then you can just ignore this email; your password will not change.`,
            mayBeMailSent: "Mail sent if found.",
            return: "I know my password. Go to login.",
            title: "Forgot password form",
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
        backupNotAvailable: 'Backup not available',
        backupReady: 'Backup ready to download',
        backupZipping: 'Zipping backup file',
        badBackupEncryptKey: 'encrypt key not present or less than 10 characters',
        cantDelete_TLDR:'Can\'t delete. May be rights problems, locked records or internal problems',
        cantInsert_TLDR:'Can\'t insert. May be rights problems, locked records or internal problems',
        cantUpdate_TLDR:'Can\'t update. May be rights problems, locked records or internal problems',
        checkingConstraints:'checking constraints',
        cellOfA1DoesNotExists:'cell of A1 does not exists',
        columnDoesNotExistInTable:'column $1 does not exist in table',
        dbMinVersionFail:'database min version $2 fail. Actual version $1',
        deleted:'deleted',
        deleting:'deleting',
        dependences:'dependences',
        ErrorCheckDatabaseStructure:'ERROR checkDatabaseStructure fail in startup',
        fileReaded:'file readed',
        files:'files',
        importColumnDoesNotHasColumnName:'column $1 does not has a string value',
        insertingRows:'inserting rows',
        lackOfBackendPlusInImport:'lack of #backend-plus signal in A1 or imports.allow-plain-xls in local-config',
        line:'line',
        missingPrimaryKeyValues:'missing primary key values',
        noMailerConfig:'not mailer configurated',
        notInputCuidado:'The uploaded file is not a "#cuidado" file',
        notLoggedIn:'not logged in',
        oldPassDontMatch:'old password does not matchs or username is not longer valid or token is invalid',
        passChangedSuccesfully: 'password was changed successfully',
        passDontMatch:'passwords does not matchs or password is not long enough',
        prefilledField1IsInConflictWithImportedField:'Prefilled field "$1" is in conclict with imported field',
        primarKeyCantBeNull4:'error at line $1. Primary key field "$2" can not be #NULL',
        spreadsheetProcessed:'spread sheet processed',
        unkownHashValue4Import:'unknown # code in value import',
        updateWithoutModfiedColumns:'update without modified columns',
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
            button: "Entrar",
            forget: "me olvidé la clave",
            userOrPassFail: "usuario o clave incorrecta",
            lockedFail: "usuario bloqueado",
            inactiveFail: "el usuario está marcado como inactivo",
            internalError: "error interno en login",
            passTooShort: "la clave es demasiado corta (el mínimo es $1)",
            passDoesntMatch: "las claves no coinciden"
        },
        newPassword:{
            button: "Obtener una nueva contraseña",
            email: "e-mail",
            invalidMail: "la dirección de mail es incorrecta",
            mailSubject: "Pedido de cambio de contraseña",
            mailHtml: `Recibimos un pedido de cambio de contraseña. Si el pedido es correcto utilice el siguiente enlace:

            <a href=""></a>
            
            Si el pedido no lo hizo usted desestime el mail. Su contraseña seguirá siendo la misma.`,
            mayBeMailSent: "Se procede a buscar el usuario correspondiente al email. Si se encuentra se envia al mismo un correo que permite cambiar la contraseña. Si envió más de un formulario solo el último es válido.",
            return: "Recuerdo mi contraseña. Ir a la pantalla de ingreso.",
            title: "Formulario de recuperación de contraseña",
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
        backupNotAvailable: 'Backup no disponible',
        backupReady: 'Archivo listo para bajar',
        backupZipping: 'Compactando el backup',
        badBackupEncryptKey: 'Debe proveer una clave de encriptacion de 10 caracteres o mas para encriptar el archivo de destino',
        cantDelete_TLDR:'no se pudo eliminar el registro. Podrían haber problemas de persmisos, bloqueo de registros o problemas internos en la definición de la PK',
        cantInsert_TLDR:'no se pudo insertar el registro. Podrían haber problemas de persmisos, bloqueo de registros o problemas internos en la definición de la PK',
        cantUpdate_TLDR:'no se pudo modificar el registro. Podrían haber problemas de persmisos, bloqueo de registros o problemas internos en la definición de la PK',
        checkingConstraints:'verificando las restricciones',
        cellOfA1DoesNotExists:'no hay valor en la celda A1',
        columnDoesNotExistInTable:'la columna $1 no existe en la tabla',
        dbMinVersionFail:'La versión actual de la base de datos es $1, pero debe ser como mínimo $2',
        deleted:'borrado',
        deleting:'borrando',
        dependences:'dependencias',
        ErrorCheckDatabaseStructure:'ERROR en checkDatabaseStructure. Falló al controlar la estructura de la base de datos',
        fileReaded:'archivo leído',
        files:'archivos',
        importColumnDoesNotHasStringValue:'la columna $1 no valor de texto',
        insertingRows:'insertando registros',
        lackOfBackendPlusInImport:'falta la señal #backend-plus en la celda A1 o la opción imports.allow-plain-xls en local-config',
        line:'linea',
        missingPrimaryKeyValues:'faltan valores en los campos de la clave principal',
        noMailerConfig:'falta la configuración del mailer',
        notInputCuidado:'El archivo no es un archivo "#cuidado"',
        notLoggedIn:'sin inicio de sesión',
        oldPassDontMatch:'la clave anterior no coincide o el usuario es inválido o el token está vencido',
        passChangedSuccesfully: 'password was changed successfully',
        passDontMatch:'las claves no coinciden o son muy cortas',
        prefilledField1IsInConflictWithImportedField:'El valor del campo "$1" está en conflicto con el esperado',
        primarKeyCantBeNull4:'error en la línea $1. El campo "$2" de la clave principal no puede ser #NULL',
        spreadsheetProcessed:'hoja de datos procesada',
        unkownHashValue4Import:'código # desconocido en la importación de un valor',
        updateWithoutModfiedColumns:'se detectó una orden de modificación sin columnas a modificar',
        updatingDb:'actualizando la base de datos',
        versions:'versiones',
    }
};

function BindMemoryPerodicallySaved(be){
    return (
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
                        var sessionInfo = json4all.parse(content);
                        store.store.load(sessionInfo);
                        console.log('session reabsorved with ',sessionInfo.length, 'sessions')
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
                var interval = setInterval(function(){
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
                be.shutdownCallbackListAdd({
                    message:'session saver',
                    fun:()=>clearInterval(interval)
                })
            });
        }
    }
    return MemoryDevelConstructor;
})}

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
    var list=[
        {
            package:{
                version: packagejson.version
            }
        },
        this.staticConfig];
    if(!this.staticConfig["client-setup"]?.title && fs.existsSync(this.rootPath+'/def-config.yaml')){
        console.log('DEPRECATED!!!!!!')
        console.error('ERROR el def-config hay que ponerlo dentro de staticConfig');
        console.log('DEPRECATED!!!!!!')
        console.error('DEPRECATED!!!!!!')
        console.log('DEPRECATED!!!!!!')
        console.error('DEPRECATED!!!!!!')
        list.push(this.rootPath+'/def-config.yaml')
    };
    list.push(this.rootPath+'/local-config');
    list.push(process.env.BACKEND_PLUS_LOCAL_CONFIG?.trim()||{});
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
    return reqOrContext && (reqOrContext.forDump || reqOrContext.user && reqOrContext.user[be.config.login.rolFieldName] == 'admin');
}

AppBackend.prototype.can = function can(reqOrContext, what){
    var be = this;
    if (be.isAdmin(reqOrContext)) return true;
    return reqOrContext?.user?.['can' + what];
}

AppBackend.prototype.canChangePass = async function canChangePass(reqOrContext, _userToChangePass){
    var be = this;
    return be.isAdmin(reqOrContext);
}

AppBackend.prototype.shutdownCallbackListAdd = function(messageFun){
    this.shutdownCallbackList.push(messageFun);
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

var fontExts = [ 'jfproj', 'ttf', 'pfa', 'woff', 'woff2', 'fnt', 'fot', 'otf', 'odttf', 'fon']
var imgExts =  ['jpg', 'png', 'jpeg', 'ico', 'gif', 'svg']

AppBackend.prototype.exts = {
    img: imgExts,
    normal: ['', 'js', 'map', 'html', 'css', ...imgExts, 'appcache', 'manifest', 'json', 'webmanifest', 'zip', 'pdf', ...fontExts, 'xlsx', 'csv', 'mjs']
};

/**
 * @param {null|{testing?:boolean}} opts
 */
AppBackend.prototype.start = function start(opts){
    var be = this;
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
                tableItem = changing({source: (tableItem.path||be.rootPath+'/'+dist+'server')+'/table-'+tableItem.fileName+'.js'}, tableItem);
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
    opts=opts||{};
    var iPosDbDump=Array.prototype.indexOf.call(process.argv,'--dump-db')+1;
    if(iPosDbDump>0){
        pg.logExceptions = true;
        var dumps=[];
        while(iPosDbDump && iPosDbDump<process.argv.length && !process.argv[iPosDbDump].startsWith('--')){
            dumps.push(process.argv[iPosDbDump]);
            iPosDbDump++;
        } 
        opts["dump-db"]={
            complete:!dumps.length,
            tableNames:dumps instanceof Array?dumps:null,
            forDump:true
        };
    }
    var iPosConfig=Array.prototype.indexOf.call(process.argv,'--config')+1;
    if(iPosConfig && process.argv[iPosConfig] && !process.argv[iPosConfig].startsWith('--')){
        opts.config=process.argv[iPosConfig]
    }
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
            process.exit(1);
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
    this.shutdownBackend = async function shutdownBackend(){
        console.log('shooting down:');
        var waitFor = [
            new Promise(function(resolve,reject){
                console.log('*','express server');
                be.server.close(/** @param {Error} err */function(err){
                    if(err){
                        console.log('*', err)
                        reject(err);
                    }else{
                        console.log('*','express server done!')
                        resolve();
                    }
                });
            }),
            ...(be.shutdownCallbackList.map(x => (async function(){
                console.log('shut:', x.message)
                await x.fun()
                console.log('done:', x.message)
            })()))
        ];
        console.log('*', 'waiting for all')
        await Promise.all(waitFor);
        console.log('*', 'all done')
        mainApp = null;
        console.log('* logWhy',logWhy)
        logWhy && logWhy();
    };
    return Promise.resolve().then(function(){
        var configList=be.configList();
        if(opts.config){
            configList.push(opts.config)
        }
        return MiniTools.readConfig(configList,opts.readConfig).catch(function(err){
            console.log("be: error reading or merging config");
            throw err;
        });
    }).then(function(config){
        be.config = config;
        be.clientSetup = {config: be.config["client-setup"]};
        be.clientSetup.config.prefix = be.clientSetup.config.prefix || be.config.server["base-url"].substr(1)+':';
        if(config.nodb){
            console.log("server without database");
        }else{
            if(be.config.login["double-dragon"]){
                be.DoubleDragon = {dbParams:{}}
            }
            return Promise.resolve().then(function(){
                if(config.db.which){
                    if(!config.db[config.db.which]){
                        throw new Error('lack of '+config.db.which+' in config.db');
                    }else{
                        config.db = {...config.db, ...config.db[config.db.which]};
                    }
                }
                var sessionStoreName=be.config.server["session-store"];
                if(sessionStoreName){
                    if(config.devel && be.sessionStores[sessionStoreName+'Devel']){
                        sessionStoreName+='Devel';
                    }
                    var storeModule = be.sessionStores[sessionStoreName];
                    be.config.login.plus.store.module = storeModule;
                }
                be.config.install.dump.db.owner=coalesce(be.config.db.owner,be.config.install.dump.db.owner,be.config.db.user);
                be.config.install.dump.db["owner4special-scripts"]=coalesce(be.config.install.dump.db["owner4special-scripts"],be.config.install.dump.db.owner)
                be.config.install.dump.db["user4special-scripts"]=coalesce(be.config.install.dump.db["user4special-scripts"],be.config.db.user)
                verboseStartup=!be.config.server["silent-startup"];
                serveContent.logAll = be.config.log["serve-content"];
                MiniTools.logServe =  be.config.log["serve-content"];
                if(be.clientSetup.config.lang in be.i18n.messages){
                    be.messages = {...be.i18n.messages.en, ...be.i18n.messages[be.clientSetup.config.lang]};
                    typeStore.locale = typeStore.i18n.locale[be.clientSetup.config.lang];
                    typeStore.messages = typeStore.i18n.messages[be.clientSetup.config.lang];
                    pg.setLang(be.clientSetup.config.lang);
                }
            }).then(function(){
                if(be.config.db.motor!='postgresql'){
                    throw new Error("backend-plus: Motor not recongnized: "+be.config.db.motor);
                }
                be.db = pg;
                be.dbUserNameExpr="get_app_user()";
                be.dbUserRolExpr=`(select ${be.db.quoteIdent(be.config.login.rolFieldName)} 
                    from ${be.config.login.schema?be.db.quoteIdent(be.config.login.schema)+'.':''}${be.db.quoteIdent(be.config.login.table)} 
                    where ${be.db.quoteIdent(be.config.login.userFieldName)} = ${be.dbUserNameExpr})`
            }).then(function(){
                if(opts["dump-db"]){
                    return be.dumpDb(opts["dump-db"]).then(function(){
                        var err = new Error('DB DUMP OK');
                        err.dumping='ok';
                        throw err;
                    },function(err){
                        err.dumping='bad';
                        throw err;
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
                be.config.db.search_path = be.config.db.search_path ?? [be.config.db.schema, 'public'];
                be.getDbClient = function getDbClient(req){
                    var paramsDb = be.DoubleDragon?.dbParams?.[req?.user?.[be.config.login.userFieldName]] ?? be.config.db;
                    return pg.connect(paramsDb).then(function(client){
                        var dbAppName=req?(
                            ((req.user||{})[be.config.login.userFieldName]||'!logged')+
                            ' '+(req.machineId||'?')+
                            ' '+(((req.useragent)||{}).shortDescription||'?')
                        ):'!app local internal';
                        return client.query(
                            "SET application_name = "+be.db.quoteLiteral(dbAppName)
                        ).execute().then(function(){
                            var search_path = be.config.db.search_path;
                            if(search_path.length>0){
                                return client.query("set SEARCH_PATH TO "+be.db.quoteIdentList(search_path)).execute().then(function(){
                                    return client;
                                });
                            }else{
                                return client;
                            }
                        }).then(function(client){
                            if(be.config["client-setup"].lang=='es'){
                                return client.query("set datestyle TO iso,dmy").execute().then(function(){
                                    return client;
                                });
                            }else{
                                return client;
                            }
                        });
                    });
                };
                be.inDbClient = async function inDbClient(req, doThisWithDbClient){
                    var be=this;
                    try{
                        var client = await be.getDbClient(req);
                        var result = await doThisWithDbClient.call(be, client /*,req?*/);
                        client.done();
                        return result;
                    }catch(err){
                        if(client && typeof client.done === "function"){
                            client.done();
                        }
                        throw err;
                    }
                };
                be.inTransaction = async function inTransaction(req, doThisWithDbTransaction){
                    var be = this;
                    return be.inDbClient(req, async function(client){
                        try{
                            await client.query("BEGIN TRANSACTION").execute();
                            var result = await doThisWithDbTransaction.call(be, client /*,req?*/);
                            await client.query("COMMIT").execute();
                            return result;
                        }catch(err){
                            try{
                                await client.query("ROLLBACK").execute();
                            }catch(err2){
                                console.log("Error in database when rollback",err," Error trying to rollback ",err2);
                            }
                            throw err;
                        }
                    });
                };
                return be.inDbClient(null, async function(client){
                    if(verboseStartup){
                        console.log(
                            'db-connected',
                            be.jsonPass(be.config.db)
                        );
                    }
                    try{
                        await be.checkDatabaseStructure(client);
                    }catch(err){
                        console.log('*******************************************')
                        console.error(be.messages.server.ErrorCheckDatabaseStructure)
                        console.log(err);
                        throw err;
                    }
                    var data = await client.query("SELECT current_timestamp as cts").fetchUniqueRow();
                    if(verboseStartup){
                        console.log('NOW in Database',data.row.cts);
                    }
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
                        return MiniTools.serveJade(loginFile,be.optsGenericForFiles(req,{withFlash:true}).jade)(req,res,next);
                    };
                    be.config.login.plus.newPassPageServe=function(req,res,next){
                        return MiniTools.serveJade(loginFile.replace(/\blogin\b/,'new-password'),be.optsGenericForFiles(req,{withFlash:true}).jade)(req,res,next);
                    };
                    be.config.login.plus.newPassPageServe2=function(req,res,next){
                        return MiniTools.serveJade(loginFile.replace(/\blogin\b/,'new-password-result'),be.optsGenericForFiles(req,{withFlash:true}).jade)(req,res,next);
                    };
                    be.config.login.plus.newPassPageEnter=function(username, token){
                        return function(req,res,next){
                            return MiniTools.serveJade(loginFile.replace(/\blogin\b/,'new-pass-enter'),{...be.optsGenericForFiles(req,{withFlash:true}).jade, username, token})(req,res,next);
                        }
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
        if(be.config.server["base-url"] && be.config.server["base-url"]!='/'){
            mainApp.get('/favicon.ico', function(req,res,next){
                MiniTools.serveFile(__dirname+'/../for-client/img/warning128.png')(req,res,next)
            })
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
                name: 'bp'+(packagejson.name+be.config.server["base-url"]||Math.random()).replace('/','#')+'-connect.sid',
                cookie:{
                    path: be.config.server["base-url"]||'/',
                }
            }});
            var loginPlusOpts={
                schrödinger:function(){
                    mainApp.use(be.config.server["base-url"], unloggedApp);
                    be.addSchrödingerServices(mainApp, be.config.server["base-url"]);
                },
                messages: be.messages.unlogged.login
            }
            if(be.config.login.unloggedLandPage){
                loginPlusOpts.noLoggedUrlPath=be.config.login.unloggedLandPage;
            }
            mainApp.loginPlusManager.init(mainApp,changing(be.config.login.plus,loginPlusOpts));
            be.shutdownCallbackListAdd({
                message:'login-plus manager',
                fun:function(){
                    mainApp.loginPlusManager.closeManager();
                }
            });
            be.shutdownCallbackListAdd({
                message:'pg',
                fun:function(){
                    pg.shutdown();
                }
            });
            mainApp.loginPlusManager.setValidatorStrategy(
                function(req, username, password, done) {
                    var client;
                    if(!be.config.login["preserve-case"]){
                        username = username.toLowerCase().trim();
                    }
                    be.getDbClient(req).then(function(cli){
                        client = cli;
                        var infoFieldList=be.config.login.infoFieldList||(be.config.login.rolFieldName?[be.config.login.userFieldName,be.config.login.rolFieldName]:[be.config.login.userFieldName]);
                        return client.query(
                            "SELECT  "+infoFieldList.map(function(fieldOrPair){ return fieldOrPair.split(' as ').map(function(ident){ return be.db.quoteIdent(ident)}).join(' as '); })+
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
                                done(null,false,{message:be.messages.unlogged.login.inactiveFail});
                            }else if(data.row.locked){
                                done(null,false,{message:be.messages.unlogged.login.lockedFail});
                            }else{
                                if(req.query["return-to"]){
                                    req.session.loginReturnTo = req.query["return-to"];
                                }
                                if(be.config.login["double-dragon"]){
                                    be.DoubleDragon.dbParams[username] = changing(be.config.db, {user:username, password});
                                }
                                return data.row;
                            }
                        }else{
                            done(null,false,{message:be.messages.unlogged.login.userOrPassFail});
                        }
                    }).then(async function(userInfo){
                        if (!userInfo) return;
                        if (!be.config.login.skipBitacora) {
                            var context = be.getContext(req);
                            var sessionInfo = await client.query(be.generateInsertSQL(be.config.server.bitacoraSchema, be.config.server.bitacoraTableName,{
                                procedure_name: '@login',
                                username,
                                machine_id: context.machineId,
                                navigator: context.navigator,
                                init_date: bestGlobals.datetime.now(),
                                parameters: {}
                            })).fetchUniqueValue();
                            userInfo.bitacoraId = sessionInfo.value;
                        }
                        done(null, userInfo);
                    }).then(function(){
                        client.done();
                    }).catch(function(err){
                        if(be.config.login["double-dragon"]){
                            done(null,false,{message:be.messages.unlogged.login.userOrPassFail});
                        }
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
            be.changePassword=async function(client,username,oldPassword,newPassword){
                var sql = "UPDATE "+(be.config.login.schema?be.db.quoteIdent(be.config.login.schema)+'.':'')+
                    be.db.quoteIdent(be.config.login.table)+
                    "\n  SET "+be.db.quoteIdent(be.config.login.passFieldName)+" = $2 "+
                    "\n  WHERE "+be.db.quoteIdent(be.config.login.userFieldName)+" = $1 "+
                    (oldPassword!==false?"\n    AND "+be.db.quoteIdent(be.config.login.passFieldName)+" = $3 ":"")+
                    "\n  RETURNING 1 as ok";
                var params = [username, md5(newPassword+username.toLowerCase())]
                if(oldPassword!==false){
                    params.push(md5(oldPassword+username.toLowerCase()))
                }
                var result = await client.query(sql, params).fetchOneRowIfExists();
                var ok = result.rowCount == 1;
                if(ok && be.config.login['double-dragon']){
                    sql = "ALTER USER " +be.db.quoteIdent(username) + " WITH PASSWORD " + be.db.quoteLiteral(newPassword);
                    await client.query(sql,[]).execute();
                }
                return ok;
            }
            be.passwordChanger=function(req, username, oldPassword, newPassword, done) {
                if(be.config.login.disableChangePassword){
                    done(null,false,'el cambio de contraseña está deshabilitado');
                }else{
                    var client;
                    be.inTransaction(req,function(cli){
                        client = cli;
                        return be.changePassword(client,username,oldPassword,newPassword)
                    }).then(function(ok){
                        done(null,ok,ok?null:be.messages.server.oldPassDontMatch);
                    }).catch(function(err){
                        //if(client && client.done){
                        //    client.done();
                        //}
                        console.log('error changing pass',err);
                        console.log('stack',err.stack);
                        throw err;
                    }).catch(done);
                }
            }
            mainApp.loginPlusManager.setPasswordChanger(be.passwordChanger);
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
            var contextForDump = be.getContextForDump();
            // var menuDef=be.getMenu({rol:'admin', be});
            var menuDef=be.getMenu(contextForDump);
            controlMenuDefinition(menuDef.menu);
        }
        mainApp.use(be.config.server["base-url"],be.app);
    }).then(function(){
        if(verboseStartup){
            console.log('listening on','http://localhost:'+be.config.server.port+be.config.server["base-url"]);
            console.log('datetime:',new Date().toISOString());
        }
        if(be.config.server.port == null){
            console.log('backend-plus: Lack of mandatory server.port in config');
            throw new Error('backend-plus: Lack of mandatory server.port in config');
        }
        be.timeReadyBackendPlus = new Date();
        if(verboseStartup){
            console.log('READY',numeral((be.timeReadyBackendPlus-timeStartBackendPlus)/1000).format("0.0"),'s elapsed');
        }
        if (Array.prototype.indexOf.call(process.argv,'--dump-includes')+1) {
            console.log("Resolved modules from: " + process.cwd())
            likeAr(resolved_modules_log).forEach((c,l)=>console.log(`   ${c} ${l}`));
        }
        return be.sendMail({
            to: be.config.mailer?.supervise?.to,
            subject: `npm start ${be.config["client-setup"]?.title || packagejson.name} ok ✔️`,
            text:`Inicio del servicio: ${new Date().toJSON()}
            
            Contexto: ${os.userInfo().username} ${process.cwd()}
            `
        }, {ignoreNoMailer:true, event:'restart-ok'})
    }).catch(function(err){
        if(err.dumping=='ok'){
            console.log('db struct dumped');
            process.exit(0);
            return; 
        }
        console.log('ERROR',err.stack || err);
        if(err.context){
            console.log('context', err.context);
        }
        if(err.dumping){
            console.log('error dumping db');
            process.exit(1);
        }
        var mailDeAvisoDeFalla = be.sendMail({
            to: be.config.mailer?.supervise?.to,
            subject: `npm start ${be.config["client-setup"]?.title || packagejson.name} fallido 🛑`,
            text:`Falla en el inicio del servicio: ${new Date().toJSON()}
            
            Contexto: ${os.userInfo().username} ${process.cwd()}

            Mensaje: ${err.message}
            
            ${err.stack}
            `
        }, {ignoreNoMailer:true, event:'restart-fail'})
        console.log('backend-plus: start up canceled');
        mailDeAvisoDeFalla.then(function(){
            if(be.config.mailer){
                console.log('avisado por mail')
            }
        },function(){
            console.log('no pudo avisarse por mail')
        }).finally(function(){
            process.exit(1);
        });
    });
};

AppBackend.prototype.rootPath = process.cwd();

AppBackend.prototype.specialValueWhenInsert = {
    currentUsername:function(context){
        return context.username;
    },
    lineNumberWhenImported:function(_context, _defField, parameters){
        return parameters.lineNumber
    }
}

AppBackend.prototype.checkDatabaseStructure = async function checkDatabaseStructure(client){
    var be=this;
    var result = await client.query(`select setting from pg_settings where name='server_version';`).fetchUniqueValue();
    if(result.value<be.config.db['min-version']){
        console.log('PARA INSTALACIONES VIEJAS QUE NO USEN generatedAs O NO ACTUALICEN operativos:');
        console.log('se puede agregar en local-config.yaml en db: min-version: 9')
        throw new Error(be.messages.server.dbMinVersionFail.replace('$1',result.value).replace('$2',be.config.db['min-version']))
    }else if(!be.config.server["silent-startup"]){
        console.log('db version',result.value);
    }
    if(be.config.login?.forget){
        if(!be.config.login.forget?.urlPath){
            be.config.login.forget.urlPath = '/new-pass';
        }
        if(!be.config.login.forget?.urlPathOk){
            be.config.login.forget.urlPathOk = '/new-pass-ok';
        }
        if(!be.config.mailer){
            console.log('NO HAY MAILER DEFINIDO');
            throw new Error(be.messages.server.noMailerConfig);
        }
        if(be.config.login?.forget){
            try{
                await client.query(`select tokentype, info, due from his.tokens limit 1`).fetchOneRowIfExists();
            }catch(err){
                var mensaje = `
                    --------quizas falten los campos en la tabla tokens:
                    alter table tokens add column tokentype text;
                    alter table tokens add column info jsonb;
                    alter table tokens add column due timestamp;
                    --------quizas falte moverla al esquema his.
                `;
                err.message += mensaje;
                console.log(mensaje)
                throw err;
            }
            try{
                await client.query(`select ${be.db.quoteIdentList(be.config.login.forget.mailFields)} 
                    from ${be.config.login.schema?be.db.quoteIdent(be.config.login.schema)+'.':''}${be.config.login.table} limit 1`).fetchOneRowIfExists();
            }catch(err){
                var mensaje = `
                    -------- quizas falten los campos en la tabla usuarios:
                    ${be.config.login.forget.mailFields.map(name=>`
                    alter table ${be.config.login.schema?be.db.quoteIdent(be.config.login.schema)+'.':''}${be.config.login.table} add column ${name} text;`).join('')}
                `;
                err.message += mensaje;
                console.log(mensaje)
                throw err;
            }
        }
    }
    var bitacoraTableName = be.config.server.bitacoraTableName || 'bitacora';
    var bitacoraId = await client.query(`SELECT data_type 
        FROM information_schema.columns
        WHERE /*table_schema = 'his' AND*/ table_name = '${bitacoraTableName}' AND column_name = 'id'
    `).fetchOneRowIfExists();
    if (bitacoraId.row?.data_type != 'bigint') {
        var message = `
            ------- hay que cambiar la bitacora (${bitacoraTableName})de lugar (a his) y agrandar el id (a bigint)
            alter table ${be.config.db.schema}.${bitacoraTableName} set schema his;
            alter table ${be.config.db.schema}.tokens set schema his;
            alter table his.${bitacoraTableName} alter column id type bigint;
            grant usage on schema his to ${be.config.db.user};
            grant select, insert, update on his.${bitacoraTableName} to ${be.config.db.user};
            alter table his.${bitacoraTableName} alter column parameters_definition drop not null;
        `;
        throw new Error(message);
    }
    var {rows: sql_routines} = await client.query(`SELECT routine_name, routine_schema, routine_definition
        FROM information_schema.routines
        WHERE routine_schema in (${be.config.db.search_path.map(path => be.db.quoteLiteral(path)).join(', ')})
    `).fetchAll();
    var sqlRoutines = likeAr.toPlainObject(sql_routines, 'routine_name');
    var message = ''
    likeAr(AppBackend.prototype.sql_routines).forEach((routine_name, def) => {
        if (sqlRoutines[routine_name] && def.dump.includes(sqlRoutines[routine_name].routine_definition)) {
            message += `
                ----- hay que crear o actualizar la rutina ${routine_name}:
                ${dump}
                `;
        }
    })
    if (message) throw new Error(message);
};

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

AppBackend.prototype.isThisProcedureAllowed = async function(){
    return true;
}

AppBackend.prototype.inTransactionProcedureContext = function inTransactionProcedureContext(req, coreFunction, context){
    var be = this;
    context = context ?? be.getContext(req);
    if(be.config.nodb){
        return coreFunction(context);
    }
    if (!context.informProgress) {
        context.informProgress = function informProgress(){}
    }
    return be.inTransaction(req, function(client){
        context.client=client;
        return coreFunction(context);
    });
}

AppBackend.prototype.generateInsertSQL = function generateInsertSQL(schemaName, tableName, insertElement){
    var {db} = this;
    var cleanKeys = [];
    var cleanValues = [];
    for (var key in insertElement) {
        cleanKeys.push(db.quoteIdent(key));
        cleanValues.push(db.quoteNullable(insertElement[key]));    
    }
    var sql =  `INSERT INTO ${db.quoteIdent(schemaName)}.${db.quoteIdent(tableName)}
        (${cleanKeys.join(',')}) VALUES (${cleanValues.join(',')}) returning id`;
    return sql;
}

AppBackend.prototype.updateUpdateSQL = function updateUpdateSQL(schemaName, tableName, updateElement, updateConditions){
    var be = this;
    var {db} = this;
    var setPairs = [];
    for (var key in updateElement) {
        setPairs.push(db.quoteIdent(key) + " = " + db.quoteNullable(updateElement[key]));
    }
    var filterPairs = [];
    for (var key in updateConditions) {
        filterPairs.push(be.db.quoteIdent(key) + " = " + be.db.quoteLiteral(updateConditions[key]));
    };
    var sql =  `UPDATE ${db.quoteIdent(schemaName)}.${db.quoteIdent(tableName)} 
        SET ${setPairs.join(',')}
        WHERE ${filterPairs.join(' AND ')}`;
    return sql;
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
        app.get('/client-setup',async function(req, res, next){
            if(forUnlogged && req.user){ 
                // este pedido es para unlogged y está logueado, va al próximo
                next();
            }else{
                var clientSetup = await be.getClientSetupForSendToFrontEnd(req);
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
            app[procedureDef.method]('/'+procedureDef.action, 
            /**
             * 
             * @param {Request} req 
             * @param {Response} res 
             * @param {import('express').NextFunction} next 
             */
            async function(req, res, next){
                const BITACORA_SCHEMA = be.config.server.bitacoraSchema;
                const BITACORA_TABLENAME = be.config.server.bitacoraTableName;
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
                        undecodedValue = paramDef.encoding == 'plain' || undecodedValue === undefined ? undecodedValue : undecodedValue + '';
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
                var processBitacora = async function(hasError, status){
                    var params = getParams();
                    var defInsertBitacoraElement = {
                        procedure_name : procedureDef.action,
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
                                await client.query(be.updateUpdateSQL(BITACORA_SCHEMA, BITACORA_TABLENAME, getFinalStatusBitacoraElement(), updateConditions)).execute();
                            });
                        }else{
                            await be.inTransaction(req, async function(client){
                                var result = await client.query(be.generateInsertSQL(BITACORA_SCHEMA, BITACORA_TABLENAME, defInsertBitacoraElement)).fetchUniqueRow();
                                lastBitacoraInsertedId = result.row.id;
                            });
                        }
                    }else if(hasError && procedureDef.bitacora.error){
                        await be.inTransaction(req,async function(client){
                            var insertElement = changing(defInsertBitacoraElement, getFinalStatusBitacoraElement());
                            await client.query(be.generateInsertSQL(BITACORA_SCHEMA, BITACORA_TABLENAME, insertElement)).execute();
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
                            await client.query(be.updateUpdateSQL(BITACORA_SCHEMA, procedureDef.bitacora.targetTable, updateElement, updateConditions)).execute();
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
                                    if(progressInfo.lengthComputable){
                                        if (!context.lastMessageSended) {
                                            context.lastMessageSended = {}
                                        }
                                        if(new Date()-(context.lastMessageSended[progressInfo.idGroup]||0) > 500 || progressInfo.force){
                                            context.lastMessageSended[progressInfo.idGroup]=new Date();
                                            res.write(JSON.stringify({progress:progressInfo})+"\n");
                                            if(progressInfo.total){
                                                var rate100=Math.floor(progressInfo.loaded*100/progressInfo.total);
                                                var rate1000=Math.floor(progressInfo.loaded*1000/progressInfo.total);
                                                var message = rate100<1 && progressInfo.loaded>0 ? '('+(rate1000||'½')+'‰)' : rate100+'%';
                                                progress2send={message, ephemeral:true, idGroup:progressInfo.idGroup};
                                            }
                                        }else{
                                            progress2send=null;
                                        }
                                    }else{
                                        progress2send=progressInfo;
                                    }
                                }
                                // console.log('informProgress J',JSON.stringify(progress2send));
                                // console.log('informProgress J',json4all.stringify(progress2send));
                                // console.log('informProgress',progress2send);
                                if(progress2send){
                                    res.write(JSON.stringify({progress:progress2send})+"\n");
                                }
                            };
                        }
                        if(!req.cookies){
                            context.cookies = myOwn.parseStrCookies(req.headers.cookie, be.clientSetup.config.prefix);
                        }else{
                            context.cookies = req.cookies;
                        }
                        if(procedureDef.setCookies){
                            context.setCookie = function(name, value, opts){
                                res.cookie(be.clientSetup.config.prefix+name, value, {path: be.config['base-url'] , ...opts})
                            }
                            context.clearCookie = function(name, opts){
                                var {expires, maxAge, ...otherOpts} = opts;
                                res.clearCookie(be.clientSetup.config.prefix+name, {path: be.config['base-url'] , ...otherOpts})
                            }
                        }
                        context.regenerateSession = async function regenerateSession(){
                            await new Promise(function(resolve, reject){
                                req.session.regenerate(function(err){
                                    if(err) reject(err);
                                    resolve();
                                })
                            })
                        }
                        var bpClientTs = req.get('BP-Client-TS');
                        if(bpClientTs){
                            res.append('BP-Client-TS', bpClientTs);
                        }
                        res.append('Content-Type', 'application/octet-stream');
                        return Promise.resolve().then(function(){
                            var thisCache;
                            if(procedureDef.cacheable){
                                var jsonParams = JSON.stringify(params);
                                thisCache = be.caches.procedures[jsonParams];
                                if(!thisCache){
                                    thisCache = be.caches.procedures[jsonParams] = {timestamp:new Date().getTime()};
                                }
                                if(thisCache.result !== undefined){
                                    return thisCache.result;
                                }
                            }
                            var keepAliveManager=null;
                            return Promise.resolve().then(function(){
                                return be.isThisProcedureAllowed(context,procedureDef,params)
                            }).then(function(allowed){
                                if(!allowed){
                                    console.log('FORBIDDEN',procedureDef.action,params.table,context.username);
                                    var err = new Error("FORBIDDEN");
                                    err.code="403";
                                    throw err;
                                }
                            }).then(function(){
                                if(procedureDef.progress && be.config.server["keep-alive"]){
                                    keepAliveManager=setInterval(function(){
                                        res.write(JSON.stringify({progress:{keepAlive:true, ts:new Date().getTime()}})+"\n")
                                    },5000)
                                }
                                return be.inTransactionProcedureContext(req, function(context){
                                    return procedureDef.coreFunction(context, params, files);
                                }, context);
                            }).then(function(result){
                                if (procedureDef.forExport) {
                                    return be.exportacionesGenerico(result, procedureDef, context, params, files);
                                } else {
                                    return result;
                                }
                            }).then(function(result){
                                if(thisCache){
                                    thisCache.result = result;
                                    thisCache.timestamp = new Date().getTime();
                                }
                                if(keepAliveManager){
                                    clearInterval(keepAliveManager)
                                }
                                return result;
                            },function(err){
                                if(keepAliveManager){
                                    clearInterval(keepAliveManager)
                                }
                                throw err;
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
                            return result;
                        });
                    });
                }
                var lastBitacoraInsertedId = null;
                try{
                    await processBitacora(null,null);
                    var result = await processCoreFunction();
                    await processBitacora(false, json4all.stringify(result));
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

var resolved_modules_log = {}

function require_resolve(moduleName){
    var resolved;
    var ok = 'require';
    try{
        resolved = require.resolve(moduleName);
    }catch(err){
        var ok = 'node_modules';
        var packageJson = fs.readJsonSync(Path.join(process.cwd(),'node_modules',moduleName,'package.json'));
        resolved = Path.join(...[process.cwd(),'node_modules',moduleName,(packageJson.main?packageJson.main:'package.json')])
        if(!fs.existsSync(resolved)){
            ok = err.message
            throw err;
        }
    }finally{
        var resolved_modules_line = `${moduleName} -> ${Path.relative(process.cwd(), Path.dirname(resolved))} -> ${Path.basename(resolved)} : ${ok}`;
        resolved_modules_log[resolved_modules_line] = (resolved_modules_log[resolved_modules_line] ?? 0 ) + 1;
    }
    return resolved;
}

function resolve_module_dir(moduleName,path,fileToCheck){
    var baseDir;
    if(packagejson.name==moduleName){
        baseDir=Path.join(process.cwd(), packagejson.main);
    }else{
        baseDir=require_resolve(moduleName);
    }
    var resultDir = Path.join(Path.dirname(baseDir),path||'');
    if (fileToCheck) {
        fs.stat(Path.join(resultDir, fileToCheck)).then(function(status){
            if (!status) {
                console.error('Error resolve_module_dir in:',resultDir,'no:',fileToCheck);
            } else if(!status.isFile()) {
                console.error('Error resolve_module_dir in:',resultDir,',',fileToCheck,'is not a file');
            }
        },function(err){
            console.error('Error resolve_module_dir in:',resultDir,'err:',err);
        });
    }
    return resultDir;
}

AppBackend.prototype.optsGenericForFiles = function optsGenericForFiles(req, opts){
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
            ...(opts?.withFlash ? {flash:req?.flash?.()} : {}),
            msgs:changing(be.messages.unlogged, req?.user?be.messages.logged:{chpass:be.messages.logged.chpass}),
            modules:req?.user?be.clientModules():[],
            lang:be.config["client-setup"].lang,
            username:req?.user?req.user[be.config.login.userFieldName]:'',
            forget:be.config.login.forget?.urlPath
        },
    });
}

AppBackend.prototype.unloggedLandPage = function unloggedLandPage(req){
    var be = this;
    return html.div([
        html.h2({style:'text-align:center; margin-top:15%; font-family:arial, sans-serif'},[be.messages.server.notLoggedIn]),
        html.h2({style:'text-align:center'},[html.code([
            html.a({
                id:'goto-login', 
                style:'border:0.5px solid blue; border-radius: 6px; padding: 6px', 
                href:Path.posix.join(be.config.server["base-url"],(be.config.login.plus.loginUrlPath||'/login'))
            },'login')
        ])]),
        html.script({src:'auto-login.js'})
    ]);
}

AppBackend.prototype.addUnloggedServices = function addUnloggedServices(mainApp, baseUrl){
    var be=this;
    if(be.config.login.forget?.urlPath){
        mainApp.get(Path.posix.join(baseUrl,be.config.login.forget.urlPath), be.config.login.plus.newPassPageServe)
        mainApp.get(Path.posix.join(baseUrl,be.config.login.forget.urlPathOk), be.config.login.plus.newPassPageServe2)
        mainApp.post(Path.posix.join(baseUrl,be.config.login.forget.urlPath), function(req,res,next){
            var resultCode;
            if(!req.body.email || !/@/.test(req.body.email)){
                resultCode='error';
            }else{
                resultCode='ok';
                var promise = be.inDbClient(req, async (client)=>{
                    var now = bestGlobals.datetime.now();
                    var token = crypto.randomUUID();
                    var {rows} = await client.query(`select ${be.db.quoteIdent(be.config.login.userFieldName)} as username
                        from ${be.config.login.schema?be.db.quoteIdent(be.config.login.schema)+'.':''}${be.db.quoteIdent(be.config.login.table)} 
                        where $1 in (${be.db.quoteIdentList(be.config.login.forget.mailFields)}) 
                          and ${be.config.login.activeClausule}
                          and ${be.config.login.lockedClausule} is not true
                    `, [req.body.email.toLowerCase()]).fetchAll();
                    if(rows?.length>0){
                        await client.query(
                            "insert into tokens(token, tokentype, date, username, useragent, due) values ($1, 'new-pass', $2, $3, $4, $5) returning token",
                            [token, now, rows[0].username, req.useragent, now.add({days:1})]
                        ).fetchUniqueRow();
                        var chpath = req.protocol+'://' +Path.posix.join(req.hostname+baseUrl,'new-pass')+
                            '?token='+token+'&nueva=clave';
                        // console.log('chpass', chpath)
                        await be.sendMail({
                            to: req.body.email,
                            subject: be.messages.unlogged.newPassword.mailSubject,
                            html: be.messages.unlogged.newPassword.mailHtml.replace(
                                '<a href=""></a>',
                                `<a href="${chpath}">${chpath}</a>`
                            )
                        })
                    }
                })
            }
            res.redirect(Path.posix.join(baseUrl, be.config.login.forget?.urlPathOk+'?result'+resultCode));
            promise.catch(err=>{
                console.log('error in /new-password');
                console.log(err);
            })
        })
        mainApp.get(Path.posix.join(baseUrl,'/new-pass'), function(req,res,next){
            var resultCode;
            if(!req.query.token){
                res.send('No token');
                res.end();
            }else{
                var promise = be.inDbClient(req, async (client)=>{
                    var now = bestGlobals.datetime.now();
                    var {row} = await client.query(`select *
                        from tokens
                        where tokentype = 'new-pass' and token = $1
                            and due > $2
                        limit 1;
                    `, [req.query.token, now]).fetchOneRowIfExists();
                    if(!row){
                        res.send('Invalid token');
                        res.end();
                    }else{
                        be.config.login.plus.newPassPageEnter(row.username, req.query.token)(req,res,next);
                    }
                })
            }
        })
        mainApp.post(Path.posix.join(baseUrl,'/new-pass-enter'), function(req,res,next){
            var newPassword = req.body.newPassword.trim();
            if(newPassword != req.body.repPassword.trim()){
                res.send(be.messages.server.passDontMatch);
                res.end();
                return;
            }
            if(newPassword.length < 6){
                res.send(be.messages.server.passDontMatch);
                res.end();
                return;
            }
            var promise = be.inDbClient(req, async (client)=>{
                var now = bestGlobals.datetime.now();
                var {row} = await client.query(`select *
                    from tokens
                    where tokentype = 'new-pass' and token = $1
                        and $2 < due
                    limit 1;
                `, [req.body.token, now]).fetchOneRowIfExists();
                if(!row){
                    res.send('Invalid token');
                    res.end();
                    return;
                }
                await new Promise((resolve, reject)=>{
                    be.passwordChanger(req, row.username, false, newPassword, function done(err, ok, message){
                        if(err){
                            reject(err)
                        }else if(ok){
                            resolve()
                        }else{
                            // console.log(arguments)
                            reject(message.message)
                        }
                    })
                })
                res.redirect(Path.posix.join(baseUrl, be.config.login.noLoggedUrlPath || '/login'));
                await client.query(`update tokens set due = null
                    where tokentype = 'new-pass' and token = $1;
                `, [req.body.token]).execute();
            })
            return promise;
        });
    }
    if(be.config.login.unloggedLandPage){
        mainApp.get(Path.posix.join(baseUrl,be.config.login.unloggedLandPage), function(req, res, next){
            res.status(401);
            return MiniTools.serveText(be.unloggedLandPage(req).toHtmlDoc({
                title:be.messages.server.notLoggedIn
            }),'html')(req,res,next);
        })
    }
    // http://localhost:3033/img/login-logo-icon.png
    mainApp.get(Path.posix.join(baseUrl,'/img/login-logo-icon.png'), async function(req,res,next){
        var buscar = [
            'unlogged/img/login-logo-icon.svg', 
            'dist/unlogged/img/login-logo-icon.svg', 
            'dist/client/unlogged/img/login-logo-icon.svg', 
            'unlogged/img/login-logo-icon.png', 
            'dist/unlogged/img/login-logo-icon.png', 
            'dist/client/unlogged/img/login-logo-icon.png', 
            'unlogged/img/logo.png', 
            'dist/unlogged/img/logo.png', 
            'dist/client/unlogged/img/logo.png', 
            'client/img/logo.png', 
            'dist/client/img/logo.png', 
            'dist/client/client/img/logo.png', 
            'unlogged/img/logo-128.png',
            'dist/unlogged/img/logo-128.png',
            'dist/client/unlogged/img/logo-128.png' 
        ];
        buscar = buscar.map(n=>be.rootPath+'/'+n);
        buscar.push(__dirname+'/../for-client/img/login-logo-icon.png');
        for(var nombre of buscar){
            try{
                await fs.stat(nombre)
                break;
            }catch{}
        }
        MiniTools.serveFile(nombre/*,[['Content-Type', 'image/png']]*/)(req,res,next);
    });
    be.clientIncludesCompleted(null).filter(x => x.module).forEach(function (moduleDef) {
        if(baseUrl=='/'){
            baseUrl='';
        }   
        let baseLib = baseUrl + '/' + (moduleDef.path ? moduleDef.path : be.esJavascript(moduleDef.type)? 'lib': 'css');
        try {
            var allowedExts=(moduleDef.type=='js'?['js','map']:[moduleDef.type]);
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
            console.error('ERROR: No se pudo servir el módulo', moduleDef.module);
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
    var dist=/(^|[/\\])dist[/\\]server[/\\]server[/\\]/.test(packagejson.main)?'dist/client/':regexpDistCheck.test(packagejson.main)?'dist/':'';
    unloggedPaths.push(Path.join(Path.resolve(be.rootPath),dist));
    if(dist=='dist/client/'){
        if(fs.existsSync('dist/unlogged/unlogged')){
            unloggedPaths.push('dist/unlogged/');
        }else{
            unloggedPaths.push('dist/');
        }
    }
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

AppBackend.prototype.sendMail = async function sendMail(mailInfo, options){
    var be = this;
    if(be.config.mailer){
        if(!options || !options.event || be.config.mailer?.supervise?.event[options.event]){
            var transporter = nodemailer.createTransport(be.config.mailer.conn);
            return await transporter.sendMail({...mailInfo, ...be.config.mailer["mail-info"]});
        }
    }else{
        if(!options.ignoreNoMailer){
            throw new Error("no mailer configured");
        }
    }
};

AppBackend.prototype.getVisibleMenu = function getVisibleMenu(menu, context){
    return menu;
};

AppBackend.prototype.clientIncludes = function clientIncludes(req, opts) {
    const hideBEPlusInclusions = opts === true || opts && typeof opts == "object" && opts.hideBEPlusInclusions;
    opts = opts === true ? {} : opts || {}; 
    var list = [];
    if (!hideBEPlusInclusions) {
        list = [
            { type: 'js', module: 'js-yaml', modPath: 'dist', file: 'js-yaml.js' },
            // { type: 'js', module: 'xlsx', modPath: 'dist', file: 'xlsx.core.min.js' },
            { type: 'js', module: 'xlsx', modPath: 'dist', file: 'xlsx.full.min.js' },
            { type: 'js', module: 'require-bro' },
            { type: 'js', module: 'cast-error' },
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
        ];
        if(opts.skipMenu){
            list.push({ type: 'js', file: 'my-start.js', path:'.', modPath:'unlogged/for-client' });
            list.push({ type: 'js', file: 'my-skin.js'});
        }else{
            list = list.concat([
                { type: 'js', file: 'my-things.js' },
                { type: 'js', file: 'my-skin.js' },
                { type: 'js', file: 'my-tables.js' },
                { type: 'js', file: 'my-inform-net-status.js' },
                { type: 'css', file: "my-things.css" },
                { type: 'css', file: "my-tables.css" },
                { type: 'css', file: "my-menu.css" },
            ])
        };
        var browInfo=req && this._Browsers[req.useragent.browser]||{polly:true};
        if(!req || browInfo.polly === true || (req.useragent.version || '0').split('.')[0] < browInfo.polly){
            list.unshift({ type: 'js', src: 'lib/polyfills-bro.js' })
        }
        var clientConfig = this.config["client-setup"];
        if(clientConfig.menu === true && !opts.skipMenu){
            list.push({ type: 'js', file: 'my-menu.js' });
        }
        if(clientConfig.lang==='es'){
            list.push({ type: 'js', module: 'castellano' });
        }
    }
    return list;
}

AppBackend.prototype.clientIncludesCompleted = function clientIncludesCompleted(req, opts) {
    let list = this.clientIncludes(req, opts);
    var be = this;
    if(this.config.devel && this.config.devel.useFileDevelopment){
        list=list.map(includeDef=>{
            if(includeDef.fileProduction){
                // deprecated;
            }
            if(includeDef.fileDevelopment){
                includeDef.file=includeDef.fileDevelopment;
            }
            return includeDef;
        });
    }
    var rPaths={paths:[process.cwd()]};
    return list.map(inclusion =>{
        var filename = inclusion.file? inclusion.file: (inclusion.module? Path.basename(require_resolve(inclusion.module,rPaths)): '');
        return changing({
            src: be.esJavascript(inclusion.type) ? ((inclusion.path ? inclusion.path : 'lib') + '/' + (inclusion.file ? inclusion.file : filename)) : '',
            href: inclusion.type == 'css' ? ((inclusion.path ? inclusion.path : 'css') + '/' + (inclusion.file ? inclusion.file : (inclusion.module + '.css'))) : ''
        }, inclusion);
    });
}

AppBackend.prototype.clientModules = function clientModules(req, opts) {
    var be = this;
    return { scripts: this.clientIncludesCompleted(req, opts).filter(x => be.esJavascript(x.type)).map(mod => {return { src: mod.src, type:mod.type=='mjs'?"module":null }})};
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
    tables.push({path: __dirname + '/tables', name:'summary'});
    var gridBuffer = be.staticConfig['client-setup']['grid-buffer'];
    var offlineMode = gridBuffer && (gridBuffer === 'idbx' || gridBuffer === 'wsql');
    if(offlineMode){
        tables.push({path: __dirname + '/tables', name:'locks'});
    }
    tables.push({path: __dirname + '/tables', name:'tokens'});
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

AppBackend.prototype.mainPage = function mainPage(req, offlineMode, opts){
    opts = opts||{};
    if(!opts.icons){
        if(!opts.icon){
            opts.icons={
                iconShortcut: "img/logo-128.png",
                icon        : "img/logo.png",
                iconApple   : "img/logo.png",
            }
        }else{
            opts.icons={
                iconShortcut: opts.icon,
                icon        : opts.icon,
                iconApple   : opts.icon,
            }
        }
    }
    var be=this;
    var attr={lang: be.config["client-setup"].lang};
    var viewportAttrs=null;
    if(offlineMode && req && req.user){
        attr.manifest=opts.manifestPath || "ext/app.manifest";
    }
    var viewportContent=[];
    viewportContent.push('width=' + (be.config["client-setup"]["deviceWidthForMobile"] || 'device-width'));
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
            html.title(be.config["client-setup"]?.title),
            html.meta({charset:"utf-8"}),
            viewportAttrs?html.meta(viewportAttrs):null,
            html.link({href: opts.icons.iconShortcut , rel: "shortcut icon", type: "image/png"}),
            html.link({href: opts.icons.icon         , rel: "icon", type: "image/png"}),
            html.link({href: opts.icons.iconApple    , rel: "apple-touch-icon"}),
            html.meta({name:"format-detection", content:"telephone=no"}),
            opts.webManifestPath?null:html.meta({name:"apple-mobile-web-app-capable", content:"yes"}),
            opts.webManifestPath?null:html.meta({name:"apple-mobile-web-app-status-bar-style", content:"black"}),
            opts.webManifestPath?null:html.meta({name:"mobile-web-app-capable", content:"yes"}),
            opts.webManifestPath?null:html.meta({name:"mobile-web-app-status-bar-style", content:"black"}),
            opts.webManifestPath?html.link({rel:"manifest", crossorigin:"use-credentials", href:opts.webManifestPath}):null,
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
            html.div({id: "total-scripts"}, be.clientModules(req,opts).scripts.map(function(scriptDef){
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
        myOwn.path = myOwn.path || {};
        myOwn.path.img='${imgUrl}';
        myOwn.appName='${packagejson.name}${be.config.server["base-url"]}';
        myOwn.clientVersion='${be.config["client-setup"].version}';
        window.addEventListener('load', function(){
            document.body.setAttribute('my-skin', '${skin}')
        });
    `, 'application/javascript'));
    be.app.use(slashSkin,serveContent(Path.join(be.config.server.skins[skin]['local-path'],skin),{allowedExts:be.exts.img.concat(['css'])}));
    be.app.use(slashSkin,serveContent(Path.join(be.rootPath,'skins',skin),{allowedExts:be.exts.img.concat(['css'])}));
    var dist=/(^|[/\\])dist[/\\]server[/\\]server[/\\]/.test(packagejson.main)?'dist/client/':regexpDistCheck.test(packagejson.main)?'dist/':'';
    [Path.resolve(be.rootPath,dist+'client'), Path.join(__dirname,'../for-client')].forEach(function(path){
        if(!fs.existsSync(path)){
            console.error('****************** WARNING!!!!')
            console.log('NO EXISTE EL path PARA EL CLIENT INCLUDES',path)
            if(/client.client/.test(path)){
                console.log('si hay server/server tiene que haber client/client');
            }
        }
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
                }else{
                    throw new Error('forbiden');
                }
            }).then(function(){
                MiniTools.serveText(html.body(info).toHtmlDoc({title:'loggin'}),'html')(req,res);
            }).catch(MiniTools.serveErr(req,res,next));
        });
    }
    if(be.config.db['downloadable-backup-path']){
        be.app.get('/backup-db.zip', function(req,res,next){
            if (be.can(req, 'DownloadBackup')) {
                MiniTools.serveFile('./local-private/backup-db.zip')(req,res,next);
            }
        })
    }
    be.app.use(function(req,res,next){
        // req != '/keep-alive.json'
        req.session.lastNonKeepAlive = new Date().getTime();
        next();
    });
    this.app.use('/info', async function(req,res,next){
        if(req.path.endsWith('.md')){
            var fileName=__dirname+'/../public-docs/'+req.path;
            var content = await fs.readFile(fileName,'utf8');
            var md = await markdownRender('html', content);
            MiniTools.serveText(md.content, 'html')(req,res);
        }else{
            serveContent(__dirname+'/../docs',be.optsGenericForFiles(req))(req,res,next);
        }
    });
    var logo=this.config.logo;
};

AppBackend.prototype.getEditableForDump = function getEditableForDump(){
    var be=this;
    var contextForDump={be:be, forDump:true, user:{}};
    if(be.config.login){
        contextForDump.user[be.config.login.userFieldName]='!dump';
        contextForDump.user[be.config.login.rolFieldName]='admin';
    }
    return contextForDump;
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
    procedureDef.resultOk=procedureDef.resultOk ?? (procedureDef.forExport ? 'showDownloadUrl' : 'showText');
    procedureDef.progress = procedureDef.progress ?? (procedureDef.forExport && true);
    procedureDef.uniqueUse = procedureDef.uniqueUse ?? !!procedureDef.forExport;
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
    var owner=db.quoteIdent(be.config.db.owner||be.config.install.dump.db.owner||be.config.db.user);
    if(be.config.install.dump.db.password || be.config.db["owner-password"] && !be.config.db["for-test"]){
        throw new Error("password must not be setted in config");
    }
    if(be.config.install.dump.db.owner!=be.config.db.user){
        lines.push(`create user ${owner} ${be.config.db["for-test"]?`password ${db.quoteLiteral(be.config.db["owner-password"])}`:`nologin`};`);
    }
    if(!be.config.db.password){
        throw new Error('Lack of config.db.password in local-config');
    }
    lines.push("create user "+db.quoteIdent(be.config.db.user)+" password "+db.quoteLiteral(be.config.db.password)+";");
    lines.push("create database "+db.quoteIdent(be.config.db.database)+" owner "+owner+
        (be.config.db.tablespace?" tablespace "+db.quoteIdent(be.config.db.tablespace):"")+
    ";");
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
        (forced?
            ' on update no action on delete no action':
            (fk.onDelete?' on delete '+fk.onDelete:'')+
            ((fk.onUpdate||this.config.db.fkOnUpdate)?' on update '+(fk.onUpdate||this.config.db.fkOnUpdate):'')+
            (fk.initiallyDeferred?' initially deferred':'')
        );
    return {consName, clause, sourceFieldList};
}

AppBackend.prototype.dumpDbTableFields = function dumpDbTableFields(tableDef, opts = {}, complements = null){
    var db = this.db;
    var fields=[];
    tableDef.fields.forEach(function(fieldDef){
        if(!fieldDef.clientSide && fieldDef.inTable!==false && !fieldDef.inJoin && !(tableDef.sql.fields[fieldDef.name]||{}).expr || fieldDef.inTable){
            var fieldType=typeDb[fieldDef.typeName]||'"'+fieldDef.typeName+'"';
            if(fieldDef.sizeByte==4){
                fieldType = 'integer';
            }
            fields.push(
                '  '+db.quoteIdent(fieldDef.name)+
                ' '+(fieldDef.dataLength?(fieldType=='text'?'varchar':fieldType)+'('+fieldDef.dataLength+')':fieldType)+
                (fieldDef.defaultValue!=null?' default '+db.quoteLiteral(fieldDef.defaultValue):'')+
                (fieldDef.defaultDbValue!=null?' default '+fieldDef.defaultDbValue:'')+
                (fieldDef.sequence && !fieldDef.sequence.name?' generated always as identity':'')+
                (fieldDef.generatedAs!=null?` generated always as (${fieldDef.generatedAs}) stored`:'')
            );
            if(complements){
                complements(fieldDef)
            }
        }
    });
    return fields
}

AppBackend.prototype.dumpDbSchemaPartial = async function dumpDbSchemaPartial(partialTableStructures, opts = {}){
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
    var policyLines=[];
    var enanceLines=[];
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
    var control = `-- CONTROL
    do $do$
    declare
      vExpectedVersion text := '${be.config.db["min-version"]}';
      vCurrentVersion  text := (select setting from pg_settings where name = 'server_version');
    begin
      if semver_to_decimal(vCurrentVersion) < semver_to_decimal(vExpectedVersion) then
        raise exception 'BACKEND-PLUS DUMP: Old PostrgreSQL Version % expected %', vCurrentVersion, vExpectedVersion;
      end if;
    end;
    $do$;
    do $do$
    declare
      vExpected text := 'UTF8';
      vCurrent  text := coalesce((select setting from pg_settings where name = 'server_encoding'),'unknown');
    begin
      if vCurrent is distinct from vExpected then
        raise exception 'BACKEND-PLUS DUMP: PostrgreSQL server_encoding %, expected %', vCurrent, vExpected;
      end if;
    end;
    $do$;
    `;
    linesCreate.push("drop schema if exists "+schema+' cascade;');
    if (be.config.install.dump["drop-his"]) {
        linesCreate.push("drop schema if exists his cascade;");
    }
    linesCreate.push("create schema "+schema+';');
    linesCreate.push("grant usage on schema "+schema+' to '+user+';');
    linesCreate.push("create schema if not exists his;");
    linesCreate.push("grant usage on schema his to "+user+';');
    if(be.config.install.dump["admin-can-create-tables"]){
        linesCreate.push("grant create on schema "+schema+' to '+user+';');
    }
    linesCreate.push('');

    if(!complete && opts.forDump){
        linesCreate.push("set role to "+owner+";");
    }
    searchPathline.push("set search_path = "+schema+', public;');
    searchPathline.push("set client_encoding = 'UTF8';");
    searchPathline.push('');
    /*eslint guard-for-in: 0*/
    /*eslint no-loop-func: 0*/
    /*jshint loopfunc:true */
    var contextForDump=be.getContextForDump();
    var functionLines = (await be.getDbFunctions(opts)).map(fdef=>fdef.dumpText);
    var tablesWithStrictSequence={}
    for(var tableName in partialTableStructures) if(partialTableStructures.hasOwnProperty(tableName)){
        try{
            var tableDef=partialTableStructures[tableName](contextForDump);
            if(!tableDef.adapted){
                if(!tableDef.fields){
                    throw new Error('DUMP ERROR. '+tableName+' without fields')
                }
                tableDef=be.tableDefAdapt(tableDef);
            }
            var fieldsForSequences=[];
            var cualQuoteTableName=(tableDef.schema?db.quoteIdent(tableDef.schema)+'.':'')+db.quoteIdent(tableDef.sql.tableName);
            if(tableDef.sql.isTable){
                if(tableDef.sql.viewBody){
                    throw new Error('table '+tableDef.sql.tableName+' has viewBody. It must has isTable=false');
                }
                lines.push('create table '+cualQuoteTableName+' (');
                var fields = be.dumpDbTableFields(tableDef, opts,
                    function complements(fieldDef){
                        if(fieldDef.sequence && !fieldDef.sequence.name){
                            tablesWithStrictSequence[tableName]={}
                        }
                        if(fieldDef.typeName==='text' && !fieldDef.allowEmptyText){
                            consLines.push(
                                'alter table '+cualQuoteTableName+
                                ' add constraint '+db.quoteIdent(fieldDef.name+"<>''")+
                                ' check ('+db.quoteIdent(fieldDef.name)+"<>'');"
                            );
                        }
                        if(fieldDef.options){
                            consLines.push(
                                'alter table '+cualQuoteTableName+
                                ' add constraint '+db.quoteIdent(fieldDef.name+" invalid option")+
                                ' check ('+db.quoteIdent(fieldDef.name)+
                                    ` in (${fieldDef.options.map(opt=>db.quoteLiteral(opt.option===undefined?opt:opt.option))}) );`
                            );
                        }
                        if(fieldDef.nullable===false || fieldDef.dbNullable===false){
                            consLines.push(
                                'alter table '+cualQuoteTableName+
                                ' alter column '+db.quoteIdent(fieldDef.name)+' set not null;'
                            );
                        }
                        if(fieldDef.sequence && fieldDef.sequence.name){
                            fieldsForSequences.push(fieldDef);
                        }
                    }
                );
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
                    lines.push('grant '+sqlRights+' on '+cualQuoteTableName+' to '+user+';');
                }
                if (user != owner){
                    lines.push('grant all on '+cualQuoteTableName+' to '+owner+';');
                }
                tableDef.foreignKeys.map(function(fk){
                    var { clause:fullClause, sourceFieldList } = be.dumpFkConstraint(fk, tableDef);
                    var indexName=db.quoteIdent(sourceFieldList.replace(/[ "]/g,'')+' 4 '+tableDef.sql.tableName+' IDX');
                    if(indexName.length>63){
                        indexName=db.quoteIdent(fk.consName?fk.consName+' IDX':(tableDef.alias||tableDef.sql.tableName)+' '+fk.references+' IDX');
                    }
                    indexLines.push('create index '+indexName+' ON '+cualQuoteTableName+' ('+sourceFieldList+');');
                    fkLines.push('alter table '+cualQuoteTableName+
                        ' add '+fullClause+';'
                    );
                });
                if(tableDef.sql.constraintsDeferred){
                    var fkEnabling=tableDef.foreignKeys.filter(fk=>fk.forceDeferrable).map(function(fk){
                        var {consName, clause:clauseFalse} = be.dumpFkConstraint(fk, tableDef, false);
                        return `
                        if enable then
                            ALTER TABLE ${cualQuoteTableName} ADD ${clauseFalse};
                        else
                            ALTER TABLE ${cualQuoteTableName} DROP constraint ${consName};
                        end if;
                        `
                    });
                    if(fkEnabling.length){
                        functionLines.push(
                            `create or replace function ${(tableDef.schema?be.db.quoteIdent(tableDef.schema)+'.':'')+be.db.quoteIdent(`${tableDef.tableName}_toggle_consts`)}(enable boolean) returns text
                            language plpgsql security definer as \n$BODY$\nbegin`+fkEnabling.join('')+' return $$ok$$;\nend;\n$BODY$;\n'
                        );
                    }
                }
                tableDef.constraints.map(function(cons){
                    var sql;
                    var prefix = 'alter table '+cualQuoteTableName+' add '+
                        (cons.consName?'constraint '+db.quoteIdent(cons.consName)+' ':'');
                    switch(cons.constraintType){
                    case 'unique': 
                        sql='('+cons.fields.map(function(field){ return db.quoteIdent(field); }).join(', ')+')';
                        if(cons.where){
                            if(cons.consName == null){
                                console.error('create unique index constraint: must include consName in ',cons);
                            }
                            prefix = 'create unique index '+db.quoteIdent(cons.consName)+' on '+cualQuoteTableName;
                            sql += 'where ' + cons.where;
                        }else{
                            prefix += 'unique ';
                        }
                    break;
                    case 'check': 
                        sql='check ('+cons.expr+')';
                    break;
                    case 'exclude': 
                        sql=`exclude using ${cons.using} (${cons.fields.map(f => typeof f == "string"?`${f} WITH =`:`${f.fieldName} WITH ${f.operator}`).join(', ')})${cons.where ? ` WHERE (${cons.where})`:``}`;
                    break;
                    default:
                        throw new Error('constraintType not implemented: '+cons.constraintType);
                    }
                    consLines.push(
                        prefix + sql + ';'
                    );
                });
                lines.push(tableDef.sql.postCreateSqls);
                lines.push('');
                fieldsForSequences.forEach(function(fieldDef) {
                    var sequence = fieldDef.sequence;
                    lines.push("CREATE SEQUENCE "+db.quoteIdent(sequence.name)+" START "+db.quoteInteger(sequence.firstValue||1)+";");
                    lines.push(
                        "ALTER TABLE "+cualQuoteTableName+
                        " ALTER COLUMN "+db.quoteIdent(fieldDef.name)+
                        (sequence.prefix==null
                        ?" SET DEFAULT nextval("+db.quoteLiteral(sequence.name)+"::regclass);"
                        :" SET DEFAULT ("+db.quoteLiteral(sequence.prefix)+" || nextval("+db.quoteLiteral(sequence.name)+"::regclass)::text);"
                        )
                    );
                    lines.push('GRANT USAGE, SELECT ON SEQUENCE '+db.quoteIdent(sequence.name)+' TO '+user+';');
                });
                lines.push('');
                if(tableDef.sql.policies.enabled){
                    policyLines.push(`ALTER TABLE ${cualQuoteTableName} ENABLE ROW LEVEL SECURITY;`);
                    [null, 'all', 'select', 'insert', 'update', 'delete'].forEach((command)=>{
                        var polcom=tableDef.sql.policies[command] ?? {using: `true`, permissive:true};
                        if(polcom?.using || polcom?.check){
                            policyLines.push(`CREATE POLICY ${be.db.quoteIdent(polcom.name ?? `bp ${command ?? `base`}`)} ON ${cualQuoteTableName} `+
                                `AS ${polcom.permissive ? `PERMISSIVE` : `RESTRICTIVE`} FOR ${command ?? `all`} TO ${be.config.db.user}`+
                                (polcom.using?     ` USING ( ${polcom.using} )`:'')+
                                (polcom.check?` WITH CHECK ( ${polcom.check} )`:'')+';'
                            );
                        }                        
                    });
                }
            }else{
                if(tableDef.sql.viewBody){
                    lines.push('create or replace view '+cualQuoteTableName+' (');
                    var viewFields=[];
                    tableDef.fields.forEach(function(fieldDef){
                        if(!fieldDef.clientSide && fieldDef.inTable!==false && !(tableDef.sql.fields[fieldDef.name]||{}).expr || fieldDef.inView){
                            viewFields.push(db.quoteIdent(fieldDef.name));
                        }
                    });
                    lines.push('  '+viewFields.join(', '));
                    lines.push(') as '+tableDef.sql.viewBody+';');
                    lines.push('grant select on '+cualQuoteTableName+' to '+user+';');
                    lines.push('');
                }
            }
        }catch(err){
            err.context=(err.context||'')+'dumping structure of table '+tableName+' \n ';
            throw err;
        }
    }
    var enancePart= 'do $SQL_ENANCE$\n begin\n' + enanceLines.join('\n')+'\n' + 'end\n$SQL_ENANCE$;';
    var someNotFound=false;
    try {
        var allTableData = await fs.readFile('install/local-data-dump.psql','utf-8');
    } catch(err) {
        if (err.code != 'ENOENT') throw err;
        try {
            var allTableContent = await fs.readFile('install/local-dump.psql','utf-8');
            var startIndex = allTableContent.indexOf('-- Data for Name: ');
            console.log('startIndex', startIndex);
            var lastUseful = allTableContent.lastIndexOf('\nSELECT pg_catalog.setval') 
            console.log('lastUseful', lastUseful);
            if (lastUseful == -1) lastUseful = allTableContent.lastIndexOf('\n\\.\n');
            console.log('lastUseful', lastUseful);
            var lastIndex = allTableContent.indexOf('\n--', lastUseful);
            console.log('lastIndex', lastIndex);
            allTableData = allTableContent.slice(startIndex, lastIndex);
        } catch(err) {
            if (err.code != 'ENOENT') throw err;
            //throw err;
        }
    }
    if (allTableData) {
        var prepa = await be.getDataDumpTransformations(allTableData)
        dataText = [
            '-- BEGIN DATA FROM DUMP',
            ...prepa.prepareTransformationSql,
            prepa.rawData,
            ...prepa.endTransformationSql,
            '-- END DATA FROM DUMP'
        ]
    } else {
        await Promise.all(likeAr(partialTableStructures).map(function(tableDef, tableName, _, i){
            if(tableDef?.sql?.isTable === false) return;
            // TODO: buscar
            var buscarEn=[Path.join('local-install',tableName+'.tab')].concat(
                be.appStack.map(function(stackNode){
                    return Path.join(stackNode.path,'../install',tableName+'.tab').replace(regexpDistReplacer,'$1$2');
                })
            );
            if(be.config.install['table-data-dir'] instanceof Array){
                buscarEn=be.config.install['table-data-dir'].map(path=>Path.join(path,tableName+'.tab')).concat(buscarEn);
            }else if(be.config.install['table-data-dir']){
                buscarEn=[].concat(Path.join(be.config.install['table-data-dir'],tableName+'.tab')).concat(buscarEn);
            }
            if(!i) console.log('buscar en', buscarEn)
            return locatePath(buscarEn).then(function(theTableFileName){
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
                    if(fieldName==null){
                        throw new Error('ERROR empty name or extra column in '+tableName+'.tab')
                    }
                    var defField=tableDef.field[fieldName];
                    if(!defField && !fieldName.startsWith('!')){
                        throw new Error('field '+fieldName+' does no exists in .tab for '+tableName+' in '+path);
                    }
                    return !fieldName.startsWith('!') && defField.inTable!==false && !defField.inJoin && (!defField.clientSide || defField.serverSide) && !defField.generatedAs;
                }
                if(/[-[]/.test(content[0])){
                    var filterField2=function(_value,fieldName){
                        var fieldDef = tableDef.field[fieldName];
                        if(!fieldDef){
                            console.log('lack of field',fieldName,'in table',tableName,'filtering fields')
                        }
                        return (!fieldDef.sequence || fieldDef.sequence.name) && filterField(fieldName);
                    }
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
                        .map(line => splitRawRowIntoRow(line))
                        .filter(line => line.length>1 || line.length==1 && line[0].trim() );
                    if(lines.length>1){
                        if(lines[0][0].startsWith('\ufeff')){
                            lines[0][0]=lines[0][0].replace('\ufeff','')
                        }
                        rows=lines.slice(1);
                        var filteredFieldDef = lines[0].filter(filterField);
                        if(tablesWithStrictSequence[tableName]){
                            var dataString="COPY "+db.quoteIdent(tableName)+" ("+
                                filteredFieldDef.map(db.quoteIdent).join(', ')+
                                ') FROM stdin;\n'+
                                rows.map(function(line){
                                    return line.filter(function(_,i){ return filterField(lines[0][i]);}).map(function(value,i){
                                        var def = tableDef.field[filteredFieldDef[i]];
                                        return value==='' ? (
                                                def.allowEmptyText && ('nullable' in def) && !def.nullable ? '' : '\\N'
                                            ): value.replace(/\\/g,'\\\\').replace(/\t/g,'\\t').replace(/\n/g,'\\n').replace(/\r/g,'\\r');
                                    }).join('\t')+'\n';
                                }).join('')+'\\.\n';
                        }else{
                            var dataString="insert into "+db.quoteIdent(tableName)+" ("+
                                filteredFieldDef.map(db.quoteIdent).join(', ')+
                                ') values\n'+
                                rows.map(function(line){
                                    return "("+line.filter(function(_,i){ return filterField(lines[0][i]);}).map(function(value,i){
                                        var def = tableDef.field[filteredFieldDef[i]];
                                        if(def == null) {
                                            throw Error("no se encuentra la columna "+filteredFieldDef[i]+" en "+tableName);
                                        }
                                        return value==='' ? (
                                            def.allowEmptyText && ('nullable' in def) && !def.nullable ? "''" : 'null' 
                                        ) : db.quoteNullable(value);
                                    }).join(', ')+")";
                                }).join(',\n')+';\n';
                        }
                        dataText.push(dataString);
                    }
                    // tablesWithStrictSequence[tableName]
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
        }).array())
        if(someNotFound){
            console.log('silence "skipping content" messages in "local-config.yaml".install.dump.skip-content=true');
        }
    }
    let installFolders = be.config.install.dump.folders ?? ['install']
    let texts = await Promise.all(
        [
            ['prepare.sql'],
            ['pre-adapt.sql'].concat(be.config.install.dump.scripts['pre-adapt']),
            ['adapt.sql'],
            be.config.install.dump.scripts['prepare'] ?? [],
            be.config.install.dump.scripts['post-adapt'] ?? []
        ]
        .map(async function(fileNames){
            if (!fileNames) return '';
            var i = 0; 
            return (await Promise.all(fileNames.map(async fileName => {
                var content;
                do {
                    var folder = installFolders[i];
                    try{
                        content = await fs.readFile(be.rootPath+'/'+folder+'/'+fileName, {encoding:'UTF8'});
                    } catch (err) {
                        if(err.code!='ENOENT') throw err;
                    }
                    i++;
                } while (i < installFolders.length && !content);
                if (!content) {
                    return '-- no '+fileName+'\n';
                } else {
                    return '-- '+folder+'/'+fileName+'\n'+content;
                };
            }))).join('\n')
        })
    );

    var common = (await Promise.all(be.appStack.map(async function(stackNode){
        var common = [];
        for (var prefix of ['../', '../../']) {
            try {
                var dirName = Path.join(stackNode.path,prefix+'install').replace(regexpDistReplacer,'$1$2')
                var list = await fs.readdir(dirName);
            } catch (err) {
                if (err.code != 'ENOENT') throw err;
                var list = [];
            }
            for(var fileName of list){
                if (fileName.endsWith('-fun.sql')) {
                    common.push(await fs.readFile(Path.join(dirName,fileName), 'utf-8'));
                }
            }
        }
        return common.join('\n');
    }))).join('\n');

    var prepareList=(be.config.install.dump.scripts['prepare']||[]);
    var mainSql=(
        (complete? linesCreate.join('\n'): '')+
        (complete||opts.forDump? searchPathline.join('\n'): '')+
        '\n-- common'+
        common+'\n'+
        control+'\n'+
        (complete? '\n\n--prepare.sql\n'+ texts[0]+'\n\n' :'' )+
        (complete? texts[3] + '\n\n' : '' )+
        '\n-- functions\n' + functionLines.join('\n')+
        '\n-- lines \n' + lines.join('\n')+
        (complete? ('\n\n-- pre-ADAPTs\n'+texts[1]+'\n\n') : '' )+
        (complete? ('\n\n-- DATA\n'+ dataText.join('\n')) : '' )+ 
        (complete? ('\n\n-- ADAPTs\n'+ texts[2]+'\n\n') : '' )+
        '\n-- conss\n' + consLines.join('\n')+
        '\n-- FKs\n' + fkLines.join('\n')+
        '\n-- index\n' + indexLines.join('\n')+
        '\n-- policies\n' + policyLines.join('\n')+
        (complete? texts[4] + '\n\n' : '' )+
        (complete? (be.config.install.dump.enances==='inline'?enancePart:'') :'')
    ).replace(/\uFEFF/g /*inner BOM replacing*/,'\n\n').replace(
        new RegExp(escapeRegExp(db.quoteIdent(be.config.install.dump.db["owner4special-scripts"])),'g'),
        db.quoteIdent(be.config.install.dump.db.owner)
    ).replace(
        new RegExp(escapeRegExp(db.quoteIdent(be.config.install.dump.db["user4special-scripts"])),'g'),
        db.quoteIdent(be.config.db.user)
    );
    if(be.config.install.dump.db["apply-generic-user-replaces"]){
        mainSql=mainSql.replace(/((\bto\s|=)\s*"?)\w+(_user\b)/ig, "$1"+user);
        mainSql=mainSql.replace(/((\bto\s|=)\s*"?)\w+(_owner\b)/ig, "$1"+owner);
    }
    return {mainSql,enancePart};
}

AppBackend.prototype.getDbFunctions = async function (){
    return [];
}

/** @param {{complete:boolean, tableNames:string[]}} opts */
AppBackend.prototype.dumpDbSchema = async function dumpDbSchema(opts){
    var be = this;
    var {mainSql,enancePart} = await be.dumpDbSchemaPartial(
        opts.complete?be.tableStructures:likeAr(be.tableStructures).filter((_, name)=>opts.tableNames.includes(name)), 
        opts
    )
    mainSql=be.config.install.dump.db.extensions.map(function(extension){
        return ({
            gist: "create extension if not exists btree_gist;",
            pg_trgm: "create extension if not exists pg_trgm;",
            pgcrypto: "create extension if not exists pgcrypto;"
        }[extension]||('--unknown exension '+extension))+'\n';
    }).join('')+mainSql;
    await fs.writeFile('local-db-dump.sql', mainSql);
    if(be.config.install.dump.enances==='file'){
        await fs.writeFile('local-db-dump-enances.sql', enancePart);
    }
};

AppBackend.prototype.getDataDumpTransformations = function getDataDumpTransformations(rawData){
    return Promise.resolve({rawData, prepareTransformationSql:[], endTransformationSql:[]});
}

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

/** @param {{complete:boolean, tableNames:string[]}} opts */
AppBackend.prototype.dumpDb = function dumpDb(opts){
    if(!this.fieldDomain){
        this.fieldDomain={};
    }
    return Promise.all([
        this.dumpDbCreateDatabase(),
        this.dumpDbSchema(opts)
    ]);
};

AppBackend.prototype.inputTransformers={
    keepAll:{},
    normal:{
        replaceNewLines:' ',
        simplificateSpaces:true
    },
    upper:{
        replaceNewLines:' ',
        simplificateSpaces:true,
        fun:t=>t.toLocaleUpperCase()
    }
}

AppBackend.prototype.transformInput = function transformInput(fieldDef, value){
    var be = this;
    if(fieldDef.typeName == 'text'){
        var idTransformer = fieldDef.transformer ?? be.config.data.transformers.text;
        var parameters = be.inputTransformers[idTransformer] ?? idTransformer ?? {}
        if(value != null){
            if(parameters.replaceNewLines != null){
                value = value.replace(/\r|\n/g,' ').trim()
            }
            if(parameters.simplificateSpaces){
                value = value.replace(/(\s|\u00A0)+/g,' ').trim()
            }
            if(parameters.fun){
                value = parameters.fun(value)
            }
        }
    }
    return value;
}

/** 
 * xxxparam {{ action:string, parameters:any, conRegistro:boolean, conPadron:boolean, fileName?:string, csvFileName?:string, csvSeparator?:string, queries:{titulo:string, sql:string, params:string[]}[] }}
 * @param {{title:string, rows:Record<string, any>[]}[]} result
 * @returns {Promise<void>}
 */

AppBackend.prototype.exportacionesGenerico = async function exportacionesGenerico(result, procedureDef, context, params, files){
    var {csvFileName, fileName} = procedureDef.forExport
    if (!(result instanceof Array)) {
        if (!result || !(result instanceof Object)) {
            throw new Error ("exportacionesGenerico debe recibir {title:string, rows:Record<string, any>[]}[]")
        }
        result = [result]
    }
    if (typeof result[0].title !== "string" || typeof result[0].rows !== "object" && !(result[0].rows instanceof Array) ) {
        throw new Error ("exportacionesGenerico debe recibir {title:string, rows:Record<string, any>[]}")
    }
    csvFileName = result[0].csvFileName ?? csvFileName;
    fileName = result[0].fileName ?? fileName;
    await bestGlobals.sleep(100);
    context.informProgress({message:`buscando archivos recién generados`})
    /** @type {{url:string, label:string}[]} */
    var hayGenerados = [];
    const MINUTESms = 60*1000;
    var buscarGenerados = async (name) => {
        if(name){
            try{
                var stat = await fs.stat(`dist/client/${name}`);
                if(stat && stat.mtimeMs > new Date().getTime() - 10 * MINUTESms){
                    hayGenerados.push(
                        {url:name, label:name+' generado '+stat.mtime.toLocaleDateString("es-ES")}
                    )
                }
            }catch(err){
                var code = err.code
                if(code != 'ENOENT') throw err;
            }
        }
    }
    await buscarGenerados(csvFileName);
    await buscarGenerados(fileName);
    if(hayGenerados.length>0){
        return hayGenerados;
    }
    await bestGlobals.sleep(100);
    if(csvFileName){
        async function writeLine(f, values){
            return f.write(values.map(function q(value){
                if(value==null) return '';
                if(value instanceof Date){
                    return value.toLocaleDateString("es-ES");
                }
                // @ts-expect-error no reconoce el parámetro
                value = value.toLocaleString("es-ES")
                if(/[,"]/.test(value)){
                    return '"'+value.replace(/"/g, '""')+'"'
                }else{
                    return value
                }
            }).join(',')+"\n", null, 'utf-8');
        }
        context.informProgress({message:`guardando CSV: ${csvFileName}`})
        try {
            var f = await fsP.open(`dist/client/${csvFileName}`,'w')
            await f.write('\ufeff',null,'utf-8');
            if (result[0].rows.length) {
                await writeLine(f,Object.keys(result[0].rows[0]))
            } else {
                await writeLine(f,['no data']);
            }
            for (var row of result[0].rows) {
                await writeLine(f,Object.values(row));
            }
        } finally {
            await f.close();
        }
    }
    if(fileName){
        context.informProgress({message:'armando XLSX'})
        var wb = XLSX.utils.book_new();
        result.map(({title, rows})=>{
            var rowsA = rows.map(row=>Object.values(row));
            if(rows[0]){
                rowsA.unshift(Object.keys(rows[0]));
            }
            var ws = XLSX.utils.aoa_to_sheet(rowsA);
            XLSX.utils.book_append_sheet(wb, ws, title);
            return ws;
        })
        context.informProgress({message:`guardando XLSX: ${fileName}`})
        await bestGlobals.sleep(100);
        await new Promise((resolve,reject)=>XLSX.writeFileAsync(`dist/client/${fileName}`,wb,{},
            (err)=>err?reject(err):resolve()
        ))
    }
    return [
        ...(fileName?[{url:fileName, label:csvFileName?'xlsx de control':fileName}]:[]), 
        ...(csvFileName?[{url:csvFileName, label:fileName?'csv (formato UTF-8)':csvFileName}]:[]),
    ];
}


backendPlus.AppBackend = AppBackend;
backendPlus.require_resolve = require_resolve;

module.exports = backendPlus;
