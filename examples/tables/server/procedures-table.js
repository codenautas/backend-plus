"use strict";

var procedures = require('./procedures.js');

module.exports = [
    {
        action:'/table/structure',
        params:[
            {name: 'table'}
        ],
        encoding:'JSON',
        coreFunction:function(params){
            console.log('core',params,params.table,this.tableStructures[params.table]);
            return this.tableStructures[params.table];
        }
    },
    {
        action:'/table/data',
        params:[
            {name: 'table'}
        ],
        encoding:'JSON',
        coreFunction:function(params){
            var be=this;
            var defTable=be.tableStructures[params.table];
            if(!defTable){
                throw new Error('no table def for '+params.table)
            }
            var client;
            return be.getDbClient().then(function(client_){
                client=client_;
                return client.query(
                    "SELECT "+defTable.fields.map(function(fieldDef){ return be.db.quoteObject(fieldDef.name); }).join(', ')+
                    " FROM "+be.db.quoteObject(defTable.name)+
                    // " ORDER BY "+defTable.primaryKey.map(be.db.quoteObject.bind(be.db)).join(',')
                    " ORDER BY "+defTable.primaryKey.map(function(fieldName){ return be.db.quoteObject(fieldName); }).join(',')
                ).execute();
            }).then(function(result){
         
                return result.rows;
            });
        }
    }
].map(procedures.defCompleter);