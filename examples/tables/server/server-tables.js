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
            {menuType:'menu', name:'periodic table', menuContent:[
                {menuType:'table', name:'ptable'  , label:'elements'},
                {menuType:'table', name:'pgroups' , label:'groups'  },
                {menuType:'table', name:'isotopes', label:'isotopes'},
                {menuType:'table', name:'new_element', label:'new element'},
                {menuType:'table', name:'new_isotopes', label:'new isotopes'},
                {menuType:'proc' , name:'count/without-isotopes', label:'count'}
            ]},
            {menuType:'table', name:'images', table:'element_images'},
            {menuType:'menu', name:'test', menuContent:[
                {menuType:'table', name:'bigint'},
            ]},
            {menuType:'menu', name:'config', menuContent:[
                {name:'users', menuType:'table'},
            ]},
        ]}
    }
    getTables(){
        return super.getTables().concat([
            'users',
            {name:'pgroups', fileName:'groups'},
            'ptable',
            'isotopes',
            'element_images',
            'cursors',
            'bigint',
            'new_element',
            'new_isotopes',
        ]);
    }
}

new AppExample().start();