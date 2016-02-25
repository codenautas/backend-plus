"use strict";

const util = require('util');

var Promises = require('best-promise');

// var idEncuesta = Math.random();
var idEncuesta = 1001;

var backendPlus = require("..");
var provisorio = {
    id:{enc: idEncuesta, "for": "TRAC"},
    estructura:[
        { tipo:'TITULO', texto:"EVALUACION DE SOPORTE INFORMATICO"},
        { tipo:'PREGUNTA', id: "1", variable: "v1", texto: "Tiempo transcurrido entre el pedido y la asistencia", opciones:[
            {opcion: "a", texto:"24hs"},
            {opcion: "b", texto:"48hs"},
            {opcion: "c", texto:"72hs"},
            {opcion: "d", texto:"Más de 72 hs"}
        ]},
        { tipo:'PREGUNTA', id: "2", variable: "v2", texto: "Tiempo que llevo la asistencia", opciones:[
            {opcion: "a", texto:"24hs"},
            {opcion: "b", texto:"48hs"},
            {opcion:"c",  texto:"72hs"},
            {opcion:"d",  texto:"Más de 72hs"}
        ]},
        {tipo:'PREGUNTA', id:"3", variable:"v3",texto: "Cumplimiento con la asistencia",opciones:[
            {opcion: "a", texto:"Total"},
            {opcion:"b",  texto:"Parcial"},
            {opcion:"c",  texto:"No cumplió (aclarar en observaciones)"},
            {opcion:"d",  texto:"No aplica"}
        ]},
        {tipo:"PREGUNTA", id:"4", variable:"v4",texto: "Calidad de la asistencia",opciones:[
            {opcion:"a",  texto:"Muy buena"},
            {opcion:"b",  texto:"Buena"},
            {opcion:"c",  texto:"Regular (aclarar en observaciones)"},
            {opcion:"d",  texto:"Mala (aclarar en observaciones)"},
            {opcion:"e",  texto:"No aplica"}
        ]}
    ],
    datos:{v1: "a", v2: "b", v3: null, v4: null, v5: null},
    estado:'con-datos',
};

var registroVacio={};

provisorio.estructura.forEach(function(celda){
    if(celda.tipo=='PREGUNTA'){
        registroVacio[celda.variable]=null;
    }
});

class AppTrac extends backendPlus.AppBackend{
    configList(){
        return super.configList().concat([
            'ejemplos/def-config.yaml',
            'ejemplos/local-config.yaml'
        ]);
    }
    
    updateDatabase(req, parametros, updateSql, updateParameters) {
        console.log('updateDatabase', parametros, updateSql, updateParameters);
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
                console.log('tengo que hacer el insert', parametros)
                var sql = "INSERT INTO bep.datos (id, contenido) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM bep.datos WHERE id=$3)";
                return client.query(sql,[parametros.id, registroVacio, parametros.id]).execute();
            }
        }).then(function() {
            console.log('termine el insert', parametros)
            return client.query(updateSql, updateParameters).execute();
        }).then(function(datos) {
            return client.query("COMMIT").execute().then(function(){ return datos; });
        }).then(function(datos) {
            console.log("data", datos);
        }).catch(function(err) {
            console.log("error: "+err);
        }).then(function(){
            client.done();
            return parametros;
        }).catch(function(err) {
            console.log("error al cerrar: "+err);
        });
    }
    addLoggedServices(){
        super.addLoggedServices();
        var be = this;
        this.app.get('/info-enc-act', function(req, res){
            res.end(JSON.stringify(provisorio));
        });
        this.app.post('/guardar', function(req, res){
            var parametros=JSON.parse(req.body.info);
            be.updateDatabase(req, parametros,
                              "UPDATE bep.datos SET contenido = contenido || $2, estado='pendiente' WHERE id = $1 RETURNING contenido",
                              [parametros.id, {[parametros.variable]: parametros.valor}]);
            res.end("recibi: "+JSON.stringify(parametros));
        });
        this.app.post('/finalizar', function(req, res){
            var parametros=JSON.parse(req.body.info);
            console.log('entra a /finalizar',parametros);
            be.updateDatabase(req, parametros,
                              "UPDATE bep.datos SET contenido = $2, estado='ingresado' WHERE id = $1 RETURNING contenido",
                              [parametros.id, parametros.datos]);
            res.end("Encuesta finalizada");
        });
        this.app.post('/blanquear', function(req, res){
            var parametros=JSON.parse(req.body.info);
            console.log('entra a /blanquear',parametros);
            be.updateDatabase(req, parametros,
                              "UPDATE bep.datos SET contenido = $2, estado='vacio' WHERE id = $1 RETURNING contenido",
                              [parametros.id, registroVacio]);
            res.end("Encuesta blanqueada");
        });
        this.app.post('/enc-status', function(req, res){
            var client;
            var estado;
            return be.getDbClient().then(function(cli) {
                client=cli;
                return client.query("SELECT estado FROM bep.datos WHERE id = $1",[provisorio.id]).fetchOneRowIfExists();
            }).then(function(data) {
                console.log("data",data);
                res.end(JSON.stringify(data.rowCount==0?{estado:'vacio'}:data.row));
            }).catch(function(err) {
                console.log("error: "+err);
            }).then(function(){
                client.done();
            }).catch(function(err) {
                console.log("error al cerrar: "+err);
            });
        });
    }
    get rootPath(){ return __dirname +'/'; }
}

new AppTrac().start();