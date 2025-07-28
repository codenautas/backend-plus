"use strict";

var likeAr = require('like-ar');
var changing = require('best-globals').changing;
var coalesce = require('best-globals').coalesce;
var bestGlobals = require('best-globals');
var TypeStore = require('type-store');

const escapeRegExp = bestGlobals.escapeRegExp;

function completeEditablesProperties(def,defaultValue,otherAllow){
    otherAllow = otherAllow || {};
    ['insert','delete','update','select'].forEach(function(actionName){
        if(!(actionName in def.allow)){
            def.allow[actionName] = (
                actionName!=='select' && 'editable' in def ? 
                !!def.editable : 
                (actionName in otherAllow?otherAllow[actionName]:defaultValue)
            );
        }
    });
    def.allow.filter = coalesce(def.allow.filter,true);
    def.allow.import = coalesce(def.allow.import,def.allow.export && def.allow.update,otherAllow.import,false);
}

function tableDefAdapt(tableDef, context){
    var be = this;
    var fieldDomain = be.fieldDomain || {};
    if(false && !be.fieldDomain){
        throw new Error('lack of fieldDomain in backend. postConfig must call super.postConfig');
    }
    var resultTableDef = changing({
        title: tableDef.name,
        field: {},
        allow: {select: true, orientation: false, "vertical-edit": tableDefAdapt["vertical-edit"], export:true},
        actionNamesList: [],
        foreignKeys: [],
        softForeignKeys: [],
        filterColumns: [],
        detailTables: [],
        sql:{
            fields:{},
            policies:{
                all:{using:false, check:false},
                select:{using:false, check:false},
                insert:{using:false, check:false},
                update:{using:false, check:false},
                delete:{using:false, check:false},
            }
        },
        layout:{
            styleColumns:[],
            vertical:false,
            errorList:false,
            extraRows: 0,
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
        },
        offline:{
            mode:false,
            details:null
        },
        refrescable: false
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
        prefixRegExp=new RegExp('^'+escapeRegExp(resultTableDef.prefix)+'_');
    }else{
        prefixRegExp=/^/;
    }
    resultTableDef.nameFields = [];
    if(resultTableDef.offline.mode){
        if(!resultTableDef.fields.find(fieldDef=>fieldDef.name=='$lock')){
            resultTableDef.fields.unshift({ name:"$lock", title: '🔑', typeName: 'text', clientSide:'$lock' });
        }
        if(resultTableDef.offline.mode && !resultTableDef.offline.details){
            throw new Error("lack of offline.details in table "+tableDef.name);
        }
    }
    resultTableDef.fields = resultTableDef.fields.map(function(fieldDef){
        var resultFieldDef = changing(changing({
            visible: true,
            allow:{},
            defaultForOtherFields: false,
            extraRow: resultTableDef.layout.extraRows,
            title: fieldDef.name.replace(prefixRegExp,'').replace(/_/g, ' '),
        },fieldDomain[fieldDef.name]||{}), fieldDef);
        if(!resultFieldDef.visible && resultFieldDef.clientSide){
            console.log("fieldDef: ", fieldDef);
            throw Error("FieldDef Error: Invisible field can't be set as clientSide")
        }
        TypeStore.completeTypeInfo(resultFieldDef);
        resultFieldDef.label = resultFieldDef.label||resultFieldDef.title;
        completeEditablesProperties(resultFieldDef, !!resultTableDef.editableFieldDef, resultTableDef.allow);
        if(resultFieldDef.nullable == null && resultFieldDef.sequence && ! resultFieldDef.sequence.name){
            resultFieldDef.nullable = true;
            resultFieldDef.editable = false;
            resultFieldDef.allow.insert = false;
            resultFieldDef.allow.update = false;
        }else if(resultTableDef.allow.insert){
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
        return fieldDef.allow.select || context && context.forDump;
    }).map(function(fieldDef){
        resultTableDef.field[fieldDef.name]=fieldDef;
        if(fieldDef.isName){
            resultTableDef.nameFields.push(fieldDef.name);
            if (fieldDef.isName == 'known' && resultTableDef.hiddenColumns && !resultTableDef.hiddenColumns.includes(fieldDef.name)) {
                resultTableDef.hiddenColumns.push(fieldDef.name);
            }
        }
        return fieldDef;
    });
    (resultTableDef.primaryKey||[]).forEach(function(fieldName, i){
        if(!(fieldName in resultTableDef.field)){
            console.error('Lack of field '+JSON.stringify(fieldName)+' in '+JSON.stringify(resultTableDef.name))
        }
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
    if(!resultTableDef.sortColumns && resultTableDef?.sql?.orderBy){
        resultTableDef.sortColumns = resultTableDef.sql.orderBy.map(column=>({column}))
    }
    if(resultTableDef.sortColumns){
        resultTableDef.sortColumns.map(function(sortColumn){
            sortColumn.order = sortColumn.order || 1;
            if (!resultTableDef.field[sortColumn.column] && !/__/.test(sortColumn.column)) {
                throw new Error("unkown column " + JSON.stringify(sortColumn.column) + " in sortColumn (or Primarykey) of " + resultTableDef.name);
            }
        });
    }
    resultTableDef.tableName = resultTableDef.tableName || resultTableDef.name;
    resultTableDef.alias = resultTableDef.alias || resultTableDef.tableName;
    resultTableDef.sql.tableName = resultTableDef.sql.tableName || resultTableDef.tableName;
    if(resultTableDef.functionDef){
    }
    resultTableDef.sql.select = resultTableDef.sql.select || resultTableDef.fields.map(function(fieldDef){
        var resultName = be.db.quoteIdent(fieldDef.name)
        var exprAs='';
        if(/__/.test(fieldDef.name) && !be.config.db.allow_double_lodash_fields){
            return null;
        }else{
            if(fieldDef.clientSide && !fieldDef.inTable && !fieldDef.serverSide){
                exprAs="null::text as ";
            }else if((resultTableDef.sql.fields[fieldDef.name]||{}).expr){
                if(!('inTable' in resultTableDef.field[fieldDef.name])){
                    console.error('DEPRECATED!!!',fieldDef.name,'in table',tableDef.name,'has sql.fields.expr. Must has "inTable" prop also.');
                }
                exprAs=resultTableDef.sql.fields[fieldDef.name].expr+' as ';
            }else{
                resultName=be.db.quoteIdent(fieldDef.inJoin ?? resultTableDef.alias)+'.'+resultName;
            }
            return exprAs+resultName;
        }
    }).filter(function(expr){ return expr });
    var otherColumns = [];
    var pol = resultTableDef.sql.policies;
    if(resultTableDef.sql.policies.enabled==null){
        var pol = resultTableDef.sql.policies;
        pol.enabled = (
            pol.all.using || pol.select.using || pol.insert.using || pol.update.using || pol.delete.using ||
            pol.all.check || pol.select.check || pol.insert.check || pol.update.check || pol.delete.check ||
            false
        ) && true;
    }
    if(pol && pol.enabled){
        resultTableDef.sql.select.push(`${be.db.quoteIdent(resultTableDef.alias)}."$allow.update"`);
        resultTableDef.sql.select.push(`${be.db.quoteIdent(resultTableDef.alias)}."$allow.delete"`);
    }
    resultTableDef.sql.isTable = coalesce(resultTableDef.sql.isTable, !resultTableDef.sql.from);
    resultTableDef.sql.originalFrom = resultTableDef.sql.from;
    resultTableDef.sql.from = (resultTableDef.sql.from || (
        be.db.quoteIdent(resultTableDef.tableName)+(resultTableDef.functionDef?
            '('+resultTableDef.functionDef.parameters.map(function(x,i){return '$'+(i+1);}).join(',')+')' 
        :'')
    ));
    if(resultTableDef.sql.from.endsWith(' x')){
        console.log('hay que quitar el " as x"')
        throw Error('tableDefAdapt from ends with x "'+resultTableDef.tableName+'"');
    }
    resultTableDef.sql.fromWoAs = resultTableDef.sql.from;
    if(be.db.quoteIdent(resultTableDef.alias)!==resultTableDef.sql.from){
        resultTableDef.sql.from += ' as ' + be.db.quoteIdent(resultTableDef.alias);
    }
    if(pol.enabled){
        var otherColumns = [];
        var pol = resultTableDef.sql.policies;
        if(pol && pol.enabled){
            otherColumns.push(`(${(pol.enabled && (pol.update.using || pol.all.using) || 'true' )}) is true as "$allow.update"`);
            otherColumns.push(`(${(pol.enabled && (pol.delete.using || pol.all.using) || 'true' )}) is true as "$allow.delete"`);
        }
        resultTableDef.sql.from = `( select *, ${otherColumns} from ${resultTableDef.sql.from}) as ${be.db.quoteIdent(resultTableDef.alias)}`
    }
    if(resultTableDef.sql.join){
        resultTableDef.sql.from += '\n'+resultTableDef.sql.join;
    }
    if(resultTableDef.sql.logicalDeletes){
        resultTableDef.sql.where=(resultTableDef.sql.where?'('+resultTableDef.sql.where+') and ':'')+
            be.db.quoteIdent(resultTableDef.sql.logicalDeletes.fieldName)+
            " is distinct from "+be.db.quoteNullable(resultTableDef.sql.logicalDeletes.valueToDelete);
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
            fkDef.displayFields = fkDef.displayAllFields?
                (fkTableDef.fields.filter(fd=>fd.visible && !fd.clientSide && !resultTableDef.field[fd.name] && !fd.inJoin && !fkTableDef.sql.fields[fd.name]).map(fd=>fd.name)): //EVALUAR SI ESTÁ BIEN COMENTARLO
                fkDef.displayFields || fkTableDef.nameFields;
            resultTableDef.sql.from += '\n    left join ' + fkTableDef.sql.fromWoAs + ' as ' + be.db.quoteIdent(fkDef.alias) + ' on ' +
                fkDef.fields.map(function(pair){
                    lastSourceField = pair.source;
                    return be.db.quoteIdent(resultTableDef.alias)+'.'+be.db.quoteIdent(pair.source)
                        + ' = ' + be.db.quoteIdent(fkDef.alias)+'.'+be.db.quoteIdent(pair.target);
                }).join(' AND ');
            var iLastSourceField = fkDef.displayAfterFieldName === true ? resultTableDef.fields.length-1 : resultTableDef.fields.findIndex(function(fieldDef){ return fieldDef.name == (fkDef.displayAfterFieldName || lastSourceField) });
            fkDef.displayFields.forEach(function(fieldName,iField){
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
                if(lastSourceFieldDef == null){
                    console.log("not found lastSourceField:", lastSourceFieldDef, "in", resultTableDef.name, "fk:", fkDef)
                }
                if(lastSourceFieldDef.orderForInsertOnly){
                    fieldDefAdded.orderForInsertOnly=lastSourceFieldDef.orderForInsertOnly+' '+(iField+1);
                }
                if(fieldNameAdded in resultTableDef.field){
                    fieldDefAdded = changing(resultTableDef.field[fieldNameAdded], fieldDefAdded)
                }else{
                    iLastSourceField++;
                    resultTableDef.fields.splice(iLastSourceField,0,fieldDefAdded);
                }
                resultTableDef.field[fieldNameAdded]=fieldDefAdded;
                // resultTableDef.field[fieldNameAdded]=changing(fieldDefAdded,resultTableDef.field[fieldNameAdded]||{});
                resultTableDef.sql.select.push(
                    be.db.quoteIdent(fkDef.alias)+'.'+be.db.quoteIdent(fieldName)+' as '+
                    be.db.quoteIdent(fkDef.alias+'__'+fieldName)
                );
            });
            if(fkDef.fields.length===1 || "busqueda en fk compuesta experimental"){
                var lastPos=fkDef.fields.length-1;
                if(!(fkDef.fields[lastPos].target in fkTableDef.field)){
                    throw new Error('ERROR in tableDef '+JSON.stringify(resultTableDef.name)+' in FKs, field '+JSON.stringify(fkDef.fields[lastPos].target)+' not present in table '+JSON.stringify(resultTableDef.name));
                }
                if(fkTableDef.field[fkDef.fields[lastPos].target].isPk){
                    try{
                        var resultFieldDef=resultTableDef.field[fkDef.fields[lastPos].source];
                        if(!resultFieldDef){
                            throw new Error('ERROR in tableDef '+JSON.stringify(resultTableDef.name)+' fk.fields.source '+JSON.stringify(fkDef.fields[lastPos].source)+' not found')
                        }
                        resultFieldDef.references=fkDef.references;
                        resultFieldDef.referencesAlias=fkDef.alias;
                        resultFieldDef.referencesFields=fkDef.fields;
                        resultFieldDef.skipReferenceLookup=fkDef.skipReferenceLookup || fkTableDef.skipReferenceLookup;
                    }catch(err){
                        console.log('ERROR',fkDef.fields,'in',resultTableDef.field.name);
                        err.context=(err.context||'')+'referencing '+fkDef.fields[lastPos].source+' in '+resultTableDef.name+' to '+fkDef.references+' \n ';
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
    resultTableDef.adapted = (resultTableDef.adapted||0)+1;
    return resultTableDef;
}

tableDefAdapt["vertical-edit"] = true;

tableDefAdapt.forInsertOnly = function forInsertOnly(tableDef){
    if(tableDef.forInsertOnlyMode){
        tableDef.field = likeAr(tableDef.field).filter(function(fieldDef){
            return fieldDef.orderForInsertOnly;
        });
        tableDef.fields = likeAr(tableDef.field).array();
        tableDef.fields.sort(bestGlobals.compareForOrder([{column:'orderForInsertOnly'}]))
        tableDef.sql.select = tableDef.fields.map(function(fieldDef){
            var typer=TypeStore.typerFrom(fieldDef);
            return (fieldDef.inTable===false || fieldDef.inJoin) && tableDef.sql.fields[fieldDef.name] ?"null::"+typer.typeDbPg+" as "+be.db.quoteIdent(fieldDef.name):(
                fieldDef.referencedName?(
                    be.db.quoteIdent(fieldDef.referencedAlias)+"."+be.db.quoteIdent(fieldDef.referencedName)+" as "+be.db.quoteIdent(fieldDef.name)
                ):(
                    be.db.quoteIdent(tableDef.alias)+"."+be.db.quoteIdent(fieldDef.name)
                )
            );
        });
    }
}

module.exports = tableDefAdapt;