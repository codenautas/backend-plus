"use strict";

var Path = require('path');
var backendPlus = require("../lib/backend-plus");
var MiniTools = require('mini-tools');
var changing = require('best-globals').changing;

var Promises = require('best-promise');

class AppExample extends backendPlus.AppBackend{
    constructor(opts){
        super();
        this.rootPath=Path.resolve(__dirname,'..');
        this.tableStructures = {};
        this.tableStructures.simple = require('./table-simple.js');
        this.tableStructures.employees = require('./table-employees.js');
        this.optsForConfigList=opts;
    }
    configList(){
        return super.configList().concat([
            __dirname+'/simple-config.yaml',
            __dirname+'/local-config.yaml',
            this.optsForConfigList
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

module.exports = function(opts){
    var app = new AppExample(changing(opts,{server:{"silent-startup":true}}));
    return app.start({readConfig:{whenNotExist:'ignore'}, testing:true}).then(function(){
        return app;
    });
};