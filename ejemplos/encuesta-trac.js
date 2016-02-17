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
                        { opcion: "a", texto:"24hs"},
                        { opcion: "b", texto:"48hs"},
                    ]},
                    { tipo:'PREGUNTA', id: "2", variable: "v2", texto: "Tiempo que llevo la asistencia", opciones:[
                        { opcion: "a", texto:"24hs"},
                        { opcion: "b", texto:"48hs"},
                    ]},
                ],
                datos:{v1: "1", v2: null, v3: null, v4: null, v5: null}
            };
            res.end(JSON.stringify(provisorio));
        });
    }
    get rootPath(){ return __dirname +'/'; }
}

new AppTrac().start();