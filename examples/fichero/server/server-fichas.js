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
        this.tableStructures.users = require('./table-users.js');
        this.tableStructures.tipos_medios = require('./table-tipos_medios.js');
        this.tableStructures.medios = require('./table-medios.js');
        this.tableStructures.autores = require('./table-autores.js');
        this.tableStructures.fichas = require('./table-fichas.js');
        this.tableStructures.apariciones = require('./table-apariciones.js');
        this.tableStructures["apariciones-fichas"] = this.tableMixin('apariciones','fichas',{
            name:'apariciones-fichas',
            title:'apariciones'
        });
        this.tableStructures["apariciones-medios"] = this.tableMixin('apariciones','medios',{
            name:'apariciones-medios',
            title:'apariciones'
        });
    }
    configList(){
        return super.configList().concat([
            __dirname+'/def-server-fichas-config.yaml',
            __dirname+'/local-config.yaml'
        ]);
    }
    addPublicServices(mainApp, baseUrl){
        var be = this;
        var indexOpts = {};
        ['index.js'].forEach(function(fileName){
            mainApp.use(baseUrl+'/'+fileName, 
                MiniTools.serveFile(Path.join(be.rootPath+'/client/',fileName))
            );
        });
        mainApp.get(baseUrl+'/index.css',MiniTools.serveStylus(be.rootPath+'/client/index.styl'));
        mainApp.get(baseUrl+'/index',function(req, res, next){
            var rol = (req.user||{}).rol
            return MiniTools.serveJade(be.rootPath+'/client/index', changing(indexOpts,{
                isAdmin:rol=='admin',
                isUser:rol=='admin' || rol=='user'
            }))(req, res, next);
        });
        super.addPublicServices(mainApp, baseUrl);
    }
    addLoggedServices(){
        var be = this;
        var indexOpts = {};
        be.app.get('/admin',function(req, res, next){
            return MiniTools.serveJade(be.rootPath+'/client/admin', changing(indexOpts,{
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