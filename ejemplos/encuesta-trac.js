"use strict";

const util = require('util');

var Promises = require('best-promise');

var backendPlus = require("..");
var provisorio = {
    id:{enc: Math.random(), "for": "TRAC"},
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
    addLoggedServices(){
        super.addLoggedServices();
        this.app.get('/info-enc-act', function(req, res){
            res.end(JSON.stringify(provisorio));
        });
        var be = this;
        this.app.post('/guardar', function(req, res){
            var parametros=JSON.parse(req.body.info);
            console.log('entra a /guardar',parametros)
            var client;
            return be.getDbClient().then(function(cli) {
                client=cli;
                return client.query("BEGIN TRANSACTION").execute();
            }).then(function() {
                return client.query("SELECT id, contenido, estado FROM bep.datos WHERE id = $1 FOR UPDATE",[parametros.id]).fetchOneRowIfExists();
            }).then(function(data) {
                console.log('veo filas',data.rowCount,parametros)
                return Promises.sleep(1000).then(function(){
                    console.log('terminé de esperar',parametros)
                    return data;
                });
            }).then(function(data) {
                var sql = '';
                if(data.rowCount == 0) {
                    console.log('tengo que hacer el insert', parametros)
                    sql = "INSERT INTO bep.datos (id, contenido) SELECT $1, $2 FROM bep.datos WHERE NOT EXISTS (SELECT 1 FROM bep.datos WHERE id=$3)";
                    return client.query(sql,[parametros.id, registroVacio, parametros.id]).execute();
                }
            }).then(function() {
                console.log('termine el insert', parametros)
                var sql = "UPDATE bep.datos SET contenido = contenido || $2, estado='pendiente' WHERE id = $1 RETURNING contenido";
                // var nuevoValorCampo
                return client.query(sql,[parametros.id, {[parametros.variable]: parametros.valor}]).execute();
            }).then(function(datos) {
                return client.query("COMMIT").execute().then(function(){ return datos; });
            }).then(function(datos) {
                console.log("data", datos);
                res.end("recibi: "+JSON.stringify(datos.rows));
            }).catch(function(err) {
                console.log("error: "+err);
                res.end("error: "+err);
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