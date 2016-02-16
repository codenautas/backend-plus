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
    get rootPath(){ return __dirname +'/'; }
}

new AppTrac().start();