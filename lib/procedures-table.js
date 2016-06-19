"use strict";

var ProcedureTables = {};

ProcedureTables = [
    {
        action:'table/structure',
        parameters:[
            {name: 'table', encoding:'plain'}
        ],
        coreFunction:function(parameters){
            console.log('core',parameters,parameters.table,this.tableStructures[parameters.table]);
            return this.tableStructures[parameters.table];
        }
    },
    {
        action:'table/data',
        parameters:[
            {name: 'table', encoding:'plain'}
        ],
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
                client.done();
                return result.rows;
            });
        }
    },
    {
        action:'table/save-record',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'primaryKeyValues'},
            {name: 'field'},
            {name: 'value'},
        ],
        coreFunction:function(parameters){
            var be=this;
            var defTable=be.tableStructures[parameters.table];
            var primaryKeyValues=parameters.primaryKeyValues;
            if(defTable && defTable.field[parameters.field] && primaryKeyValues.length==defTable.primaryKey.length){
                var client;
                return be.getDbClient().then(function(client_){
                    client=client_;
                    return client.query(
                        "UPDATE "+be.db.quoteObject(defTable.name)+
                        " SET "+be.db.quoteObject(parameters.field)+" = $1 "+
                        " WHERE "+defTable.primaryKey.map(function(fieldName, i){
                            return be.db.quoteObject(fieldName)+" = $"+(i+2);
                        }).join(" AND ")+
                        " RETURNING "+defTable.fields.map(function(fieldDef){ return be.db.quoteObject(fieldDef.name); }).join(', '),
                        [parameters.value].concat(primaryKeyValues)
                    ).execute();
                }).then(function(result){
                    console.log('//////',result);
                    client.done();
                    if(result.rows.length==0){
                        throw new Error("invalid request - not record found");
                    }else{
                        return result.rows;
                    }
                });
            }else{
                throw new Error("invalid request");
            }
        }
    }
];

module.exports = ProcedureTables;