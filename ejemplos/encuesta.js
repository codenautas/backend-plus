"use strict";

const _ = require('lodash');
const util = require('util');
var readYaml = require('read-yaml-promise');
var MiniTools = require('mini-tools');
var fs = require('fs-promise');
var Promises = require('best-promise');

// var idEncuesta = Math.random();
var idEncuesta = 1001;

var backendPlus = require("..");

var backendEncuesta={};

require('best-globals').setGlobals(global);

class AppEncuesta extends backendPlus.AppBackend{
    constructor(){
        super();
    }
    configList(){
        return super.configList().concat([
            'ejemplos/def-config.yaml',
            'ejemplos/local-config.yaml'
        ]);
    }
    postConfig(){
        var be=this;
        be.registroVacio = {};
        be.readStructure(be.config.estructura.origen).then(function(estructura){
            be.estructura = estructura;
        }).catch(function(err){
            console.log('ERROR AL LEER LA ESTRUCTURA');
            console.log(err);
            console.log(err.stack);
        });
    }
    updateDatabase(req, parametros, updateSql, updateParameters) {
        var be=this;
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
                var sql = "INSERT INTO bep.datos (id, contenido) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM bep.datos WHERE id=$3)";
                return client.query(sql,[parametros.id, be.registroVacio, parametros.id]).execute();
            }
        }).then(function() {
            return client.query(updateSql, updateParameters).execute();
        }).then(function(datos) {
            return client.query("COMMIT").execute().then(function(){ return datos; });
        }).then(function(datos) {
        }).catch(function(err) {
            console.log("error: "+err);
        }).then(function(){
            return parametros;
        }).catch(function(err) {
            console.log("error al cerrar: "+err);
        }).then(function(){
            client.done();
        });
    }
    obtenerParametros(req){
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
            var client;
            be.getDbClient().then(function(cli){
                client=cli;
                return client.query("SELECT contenido, estado FROM bep.datos WHERE id = $1", [rta.id]).fetchOneRowIfExists();
            }).then(function(result){
                if(result.rowCount>0){
                    rta.datos=result.row.contenido;
                    rta.estado=result.row.estado;
                }else{
                    rta.datos=be.registroVacio;
                    rta.estado='vacio';
                }
                res.end(JSON.stringify(rta));
            }).catch(MiniTools.serveErr(req,res)).then(function(){
                client.done();
            });
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
            be.updateDatabase(req, parametros,
                              "UPDATE bep.datos SET contenido = $2, estado='ingresado' WHERE id = $1 RETURNING contenido",
                              [parametros.id, parametros.datos]);
            res.end("Encuesta finalizada");
        });
        this.app.post('/blanquear', function(req, res){
            var parametros=be.obtenerParametros(req);
            be.updateDatabase(req, parametros,
                              "UPDATE bep.datos SET contenido = $2, estado='vacio' WHERE id = $1 RETURNING contenido",
                              [parametros.id, be.registroVacio]);
            res.end("Encuesta blanqueada");
        });
        this.app.get('/metadatos/obtener', function(req, res){
            fs.readFile(be.config.estructura.origen,'utf8').then(function(data){
                res.end(data);
            }).catch(function(err){
                console.log(err.message);
            });
            
        });
        this.app.post('/metadatos/reescribir',function(req,res){
            var contenido=req.body.contenido;
            var file=be.config.estructura.origen;
            Promise.all([
                be.config.estructura.origen,
                be.config.estructura.origen.replace(/^(.*[\/\\])([^\/\\]+).yaml$/,'$1local-copy-$2')+(new Date()).toISOString().replace(/[:.]/g,'-')+'.yaml'
            ].map(function(fileName){
                return fs.writeFile(fileName,contenido,'utf8').then(function(){
                    console.log('grabado ok', fileName);
                    return 'ok';
                }, function(err){
                    console.log('grabado con error',fileName, err);
                    return 'error al grabar '+fileName+': '+err.message;
                })
            })).then(function(resultados){
                res.end('grabado '+JSON.stringify(resultados));
            });
        });
        this.app.get('/about-info', function(req, res){
            if(req.user.rol=='admin'){
                var client;
                be.getDbClient().then(function(cli){
                    client=cli;
                    return client.query("select * from bep.parametros").fetchUniqueRow();
                }).then(function(sysParams){
                    if(sysParams.row.full_log){
                        res.header('Content-Type','text/plain');
                        res.end(JSON.stringify(be.config,null,'    ').replace(/\n(.*".*pass.*":\s*").*(",?)\n/g,'\n$1********$2\n'));
                    }else{
                        res.status(401);
                        res.end("Not full log");
                    }
                }).catch(MiniTools.serveErr(req,res)).then(function(){
                    client.done();
                });
            }else{
                res.status(401);
                res.end("No autorizado");
            }
        });
    }
    get rootPath(){ return __dirname +'/'; }
}

backendEncuesta.AppEncuesta = AppEncuesta;

module.exports=backendEncuesta;
