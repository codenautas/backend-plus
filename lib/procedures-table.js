"use strict";

var ProcedureTables = {};

ProcedureTables = [
    {
        action:'table/structure',
        parameters:[
            {name: 'table', encoding:'plain'}
        ],
        coreFunction:function(context, parameters){
            console.log('core',parameters,parameters.table,context.be.tableStructures[parameters.table]);
            return context.be.tableStructures[parameters.table];
        }
    },
    {
        action:'table/data',
        parameters:[
            {name: 'table', encoding:'plain'}
        ],
        coreFunction:function(context, parameters){
            var be=context.be;
            var defTable=be.tableStructures[parameters.table];
            if(!defTable){
                throw new Error('no table def for '+parameters.table)
            }
            return context.client.query(
                "SELECT "+defTable.fields.map(function(fieldDef){ return be.db.quoteObject(fieldDef.name); }).join(', ')+
                " FROM "+be.db.quoteObject(defTable.name)+
                // " ORDER BY "+defTable.primaryKey.map(be.db.quoteObject.bind(be.db)).join(',')
                " ORDER BY "+defTable.primaryKey.map(function(fieldName){ return be.db.quoteObject(fieldName); }).join(',')
            ).fetchAll().then(function(result){
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
        coreFunction:function(context, parameters){
            var be=context.be;
            var defTable=be.tableStructures[parameters.table];
            var primaryKeyValues=parameters.primaryKeyValues;
            if(defTable && defTable.field[parameters.field] && primaryKeyValues.length==defTable.primaryKey.length){
                return context.client.query(
                    "UPDATE "+be.db.quoteObject(defTable.name)+
                    " SET "+be.db.quoteObject(parameters.field)+" = $1 "+
                    " WHERE "+defTable.primaryKey.map(function(fieldName, i){
                        return be.db.quoteObject(fieldName)+" = $"+(i+2);
                    }).join(" AND ")+
                    " RETURNING "+defTable.fields.map(function(fieldDef){ return be.db.quoteObject(fieldDef.name); }).join(', '),
                    [parameters.value].concat(primaryKeyValues)
                ).execute().then(function(result){
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
    },
    {
        action:'table/delete-record',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'primaryKeyValues'}
        ],
        coreFunction:function(context, parameters){
            var be=context.be;
            var defTable=be.tableStructures[parameters.table];
            var primaryKeyValues=parameters.primaryKeyValues;
            if(defTable && primaryKeyValues.length==defTable.primaryKey.length){
                return context.client.query(
                    "DELETE FROM "+be.db.quoteObject(defTable.name)+
                    " WHERE "+defTable.primaryKey.map(function(fieldName, i){
                        return be.db.quoteObject(fieldName)+" = $"+(i+1);
                    }).join(" AND "),
                    primaryKeyValues
                ).execute().then(function(){
                    return 'ok';
                });
            }else{
                throw new Error("invalid request");
            }
        }
    }
];

module.exports = ProcedureTables;