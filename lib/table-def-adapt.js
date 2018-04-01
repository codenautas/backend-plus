"use strict";

var likeAr = require('like-ar');
var changing = require('best-globals').changing;
var coalesce = require('best-globals').coalesce;
var bestGlobals = require('best-globals');
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
        allow: {select: true, orientation: false, "vertical-edit": true, export:true},
        actionNamesList: [],
        foreignKeys: [],
        softForeignKeys: [],
        filterColumns: [],
        detailTables: [],
        sql:{
            fields:{}
        },
        layout:{
            vertical:false,
        },
        constraints:[],
        registerImports:{
            inTable:null,
            fieldNames:{
                tableName:'table_name',
                fieldName:'field',
                fieldIndex:'field_index',
                originalFileName:null,
                serverPath:null,
                lastUpload:null,
            }
        }
    },tableDef);
    var JSONFieldForOtherFields = tableDef.fields.filter(function findDefaultForOthers(field) { 
        return field.defaultForOtherFields === true;
    });
    if(JSONFieldForOtherFields.length === 0){
        resultTableDef.JSONFieldForOtherFields = false;
    }else if(JSONFieldForOtherFields.length === 1){
        resultTableDef.JSONFieldForOtherFields = JSONFieldForOtherFields[0];
    }else{
        throw new Error("multiple defaultForOtherFields in field definition in "+tableDef.name);
    }
    completeEditablesProperties(resultTableDef, false);
    var prefixRegExp;
    if(resultTableDef.prefix){
        prefixRegExp=new RegExp('^'+escapeStringRegexp(resultTableDef.prefix)+'_');
    }else{
        prefixRegExp=/^/;
    }
    resultTableDef.nameFields = [];
    resultTableDef.fields = resultTableDef.fields.map(function(fieldDef){
        var resultFieldDef = changing({
            visible: true,
            allow:{},
            defaultForOtherFields: false,
            sequence: {
                name: null,
                prefix: null,
                firstValue: 1
            }, 
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
        if(fieldDef.isName){
            resultTableDef.nameFields.push(fieldDef.name);
        }
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
    resultTableDef.softForeignKeys.map(function(sfk){
        sfk.fields.forEach(function(pair, i, pairs){
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
    if(resultTableDef.sortColumns){
        resultTableDef.sortColumns.map(function(sortColumn){
            sortColumn.order = sortColumn.order || 1;
        });
    }
    resultTableDef.tableName = resultTableDef.tableName || resultTableDef.name;
    resultTableDef.alias = resultTableDef.alias || resultTableDef.tableName;
    resultTableDef.sql.tableName = resultTableDef.sql.tableName || resultTableDef.tableName;
    resultTableDef.sql.select = resultTableDef.sql.select || resultTableDef.fields.map(function(fieldDef){
        var resultName = be.db.quoteObject(fieldDef.name)
        var exprAs='';
        if(fieldDef.clientSide && !fieldDef.inTable && !fieldDef.serverSide){
            exprAs="null::text as ";
        }else if((resultTableDef.sql.fields[fieldDef.name]||{}).expr){
            exprAs=resultTableDef.sql.fields[fieldDef.name].expr+' as ';
        }else{
            resultName=be.db.quoteObject(resultTableDef.alias)+'.'+resultName;
        }
        return exprAs+resultName;
    });
    resultTableDef.sql.isTable = coalesce(resultTableDef.sql.isTable, !resultTableDef.sql.from);
    resultTableDef.sql.originalFrom = resultTableDef.sql.from;
    resultTableDef.sql.from = (resultTableDef.sql.from || be.db.quoteObject(resultTableDef.tableName));
    if(resultTableDef.sql.from.endsWith(' x')){
        console.log('hay que quitar el " as x"')
        throw Error('tableDefAdapt from ends with x "'+resultTableDef.tableName+'"');
    }
    resultTableDef.sql.fromWoAs = resultTableDef.sql.from;
    if(be.db.quoteObject(resultTableDef.alias)!==resultTableDef.sql.from){
        resultTableDef.sql.from += ' as ' + be.db.quoteObject(resultTableDef.alias);
    }
    if(context && !context.plainStructure){
        resultTableDef.foreignKeys.concat(resultTableDef.softForeignKeys).forEach(function(fkDef){
            if(fkDef.definingSubclass){
                return;
            }
            var fkTableDef = be.tableStructures[fkDef.references];
            if(!fkTableDef){
                throw new Error('tableDefAdapt: table "'+fkDef.references+'" must be declared before "'+resultTableDef.tableName+'"');
            }
            fkTableDef=fkTableDef(changing(context,{plainStructure: true}));
            var lastSourceField=null;
            fkDef.alias = fkDef.alias || fkDef.label || fkTableDef.alias;
            fkDef.nameFields = fkDef.nameFields || fkTableDef.nameFields;
            resultTableDef.sql.from += '\n    left join ' + fkTableDef.sql.fromWoAs + ' as ' + fkDef.alias + ' on ' +
                fkDef.fields.map(function(pair){
                    lastSourceField = pair.source;
                    return be.db.quoteObject(resultTableDef.alias)+'.'+be.db.quoteObject(pair.source)
                        + ' = ' + be.db.quoteObject(fkDef.alias)+'.'+be.db.quoteObject(pair.target);
                }).join(' AND ');
            var iLastSourceField = resultTableDef.fields.findIndex(function(fieldDef){ return fieldDef.name == lastSourceField });
            fkDef.nameFields.forEach(function(fieldName,iField){
                var fieldNameAdded=fkDef.alias+'__'+fieldName;
                var fieldDefAdded=changing(fkTableDef.field[fieldName], {
                    name:fieldNameAdded,
                    editable:false,
                    allow:{update:false, insert:false},
                    references:fkDef.references,
                    referencesField:lastSourceField,
                    inTable:false,
                    referencedName:fieldName,
                    referencedAlias:fkDef.alias,
                    nullable:true,
                });
                var lastSourceFieldDef=resultTableDef.field[lastSourceField];
                if(lastSourceFieldDef.orderForInsertOnly){
                    fieldDefAdded.orderForInsertOnly=lastSourceFieldDef.orderForInsertOnly+' '+(iField+1);
                }
                resultTableDef.field[fieldNameAdded]=fieldDefAdded;
                iLastSourceField++;
                resultTableDef.fields.splice(iLastSourceField,0,fieldDefAdded);
                resultTableDef.sql.select.push(
                    be.db.quoteObject(fkDef.alias)+'.'+be.db.quoteObject(fieldName)+' as '+
                    be.db.quoteObject(fkDef.alias+'__'+fieldName)
                );
            });
            if(fkDef.fields.length===1){
                if(fkTableDef.field[fkDef.fields[0].target].isPk){
                    try{
                        resultTableDef.field[fkDef.fields[0].source].references=fkDef.references;
                    }catch(err){
                        console.log('ERROR',fkDef.fields,'in',resultTableDef.field);
                        err.context=(err.context||'')+'referencing '+fkDef.fields[0].source+' in '+resultTableDef.name+' to '+fkDef.references+' \n ';
                        throw err;
                    }
                }
            }
        });
    }else if(!context){
        if(resultTableDef.foreignKeys.length){
            console.log("ATENCIÓN. Conviene pasar context como segundo parámetro a tableDefAdapt para que tome las FK en tabla "+resultTableDef.tableName)
        }
    }
    resultTableDef.sql.postCreateSqls = resultTableDef.sql.postCreateSqls || '';
    return resultTableDef;
}

tableDefAdapt.forInsertOnly = function forInsertOnly(tableDef){
    if(tableDef.forInsertOnlyMode){
        tableDef.field = likeAr(tableDef.field).filter(function(fieldDef){
            return fieldDef.orderForInsertOnly;
        });
        tableDef.fields = likeAr(tableDef.field).array();
        tableDef.fields.sort(bestGlobals.compareForOrder([{column:'orderForInsertOnly'}]))
        tableDef.sql.select = tableDef.fields.map(function(fieldDef){
            return fieldDef.referencedName?(
                JSON.stringify(fieldDef.referencedAlias)+"."+JSON.stringify(fieldDef.referencedName)+" as "+JSON.stringify(fieldDef.name)
            ):(
                JSON.stringify(tableDef.alias)+"."+JSON.stringify(fieldDef.name)
            );
        });
    }
}

module.exports = tableDefAdapt;