"use strict";

function tableDefCompleter(tableDef){
    tableDef.fields.forEach(function(fieldDef){
        fieldDef.title = fieldDef.title || fieldDef.name.replace(/_/g, ' ');
    });
    return tableDef;
}

module.exports = tableDefCompleter;