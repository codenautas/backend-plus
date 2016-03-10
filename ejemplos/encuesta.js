"use strict";

const _ = require('lodash');
const util = require('util');
var readYaml = require('read-yaml-promise');
var MiniTools = require('mini-tools');

var Promises = require('best-promise');

// var idEncuesta = Math.random();
var idEncuesta = 1001;

var backendPlus = require("..");

var backendEncuesta={};

require('best-globals').setGlobals(global);

class AppEncuesta extends backendPlus.AppBackend{
    constructor(){
        super();
        this.tiposCeldas={
            titulo:{
                completar(){
                    
                }
            },
            pregunta:{
                completar(celda, be, idFormulario){
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
                            celda.typeInfo.typeName=celda["tipo-dato"];
                        }
                        (celda.typeInfo.options||[]).forEach(function(opcion){
                            opcion.option = coalesce(opcion.option,opcion.opcion,coalesce.throwError);
                            opcion.label  = coalesce(opcion.label ,opcion.texto ,coalesce.throwError);
                        });
                    }

                }
            }
        }
    }
    configList(){
        return super.configList().concat([
            'ejemplos/def-config.yaml',
            'ejemplos/local-config.yaml'
        ]);
    }
    postConfig(){
        var be=this;
        return readYaml(be.config.estructura.origen).then(function(estructura){
            be.estructura = estructura;
            // var test=be.estructura['main-form']
            be.registroVacio = {};
            _.forEach(be.estructura.formularios, function(formulario, idFormulario){
                _.forEach(formulario.celdas, function(celda, indexCelda){
                    if(!celda.tipo){
                        for(var tipoCelda in be.tiposCeldas){
                            if(tipoCelda in celda){
                                celda.tipo = tipoCelda;
                            }
                        }
                    }
                    var defTipoCelda = be.tiposCeldas[celda.tipo];
                    defTipoCelda.completar(celda, be, idFormulario);
                });
            });
            /*
            console.log('***************************')
            console.dir(be.estructura);
            console.dir(be.estructura.formularios[be.estructura["main-form"]].celdas, {depth:8});
            */
        });
    }
    updateDatabase(req, parametros, updateSql, updateParameters) {
        var be=this;
        //console.log('updateDatabase', parametros, updateSql, updateParameters);
        var client;
        return this.getDbClient().then(function(cli) {
            client=cli;
            return client.query("BEGIN TRANSACTION").execute();
        }).then(function() {
            return client.query("LOCK TABLE bep.datos").execute();
        }).then(function() {            
            return client.query("SELECT id, contenido, estado FROM bep.datos WHERE id = $1",[parametros.id]).fetchOneRowIfExists();
        }).then(function(data) {
            if(data.rowCount == 0) {
                //console.log('tengo que hacer el insert', parametros)
                var sql = "INSERT INTO bep.datos (id, contenido) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM bep.datos WHERE id=$3)";
                return client.query(sql,[parametros.id, be.registroVacio, parametros.id]).execute();
            }
        }).then(function() {
            //console.log('termine el insert', parametros)
            return client.query(updateSql, updateParameters).execute();
        }).then(function(datos) {
            return client.query("COMMIT").execute().then(function(){ return datos; });
        }).then(function(datos) {
            //console.log("data", datos);
        }).catch(function(err) {
            console.log("error: "+err);
        }).then(function(){
            client.done();
            return parametros;
        }).catch(function(err) {
            console.log("error al cerrar: "+err);
        });
    }
    obtenerParametros(req){
       // console.log("########################",req.body);
        var parametros=JSON.parse(req.body.info);
        if(req.user.iddato && req.query.id && req.user.iddato != req.query.id){
            throw new Error("No coinciden los ID");
        }
        /////////// OJO, FALTA VER SI TIENE PERMISO EN CASO DE QUE NO SEA UNA ORGANIZACIÓN SIMPLE
        return parametros;
    }
    addLoggedServices(){
        super.addLoggedServices();
        var be = this;
        this.app.post('/info', function(req, res){
            res.end('ok!');
        });
        this.app.post('/info-enc-act', function(req, res){
            var rta={};
            var parametros=be.obtenerParametros(req);
            rta.id = req.user.iddato || parametros.id;
            rta.estructura = be.estructura;
            be.getDbClient().then(function(client){
                return client.query("SELECT contenido, estado FROM bep.datos WHERE id = $1", [rta.id]).fetchOneRowIfExists().then(function(result){
                    if(result.rowCount>0){
                        rta.datos=result.row.contenido;
                        rta.estado=result.row.estado;
                    }else{
                        rta.datos=be.registroVacio;
                        rta.estado='vacio';
                    }
                    res.end(JSON.stringify(rta));
                });
            }).catch(MiniTools.serveErr(req,res));
        });
        this.app.post('/guardar', function(req, res){
            var parametros=be.obtenerParametros(req);
            be.updateDatabase(req, parametros,
                              "UPDATE bep.datos SET contenido = contenido || $2, estado='pendiente' WHERE id = $1 RETURNING contenido",
                              [parametros.id, {[parametros.variable]: parametros.valor}]);
            res.end("recibi: "+JSON.stringify(parametros));
        });
        this.app.post('/finalizar', function(req, res){
            var parametros=be.obtenerParametros(req);
            //console.log('entra a /finalizar',parametros);
            be.updateDatabase(req, parametros,
                              "UPDATE bep.datos SET contenido = $2, estado='ingresado' WHERE id = $1 RETURNING contenido",
                              [parametros.id, parametros.datos]);
            res.end("Encuesta finalizada");
        });
        this.app.post('/blanquear', function(req, res){
            var parametros=be.obtenerParametros(req);
            //console.log('entra a /blanquear',parametros);
            be.updateDatabase(req, parametros,
                              "UPDATE bep.datos SET contenido = $2, estado='vacio' WHERE id = $1 RETURNING contenido",
                              [parametros.id, be.registroVacio]);
            res.end("Encuesta blanqueada");
        });
    }
    get rootPath(){ return __dirname +'/'; }
}

backendEncuesta.AppEncuesta = AppEncuesta;

module.exports=backendEncuesta;
