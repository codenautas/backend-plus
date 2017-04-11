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
    def.allow.import = coalesce(def.allow.import,def.allow.export && def.allow.update,false);
}

function tableDefAdapt(tableDef, context){
    var be = this;
    var resultTableDef = changing({
        title: tableDef.name,
        field: {},
        allow: {select: true, orientation: false, "vertical-edit": true, export:true, import:true},
        actionNamesList: [],
        foreignKeys: [],
        filterColumns: [],
        detailTables: [],
        sql:{
            fields:{}
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
        var exprAs='';
        if(fieldDef.clientSide && !fieldDef.inTable){
            exprAs="null::text as ";
        }else if((resultTableDef.sql.fields[fieldDef.name]||{}).expr){
            exprAs=resultTableDef.sql.fields[fieldDef.name].expr+' as ';
        }
        return exprAs+resultName;
    });
    resultTableDef.sql.isTable = coalesce(resultTableDef.sql.isTable, !resultTableDef.sql.from);
    resultTableDef.alias = resultTableDef.alias || resultTableDef.name;
    resultTableDef.sql.from = (resultTableDef.sql.from || be.db.quoteObject(resultTableDef.name)) + ' as ' + be.db.quoteObject(resultTableDef.alias);
    if(resultTableDef.sql.from.endsWith(' x')){
        console.log('hay que quitar el " as x"')
        throw Error('tableDefAdapt from ends with x "'+resultTableDef.name+'"');
    }
    if(context){
        resultTableDef.foreignKeys.forEach(function(fkDef){
            var fkTableDef = be.tableStructures[fkDef.references];
            if(!fkTableDef){
                throw new Error('tableDefAdapt: table "'+fkDef.references+'" must be declared before "'+resultTableDef.name+'"');
            }
            fkTableDef=fkTableDef(context);
            resultTableDef.sql.from += '\n    left join ' + fkTableDef.sql.from + ' as ' + be.db.quoteObject(fkTableDef.alias) + ' on ' +
                fkDef.fields.map(function(pair){
                    return be.db.quoteObject(resultTableDef.alias)+'.'+be.db.quoteObject(pair.source)
                        + ' = ' + be.db.quoteObject(fkTableDef.alias)+'.'+be.db.quoteObject(pair.target);
                }).join(' AND ');
                
        });
    }else{
        if(resultTableDef.foreignKeys.length){
            console.log("ATENCIÓN. Conviene pasar context como segundo parámetro a tableDefAdapt para que tome las FK en tabla "+resultTableDef.name)
        }
    }
    resultTableDef.sql.postCreateSqls = resultTableDef.sql.postCreateSqls || '';
    return resultTableDef;
}

module.exports = tableDefAdapt;