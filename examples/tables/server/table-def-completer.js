"use strict";

function tableDefCompleter(tableDef){
    tableDef.fields.forEach(function(fieldDef){
        fieldDef.title = fieldDef.title || fieldDef.name.replace(/_/g, ' ');
        if(fieldDef.typeName==='integer'){
            fieldDef.typeName='number';
        }
    });
    return tableDef;
}

module.exports = tableDefCompleter;