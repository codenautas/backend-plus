"use strict";

var Path = require('path');
var backendPlus = require("../../..");
var MiniTools = require('mini-tools');

var Promises = require('best-promise');

class AppExample extends backendPlus.AppBackend{
    constructor(){
        super();
        this.rootPath=Path.resolve(__dirname,'..');
        console.log('rootPath',this.rootPath);
        this.tableStructures = {};
        this.tableStructures.ptable = require('./table-ptable.js');
        this.tableStructures.pgroups = require('./table-groups.js');
    }
    configList(){
        return super.configList().concat([
            __dirname+'/def-server-tables-config.yaml',
            __dirname+'/local-config.yaml'
        ]);
    }
    addLoggedServices(){
        var be = this;
        super.addLoggedServices();
        this.app.get('/echo', function(req,res){
            res.end('echo');
        });
    }
}

new AppExample().start();