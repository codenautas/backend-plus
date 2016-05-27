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
        this.releerMetadatos();
    }
    updateDatabase(parametros, updateSql, updateParameters) {
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
                var sql = "INSERT INTO bep.datos (id, contenido, cambios) SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT 1 FROM bep.datos WHERE id=$4)";
                return client.query(sql,[parametros.id, be.almacenVacio, be.almacenVacio, parametros.id]).execute();
            }
        }).then(function() {
            return client.query(updateSql, updateParameters).execute();
        }).then(function(datos) {
            return client.query("COMMIT").execute().then(function(){ return datos; });
        }).then(function(datos) {
        }).catch(function(err) {
            console.log("error: "+err);
            console.log(err.stack);
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
    releerMetadatos(){
        var be=this;
        return Promises.start(function(){
            return be.readStructure(be.config.estructura.origen);
        }).then(function(estructura){
            be.estructura = estructura;
            return "metadatos ok";
        }).catch(function(err){
            console.log('ERROR AL LEER LA ESTRUCTURA');
            console.log(err);
            console.log(err.stack);
        });
    }
    addLoggedServices(){
        super.addLoggedServices();
        var be = this;
        this.app.post('/info', function(req, res){
            res.end('ok!');
        });
        this.app.post('/info-enc-act', function(req, res){
            var rta={"modo-devel": new Date(be.config["modo-devel"].hasta)>new Date()  };
            var parametros=be.obtenerParametros(req);
            rta.id = req.user.iddato || parametros.id;
            rta.estructura = be.estructura;
            var client;
            be.getDbClient().then(function(cli){
                client=cli;
                return client.query("SELECT contenido, estado FROM bep.datos WHERE id = $1", [rta.id]).fetchOneRowIfExists();
            }).then(function(result){
                if(result.rowCount>0){
                    rta.almacen=result.row.contenido;
                    rta.estado=result.row.estado;
                }else{
                    rta.almacen=be.almacenVacio;
                    rta.estado='vacio';
                }
                res.end(JSON.stringify(rta));
            }).catch(MiniTools.serveErr(req,res)).then(function(){
                client.done();
            });
        });
        this.app.post('/set-status', function(req, res){
            var parametros=be.obtenerParametros(req);
            be.updateDatabase(
                parametros,
                "UPDATE bep.datos SET estado=$2 WHERE id = $1 RETURNING contenido",
                [parametros.id, parametros.estado]
            ).then(function(result){
                res.end("recibi: "+JSON.stringify(parametros));
            },function(err){
                res.end("error: "+err.message);
            });
        });
        this.app.post('/guardar', function(req, res){
            var parametros=be.obtenerParametros(req);
            be.updateDatabase(
                parametros,
                "UPDATE bep.datos SET contenido = $2, estado='pendiente' WHERE id = $1 RETURNING contenido",
                [parametros.id, parametros.almacen]
            ).then(function(result){
                res.end("recibi: "+JSON.stringify(parametros));
            },function(err){
                res.end("error: "+err.message);
            });
        });
        this.app.post('/guardar-cambios', function(req, res){
            var parametros=be.obtenerParametros(req);
            // basado en:
            // select jsonb_set('{"formularios": {"TCNAI" : {"variables": {}}, "TCNAA" : [{"variables": {"v1":"a"}}, {"variables": {"v2":"b"}} ] }}', '{formularios,TCNAA,1,variables,t3}', '3')
            var ruta=['formularios', parametros.ruta.formulario];
            if(parametros.ruta.orden!=null){
                ruta.push(parametros.ruta.orden.toString());
            }
            ruta.push('registro');
            ruta.push(parametros.ruta.variable);
            be.updateDatabase(
                parametros,
                "UPDATE bep.datos SET cambios = jsonb_set(cambios, $2, $3), estado='pendiente' WHERE id = $1 RETURNING contenido",
                [parametros.id, ruta, parametros.valor]
            );
            res.end("recibi: "+JSON.stringify(parametros));
        });
        this.app.post('/finalizar', function(req, res){
            var parametros=be.obtenerParametros(req);
            be.updateDatabase(
                parametros,
                "UPDATE bep.datos SET contenido = $2, estado='ingresado' WHERE id = $1 RETURNING contenido",
                [parametros.id, parametros.almacen]
            );
            res.end("Encuesta finalizada");
        });
        this.app.post('/blanquear', function(req, res){
            var parametros=be.obtenerParametros(req);
            be.updateDatabase(
                parametros,
                "UPDATE bep.datos SET contenido = $2, cambios = $3, estado='vacio' WHERE id = $1 RETURNING contenido",
                [parametros.id, be.almacenVacio, be.almacenVacio]
            );
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
                be.config.estructura.origen.replace(/^(.*[\/\\])([^\/\\]+).yaml$/,function(matchCompleto,path,fileName){
                    return path+'copias/'+fileName;
                })+(new Date()).toISOString().replace(/[:.]/g,'-')+'.yaml'
            ].map(function(fileName){
                return fs.writeFile(fileName,contenido,'utf8').then(function(){
                    console.log('grabado ok', fileName);
                    return 'ok';
                }, function(err){
                    console.log('grabado con error',fileName, err);
                    return 'error al grabar '+fileName+': '+err.message;
                })
            })).then(function(resultados){
                return Promises.start(function(){
                    return be.releerMetadatos();
                }).then(function(result){
                    resultados.push(result);
                    console.log("resultados",resultados)
                    return resultados;
                });
            }).then(function(resultados){
                console.log("resultados",resultados)
                res.end('grabado '+JSON.stringify(resultados));
            })
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
