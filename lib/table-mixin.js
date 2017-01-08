"use strict";

var changing = require('best-globals').changing;

module.exports = function(tableName1, tableName2, tableDefForMixin){
    return function(context){
        // tableMixin(tableApariciones, tableFichas)
        var table1 = context.be.tableStructures[tableName1];
        var table2 = context.be.tableStructures[tableName2];
        var td1=table1(context);
        var td2=table2(context);
        var joinDef = td1.foreignKeys.filter(function(fk){
            return fk.references == td2.name;
        })[0];
        console.log('join', joinDef);
        var tableDef=changing(tableDefForMixin,td1);
        console.log(tableDef);
        console.log('join', joinDef);
        var otherColumns = [];
        td2.fields.forEach(function(fieldDef){
            if(!td1.fields.filter(function(fd1){ return fd1.name === fieldDef.name; }).length){
                // tableDef.fields.push(changing(fieldDef,{allow:{select: fieldDef.allow.select, update:false, insert:false}}));
                otherColumns.push(changing(fieldDef,{allow:{select: fieldDef.allow.select, update:false, insert:false}}));
            }
        });
        tableDef.sql.from = td1.sql.from+" inner join "+td2.sql.from+" on "+joinDef.fields.map(function(pair){
            return context.be.db.quoteObject(td1.name)+"."+pair.source+" = "+context.be.db.quoteObject(td2.name)+"."+pair.target;
        }).join(" AND ");
        tableDef.fields = tableDef.fields.concat(otherColumns);
        tableDef.sql.select = [context.be.db.quoteObject(td1.name)+".*"].concat(otherColumns.map(function(fieldDef){
            return context.be.db.quoteObject(td2.name)+"."+context.be.db.quoteObject(fieldDef.name);
        }));
        return tableDef;
    };
}


