"use strict";

var changing = require('best-globals').changing;
var coalesce = require('best-globals').coalesce;

const escapeStringRegexp = require('escape-string-regexp');

function completeEditablesProperties(def,defaultValue,other){
    var other = other || {};
    ['insert','delete','update','select'].forEach(function(actionName){
        if(!(actionName in def.allow)){
            def.allow[actionName] = (
                actionName!=='select' && 'editable' in def ? 
                !!def.editable : 
                (actionName in other?other[actionName]:defaultValue)
            );
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
        actionNamesList: [],
        detailTables: [],
        sql:{}
    },tableDef);
    completeEditablesProperties(resultTableDef, false);
    var prefixRegExp;
    if(resultTableDef.prefix){
        prefixRegExp=new RegExp('^'+escapeStringRegexp(resultTableDef.prefix)+'_');
    }else{
        prefixRegExp=/^/;
    }
    resultTableDef.fields = resultTableDef.fields.map(function(fieldDef){
        var resultFieldDef = changing({
            allow:{},
            title: fieldDef.name.replace(prefixRegExp,'').replace(/_/g, ' '),
            label: fieldDef.name.replace(prefixRegExp,'').replace(/_/g, ' '),
        }, fieldDef);
        completeEditablesProperties(resultFieldDef, !!resultTableDef.editableFieldDef, resultTableDef.allow);
        if(resultTableDef.allow.insert){
            resultFieldDef.allow.insert=true;
        }
        if(fieldDef.typeName==='integer'){
            resultFieldDef.typeName='number';
            resultFieldDef.exact=true;
            resultFieldDef.decimals=0;
            resultFieldDef.sizeByte=4;
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
    }).map(function(fieldDef){
        resultTableDef.field[fieldDef.name]=fieldDef;
        return fieldDef;
    });
    resultTableDef.sql.select = resultTableDef.sql.select || resultTableDef.fields.map(function(fieldDef){
        var resultName = be.db.quoteObject(fieldDef.name)
        if(fieldDef.clientSide){
            return "null::text as "+resultName;
        }else{
            return resultName;
        }
    });
    resultTableDef.sql.from = resultTableDef.sql.from || be.db.quoteObject(resultTableDef.name);
    return resultTableDef;
}

module.exports = tableDefAdapt;