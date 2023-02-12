// @ts-check
"use strict";

var {datetime, changing, coalesce} = require('best-globals');
// var XLSX = require('xlsx-style'); // Se va porque tiene vulnerabilidades
var XLSX = require('xlsx');
var fs = require('fs-extra');
var typeStore=require('type-store');
var likeAr=require('like-ar');
const f = require('session-file-store');

const PANIC_IMPORT = true;

var ProcedureTables;

function inlineLog(mmm){ console.log(mmm); return mmm; }

ProcedureTables = [
    {
        action:'table_structure',
        parameters:[
            {name: 'table', encoding:'plain'}
        ],
        coreFunction:async function(context, parameters){
            var be=context.be;
            var tableName=parameters.table;
            var changes = {sql: undefined}
            var defTable=be.tableStructures[tableName];
            if(!defTable){
                throw new Error('no table def for '+parameters.table+' (in table_structure)')
            }
            var struct=defTable(context);
            if(be.config.devel && context.be.config.devel.forceShowAsEditable){
                struct=changing(struct, {allow:{
                    delete:true,
                    update:true,
                    insert:true,
                }});
            }
            if(struct.JSONFieldForOtherFields){ 
                var registerImports = struct.registerImports;
                if(registerImports.inTable && registerImports.fieldNames.tableName && registerImports.fieldNames.fieldName){
                    return context.client.query(
                         "SELECT distinct " + be.db.quoteIdent(registerImports.fieldNames.fieldName) +
                         " FROM " + be.db.quoteIdent(registerImports.inTable) +
                         " WHERE " + be.db.quoteIdent(registerImports.fieldNames.tableName) + " = $1"
                         ,[parameters.table]
                    ).fetchAll().then(function(result){
                        struct.otherFields = result.rows;
                        return struct;
                    }).catch(function(err){
                        throw err;
                    });
                }else{
                    throw new Error('Bad configuration for registerImports param on table ' + parameters.table)
                }
            }
            var sanitizeField = ({generatedAs, defaultDbVAlue, ...def})=>def;
            return {
                ...struct,
                sql: undefined,
                fields: struct.fields.map(sanitizeField),
                field: likeAr(struct.field).map(sanitizeField).plain()
            };
        }
    },
    {
        action:'table_data',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'fixedFields', defaultValue:[]},
            {name: 'paramfun', defaultValue:[]}
        ],
        coreFunction:
        /**
        * 
        * @param {*} context 
        * @param {{table:string, fixedFields:{fieldName:string, value:any, range:string}[], paramfun:string[]}} parameters 
        */
        async function tableDatum(context, parameters){
            var be=context.be;
            var tableName=parameters.table;
            var defTable=be.tableStructures[tableName];
            if(!defTable){
                throw new Error('no table def for '+tableName+' (in table_data)')
            }
            defTable=defTable(context);
            /** @type {string} */
            var sql;
            var queryValues=[];
            var specialFixedClause=[];
            var fixedClausule=[];
            if(defTable.functionDef){
                parameters.fixedFields.forEach(function(pair, iPair){
                    if(defTable.functionDef.parameters.find(x=>x.name==pair.fieldName) && !(pair.fieldName in parameters.paramfun) && pair.value != null){
                        parameters.paramfun[pair.fieldName] = pair.value;
                        delete parameters.fixedFields[iPair];
                    }
                });
                defTable.functionDef.parameters.forEach(function(paramdef){
                    if(paramdef.name in parameters.paramfun){
                        queryValues.push(parameters.paramfun[paramdef.name]);
                    }else{
                        throw new Error('lack of parameter: '+paramdef.name);
                    }
                })
            }
            parameters.fixedFields.forEach(function(pair, iPair){
                var defField=defTable.field[pair.fieldName];
                if(!defField){
                    throw new Error('field does not exists '+pair.fieldName+' in table '+tableName);
                }
                var fieldName = pair.fieldName;
                var alias = defTable.alias;
                if(/__/.test(pair.fieldName)){
                    fieldName=pair.fieldName.split('__')[1];
                    alias=pair.fieldName.split('__')[0];
                }
                var comparison = " = $" + (queryValues.length+1);
                if(pair.value == null){
                    comparison = " is null";
                }else{
                    queryValues.push(pair.value);
                    if(pair.range){
                        queryValues.push(pair.value);
                        queryValues.push(pair.range);
                        queryValues.push(pair.range);
                        comparison = " between $" + (queryValues.length-3) + ' - $' +(queryValues.length-1) + ' and $' +(queryValues.length-2) + ' + $' +(queryValues.length-3);
                    }
                }
                var exprClausule=' AND '+be.db.quoteIdent(alias)+'.'+be.db.quoteIdent(fieldName) + comparison
                if(defTable.sql && defTable.sql.fields[fieldName] && defTable.sql.fields[fieldName].expr){
                    specialFixedClause.push(be.db.quoteIdent(fieldName) + comparison)
                }else{
                    fixedClausule.push(exprClausule)
                }
            });
            /** @type {string} */
            var sql="SELECT "+[...defTable.sql.select].join(', ')+
                " FROM "+defTable.sql.from+
                " WHERE "+(defTable.sql.where||(defTable.allow.select && !defTable.forInsertOnlyMode?'true':'false'))+fixedClausule.join("")+
                // " ORDER BY "+defTable.primaryKey.map(be.db.quoteIdent.bind(be.db)).join(',')
                " ORDER BY "+(defTable.sql.orderBy||defTable.primaryKey).map(function(fieldName){ return be.db.quoteIdent(fieldName); }).join(',')
            if(specialFixedClause.length){
                sql="SELECT * FROM ("+sql+") x WHERE "+specialFixedClause.join(" AND ");
            }
            return context.client.query(sql,
                queryValues
            ).fetchAll().then(function(result){
                return result.rows;
            }).catch(function(err){
                throw err;
            });
        }
    },
    {
        action:'table_record_save',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'primaryKeyValues'},
            {name: 'newRow'},
            {name: 'oldRow'},
            {name: 'status', encoding:'plain'},
        ],
        coreFunction:async function(context, parameters, files, opts){
            var be=context.be;
            var mainDefTable=be.tableStructures[parameters.table](context);
            var action=parameters.status=='new'?'insert':'update';
            if(!mainDefTable.allow[action] && (!opts || !opts.forImport)){
                throw changing(new Error(action+" not allowed"),{status:403});
            }
            function emptyUpdater(){ return {fieldNames:[], values:[]}};
            var plainUpdate=emptyUpdater();
            var otherUpdates={
                tables:{},
                tableNames:{}
            };
            var expectedMainPrimaryKeyValues=parameters.primaryKeyValues;
            for(var name in parameters.newRow){
                var defField=mainDefTable.field[name];
                if(!defField.allow[action] && (!opts || !opts.forImport) && (
                    !defField.isPk || 
                    parameters.primaryKeyValues[defField.isPk-1]!=parameters.newRow[name]
                )){
                    throw changing(new Error(action+" not allowed for "+name),{status:403});
                }
                if(!defField){
                    console.log("invalid request", parameters);
                    throw new Error("invalid request");
                }
                var updateTarget;
                if(defField.table && defField.table!=mainDefTable.name){
                    updateTarget=otherUpdates.tables[defField.table]=otherUpdates.tables[defField.table]||emptyUpdater();
                }else if(defField.tableName && defField.tableName!=(mainDefTable.tableName||mainDefTable.name)){
                    updateTarget=otherUpdates.tableNames[defField.table]=otherUpdates.tableNames[defField.table]||emptyUpdater();
                }else{
                    updateTarget=plainUpdate;
                }
                updateTarget.fieldNames.push(name);
                var value=(
                    name in parameters.newRow?parameters.newRow[name]:(
                        'defaultValue' in defField?defField.defaultValue:(
                            'specialDefaultValue' in defField?new Error("my.specialDefaultValue[defField.specialDefaultValue](name, {row:{}}, {row:previousRow})"):null
                        )
                    )
                );
                value = be.transformInput(defField, value);
                updateTarget.values.push(value);
            }
            var fieldNames=updateTarget.fieldNames;
            var values=updateTarget.values;
            var updatesOthers=likeAr(otherUpdates.tables).map(function(data,name){
                var tableDef=be.tableStructures[name](context);
                return {defTable:changing(tableDef, ((mainDefTable.sql.otherTableDefs||{})[name])||{}), ...data};
            }).array().concat(likeAr(otherUpdates.tableNames).map(function(data,name){
                return {defTable:mainDefTable.otherTableDefs[name], ...data};
            }).array());
            var updates = updatesOthers.filter(u => !u.defTable.saveAfter)
                .concat(plainUpdate.values.length?[changing({defTable:mainDefTable,main:true},plainUpdate)]:[])
                .concat(updatesOthers.filter(u => u.defTable.saveAfter));
            var globalPrimaryKeyValue={}
            mainDefTable.primaryKey.forEach(function(name,i){
                globalPrimaryKeyValue[name]=parameters.primaryKeyValues[i];
            });
            var result;
            var mainResult;
            while(updates.length){
                var {fieldNames, values, defTable, main}=updates.shift();
                var values4Insert = values.slice(0);
                var fieldNames4Insert = fieldNames.slice(0);
                defTable.fields.forEach((defField)=>{
                    if('specialValueWhenInsert' in defField){
                        var i = fieldNames4Insert.indexOf(defField.name);
                        var value = be.specialValueWhenInsert[defField.specialValueWhenInsert](context, defField, parameters);
                        if(i===-1){
                            values4Insert.push(value);
                            fieldNames4Insert.push(defField.name);
                        }else{
                            values4Insert[i] = value;
                        }
                    }
                    if(defField.generatedAs){
                        var i = fieldNames4Insert.indexOf(defField.name);
                        if(i!==-1){
                            fieldNames4Insert.splice(i,1);
                            values4Insert.splice(i,1);
                        }
                    }
                })
                var insertIfNotUpdate=parameters.insertIfNotUpdate || defTable.sql.insertIfNotUpdate;
                var primaryKeyValues=[]
                var primaryKeyValuesForUpdate=[]
                var primaryKeyValueObject={};
                defTable.primaryKey.forEach(function(name,i){
                    var value = main?parameters.primaryKeyValues[i]:coalesce(parameters.newRow[name],parameters.oldRow[name],undefined);
                    if(value===undefined){
                        var defField = defTable.field[name];
                        value = defTable.prefilledField && name in defTable.prefilledField ? defTable.prefilledField[name] : (
                            'defaultValue' in defField?defField.defaultValue:(
                            'specialDefaultValue' in defField?new Error("my.specialDefaultValue[defField.specialDefaultValue](name, {row:{}}, {row:previousRow})"):undefined
                        ))
                        if(value===undefined){
                            value = mainResult?.row?.[name]
                        }
                    }
                    value = value ?? null
                    primaryKeyValues[i]=value;
                    primaryKeyValueObject[name]=value;
                    if(globalPrimaryKeyValue[name]!==undefined){
                        primaryKeyValuesForUpdate[i]=globalPrimaryKeyValue[name];
                    }else{
                        primaryKeyValuesForUpdate[i]=value;
                    }
                    if(!fieldNames4Insert.includes(name) && value != null){
                        fieldNames4Insert.push(name); 
                        values4Insert.push(value);
                    }
                });
                if(main){
                    expectedMainPrimaryKeyValues=primaryKeyValues;
                }
                var returningClausule='';
                if(opts && opts.forImport){
                    returningClausule="RETURNING 'ok' as ok";
                }else if(defTable.sql.from){
                    returningClausule="RETURNING "+defTable.primaryKey.map(be.db.quoteIdent).join(', ');
                }else{
                    returningClausule="RETURNING "+defTable.sql.select.join(', ');
                }
                async function insertFun(){
                    var result=await context.client.query(
                        "INSERT INTO "+be.db.quoteIdent(defTable.sql.tableName)+
                        " ("+fieldNames4Insert.map(function(name,i){ return be.db.quoteIdent(name); }).join(', ')+
                        ") VALUES ("+fieldNames4Insert.map(function(name,i){ return '$'+(i+1); }).join(', ')+
                        ") "+returningClausule,
                        values4Insert
                    ).fetchUniqueRow(be.messages.server.cantInsert_TLDR);
                    return result;
                }
                var sql;
                if(defTable && parameters.status=='new'){
                    result = await insertFun();
                }else if(defTable && primaryKeyValues.length==defTable.primaryKey.length){
                    var values4Update = [];
                    var fieldNames4Update = fieldNames.filter((name,i)=>{
                        var posPk = defTable.field[name].isPk;
                        var queda = !posPk || parameters.primaryKeyValues[posPk-1] != parameters.newRow[name];
                        if(queda){
                            values4Update.push(values[i])
                        }
                        return queda;
                    });
                    if(fieldNames4Update.length==0){
                        if(insertIfNotUpdate){
                            result = await context.client.query(sql=
                                "SELECT 'ok' FROM "+be.db.quoteIdent(defTable.sql.tableName)+
                                " WHERE "+defTable.primaryKey.map(function(fieldName, i){
                                    return be.db.quoteIdent(fieldName)+" = $"+(i+1+fieldNames4Update.length);
                                }).join(" AND ")+" ",
                                primaryKeyValuesForUpdate
                            )[insertIfNotUpdate?'fetchOneRowIfExists':'fetchUniqueRow'](be.messages.server.cantUpdate_TLDR);
                        }else{
                            throw Error(be.messages.server.updateWithoutModfiedColumns)
                        }
                    }else{
                        result = await context.client.query(sql=
                            "UPDATE "+be.db.quoteIdent(defTable.sql.tableName)+
                            " SET "+fieldNames4Update.map(function(name,i){ return be.db.quoteIdent(name)+" = $"+(i+1); }).join(', ')+
                            " WHERE "+defTable.primaryKey.map(function(fieldName, i){
                                return be.db.quoteIdent(fieldName)+" = $"+(i+1+fieldNames4Update.length);
                            }).join(" AND ")+" "+
                            returningClausule,
                            [...values4Update, ...primaryKeyValuesForUpdate]
                        )[insertIfNotUpdate?'fetchOneRowIfExists':'fetchUniqueRow'](be.messages.server.cantUpdate_TLDR);
                    }
                    if(insertIfNotUpdate && !result.rowCount){
                        if(defTable.sql.insertIfNotUpdate){
                            defTable.primaryKey.forEach(function(name,i){
                                if(!fieldNames4Insert.includes(name)){
                                    fieldNames4Insert.push(name);
                                    values4Insert.push(primaryKeyValues[i]);
                                }
                            });
                        }
                        if(defTable.sql.insertIfNotUpdate !== false){
                            result = await insertFun();
                        }
                    }
                }else if(!parameters.masive || primaryKeyValues.length>0){
                    console.log("invalid request", parameters);
                    throw new Error(be.messages.server.missingPrimaryKeyValues);
                }else{
                    return {masive:true};
                }
                if(main){
                    mainResult=result;
                }
            }
            if((!mainDefTable || parameters.status!='new') 
                && (!mainDefTable || parameters.primaryKeyValues.length!=mainDefTable.primaryKey.length)
                && (parameters.masive && parameters.primaryKeyValues.length>0)
            ){
                return {masive:true};
            }
            var insertOrUpdate=result.command;
            if(mainDefTable.sql.from && result.row && (!opts || !opts.forImport)){
                //var rowFrom = plainUpdate.values.length?result.row:primaryKeyValueObject;
                var rowFrom = parameters.status!='new' && !plainUpdate.values.length?
                    likeAr.toPlainObject(mainDefTable.primaryKey,expectedMainPrimaryKeyValues):
                    (mainResult||result).row;
                result = await be.queryValuesOfUniqueRow(context, mainDefTable, rowFrom);
            }
            return {command:insertOrUpdate, row:result.row};
        }
    },
    {
        action:'table_record_delete',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'primaryKeyValues'}
        ],
        coreFunction:function(context, parameters){
            var be=context.be;
            var defTable=be.tableStructures[parameters.table](context);
            if(!defTable.allow.delete){
                throw changing(new Error("Deletes not allowed"),{status:403});
            }
            var primaryKeyFields=defTable.primaryKey4Delete||defTable.primaryKey;
            var primaryKeyValues=parameters.primaryKeyValues;
            if(defTable && primaryKeyValues.length==primaryKeyFields.length){
                var sqlDelete;
                if(defTable.sql.logicalDeletes){
                    sqlDelete="UPDATE "+be.db.quoteIdent(defTable.sql.tableName)+
                    " SET "+be.db.quoteIdent(defTable.sql.logicalDeletes.fieldName)+
                    " = "+be.db.quoteNullable(defTable.sql.logicalDeletes.valueToDelete);
                }else{
                    sqlDelete="DELETE FROM "+be.db.quoteIdent(defTable.sql.tableName);
                }
                sqlDelete+=" WHERE "+primaryKeyFields.map(function(fieldName, i){
                    return be.db.quoteIdent(fieldName)+" = $"+(i+1);
                }).join(" AND ")+" AND "+(defTable.sql.where||'true')+
                " RETURNING "+primaryKeyFields.map(be.db.quoteIdent).join(', ');
                return context.client.query(sqlDelete,primaryKeyValues).fetchUniqueRow(be.messages.server.cantDelete_TLDR).then(function(result){
                    return result.row;
                });
            }else{
                console.log("invalid request", parameters);
                throw new Error("invalid request");
            }
        }
    },
    {
        action:'table_records_delete',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'rowsToDelete'},
            {name: 'expectedRemainCount'}
        ],
        progress:true,
        coreFunction:async function(context, parameters){
            var be=context.be;
            context.informProgress({message:be.messages.server.deleting})
            var be=context.be;
            var defTable=be.tableStructures[parameters.table](context);
            if(!defTable.allow.delete && !defTable.allow.deleteAll){
                throw changing(new Error("Deletes not allowed"),{status:403});
            }
            var deleteCounter=0;
            var deleteOneRow=function(row){
                //return Promise.resolve().then(function(){
                //    row.
                var dataParams=[];
                var whereParts=[];
                defTable.fields.forEach(function(fieldDef){
                    var fieldName=fieldDef.name;
                    if(fieldName in row){
                        var value=row[fieldName];
                        if(fieldDef.clientSide){
                            //skip
                        }else if(value==null){
                            whereParts.push(be.db.quoteIdent(fieldName)+" IS NULL");
                        }else if(fieldDef.inexactNumber){
                            dataParams.push(value);
                            whereParts.push("abs("+be.db.quoteIdent(fieldName)+" - $"+dataParams.length+")<0.00000005");
                        }else{
                            dataParams.push(value);
                            whereParts.push(be.db.quoteIdent(fieldName)+" = $"+dataParams.length);
                        }
                    }
                });
                return context.client.query(
                    inlineLog(
                    "DELETE FROM "+be.db.quoteIdent(defTable.sql.tableName)+
                    " WHERE "+whereParts.join(" AND ")+" RETURNING 1"),
                    dataParams
                ).fetchUniqueRow().then(function(){
                    deleteCounter++;
                    context.informProgress({lengthComputable:true, loaded:deleteCounter, total:parameters.rowsToDelete.length});
                });
            };
            var result = await Promise.all(parameters.rowsToDelete.map(deleteOneRow)).then(function(){
                return context.client.query(
                    "SELECT count(*) remaining_record_count FROM "+be.db.quoteIdent(defTable.sql.tableName)
                ).fetchUniqueRow().then(function(result){
                    context.informProgress({lengthComputable:true, loaded:deleteCounter, total:parameters.rowsToDelete.length, force:true});
                    return result.row;
                });
            });
            context.informProgress({message:be.messages.server.deleted})
            return result;
        }
    },
    {
        action:'table_record_lock',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'primaryKeyValues'},
            {name: 'token'},
            {name: 'softLock'},
        ],
        /** @param {ProcedureContext} context */
        /** @param {TablaDatosGenerarParameters} parameters */
        coreFunction:async function(context, parameters){
            var be=context.be;
            var db=be.db;
            var tableDef=be.tableStructures[parameters.table](context);
            var tableDefArray = [tableDef].concat(tableDef.offline.details.map(name=>be.tableStructures[name](context)));
            if(!tableDef || !tableDef.offline.mode){
                throw new Error("No offline mode for "+parameters.table);
            }
            var fixedFields = tableDef.primaryKey.map((name,i) => ({fieldName: name, value: parameters.primaryKeyValues[i]}));
            var results = await Promise.all(tableDefArray.map(
                function(tableDef){
                    return be.procedure.table_data.coreFunction(
                        context,{
                            table: tableDef.name, 
                            fixedFields:fixedFields
                        }
                    )
                }
            ));
            if(!parameters.softLock){
                var locksTableDef=be.tableStructures['locks'](context);
                var promiseChain=Promise.resolve();
                tableDefArray.forEach(function(tableDef,i){
                    results[i].forEach(function(row){
                        var primaryKeyValues = {};
                        tableDef.fields.forEach(function(field){
                            if(field.isPk){
                                primaryKeyValues[field.name]=row[field.name];
                            }
                        })
                        var newRow = {
                            table_name: tableDef.sql.tableName,
                            record_pk: JSON.stringify(primaryKeyValues),
                            token: parameters.token,
                            lock_datetime: datetime.now(),
                            unlock_datetime: null
                        }
                        var primaryKeyValues = [];
                        locksTableDef.fields.forEach(function(field){
                            if(field.isPk){
                                primaryKeyValues[field.isPk-1]=newRow[field.name];
                            }
                        })
                        promiseChain=promiseChain.then(function(){
                            return be.procedure.table_record_save.coreFunction(
                                context,{
                                    table: 'locks', 
                                    primaryKeyValues,
                                    newRow,
                                    oldRow:[],
                                    status:'update',
                                    insertIfNotUpdate:true,
                                    masive:true
                                }
                            )
                        });
                    });
                });
                await promiseChain;
            }
            var tableNames = tableDefArray.map(function(tableDef){
                return tableDef.name
            })
            return {data:results, tableNames: tableNames};
        }
    },
    {
        action: 'token_get',
        parameters:[
            {name:'useragent' },
            {name:'username' },
        ],
        coreFunction:function(context, parameters){
            var now = datetime.now();
            var token = parameters.username + now;
            var client=context.client;
            var be=context.be;
            return Promise.resolve().then(function(){
                return client.query(
                    "insert into tokens(token, date, username, useragent) values (md5($1), $2, $3, $4) returning token",
                    [token, now, parameters.username, parameters.useragent]
                ).fetchUniqueRow();
            }).then(function(result){
                return {token:result.row.token, usuario: context.user.usuario}
            }).catch(function(err){
                console.log('ERROR',err.message);
                throw err;
            });
        }
    },
    {
        action:'table_record_enter',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'primaryKeyValues'}
        ],
        coreFunction:function(context, parameters){
            var be=context.be;
            var defTable=be.tableStructures['cursors'](context);
            var otherFields={username:context.username, machineId:context.machineId, navigator: context.navigator, since:new Date()};
            var fieldNames=[];
            var values=[];
            for(var name in parameters){
                values.push(parameters[name]);
                if(name==='table'){name='table_name'}
                if(name==='primaryKeyValues'){name='pk_values'}
                fieldNames.push(name);
            }
            for(var name in otherFields){
                fieldNames.push(name);
                values.push(otherFields[name]);
            }
            var returningClausule="RETURNING "+defTable.sql.select.join(', ');
                var x;
                return context.client.query(x=
                    "INSERT INTO "+be.db.quoteIdent(defTable.sql.tableName)+
                    " ("+fieldNames.map(function(name,i){ return be.db.quoteIdent(name); }).join(', ')+
                    ") VALUES ("+fieldNames.map(function(name,i){ return '$'+(i+1); }).join(', ')+
                    ") "+returningClausule,
                    values
                ).fetchUniqueRow().then(function(result){
                    return result.row;
                });
        }
    },
    {
        action:'table_record_leave',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'primaryKeyValues'}
        ],
        coreFunction:function(context, parameters){
            //return 'ok';
            var be=context.be;
            var defTable=be.tableStructures['cursors'](context);
            var otherFields={username:context.username, machineId:context.machineId, navigator: context.navigator};
            var fieldNames=[];
            var values=[];
            for(var name in parameters){
                values.push(parameters[name]);
                if(name==='table'){name='table_name'}
                if(name==='primaryKeyValues'){name='pk_values'}
                fieldNames.push(name);
            }
            for(var name in otherFields){
                fieldNames.push(name);
                values.push(otherFields[name]);
            }
            return context.client.query(
                "DELETE FROM "+be.db.quoteIdent(defTable.sql.tableName)+
                " WHERE "+fieldNames.map(function(name,i){
                    return be.db.quoteIdent(name)+' = $'+(i+1)}).join( ' AND '),values
            ).fetchOneRowIfExists().then(function(result){
                return 'ok';
            });
        
        }
    },
    {
        action:'admin_chpass',
        parameters:[
            {name:'user'},
            {name:'newpass'},
        ],
        coreFunction:async function(context, parameters){
            if(context.be.isAdmin(context) && context.user[context.be.config.login.userFieldName]!=parameters.user){
                var ok = await context.be.changePassword(context.client,parameters.user,false,parameters.newpass);
                if(ok){
                    return ok
                }
            }
            throw changing(new Error("not allowed"), {status: 401});
        }
    },
    {
        action:'table_upload',
        multipart:true,
        progress:true,
        parameters:[
            {name: 'table'},
            {name: 'prefilledFields'},
            {name: 'skipUnknownFieldsAtImport'},
            {name: 'simplificateSpaces'},
            {name: 'replaceNewLineWithSpace'},
        ],
        files:{count:1},
        coreFunction:async function(context, parameters, files){
            var be=context.be;
            var doing="opening file";
            var skipUnknownFieldsAtImport = coalesce(parameters.skipUnknownFieldsAtImport, be.config.skipUnknownFieldsAtImport);
            /** @type {string[]} */
            var skippedColumns = [];
            async function recreateConstraints(tableDef, enable){
                return await context.client.query(
                    `select ${context.be.db.quoteIdent(`${tableDef.tableName}_toggle_consts`)}($1)`,
                    [enable]
                ).execute();
            }
            return Promise.resolve().then(async function(){
                // console.log('xxxxxxxx files', files);
                var tableDef=be.tableStructures[parameters.table](context);
                if(!tableDef.allow.import){
                    throw changing(new Error("import not allowed"),{status:403});
                }
                context.informProgress({message:be.messages.fileUploaded});
                var readerFunction;
                // console.log('xxxxxxxxxxxxxxx ',files[0].originalFilename);
                var fields=[];
                var otherFieldNames=[];
                var inputCuidado = false;
                var testCandidateColumnAndAddIt=function testCandidateColumnAndAddIt(fieldName, iColumn, cellAddress){
                    cellAddress=cellAddress||iColumn;
                    if(fieldName == "#cuidado"){
                        inputCuidado = true;
                    }else if(fieldName && fieldName!='#ignore'){
                        var fieldName=fieldName.trim();
                        if(tableDef.prefix){
                            fieldName=tableDef.prefix+'_'+fieldName;
                        }
                        var defField=tableDef.field[fieldName];
                        if(!defField){
                            fieldName=fieldName.toLowerCase();
                            defField=tableDef.field[fieldName];
                        }
                        if(!defField){
                            fieldName=fieldName.toLowerCase().trim();
                            defField=tableDef.fields.find(f =>(f.title??f.label??f.name).toLowerCase().trim() == fieldName);
                        }
                        if(!defField && !tableDef.JSONFieldForOtherFields){
                            if(skipUnknownFieldsAtImport){
                                skippedColumns.push(fieldName);
                            }else{
                                throw new Error(be.messages.server.columnDoesNotExistInTable.replace('$1', fieldName.trim()||cellAddress));
                            }
                        }
                        if(!defField && tableDef.JSONFieldForOtherFields){
                            otherFieldNames.push({index: iColumn, name: fieldName});
                            fields.push(changing(tableDef.JSONFieldForOtherFields,{iColumn:iColumn}));
                        }
                        if(defField && 
                            defField.inTable!==false && 
                            (defField.allow.import || defField.allow.insert && (defField.allow.update || defField.isPk)) &&
                            (!defField.clientSide || defField.serverSide)
                        ){
                            fields.push(changing(defField,{iColumn:iColumn}));
                        }
                    }
                };
                var addFieldToOthers = function addFieldToOthers(othersArray, field, value){
                    var otherFieldName = otherFieldNames.find(function findOtherFieldName(aux) { 
                        return aux.index === field.iColumn;
                    });
                    if(otherFieldName){
                        var index = othersArray.findIndex(function findIndexForOtherFieldName(aux) { 
                            return aux.name === otherFieldName.name
                        });
                        var row = {name: otherFieldName.name, index: otherFieldName.index, value: value || ''};                    
                        if(index == -1){
                            othersArray.push(row);          
                        }else{
                            othersArray[index] = row;          
                        }
                    }
                };
                var addOtherColumnsToNewRow = function addOtherColumnsToNewRow(newRow, othersArray){
                    if(tableDef.JSONFieldForOtherFields){
                        newRow[tableDef.JSONFieldForOtherFields.name] = JSON.stringify(othersArray);
                    }
                    return newRow;
                };
                var hashConverters={
                    "#null":null,
                    "#''":''
                };
                var controlCuidado = function(){
                    if(tableDef.importCuidado && !inputCuidado){
                        throw new Error(be.messages.server.notInputCuidado);
                    }
                }
                if(files[0].originalFilename.match(/\.(tab|txt)$/)){
                    readerFunction=fs.readFile(files[0].path,{encoding:'UTF8'}).then(function(content){
                        context.informProgress({message:be.messages.server.fileReaded});
                        doing="reading file";
                        var lines=content.split(/\r?\n/);
                        doing="accessing first sheet";
                        doing="detecting fields";
                        var separatorCandidate='|\t;,|'.split('');
                        var heading=[];
                        while(heading.length<2 && separatorCandidate.length>1){
                            var separator=separatorCandidate.shift();
                            heading=lines[0].split(separator);
                        }
                        heading.forEach(function(col,i){ return testCandidateColumnAndAddIt(col,i); });
                        controlCuidado();
                        doing="retrieving rows";
                        var rowsForUpsert=lines.slice(1).map(function(line){
                            var othersArray = [];
                            if(separator=='|'){
                                var row = line.split(/(?<!(?:^|[^\\])(?:\\\\)*\\)\|/).map(item => item.trimRight().replace(/\\(.)/g,(_,l)=>(l=='t'?'\t':l=='r'?'\r':l=='n'?'\n':l=='s'?' ':l)));
                            }else{
                                var row=line.split(separator);
                            }
                            var newRow={};
                            var primaryKeyValues=[];
                            fields.forEach(function(field){
                                var value=row[field.iColumn]||null;
                                if(field.defaultForOtherFields){
                                    addFieldToOthers(othersArray, field, value);
                                }else{
                                    if(value != null && parameters.replaceNewLineWithSpace){
                                        value = value.replace(/\s*\r?\n\s*/g,' ').trim()
                                    }
                                    if(value != null && parameters.skipUnknownFieldsAtImport){
                                        value = value.replace(/(\s|\u00A0)+/g,' ').trim()
                                    }
                                    newRow[field.name]=value;
                                }
                            });
                            if(inputCuidado){
                                newRow['#cuidado'] = row[0];
                            }
                            newRow = addOtherColumnsToNewRow(newRow, othersArray);
                            return newRow;
                        });
                        return {rowsForUpsert, otherFieldNames};
                    });
                }else if(files[0].originalFilename.match(/\.(xls|xlsx)$/)){
                    readerFunction=fs.readFile(files[0].path).then(function(content){
                        context.informProgress({message:be.messages.server.fileReaded});
                        doing="reading file";
                        var wb = XLSX.read(content, be.config["client-setup"].lang=='es'?{dateNF:'dd"/"mm"/"yyyy'}:{});
                        doing="accessing first sheet";
                        var ws = wb.Sheets[wb.SheetNames[0]];
                        var range = XLSX.utils.decode_range(ws['!ref']);
                        doing="detecting fields";
                        var cellAddress=XLSX.utils.encode_cell({r:0, c:0});
                        var cellOfA1=ws[cellAddress];
                        if(!cellOfA1){
                            throw new Error(be.messages.server.cellOfA1DoesNotExists)
                        }
                        var bpMode=cellOfA1.v.startsWith('#backend-plus');
                        if(!bpMode && !be.config.imports["allow-plain-xls"] && false){
                            throw new Error(be.messages.server.lackOfBackendPlusInImport);
                        }
                        var fieldNameRowNum=bpMode?1:0;
                        var dataColNum=bpMode?1:0;
                        for(var iColumn=dataColNum; iColumn<=range.e.c; iColumn++){
                            var cellAddress=XLSX.utils.encode_cell({r:fieldNameRowNum, c:iColumn});
                            var cellOfFieldName=ws[cellAddress];
                            if(cellOfFieldName){
                                if(typeof cellOfFieldName.v !== 'string'){
                                    throw new Error(be.messages.server.importColumnDoesNotHasStringValue.replace('$1', cellAddress));
                                }
                                testCandidateColumnAndAddIt(cellOfFieldName.v,iColumn,cellAddress);
                            }
                        }
                        controlCuidado();
                        doing="retrieving rows";
                        var rowsForUpsert=[];
                        for(var iRow=fieldNameRowNum+1; iRow<=range.e.r; iRow++){
                            var othersArray = [];
                            var skip=false;
                            var newRow={};
                            var primaryKeyValues=[];
                            for(let field of fields){
                                var cell=ws[XLSX.utils.encode_cell({r:iRow, c:field.iColumn})];
                                var raw=cell?cell.v:null;
                                if(raw!=null && raw!=='' || !bpMode){
                                    var value;
                                    if(raw==null || raw==='' || typeof raw ==="string" && raw.trim() === '') {
                                        value=null;
                                    }else if(typeof raw ==="string" && raw.startsWith('#') && be.config.imports['hashConverters']){
                                        if(raw.startsWith('##')){
                                            value=raw.substr(2);
                                        }else{
                                            value=hashConverters[raw.toLowerCase()];
                                        }
                                        if(value===undefined){
                                            throw new Error(be.messages.server.unkownHashValue4Import);
                                        }
                                    }else{
                                        value=typeStore.typerFrom(field).fromExcelCell(cell);
                                        if(field.typeName == 'text'){
                                            if(value != null && parameters.replaceNewLineWithSpace){
                                                value = value.replace(/\s*\r?\n\s*/g,' ').trim()
                                            }
                                            if(value != null && parameters.skipUnknownFieldsAtImport){
                                                value = value.replace(/(\s|\u00A0)+/g,' ').trim()
                                            }
                                        }
                                    }
                                    if(Number.isNaN(value)){
                                        value=null;
                                    }
                                    if(field.defaultForOtherFields){
                                        addFieldToOthers(othersArray, field, value);
                                    }else{
                                        newRow[field.name]=value;                                    
                                    }
                                }
                            };
                            if(inputCuidado){
                                newRow['#cuidado'] = (ws[XLSX.utils.encode_cell({r:iRow, c:0})]||{}).v;
                            }
                            newRow = addOtherColumnsToNewRow(newRow, othersArray);
                            rowsForUpsert.push(newRow);
                        }
                        context.informProgress({message:be.messages.server.spreadsheetProcessed});
                        return {rowsForUpsert, otherFieldNames};
                    });
                }else{
                    readerFunction = Promise.reject(be.messages.server.unkownExt);
                };
                var inserted=0;
                var updated=0;
                var deleted=0;
                var readed=0;
                var skipped=0;
                var total=1;
                var origin=new Date();
                if(tableDef.sql.constraintsDeferred){
                    await recreateConstraints(tableDef, false);
                    await context.client.query("SET CONSTRAINTS ALL DEFERRED").execute();
                }
                return readerFunction.then(async function(rowsAndOtherFieldsNames){
                    var importErrors = [];
                    var rowsForUpsert = rowsAndOtherFieldsNames.rowsForUpsert;
                    total = rowsForUpsert.length;
                    var otherFieldNames = rowsAndOtherFieldsNames.otherFieldNames;
                    var lastMessageSended=new Date();
                    context.informProgress({message:be.messages.updatingDb});
                    var previousRow={};
                    let lineNumber = 1;
                    for(let newRow of rowsForUpsert){
                        var { procedure, insertIfNotUpdate, status } = ({
                            false      :{procedure:'table_record_save'  , status:'update', insertIfNotUpdate: true },
                            ['#nuevo' ]:{procedure:'table_record_save'  , status:'new'   , insertIfNotUpdate: false},
                            ['#cambio']:{procedure:'table_record_save'  , status:'update', insertIfNotUpdate: false},
                            ['#borrar']:{procedure:'table_record_delete', status:'update', insertIfNotUpdate: false},
                        })[ inputCuidado && newRow['#cuidado'] ] || {}
                        if(inputCuidado){
                            delete newRow['#cuidado'];
                        }
                        if(procedure == null){
                            skipped++;
                            continue;
                        }
                        var skip=false;
                        var hasOneValue=false;
                        var primaryKeyValues=[];
                        for(let pair of parameters.prefilledFields){
                            if(newRow[pair.fieldName]==null){
                                var defField = tableDef.field[pair.fieldName];
                                newRow[pair.fieldName]=pair.value;
                                if(defField.isPk){
                                    primaryKeyValues[defField.isPk-1]=pair.value;
                                }
                            }else{
                                hasOneValue=true;
                            }
                        };
                        var slicers={};
                        for(let field of fields){
                            var value = newRow[field.name];
                            if(value != null){
                                hasOneValue=true;
                            }
                        };
                        if(!hasOneValue){
                            return;
                        }
                        for(let field of fields){
                            var value = newRow[field.name];
                            var prefilledField = parameters.prefilledFields.find(function findPrefilledfield(aux) { 
                                return aux.fieldName === field.name;
                            });
                            if(prefilledField && prefilledField.value != value){
                                throw new Error(be.messages.server.prefilledField1IsInConflictWithImportedField.replace('$1',prefilledField.fieldName));
                            }
                            if(field.isPk){
                                primaryKeyValues[field.isPk-1]=value;
                                if(value==null && !defField.specialValueWhenInsert){
                                    throw new Error(be.messages.server.primarKeyCantBeNull4.replace('$1',lineNumber).replace('$2',field.name));
                                }
                            }
                            if(field.isSlicer && value!=null && value!='tcaba'){ // OJO generalizar el tcaba
                                if(field.typeName=='text' && typeof value!=='string'){ // OJO generalizar el casteo con type-store
                                    value=value+'';
                                }
                                slicers[field.name]=value;
                            }
                        };
                        if(tableDef.slicerField){
                            newRow[tableDef.slicerField]=slicers;
                            var defSlicerField = tableDef.field[tableDef.slicerField];
                            if(defSlicerField.isPk){
                                primaryKeyValues[defSlicerField.isPk-1]=slicers;
                            }
                        }
                        //var tryToImportWithIncompletePk=false;
                        //primaryKeyValues.forEach(function(primaryKeyValue){
                        //    if(primaryKeyValue!=null){
                        //        tryToImportWithIncompletePk=true
                        //    }
                        //});
                        //if(tryToImportWithIncompletePk){
                        if(!skip){
                            readed++;
                            context.informProgress({lengthComputable:true, loaded:readed, total:total});
                            try{
                                var result = await be.procedure[procedure].coreFunction(
                                    context,
                                    {
                                        table: parameters.table, 
                                        primaryKeyValues,
                                        newRow,
                                        oldRow:[],
                                        status,
                                        insertIfNotUpdate,
                                        masive:true,
                                        lineNumber
                                    },
                                    null,
                                    {forImport:true}
                                )
                                if(result.command==='INSERT'){
                                    inserted++;
                                }else if(result.command==='UPDATE'){
                                    updated++;
                                }else if(procedure=='table_record_delete'){
                                    deleted++;
                                }
                            }catch(err){
                                err.detail=be.messages.server.line+' '+lineNumber+' / '+tableDef.primaryKey+' = '+JSON.stringify(primaryKeyValues);
                                if(PANIC_IMPORT){
                                    throw err;
                                }else{
                                    importErrors.push(err);
                                    try{
                                        await context.client.query('ROLLBACK').execute();
                                    }catch(err2){
                                        err.detail+=' *** in ROLLBACK ' + err2.message;
                                        throw err
                                    }
                                    try{
                                        await context.client.query("BEGIN TRANSACTION").execute();
                                    }catch(err2){
                                        err.detail+=' *** in BEGIN TRANSACTION ' + err2.message;
                                        throw err
                                    }
                                }
                            };
                        }
                        previousRow=newRow;
                        lineNumber++;
                    };
                    if(tableDef.registerImports.inTable){
                        var otherFieldsTableDef = be.tableStructures[tableDef.registerImports.inTable](context);                        
                        var timestamp = datetime.now();
                        var fieldNames = tableDef.registerImports.fieldNames;
                        for(let otherField of otherFieldNames){
                            var newRow = {};
                            newRow[fieldNames.tableName] = parameters.table;
                            newRow[fieldNames.fieldName] = otherField.name;
                            newRow[fieldNames.fieldIndex] = otherField.index;
                            if(fieldNames.originalFileName)newRow[fieldNames.originalFileName] = files[0].originalFilename;
                            if(fieldNames.serverPath)newRow[fieldNames.serverPath] = files[0].path;
                            if(fieldNames.lastUpload)newRow[fieldNames.lastUpload] = timestamp;
                            var primaryKeyValues = [];
                            for(let pkOtherField of otherFieldsTableDef.primaryKey){
                                primaryKeyValues.push(newRow[pkOtherField]);
                            };
                            await be.procedure[procedure].coreFunction(
                                context,{
                                    table: otherFieldsTableDef.name, 
                                    primaryKeyValues,
                                    newRow,
                                    oldRow:[],
                                    status,
                                    insertIfNotUpdate,
                                    masive:true
                                }
                            );
                        };
                    }
                    if(importErrors.length){
                        await context.client.query('ROLLBACK').execute();
                        return {json:{importErrors}};
                    }
                    context.informProgress({message:be.messages.insertingRows});
                }).then(async function(other){
                    context.informProgress({message:be.messages.checkingConstraints});
                    if(tableDef.sql.constraintsDeferred){
                        await context.client.query("SET CONSTRAINTS ALL IMMEDIATE").execute();
                        await recreateConstraints(tableDef, true);
                    }
                    context.informProgress({lengthComputable:true, loaded:readed, total:total, force:true});
                    return other || {uploaded:{inserted,updated,skipped,deleted,skippedColumns}};
                });
            }).catch(function(err){
                console.log('ERROR',err.message);
                console.log('DOING',doing);
                err.doing=doing;
                throw err;
            });
        }
    },
    {
        action:'summary_generate',
        parameters:[
            {name: 'table', encoding:'plain'}
        ],
        bitacora:{always: false, error: false},
        resultOk:'showGrid',
        coreFunction:async function(context,parameters){
            var {be} = context;
            var {db} = be;
            var tableName = parameters.table;
            var rows = await be.inTransaction(null, async function(client){
                await client.query(`
                    delete from "summary" where table_name = $1
                `, [tableName]).execute();
                var {rows} = await client.query(`
                    insert into "summary" (table_name, name, data_type, ordinal_position)
                        (select table_name, column_name, data_type, ordinal_position
                            from information_schema.columns
                            where table_schema = $1 and table_name = $2)
                        returning *
                `, [be.config.db.schema, tableName]).fetchAll();
                return rows;
            })
            var summaryDef = be.tableStructures.summary(context);
            var summaryName = 'summary:'+tableName;
            be.tableStructures[summaryName]=function(context){
                return changing(
                    be.tableStructures.summary(context), {
                        name:summaryName,
                        sql:{
                            where:`table_name = ${db.quoteLiteral(tableName)}`
                        },
                        isTable:false,
                        refrescable:true
                    }
                )
            }
            Promise.resolve().then(async function(){
                try{
                    var client = await be.getDbClient();
                    var db = be.db;
                    var allCache={}
                    for(var i=0; i<rows.length; i++){ var row=rows[i];
                        var cache={}
                        allCache[row.name]=cache;
                        for(var j=0; j<summaryDef.fields.length; j++){ var fieldDef=summaryDef.fields[j];
                            if(fieldDef.summary 
                                && (!fieldDef.summary.types4 || fieldDef.summary.types4.includes(row.data_type))
                                && (!fieldDef.summary.excludeTypes || !fieldDef.summary.excludeTypes.includes(row.data_type))
                            ){
                                var sql=fieldDef.summary.sql|| `select ${(fieldDef.summary.expr)} from $2`;
                                var sqlReplaced=sql
                                    .replace(/\$1/g,db.quoteIdent(row.name))
                                    .replace(/\$2/,tableName)
                                    .replace(/\$(\w+)\b/,function(all, varName){ return db.quoteNullable(cache[varName])})
                                var update=`
                                    update summary
                                        set ${db.quoteIdent(fieldDef.name)} = (${sqlReplaced})
                                        where table_name = $1 and name = $2
                                        returning ${db.quoteIdent(fieldDef.name)}
                                `;
                                try{
                                    cache[fieldDef.name] = (await client.query(update, [tableName, row.name]).fetchUniqueValue()).value;
                                }catch(err){
                                    console.error('ERROR',err);
                                    console.error(update, [tableName, row.name]);
                                }
                            }
                        }
                    }
                }catch(err){
                    console.log('ERROR IN SUMMARY',tableName);
                    console.log(err)
                }finally{
                    if(client){
                        client.done();
                    }
                }
            });
            return { tableName:summaryName };
        }
    },
    {
        action:'history_changes',
        parameters:[
            {name:'tableName'       , typeName:'text' },
            {name:'fieldName'       , typeName:'text' },
            {name:'primaryKeyValues', typeName:'jsonb'},
        ],
        bitacora:{always: false, error: false},
        resultOk:'showGrid',
        coreFunction:async function(context,parameters){
            var {be,client} = context;
            if(context.user[be.config.login.rolFieldName] != 'admin'){
                throw new Error('Forbiden history')
            }
            console.log(`select 
            cha_new_value as valor, 
            cha_when as cuando,
            cha_who as quien
        from his.changes
        where cha_table = $1 
            and cha_column = $2
            and cha_new_pk = ${context.be.db.quoteLiteral(JSON.stringify(parameters.primaryKeyValues))}
        order by cha_when desc
    `)
            var tableDef = be.tableStructures[parameters.tableName](context);
            var pk = likeAr.toPlainObject(tableDef.primaryKey, parameters.primaryKeyValues)
            var result = await client.query(`select 
                    cha_new_value as valor, 
                    cha_when as cuando,
                    split_part(cha_context,' ',1) as quien
                from his.changes
                where cha_table = $1 
                    and cha_column = $2
                    and cha_new_pk = ${context.be.db.quoteLiteral(JSON.stringify(pk))}
                order by cha_when desc
            `,[parameters.tableName, parameters.fieldName]).fetchAll();
            return result.rows;
        }
    }
];

module.exports = ProcedureTables;
