"use strict";

var Path = require('path');
var backendPlus = require("../../..");
var MiniTools = require('mini-tools');

var changing = require('best-globals').changing;

class AppExample extends backendPlus.AppBackend{
    constructor(){
        super();
        this.rootPath=Path.resolve(__dirname,'..');
        console.log('rootPath',this.rootPath);
        this.tableStructures = {};
        this.tableStructures.ptable = require('./table-ptable.js');
        this.tableStructures.pgroups = require('./table-groups.js');
        this.tableStructures.isotopes = require('./table-isotopes.js');
        this.tableStructures.element_images = require('./table-element_images.js');
        this.tableStructures.cursors = require('./table-cursors.js');
        this.tableStructures.bigint = require('./table-bigint.js');
        this.tableStructures.users = require('./table-users.js');
    }
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
            {name:'tablas', menuType:'menu', menuContent:[
                {name:'ptable', label:'periodic table', menuType:'table'},
                {name:'pgroups', label:'groups of elements', menuType:'table'},
                {name:'isotopes', label:'groups of elements', menuType:'table'},
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
}

new AppExample().start();