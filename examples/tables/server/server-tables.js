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
}

new AppExample().start();