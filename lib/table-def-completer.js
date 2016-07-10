"use strict";

var changing = require('best-globals').changing;

function completeEditablesProperties(def,defaultValue){
    ['insert','delete','update'].forEach(function(actionName){
        if(!(actionName in def.allow)){
            def.allow[actionName]='editable' in def ? !!def.editable : defaultValue;
        }
    });
}

function tableDefCompleter(tableDef){
    tableDef.title=tableDef.title||tableDef.name;
    tableDef.field={};
    tableDef.allow=tableDef.allow||{};
    tableDef.actionNamesList=tableDef.actionNamesList||[];
    completeEditablesProperties(tableDef, false);
    tableDef.fields.forEach(function(fieldDef){
        if(!fieldDef.allow){
            fieldDef.allow=changing(tableDef.allow,{});
        }
        completeEditablesProperties(fieldDef, !!tableDef.editableFieldDef);
        tableDef.field[fieldDef.name]=fieldDef;
        if(tableDef.allow.insert){
            fieldDef.allow.insert=true;
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