"use strict";

var Path = require('path');
var backendPlus = require("../../..");
var MiniTools = require('mini-tools');

var staticConfigYaml = require('./def-config');

var changing = require('best-globals').changing;

class AppExample extends backendPlus.AppBackend{
    constructor(){
        super();
    }
    configStaticConfig(){
        super.configStaticConfig();
        this.setStaticConfig(staticConfigYaml);
    }
    get rootPath(){ return Path.resolve(__dirname,'..'); }
    addLoggedServices(){
        var be = this;
        super.addLoggedServices();
        this.app.get('/echo', function(req,res){
            res.end('echo');
        });
    }
    getProcedures(){
        var be = this;
        return super.getProcedures().then(function(procedures){
            return procedures.concat(
                require('./procedures-4test.js').map(be.procedureDefCompleter, be)
            );
        });
    }
    getMenu(context){
        return {menu:[
            {menuType:'menu', name:'tables', menuContent:[
                {menuType:'table', name:'simple'},
                {menuType:'table', name:'with_fk'},
            ]},
            {menuType:'menu', name:'procs', menuContent:[
                {name:'get_notices', menuType:'proc'},
            ]},
            {menuType:'menu', name:'config', menuContent:[
                {name:'users', menuType:'table'},
            ]},
        ]}
    }
    getTables(){
        return super.getTables().concat([
            'users',
            'simple',
            'with_fk',
        ]);
    }
}

module.exports = AppExample;