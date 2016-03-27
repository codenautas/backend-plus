"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-disable no-console */

var timeStartBackendPlus = new Date();

var backendPlus = {};

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
var readYaml = require('read-yaml-promise');

require('best-globals').setGlobals(global);
var loginPlus = require('login-plus');
function md5(text){
    return crypto.createHash('md5').update(text).digest('hex');
}

function AppBackend(){
    this.app = express();
    this.tiposCeldas = {
        titulo:{
            completar: function completar(){
                
            }
        },
        pregunta:{
            completar: function completar(celda, be, idFormulario){
                be.registroVacio[celda.variable]=null;
                if(!celda.variable){
                    celda.variable = celda.pregunta.toLowerCase();
                }
                if(!celda.typeInfo){
                    celda.typeInfo={}
                    if(celda.opciones){
                        celda.typeInfo.typeName="enum";
                        celda.typeInfo.options=celda.opciones;
                    }else{
                        celda.typeInfo.typeName=celda["tipo-dato"]||celda.typeName;
                    }
                    (celda.typeInfo.options||[]).forEach(function(opcion){
                        opcion.option = coalesce(opcion.option,opcion.opcion,coalesce.throwError);
                        opcion.label  = coalesce(opcion.label ,opcion.texto ,coalesce.throwError);
                    });
                }

            }
        },
        matriz:{
            completar: function completar(){
                
            }
        },
    }
}
AppBackend.exposes={};

AppBackend.prototype.configList = function configList(){
    return [{login:{plus:{}}, log:{}, server:{"base-url":''}}];
}

AppBackend.prototype.readStructure = function readStructure(fileName){
    var be = this;
    return readYaml(fileName).then(function(estructura){
        _.forEach(estructura.formularios, function(formulario, idFormulario){
            _.forEach(formulario.celdas, function(celda, indexCelda){
                if(!celda.tipo){
                    for(var tipoCelda in be.tiposCeldas){
                        if(tipoCelda in celda){
                            celda.tipo = tipoCelda;
                        }
                    }
                }
                var defTipoCelda = be.tiposCeldas[celda.tipo];
                if(!defTipoCelda){
                    if(!celda.tipo){
                        for(var tipoCelda in celda){
                            throw new Error("falta el tipo de celda, se desconoce: "+tipoCelda);
                        }
                    }
                    throw new Error("tipo de celda desconocido: "+celda.tipo);
                }
                defTipoCelda.completar(celda, be, idFormulario);
            });
        });
        return estructura;
    });
}

AppBackend.prototype.start = function start(){
    var be = this;
    var mainApp;
    return Promises.start(function(){
        return MiniTools.readConfig(be.configList());
    }).then(function(config){
        be.config = config;
    }).then(function(){
        var startTS = new Date();
        return be.config.db && pg.connect(be.config.db).then(function(client){
            be.db = pg;
            if(!be.db.quoteObject){
                be.db.quoteObject=function(insaneName){
                    if(typeof insaneName!=="string"){
                        throw new Error("insaneName")
                    }
                    return JSON.stringify(insaneName);
                }
            }
            if(!be.db.quoteObjectList){
                be.db.quoteObjectList = function quoteObjectList(ObjectList){
                    return ObjectList.map(function(objectName){ return be.db.quoteObject(objectName); }).join(',');
                };
            }
            console.log('db-connected',changing(be.config.db,{password:undefined},changing.options({deletingValue:undefined})));
            return client;
        }).then(function(client){
            return client.query("SELECT current_timestamp as cts").fetchUniqueRow();
        }).then(function(data){
            var endTS = new Date();
            console.log('NOW in Database',data.row.cts);
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
        mainApp = express();
        mainApp.use(cookieParser());
        mainApp.use(bodyParser.urlencoded({extended:true}));
        if(be.config.log.req){
            mainApp.use(function(req,res,next){
                console.log('REQ',req.method,req.protocol,req.hostname,req.originalUrl,'from:',req.ip);
                next();
            });
        }
        if(be.config.login){
            mainApp.loginPlusManager = new loginPlus.Manager;
            be.config.login.plus.baseUrl = coalesce(be.config.login.plus.baseUrl, be.config.server["base-url"], '/');
            be.config.login.plus.userFieldName = be.config.login.plus.userFieldName || be.config.login.userFieldName;
            console.log('-------------------');
            console.log(be.config.login.plus);
            console.log('be.config.login', be.config.login);
            mainApp.loginPlusManager.init(mainApp,be.config.login.plus);
            mainApp.loginPlusManager.setValidator(
                function(username, password, done) {
                    be.getDbClient().then(function(client){
                        return client.query(
                            "SELECT  "+be.db.quoteObjectList(be.config.login.infoFieldList)+
                            "  FROM  "+be.db.quoteObject(be.config.login.table)+
                            "  WHERE "+be.db.quoteObject(be.config.login.userFieldName)+" = $1 "+
                            "    AND "+be.db.quoteObject(be.config.login.passFieldName)+" = $2 ",
                            [username, md5(password+username)]
                        ).fetchOneRowIfExists();
                    }).then(function(data){
                        if(data.rowCount==1){
                            done(null, data.row)
                        }else{
                            done('username or password error');
                        }
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
            console.log('******************');
            console.log(err);
            MiniTools.serveErr(req, res)(err);
        });
        return Promises.make(function(resolve, reject){
            try{
                mainApp.listen(be.config.server.port, resolve);
            }catch(err){
                reject(err);
            }
        });
    }).then(function(){
        if(be.config.server["kill-9"]){
            var kill9 = require('kill-9');
            be.app.use(kill9(be.config.server["kill-9"]));
        }
        return be.postConfig();
    }).then(function(){
        mainApp.use(be.config.server["base-url"],be.app);
    }).then(function(){
        console.log('listening on',be.config.server.port);
        be.timeReadyBackendPlus = new Date();
        console.log('READY',numeral((be.timeReadyBackendPlus-timeStartBackendPlus)/1000).format("0.0"),'s elapsed');
    }).catch(function(err){
        console.log('ERROR',err.stack || err);
    });
};

AppBackend.prototype.rootPath = './';

AppBackend.prototype.postConfig = function postConfig(){};

AppBackend.prototype.addLoggedServices = function addLoggedServices(){
    // var baseUrl=this.config.server["base-url"];
    this.app.use(/* baseUrl, */ MiniTools.serveJade(this.rootPath+'client',true));
    this.app.use(/* baseUrl, */ MiniTools.serveStylus(this.rootPath+'client',true));
    this.app.use(/* baseUrl, */ extensionServeStatic(this.rootPath+'client',{staticExtensions:'js'}));
    this.app.use(/* baseUrl, */ extensionServeStatic('./node_modules/js-to-html', {staticExtensions:'js'}));
    this.app.use(/* baseUrl, */ extensionServeStatic('./node_modules/ajax-best-promise/bin', {staticExtensions:'js'}));
    this.app.use(/* baseUrl, */ extensionServeStatic('./node_modules/tedede/lib', {staticExtensions:'js'}));
    this.app.use(/* baseUrl, */ extensionServeStatic('./node_modules/best-globals', {staticExtensions:'js'}));
}

backendPlus.AppBackend = AppBackend;

module.exports = backendPlus;