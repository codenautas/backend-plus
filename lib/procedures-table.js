"use strict";

var changing = require('best-globals').changing;

var ProcedureTables = {};

ProcedureTables = [
    {
        action:'table/structure',
        parameters:[
            {name: 'table', encoding:'plain'}
        ],
        coreFunction:function(context, parameters){
            var struct=context.be.tableStructures[parameters.table](context);
            if(context.be.config.devel && context.be.config.devel.forceShowAsEditable){
                struct.allowDeletes=true;
                struct.allowUpdates=true;
                struct.allowInserts=true;
            }
            return struct;
        }
    },
    {
        action:'table/data',
        parameters:[
            {name: 'table', encoding:'plain'}
        ],
        coreFunction:function(context, parameters){
            var be=context.be;
            var defTable=be.tableStructures[parameters.table](context);
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
            {name: 'newRow'},
            {name: 'status', encoding:'plain'},
        ],
        coreFunction:function(context, parameters){
            var be=context.be;
            var defTable=be.tableStructures[parameters.table](context);
            var verb=parameters.status=='new'?'Insert':'Updates';
            if(!defTable["allow"+verb]){
                throw changing(new Error(verb+" not allowed"),{status:403});
            }
            var primaryKeyValues=parameters.primaryKeyValues;
            var fieldNames=[];
            var values=[];
            for(var name in parameters.newRow){
                if(!defTable.field[name]["allow"+verb]){
                    throw changing(new Error(verb+" not allowed for "+name),{status:403});
                }
                fieldNames.push(name);
                values.push(parameters.newRow[name]);
                if(!defTable.field[name]){
                    throw new Error("invalid request");
                }
            }
            var returningClausule="RETURNING "+defTable.fields.map(function(fieldDef){ return be.db.quoteObject(fieldDef.name); }).join(', ');
            if(defTable && parameters.status=='new'){
                var x;
                return context.client.query(x=
                    "INSERT INTO "+be.db.quoteObject(defTable.name)+
                    " ("+fieldNames.map(function(name,i){ return be.db.quoteObject(name); }).join(', ')+
                    ") VALUES ("+fieldNames.map(function(name,i){ return '$'+(i+1); }).join(', ')+
                    ") "+returningClausule,
                    values
                ).fetchUniqueRow().then(function(result){
                    return result.row;
                });
            }else if(defTable && primaryKeyValues.length==defTable.primaryKey.length){
                return context.client.query(
                    "UPDATE "+be.db.quoteObject(defTable.name)+
                    " SET "+fieldNames.map(function(name,i){ return be.db.quoteObject(name)+" = $"+(i+1); }).join(', ')+
                    " WHERE "+defTable.primaryKey.map(function(fieldName, i){
                        return be.db.quoteObject(fieldName)+" = $"+(i+1+fieldNames.length);
                    }).join(" AND ")+
                    returningClausule,
                    values.concat(primaryKeyValues)
                ).fetchUniqueRow().then(function(result){
                    return result.row;
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
            var defTable=be.tableStructures[parameters.table](context);
            if(!defTable.allowInserts){
                throw changing(new Error("Deletes not allowed"),{status:403});
            }
            var primaryKeyValues=parameters.primaryKeyValues;
            if(defTable && primaryKeyValues.length==defTable.primaryKey.length){
                return context.client.query(
                    "DELETE FROM "+be.db.quoteObject(defTable.name)+
                    " WHERE "+defTable.primaryKey.map(function(fieldName, i){
                        return be.db.quoteObject(fieldName)+" = $"+(i+1);
                    }).join(" AND ")+
                    " RETURNING "+defTable.fields.map(function(fieldDef){ return be.db.quoteObject(fieldDef.name); }).join(', '),
                    primaryKeyValues
                ).fetchUniqueRow().then(function(result){
                    return result.row;
                });
            }else{
                throw new Error("invalid request");
            }
        }
    }
];

module.exports = ProcedureTables;