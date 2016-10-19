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
        this.tableStructures.publicaciones = require('./table-publicaciones.js');
    }
    configList(){
        return super.configList().concat([
            __dirname+'/def-server-fichas-config.yaml',
            __dirname+'/local-config.yaml'
        ]);
    }
    addLoggedServices(){
        var be = this;
        var indexOpts = {};
        be.app.get('/',function(req, res, next){
            return MiniTools.serveJade(be.rootPath+'client/index', changing(indexOpts,{
                isAdmin:req.user.rol=='admin',
                isUser:req.user.rol=='admin' || req.user.rol=='user'
            }))(req, res, next);
        });
        super.addLoggedServices();
        this.app.get('/echo', function(req,res){
            res.end('echo');
        });
    }
    /*
    getProcedures(){
        var be = this;
        return super.getProcedures().then(function(procedures){
            return procedures.concat(
                require('./procedures-examples.js').map(be.procedureDefCompleter, be)
            );
        });
    }
    */
}

new AppExample().start();