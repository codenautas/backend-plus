"use strict";

var Path = require('path');
var backendPlus = require("../../..");
var MiniTools = require('mini-tools');

class AppExample extends backendPlus.AppBackend{
    constructor(){
        super();
        this.rootPath=Path.resolve(__dirname,'..');
        console.log('rootPath',this.rootPath);
        this.tableStructures = {};
        this.tableStructures.usuarios = require('./table-usuarios.js');
        this.tableStructures.fichas = require('./table-fichas.js');
    }
    configList(){
        return super.configList().concat([
            __dirname+'/def-server-fichas-config.yaml',
            __dirname+'/local-config.yaml'
        ]);
    }
}

new AppExample().start();