"use strict";

var changing = require('best-globals').changing;
var coalesce = require('best-globals').coalesce;

const escapeStringRegexp = require('escape-string-regexp');

function completeEditablesProperties(def,defaultValue){
    ['insert','delete','update'].forEach(function(actionName){
        if(!(actionName in def.allow)){
            def.allow[actionName]='editable' in def ? !!def.editable : defaultValue;
        }
    });
    def.allow.filter = coalesce(def.allow.filter,true);
}

function tableDefAdapt(tableDef){
    var be = this;
    var resultTableDef = changing({
        title: tableDef.name,
        field: {},
        allow: {select: true},
        actionNamesList: []
    },tableDef);
    completeEditablesProperties(resultTableDef, false);
    var prefixRegExp;
    if(resultTableDef.prefix){
        prefixRegExp=new RegExp('^'+escapeStringRegexp(resultTableDef.prefix)+'_');
    }else{
        prefixRegExp=/^/;
    }
    console.log('xxxxxxxx resultTableDef',resultTableDef);
    resultTableDef.fields = resultTableDef.fields.map(function(fieldDef){
        var resultFieldDef = changing({
            allow: changing(resultTableDef.allow,{}),
            title: fieldDef.name.replace(prefixRegExp,'').replace(/_/g, ' '),
        }, fieldDef);
        completeEditablesProperties(resultFieldDef, !!resultTableDef.editableFieldDef);
        resultTableDef.field[resultFieldDef.name]=resultFieldDef;
        if(resultTableDef.allow.insert){
            resultFieldDef.allow.insert=true;
        }
        if(fieldDef.typeName==='integer'){
            resultFieldDef.typeName='number';
            resultFieldDef.exact=true;
            resultFieldDef.decimals=0;
        }
        if(fieldDef.typeName==='enum'){
            resultFieldDef.options = resultFieldDef.options.map(function(option){
                if(typeof option !== 'object'){
                    return {option:option, label:option};
                }else{
                    return option;
                }
            });
        }
        return resultFieldDef;
    }).filter(function(fieldDef){
        return fieldDef.allow.select;
    });
    resultTableDef.selectExpressions = resultTableDef.fields.map(function(fieldDef){
        var resultName = be.db.quoteObject(fieldDef.name)
        if(fieldDef.clientSide){
            return "null::text as "+resultName;
        }else{
            return resultName;
        }
    });
    return resultTableDef;
}

module.exports = tableDefAdapt;