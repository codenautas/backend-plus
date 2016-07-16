"use strict";
/*jshint eqnull:true */
/*jshint node:true */
/*eslint-disable no-console */

var backendPlus = {};

var timeStartBackendPlus = new Date();

var _ = require('lodash');
var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Path = require('path');
var numeral = require('numeral');
var MiniTools = require('mini-tools');
var Promises = require('best-promise');
var crypto = require('crypto');
var extensionServeStatic = require('extension-serve-static');
var pg = require('pg-promise-strict');
pg.easy = true;
var readYaml = require('read-yaml-promise');

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
/*
function AppBackend(){

    this.tiposCeldas = {
        titulo:{
            completar: function completar(){
                
            }
        },
        pregunta:{
            completar: function completar(celda, be, idFormulario, celdasAgregadas){
                if(!celda.variable){
                    celda.variable = celda.pregunta.toLowerCase();
                }
                if(!celda.typeInfo && !celda.typeName && !celda["tipo-dato"] && !celda.opciones){
                    throw new Error("falta indicar typeInfo en celda");
                }
                if(!celda.typeInfo || typeof celda.typeInfo === 'string'){
                    celda.typeInfo={typeName:celda.typeInfo};
                    if(!celda.typeInfo.typeName){
                        celda.typeInfo.typeName=celda["tipo-dato"]||celda.typeName;
                        if(!celda.typeInfo.typeName){
                            if(celda.opciones){
                                celda.typeInfo.typeName="enum";
                                celda.typeInfo.options=celda.opciones;
                            }else{
                                throw new Error("falta indicar typeInfo en celda, no se pudo calcular");
                            }
                        }
                    }
                    (celda.typeInfo.options||[]).forEach(function(opcion){
                        opcion.option = coalesce(opcion.option,opcion.opcion,coalesce.throwError);
                        opcion.label  = coalesce(opcion.label ,opcion.texto ,coalesce.throwError);
                        opcion.more = !!(opcion.salto || opcion.especifique);
                    });
                }
                if(celda.typeInfo.typeName=='multiple'){
                    celda.tipo='texto';
                    celda.subtipo='multiple';
                    celda.opciones.forEach(function(opcion){
                        var variable=(celda.pregunta+'_'+opcion.opcion).toLowerCase();
                        var celdaNueva={
                            tipo: 'pregunta',
                            subtipo: 'multiple',
                            pregunta: celda.pregunta,
                            variable: variable,
                            texto: opcion.texto,
                            typeInfo: {
                                typeName: 'boolean'
                            },
                        };
                        if(celda['expresion-habilitar']){
                            celdaNueva['expresion-habilitar']=celda['expresion-habilitar'];
                        }
                        celdasAgregadas.push(celdaNueva);
                        be.registrosVacios[idFormulario][variable]=null;
                    });
                }else{
                    be.registrosVacios[idFormulario][celda.variable]=null;
                }
            }
        },
        texto: {
            completar: function completar(){
            },
            explicitar:true,
        },
        matriz:{
            completar: function completar(){
                
            }
        },
        especial:{
            completar: function completar(){}
        }
    };
}
*/
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
            }
        }, 
        log:{}, 
        server:{"base-url":''}
    }];
};
//
//AppBackend.prototype.readStructure = function readStructure(fileName){
//    var be = this;
//    be.almacenVacio={
//        formularios:{}
//    };
//    be.registrosVacios={};
//    return readYaml(fileName).then(function(estructura){
//        _.forEach(estructura.formularios, function(formulario, idFormulario){
//            // var nuevoArregloCeldas=[]; // comentada por no usada
//            be.registrosVacios[idFormulario]={};
//            if(formulario.multiple){
//                be.almacenVacio.formularios[idFormulario]=[{registro: be.registrosVacios[idFormulario]}]; // OJO generalizar, el problema es el boton continuar
//            }else{
//                be.almacenVacio.formularios[idFormulario]={registro: be.registrosVacios[idFormulario]};
//            }
//            
//            formulario.celdas = formulario.celdas.reduce(function(nuevoArreglo ,celda){
//                if(!celda.tipo){
//                    for(var tipoCelda in be.tiposCeldas){
//                        if(tipoCelda in celda && !(be.tiposCeldas[tipoCelda].explicitar)){
//                            celda.tipo = tipoCelda;
//                        }
//                    }
//                }
//                var defTipoCelda = be.tiposCeldas[celda.tipo];
//                
//                if(!defTipoCelda){
//                    if(!celda.tipo){
//                        /*jshint forin: false */
//                        for(var tipoCelda2 in celda){
//                            throw new Error("falta el tipo de celda, se desconoce: "+tipoCelda2);
//                        }
//                        /*jshint forin: true */
//                    }
//                    throw new Error("tipo de celda desconocido: "+celda.tipo);
//                }
//                var celdasAgregadas=[];
//                defTipoCelda.completar(celda, be, idFormulario, celdasAgregadas);
//                celda.tipo=celda.tipo||'';
//                celda.subtipo=celda.subtipo||'';
//                nuevoArreglo.push(celda);
//                while(celdasAgregadas.length){
//                    nuevoArreglo.push(celdasAgregadas.shift());
//                }
//                return nuevoArreglo;
//            }, []);
//        });
//        estructura.registrosVacios=be.registrosVacios;
//        return estructura;
//        
//    });
//};

