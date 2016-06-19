"use strict";

var ProcedureTables = {};

ProcedureTables = [
    {
        action:'table/structure',
        parameters:[
            {name: 'table'}
        ],
        encoding:'JSON',
        coreFunction:function(parameters){
            console.log('core',parameters,parameters.table,this.tableStructures[parameters.table]);
            return this.tableStructures[parameters.table];
        }
    },
    {
        action:'table/data',
        parameters:[
            {name: 'table'}
        ],
        encoding:'JSON',
        coreFunction:function(parameters){
            var be=this;
            var defTable=be.tableStructures[parameters.table];
            if(!defTable){
                throw new Error('no table def for '+parameters.table)
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
];

module.exports = ProcedureTables;