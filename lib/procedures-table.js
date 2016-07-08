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
            {name: 'newRow'},
            {name: 'status', encoding:'plain'},
        ],
        coreFunction:function(context, parameters){
            var be=context.be;
            var defTable=be.tableStructures[parameters.table];
            var primaryKeyValues=parameters.primaryKeyValues;
            var fieldNames=[];
            var values=[];
            for(var name in parameters.newRow){
                fieldNames.push(name);
                values.push(parameters.newRow[name]);
                if(!defTable.field[name]){
                    throw new Error("invalid request");
                }
            }
            if(defTable && parameters.status=='new'){
                return context.client.query(
                    "INSERT INTO "+be.db.quoteObject(defTable.name)+
                    " ("+fieldNames.map(function(name,i){ return be.db.quoteObject(name); }).join(', ')+
                    ") VALUES ("+fieldNames.map(function(name,i){ return '$'+(i+1); }).join(', ')+
                    ") RETURNING "+defTable.fields.map(function(fieldDef){ return be.db.quoteObject(fieldDef.name); }).join(', '),
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
                    " RETURNING "+defTable.fields.map(function(fieldDef){ return be.db.quoteObject(fieldDef.name); }).join(', '),
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
            var defTable=be.tableStructures[parameters.table];
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