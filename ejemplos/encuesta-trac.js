"use strict";

const util = require('util');

var backendPlus = require("..");

class AppTrac extends backendPlus.AppBackend{
    /*
    constructor(){
        super();
    }
    */
    configList(){
        return super.configList().concat([
            'ejemplos/def-config.yaml',
            'ejemplos/local-config.yaml'
        ]);
    }
    addLoggedServices(){
        super.addLoggedServices();
        this.app.get('/info-enc-act', function(req, res){
            var provisorio={
                id:{enc: 9921, "for": "TRAC"},
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
            res.end(JSON.stringify(provisorio));
        });
    }
    get rootPath(){ return __dirname +'/'; }
}

new AppTrac().start();