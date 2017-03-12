"use strict";

var changing = require('best-globals').changing;
var coalesce = require('best-globals').coalesce;
var typeStore = require('type-store');

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
        allow: {select: true, orientation: false, "vertical-edit": true, export:true, import:true},
        actionNamesList: [],
        detailTables: [],
        foreignKeys: [],
        sql:{
        },
        layout:{
            vertical:false,
        }
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
        }, fieldDef);
        typeStore.completeTypeInfo(resultFieldDef);
        resultFieldDef.label = resultFieldDef.label||resultFieldDef.title;
        completeEditablesProperties(resultFieldDef, !!resultTableDef.editableFieldDef, resultTableDef.allow);
        if(resultTableDef.allow.insert){
            resultFieldDef.allow.insert=true;
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
    (resultTableDef.primaryKey||[]).forEach(function(fieldName, i){
        resultTableDef.field[fieldName].isPk=i+1;
    });
    resultTableDef.foreignKeys.map(function(fk){
        fk.fields.forEach(function(pair, i, pairs){
            if(typeof pair === "string"){
                pairs[i] = {source: pair, target: pair};
            }
        });
    });
    resultTableDef.detailTables.map(function(detail){
        detail.label=detail.label||detail.table;
        detail.fields.forEach(function(pair, i, pairs){
            if(typeof pair === "string"){
                pairs[i] = {source: pair, target: pair};
            }
        });
    });
    resultTableDef.sql.select = resultTableDef.sql.select || resultTableDef.fields.map(function(fieldDef){
        var resultName = be.db.quoteObject(fieldDef.name)
        if(fieldDef.clientSide && !fieldDef.inTable){
            return "null::text as "+resultName;
        }else{
            return resultName;
        }
    });
    resultTableDef.sql.isTable = coalesce(resultTableDef.sql.isTable, !resultTableDef.sql.from);
    resultTableDef.sql.from = resultTableDef.sql.from || be.db.quoteObject(resultTableDef.name);
    resultTableDef.sql.postCreateSqls = resultTableDef.sql.postCreateSqls || '';
    return resultTableDef;
}

module.exports = tableDefAdapt;