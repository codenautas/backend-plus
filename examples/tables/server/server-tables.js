"use strict";

var Path = require('path');
var backendPlus = require("../../..");
var MiniTools = require('mini-tools');

var changing = require('best-globals').changing;

class AppExample extends backendPlus.AppBackend{
    constructor(){
        super();
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
                require('./procedures-examples.js').map(be.procedureDefCompleter, be)
            );
        });
    }
    getMenu(context){
        return {menu:[
            {name:'periodic table', menuType:'menu', menuContent:[
                {name:'ptable', label:'elements', menuType:'table'},
                {name:'pgroups', label:'groups', menuType:'table'},
                {name:'isotopes', label:'isotopes', menuType:'table'},
            ]},
            {name:'images', menuType:'table', table:'element_images'},
            {name:'test', menuType:'menu', menuContent:[
                {name:'bigint', menuType:'table'},
            ]},
            {name:'config', menuType:'menu', menuContent:[
                {name:'users', menuType:'table'},
            ]},
        ]}
    }
    getTables(){
        return super.getTables().concat([
            'users',
            'ptable',
            {name:'pgroups', fileName:'groups'},
            'isotopes',
            'element_images',
            'cursors',
            'bigint',
        ]);
    }
}

new AppExample().start();