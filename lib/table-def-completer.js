"use strict";

function completeEditablesProperties(def,defaultValue){
    ['allowInserts','allowDeletes','allowUpdates'].forEach(function(propertyName){
        if(!(propertyName in def)){
            def[propertyName]='editable' in def ? !!def.editable : defaultValue;
        }
    });
}

function tableDefCompleter(tableDef){
    tableDef.title=tableDef.title||tableDef.name;
    tableDef.field={};
    completeEditablesProperties(tableDef, false);
    tableDef.fields.forEach(function(fieldDef){
        tableDef.field[fieldDef.name]=fieldDef;
        completeEditablesProperties(fieldDef, !!tableDef.editableFieldDef);
        if(tableDef.allowInserts){
            fieldDef.allowInserts=true;
        }
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