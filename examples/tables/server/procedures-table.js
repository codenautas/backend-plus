"use strict";

var proceduresDefCompleter = require('./procedures-def-completer.js');

module.exports = proceduresDefCompleter('table',{
    structure:{
        params:[
            {name: 'table'}
        ],
        encoding:'JSON',
        coreFunction:function(params){
            console.log('core',params,params.table,this.tableStructures[params.table]);
            return this.tableStructures[params.table];
        }
    },
    data:{
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
                    " ORDER BY "+defTable.primaryKey.join(',')
                ).execute();
            }).then(function(result){
         
                return result.rows;
            });
        }
    }
});