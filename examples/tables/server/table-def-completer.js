"use strict";

function tableDefCompleter(tableDef){
    tableDef.field={};
    tableDef.fields.forEach(function(fieldDef){
        tableDef.field[fieldDef.name]=fieldDef;
        fieldDef.title = fieldDef.title || fieldDef.name.replace(/_/g, ' ');
        if(fieldDef.typeName==='integer'){
            fieldDef.typeName='number';
            fieldDef.exact=true;
            fieldDef.decimals=0;
        }
        if(fieldDef.typeName==='enum'){
            fieldDef.options = fieldDef.options.map(function(option){
                if(typeof option !== 'object'){
                    return {option:option, label:option};
                }else{
                    return option;
                }
            });
        }
    });
    return tableDef;
}

module.exports = tableDefCompleter;