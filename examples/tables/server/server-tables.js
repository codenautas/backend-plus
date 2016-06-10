"use strict";

var Path = require('path');
var backendPlus = require("../../..");
var tableStructures = {};

var MiniTools = require('mini-tools');

tableStructures.ptable = require('./table-ptable.js');
tableStructures.groups = require('./table-groups.js');

class AppExample extends backendPlus.AppBackend{
    constructor(){
        super();
        this.rootPath=Path.resolve(__dirname,'..');
        console.log('rootPath',this.rootPath);
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
        this.app.post('/table/structure', function(req, res){
            console.log('params',req.body);
            res.end(JSON.stringify(tableStructures[req.body.table]));
        });
        this.app.post('/table/data', function(req, res){
            var defTable=tableStructures[req.body.table];
            if(defTable){
                var client;
                be.getDbClient().then(function(client_){
                    client=client_;
                    return client.query(
                        "SELECT "+defTable.fields.map(function(fieldDef){ return be.db.quoteObject(fieldDef.name); }).join(', ')+
                        " FROM "+be.db.quoteObject(defTable.name)+
                        " ORDER BY "+defTable.primaryKey.join(',')
                    ).execute();
                }).then(function(result){
                    res.end(JSON.stringify(result.rows));
                }).catch(MiniTools.serveErr(req,res)).then(function(){
                    client.done();
                });
            }
        });
    }
}

new AppExample().start();