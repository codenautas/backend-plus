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
        this.tableStructures.groups = require('./table-groups.js');
        this.procedures = {};
        this.procedures.table = require('./procedures-table.js');
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
        for(var groupName in this.procedures){
            for(var procedureName in this.procedures[groupName]){
                var procedureDef = this.procedures[groupName][procedureName];
                this.app.post('/'+groupName+'/'+procedureName, function(req, res){
                    console.log('////entering',procedureDef);
                    var params={};
                    var source=procedureDef.method=='post'?'body':'query';
                    procedureDef.params.forEach(function(fieldDef){
                        var value = req[source][fieldDef.name];
                        if(fieldDef.encoding=='JSON'){
                            value = JSON.parse(value);
                        }
                        params[fieldDef.name] = value;
                    });
                    return Promises.start(function(){
                        return procedureDef.coreFunction.call(be,params);
                    }).then(function(result){
                        if(procedureDef.encoding=='JSON'){
                            result = JSON.stringify(result);
                        };
                        res.end(result);
                    }).catch(MiniTools.serveErr(req,res));
                });
            }
        }
        //this.app.post('/table/structure', function(req, res){
        //    console.log('params',req.body);
        //    res.end(JSON.stringify(tableStructures[req.body.table]));
        //});
        // this.app.post('/table/data', function(req, res){
        //     var defTable=be.tableStructures[req.body.table];
        //     if(defTable){
        //         var client;
        //         be.getDbClient().then(function(client_){
        //             client=client_;
        //             return client.query(
        //                 "SELECT "+defTable.fields.map(function(fieldDef){ return be.db.quoteObject(fieldDef.name); }).join(', ')+
        //                 " FROM "+be.db.quoteObject(defTable.name)+
        //                 " ORDER BY "+defTable.primaryKey.join(',')
        //             ).execute();
        //         }).then(function(result){
        //             res.end(JSON.stringify(result.rows));
        //         }).catch(MiniTools.serveErr(req,res)).then(function(){
        //             client.done();
        //         });
        //     }
        // });
        this.app.post('/table/save-record', function(req, res){
            var defTable=be.tableStructures[req.body.table];
            var primaryKeyValues=JSON.parse(req.body.primaryKeyValues);
            if(defTable && defTable.field[req.body.field] && primaryKeyValues.length==defTable.primaryKey.length){
                var client;
                be.getDbClient().then(function(client_){
                    client=client_;
                    return client.query(
                        "UPDATE "+be.db.quoteObject(defTable.name)+
                        " SET "+be.db.quoteObject(req.body.field)+" = $1 "+
                        " WHERE "+defTable.primaryKey.map(function(fieldName, i){
                            return be.db.quoteObject(fieldName)+" = $"+(i+2);
                        }).join(" AND ")+
                        " RETURNING "+defTable.fields.map(function(fieldDef){ return be.db.quoteObject(fieldDef.name); }).join(', '),
                        [req.body.value].concat(primaryKeyValues)
                    ).execute();
                }).then(function(result){
                    if(result.rows.length==0){
                        res.status(400);
                        res.end("invalid request - not record found");
                    }else{
                        res.end(JSON.stringify(result.rows));
                    }
                }).catch(MiniTools.serveErr(req,res)).then(function(){
                    client.done();
                });
            }else{
                res.end(400,"invalid request")
            }
        });
    }
}

new AppExample().start();