AppBackend.prototype.start = function start(opts){
    var be = this;
    var mainApp;
    var verboseStartup;
    opts = opts || {};
    if(opts.testing){
        this.getMainApp = function getMainApp(){ return mainApp };
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
    }
    return Promises.start(function(){
        return MiniTools.readConfig(be.configList(),opts.readConfig);
    }).then(function(config){
        be.config = config;
        verboseStartup=!be.config.server["silent-startup"];
    }).then(function(){
        // var startTS = new Date(); // comentada por no usada
        return be.config.db && pg.connect(be.config.db).then(function(client){
            be.db = pg;
            if(!be.db.quoteObject){
                be.db.quoteObject=function(insaneName){
                    if(typeof insaneName!=="string"){
                        throw new Error("insaneName");
                    }
                    return JSON.stringify(insaneName);
                };
            }
            if(!be.db.quoteObjectList){
                be.db.quoteObjectList = function quoteObjectList(ObjectList){
                    return ObjectList.map(function(objectName){ return be.db.quoteObject(objectName); }).join(',');
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
            be.getDbClient = function getDbClient(){
                return pg.connect(be.config.db).then(function(client){
                    var search_path = be.config.db.search_path || [be.config.db.schema];
                    if(search_path.length>0){
                        return client.query("set SEARCH_PATH TO "+be.db.quoteObjectList(search_path)).execute().then(function(){
                            return client;
                        });
                    }else{
                        return client;
                    }
                });
            };
            // be.getDbClient.returns=be.Client;
        });
    }).then(function(){
        if(be.config.server["kill-9"]){
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
        mainApp.use(be.config.server["base-url"]+'/unlogged',extensionServeStatic(Path.join(be.rootPath,'unlogged'),{staticExtensions:['js','hmtl','css','png','jpg','jpeg']}));
        if(be.config.login){
            mainApp.loginPlusManager = new loginPlus.Manager();
            be.config.login.plus.baseUrl = coalesce(be.config.login.plus.baseUrl, be.config.server["base-url"], '/');
            be.config.login.plus.userFieldName = be.config.login.plus.userFieldName || be.config.login.userFieldName;
            if(verboseStartup){
                console.log('-------------------');
                console.log('be.config.login', be.config.login);
            }
            mainApp.loginPlusManager.init(mainApp,be.config.login.plus);
            mainApp.loginPlusManager.setValidator(
                function(username, password, done) {
                    var client;
                    be.getDbClient().then(function(cli){
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
                            }else if(!!data.row.locked){
                                done(null,false,{message:be.config.login.messages.lockedFail});
                            }else{
                                done(null, data.row);
                            }
                        }else{
                            done(null,false,{message:be.config.login.messages.userOrPassFail});
                        }
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
                    var value = req[source][paramDef.name];
                    value = myOwn.encoders[paramDef.encoding].parse(value);
                    params[paramDef.name] = value;
                });
                var context={be, user:req.user};
                return Promises.start(function(){
                    return be.getDbClient();
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
                    result = myOwn.encoders[procedureDef.encoding].stringify(result);
                    res.end(result);
                }).catch(MiniTools.serveErr(req,res));
            });
        });
    });
};

AppBackend.prototype.addLoggedServices = function addLoggedServices(){
    this.app.use(MiniTools.serveJade(Path.resolve(this.rootPath,'client'),true));
    this.app.use(MiniTools.serveStylus(Path.resolve(this.rootPath,'client'),true));
    this.app.use(MiniTools.serveStylus(Path.join(__dirname,'../for-client'),true));
    this.app.use(extensionServeStatic(Path.resolve(this.rootPath,'client'),{staticExtensions:'js'}));
    this.app.use(extensionServeStatic(Path.join(__dirname,'../for-client'),{staticExtensions:['js','css','styl','jade','html']}));
    this.app.use(extensionServeStatic('./node_modules/lodash', {staticExtensions:'js'}));
    this.app.use(extensionServeStatic('./node_modules/require-bro/lib', {staticExtensions:'js'}));
    this.app.use(extensionServeStatic('./node_modules/js-to-html', {staticExtensions:'js'}));
    this.app.use(extensionServeStatic('./node_modules/login-plus/for-client', {staticExtensions:'js'}));
    this.app.use(extensionServeStatic('./node_modules/ajax-best-promise/bin', {staticExtensions:'js'}));
    this.app.use(extensionServeStatic('./node_modules/typed-controls/lib', {staticExtensions:'js'}));
    this.app.use(extensionServeStatic('./node_modules/best-globals', {staticExtensions:'js'}));
    this.app.use(extensionServeStatic('./node_modules/regexplicit', {staticExtensions:'js'}));
    this.app.use('/img',extensionServeStatic(Path.join(__dirname,'../for-client/img'), {staticExtensions:['png','jpg','jpeg']}));
    this.app.use('/keep-alive', MiniTools.serveText('1'));
    var logo=this.config.logo;
    if(logo){
        this.app.use(extensionServeStatic(logo.path,{staticExtensions:'png'}))
    }
};

AppBackend.prototype.procedureDefCompleter = function procedureDefCompleter(procedureDef){
    procedureDef.method=procedureDef.method||this.defaultMethod;
    procedureDef.encoding=procedureDef.encoding||'yaml';
    procedureDef.parameters.forEach(function(paramDef){
        paramDef.encoding=paramDef.encoding||'yaml';
    });
    return procedureDef;
};

AppBackend.prototype.getProcedures = function getProcedures(){
    return Promises.resolve(require('./procedures-table.js').map(this.procedureDefCompleter, this));
};

AppBackend.prototype.tableDefCompleter = require('./table-def-completer.js');

backendPlus.AppBackend = AppBackend;

module.exports = backendPlus;