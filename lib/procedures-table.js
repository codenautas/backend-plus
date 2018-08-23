"use strict";

var datetime = require('best-globals').datetime;
var changing = require('best-globals').changing;
var sleep = require('best-globals').sleep;
var XLSX = require('xlsx-style');
var fs = require('fs-extra');
var typeStore=require('type-store');

var ProcedureTables;

function inlineLog(mmm){ console.log(mmm); return mmm; }

ProcedureTables = [
    {
        action:'table/structure',
        parameters:[
            {name: 'table', encoding:'plain'}
        ],
        coreFunction:function(context, parameters){
            var be=context.be;
            var defTable=be.tableStructures[parameters.table];
            if(!defTable){
                throw new Error('no table def for '+parameters.table)
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
            return changing(struct, {sql: undefined},changing.options({deletingValue:undefined}));
        }
    },
    {
        action:'table/data',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'fixedFields', defaultValue:[]},
            {name: 'paramfun', defaultValue:[]}
        ],
        coreFunction:function(context, parameters){
            var be=context.be;
            var defTable=be.tableStructures[parameters.table];
            if(!defTable){
                throw new Error('no table def for '+parameters.table)
            }
            defTable=defTable(context);
            var sql;
            var queryValues=[];
            var specialFixedClause=[];
            var fixedClausule=[];
            if(defTable.functionDef){
                parameters.fixedFields.forEach(function(pair, iPair){
                    if(defTable.functionDef.parameters.find(x=>x.name==pair.fieldName) && !(pair.fieldName in parameters.paramfun)){
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
                    throw new Error('field does not exists '+pair.fieldName+' in table '+parameters.table);
                }
                var fieldName = pair.fieldName;
                var alias = defTable.alias;
                if(/__/.test(pair.fieldName)){
                    fieldName=pair.fieldName.split('__')[1];
                    alias=pair.fieldName.split('__')[0];
                }
                queryValues.push(pair.value);
                var comparison = " = $" + queryValues.length;
                if(pair.range){
                    queryValues.push(pair.value);
                    queryValues.push(pair.range);
                    queryValues.push(pair.range);
                    comparison = " between $" + queryValues.length-3 + ' - $' +queryValues.length-1 + ' and $' +queryValues.length-2 + ' + $' +queryValues.length-3;
                }
                var exprClausule=' AND '+be.db.quoteIdent(alias)+'.'+be.db.quoteIdent(fieldName) + comparison
                if(defTable.sql && defTable.sql.fields[fieldName] && defTable.sql.fields[fieldName].expr){
                    specialFixedClause.push(be.db.quoteIdent(fieldName) + comparison)
                }else{
                    fixedClausule.push(exprClausule)
                }
            });
            var sql="SELECT "+defTable.sql.select.join(', ')+
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
        action:'table/save-record',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'primaryKeyValues'},
            {name: 'newRow'},
            {name: 'oldRow'},
            {name: 'status', encoding:'plain'},
        ],
        coreFunction:function(context, parameters, files, opts){
            var be=context.be;
            var defTable=be.tableStructures[parameters.table](context);
            var insertIfNotUpdate=parameters.insertIfNotUpdate || defTable.sql.insertIfNotUpdate;
            var action=parameters.status=='new'?'insert':'update';
            var insertOrUpdate="";
            if(!defTable.allow[action] && (!opts || !opts.forImport)){
                throw changing(new Error(action+" not allowed"),{status:403});
            }
            var primaryKeyValues=parameters.primaryKeyValues;
            var fieldNames=[];
            var values=[];
            for(var name in parameters.newRow){
                if(!defTable.field[name].allow[action] && (!opts || !opts.forImport) && (
                    !defTable.field[name].isPk || 
                    parameters.primaryKeyValues[defTable.field[name].isPk-1]!=parameters.newRow[name]
                )){
                    throw changing(new Error(action+" not allowed for "+name),{status:403});
                }
                fieldNames.push(name);
                values.push(parameters.newRow[name]);
                if(!defTable.field[name]){
                    console.log("invalid request", parameters);
                    throw new Error("invalid request");
                }
            }
            var returningClausule='';
            if(defTable.sql.from){
                returningClausule="RETURNING "+defTable.primaryKey.map(be.db.quoteIdent).join(', ');
            }else{
                returningClausule="RETURNING "+defTable.sql.select.join(', ');
            }
            var insertFun=function(){
                return context.client.query(
                    "INSERT INTO "+be.db.quoteIdent(defTable.sql.tableName)+
                    " ("+fieldNames.map(function(name,i){ return be.db.quoteIdent(name); }).join(', ')+
                    ") VALUES ("+fieldNames.map(function(name,i){ return '$'+(i+1); }).join(', ')+
                    ") "+returningClausule,
                    values
                ).fetchUniqueRow();
            }
            var sql;
            return Promise.resolve().then(function(){
                if(defTable && parameters.status=='new'){
                    return insertFun();
                }else if(defTable && primaryKeyValues.length==defTable.primaryKey.length){
                    return context.client.query(sql=
                    //return context.client.query(
                        "UPDATE "+be.db.quoteIdent(defTable.sql.tableName)+
                        " SET "+fieldNames.map(function(name,i){ return be.db.quoteIdent(name)+" = $"+(i+1); }).join(', ')+
                        " WHERE "+defTable.primaryKey.map(function(fieldName, i){
                            return be.db.quoteIdent(fieldName)+" = $"+(i+1+fieldNames.length);
                        }).join(" AND ")+" "+
                        returningClausule,
                        values.concat(primaryKeyValues)
                    )[insertIfNotUpdate?'fetchOneRowIfExists':'fetchUniqueRow']().then(function(result){
                        if(insertIfNotUpdate){
                            if(result.rowCount==1){
                                return result;
                            }else{
                                if(defTable.sql.insertIfNotUpdate){
                                    defTable.primaryKey.forEach(function(name,i){
                                        fieldNames.push(name);
                                        values.push(parameters.primaryKeyValues[i]);
                                    });
                                }
                                return insertFun();
                            }
                        }
                        return result;
                    });
                }else if(!parameters.masive || primaryKeyValues.length>0){
                    console.log("invalid request", parameters);
                    throw new Error(be.messages.server.missingPrimaryKeyValues);
                }else{
                    return {masive:true};
                }
                // }).then(sleep(1000)).then(function(result){
                //     console.log('xxxxxxxxxxxxxxx result');
                //     console.log(result);
                //     return result;
            }).then(function(result){
                insertOrUpdate=result.command;
                return result;
            }).then(function(result){
                if(defTable.sql.from && result.row){
                    return be.queryValuesOfUniqueRow(context, defTable, result.row);
                }else{
                    return result;
                }
            }).then(function(result){
                return {command:insertOrUpdate, row:result.row};
            }).catch(function(err){
                console.log(sql);
                console.log(err);
                throw err;
            })
        }
    },
    {
        action:'table/delete-record',
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
            var primaryKeyValues=parameters.primaryKeyValues;
            if(defTable && primaryKeyValues.length==defTable.primaryKey.length){
                var sqlDelete;
                if(defTable.sql.logicalDeletes){
                    sqlDelete="UPDATE "+be.db.quoteIdent(defTable.sql.tableName)+
                    " SET "+be.db.quoteIdent(defTable.sql.logicalDeletes.fieldName)+
                    " = "+be.db.quoteNullable(defTable.sql.logicalDeletes.valueToDelete);
                }else{
                    sqlDelete="DELETE FROM "+be.db.quoteIdent(defTable.sql.tableName);
                }
                sqlDelete+=" WHERE "+defTable.primaryKey.map(function(fieldName, i){
                    return be.db.quoteIdent(fieldName)+" = $"+(i+1);
                }).join(" AND ")+" AND "+(defTable.sql.where||'true')+
                " RETURNING "+defTable.primaryKey.map(be.db.quoteIdent).join(', ');
                return context.client.query(sqlDelete,primaryKeyValues).fetchUniqueRow().then(function(result){
                    return result.row;
                });
            }else{
                console.log("invalid request", parameters);
                throw new Error("invalid request");
            }
        }
    },
    {
        action:'table/delete-many-records',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'rowsToDelete'},
            {name: 'expectedRemainCount'}
        ],
        coreFunction:function(context, parameters){
            var be=context.be;
            var defTable=be.tableStructures[parameters.table](context);
            if(!defTable.allow.delete && !defTable.allow.deleteAll){
                throw changing(new Error("Deletes not allowed"),{status:403});
            }
            var primaryKeyValues=parameters.primaryKeyValues;
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
                    " WHERE "+whereParts.join(" AND ")),
                    dataParams
                ).execute();
            };
            return Promise.all(parameters.rowsToDelete.map(deleteOneRow)).then(function(){
                return context.client.query(
                    "SELECT count(*) remaining_record_count FROM "+be.db.quoteIdent(defTable.sql.tableName)
                ).fetchUniqueRow().then(function(result){
                    return result.row;
                });
            });
        }
    },
    {
        action:'table/lock-record',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'primaryKeyValues'},
            {name: 'token'},
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
                    return be.procedure['table/data'].coreFunction(
                        context,{
                            table: tableDef.name, 
                            fixedFields:fixedFields
                        }
                    )
                }
            ));
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
                        return be.procedure['table/save-record'].coreFunction(
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
            return {data:results};
        }
    },
    {
        action: 'token/get',
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
                return client.query("insert into tokens(token, date, username, useragent) values (md5($1), $2, $3, $4) returning token",
                    [token, now, parameters.username, parameters.useragent]).fetchUniqueRow();
            }).then(function(result){
                return {token:result.row.token, usuario: context.user.usuario}
            }).catch(function(err){
                console.log('ERROR',err.message);
                throw err;
            });
        }
    },
    {
        action:'table/enter-record',
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
            //console.log('entra',{username:context.username, machineId:context.machineId, navigator: context.navigator},"parameters", parameters);
        }
    },
    {
        action:'table/leave-record',
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
        action:'admin/chpass',
        parameters:[
            {name:'user'},
            {name:'newpass'},
        ],
        coreFunction:function(context, parameters){
            var role = context.user[context.be.config.login.rolFieldName];
            if((role ==='admin' || role ==='programador') && context.user[context.be.config.login.userFieldName]!=parameters.user){
                var qUser = context.be.db.quoteIdent(context.be.config.login.userFieldName);
                var qPass = context.be.db.quoteIdent(context.be.config.login.passFieldName);
                var qTable = context.be.db.quoteIdent(context.be.config.login.table);
                return context.client.query(
                    "UPDATE "+qTable+" SET "+qPass+" = md5($1||"+qUser+") WHERE "+qUser+" = $2 RETURNING 'ok' as ok",
                    [parameters.newpass, parameters.user]
                ).fetchUniqueRow().then(function(result){
                    return result.row.ok==='ok';
                });
            }
            throw changing(new Error("not allowed"), {status: 401});
        }
    },
    {
        action:'table/upload',
        multipart:true,
        progress:true,
        parameters:[
            {name: 'table'},
            {name: 'prefilledFields'},
        ],
        files:{count:1},
        coreFunction:function(context, parameters, files){
            // console.log('xxxxxxx upload parameters', parameters);
            var be=context.be;
            var doing="opening file";
            return Promise.resolve().then(function(){
                // console.log('xxxxxxxx files', files);
                var defTable=be.tableStructures[parameters.table](context);
                if(!defTable.allow.import){
                    throw changing(new Error("import not allowed"),{status:403});
                }
                context.informProgress({message:be.messages.fileUploaded});
                var readerFunction;
                // console.log('xxxxxxxxxxxxxxx ',files[0].originalFilename);
                var fields=[];
                var otherFieldNames=[];
                var testCandidateColumnAndAddIt=function testCandidateColumnAndAddIt(fieldName, iColumn, cellAddress){
                    cellAddress=cellAddress||iColumn;
                    if(fieldName){
                        var fieldName=fieldName.toLowerCase().trim();
                        if(defTable.prefix){
                            fieldName=defTable.prefix+'_'+fieldName;
                        }
                        var defField=defTable.field[fieldName];
                        if(!defField && !be.config.skipUnknownFieldsAtImport && !defTable.JSONFieldForOtherFields){
                            throw new Error(be.messages.server.columnDoesNotExistInTable.replace('$1', cellAddress));
                        }
                        if(!defField && defTable.JSONFieldForOtherFields){
                            otherFieldNames.push({index: iColumn, name: fieldName});
                            fields.push(changing(defTable.JSONFieldForOtherFields,{iColumn:iColumn}));
                        }
                        if(defField && (defField.allow.import || defField.allow.insert && (defField.allow.update || defField.isPk))){
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
                    if(defTable.JSONFieldForOtherFields){
                        newRow[defTable.JSONFieldForOtherFields.name] = JSON.stringify(othersArray);
                    }
                    return newRow;
                };
                
                if(files[0].originalFilename.match(/\.(tab|txt)$/)){
                    readerFunction=fs.readFile(files[0].path,{encoding:'UTF8'}).then(function(content){
                        context.informProgress({message:be.messages.server.fileReaded});
                        doing="reading file";
                        var lines=content.split(/\r?\n/);
                        doing="accessing first sheet";
                        doing="detecting fields";
                        var separator=/[;|]/;
                        var heading=lines[0].split(separator);
                        heading.forEach(testCandidateColumnAndAddIt);
                        doing="retrieving rows";
                        var rowsForUpsert=lines.slice(1).map(function(line){
                            var othersArray = [];
                            var row=line.split(separator);
                            var newRow={};
                            var primaryKeyValues=[];
                            fields.forEach(function(field){
                                var value=row[field.iColumn]||null;
                                if(field.defaultForOtherFields){
                                    addFieldToOthers(othersArray, field, value);
                                }else{
                                    newRow[field.name]=value;
                                }
                            });
                            newRow = addOtherColumnsToNewRow(newRow, othersArray);
                            return newRow;
                        });
                        return {rowsForUpsert, otherFieldNames};
                    });
                }else if(files[0].originalFilename.match(/\.(xls|xlsx)$/)){
                    readerFunction=fs.readFile(files[0].path).then(function(content){
                        context.informProgress({message:be.messages.server.fileReaded});
                        doing="reading file";
                        var wb = XLSX.read(content);
                        doing="accessing first sheet";
                        var ws = wb.Sheets[wb.SheetNames[0]];
                        var range = XLSX.utils.decode_range(ws['!ref']);
                        doing="detecting fields";
                        for(var iColumn=range.s.c; iColumn<=range.e.c; iColumn++){
                            var cellAddress=XLSX.utils.encode_cell({r:0, c:iColumn});
                            var cellOfFieldName=ws[cellAddress];
                            if(cellOfFieldName){
                                if(typeof cellOfFieldName.v !== 'string'){
                                    throw new Error(be.messages.server.importColumnDoesNotHasStringValue.replace('$1', cellAddress));
                                }
                                testCandidateColumnAndAddIt(cellOfFieldName.v,iColumn,cellAddress);
                            }
                        }
                        doing="retrieving rows";
                        var rowsForUpsert=[];
                        for(var iRow=range.s.r+1; iRow<=range.e.r; iRow++){
                            var othersArray = [];
                            var skip=false;
                            var newRow={};
                            var primaryKeyValues=[];
                            fields.forEach(function(field){
                                var cell=ws[XLSX.utils.encode_cell({r:iRow, c:field.iColumn})];
                                var value=cell?typeStore.typerFrom(field).fromExcelCell(cell):null;
                                if(value=='NA'){  // OJO generalizar el NA
                                    value=null;
                                }
                                if(field.defaultForOtherFields){
                                    addFieldToOthers(othersArray, field, value);
                                }else{
                                    newRow[field.name]=value;                                    
                                }
                            });
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
                var readed=0;
                var total=1;
                var origin=new Date();
                return readerFunction.then(function(rowsAndOtherFieldsNames){
                    // console.log('xxxxx upsert', rowsForUpsert);
                    var rowsForUpsert = rowsAndOtherFieldsNames.rowsForUpsert;
                    total = rowsForUpsert.length;
                    var otherFieldNames = rowsAndOtherFieldsNames.otherFieldNames;
                    var promiseChain=Promise.resolve();
                    console.log(parameters.prefilledFields);
                    var lastMessageSended=new Date();
                    context.informProgress({message:be.messages.updatingDb});
                    rowsForUpsert.forEach(function(newRow){
                        var skip=false;
                        var primaryKeyValues=[];
                        parameters.prefilledFields.forEach(function(pair){
                            if(newRow[pair.fieldName]==null){
                                var defField = defTable.field[pair.fieldName];
                                newRow[pair.fieldName]=pair.value;
                                if(defField.isPk){
                                    primaryKeyValues[defField.isPk-1]=pair.value;
                                }
                            }
                        });
                        var slicers={};
                        fields.forEach(function(field){
                            var value=newRow[field.name];
                            var prefilledField = parameters.prefilledFields.find(function findPrefilledfield(aux) { 
                                return aux.fieldName === field.name;
                            });
                            if(prefilledField && prefilledField.value != value){
                                throw new Error('Prefilled field (' + prefilledField.fieldName + ') is in conclict with imported field');
                            }
                            if(field.isPk){
                                primaryKeyValues[field.isPk-1]=value;
                                if(value==null){
                                    skip=true;
                                }
                            }
                            if(field.isSlicer && value!=null && value!='tcaba'){ // OJO generalizar el tcaba
                                if(field.typeName=='text' && typeof value!=='string'){ // OJO generalizar el casteo con type-store
                                    value=value+'';
                                }
                                slicers[field.name]=value;
                            }
                        });
                        if(defTable.slicerField){
                            newRow[defTable.slicerField]=slicers;
                            var defSlicerField = defTable.field[defTable.slicerField];
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
                            promiseChain = promiseChain.then(function(){
                                readed++;
                                if(new Date()-lastMessageSended>500){
                                    lastMessageSended=new Date();
                                    context.informProgress({lengthComputable:true, loaded:readed, total:total});
                                }
                                return be.procedure['table/save-record'].coreFunction(
                                    context,{
                                        table: parameters.table, 
                                        primaryKeyValues,
                                        newRow,
                                        oldRow:[],
                                        status:'update',
                                        insertIfNotUpdate:true,
                                        masive:true
                                    },
                                    null,
                                    {forImport:true}
                                );
                            }).then(function(result){
                                if(result.command==='INSERT'){
                                    inserted++;
                                }else if(result.command==='UPDATE'){
                                    updated++;
                                }
                            });
                        }
                    });
                    if(defTable.registerImports.inTable){
                        var otherFieldsTableDef = be.tableStructures[defTable.registerImports.inTable](context);                        
                        var timestamp = datetime.now();
                        var fieldNames = defTable.registerImports.fieldNames;
                        otherFieldNames.forEach(function(otherField){
                            var newRow = {};
                            newRow[fieldNames.tableName] = parameters.table;
                            newRow[fieldNames.fieldName] = otherField.name;
                            newRow[fieldNames.fieldIndex] = otherField.index;
                            if(fieldNames.originalFileName)newRow[fieldNames.originalFileName] = files[0].originalFilename;
                            if(fieldNames.serverPath)newRow[fieldNames.serverPath] = files[0].path;
                            if(fieldNames.lastUpload)newRow[fieldNames.lastUpload] = timestamp;
                            var primaryKeyValues = [];
                            otherFieldsTableDef.primaryKey.forEach(function(pkOtherField){
                                primaryKeyValues.push(newRow[pkOtherField]);
                            });
                            promiseChain = promiseChain.then(function(){
                                return be.procedure['table/save-record'].coreFunction(
                                    context,{
                                        table: otherFieldsTableDef.name, 
                                        primaryKeyValues,
                                        newRow,
                                        oldRow:[],
                                        status:'update',
                                        insertIfNotUpdate:true,
                                        masive:true
                                    }
                                );
                            });    
                        });
                    }
                    return promiseChain;
                }).then(function(){
                    console.log('xxxxxxxxxxxxxxxx tl',new Date()-origin, {lengthComputable:true, loaded:readed, total:total})
                    context.informProgress({lengthComputable:true, loaded:readed, total:total});
                    return {uploaded:{inserted,updated}};
                });
            }).catch(function(err){
                console.log('ERROR',err.message);
                console.log('DOING',doing);
                err.doing=doing;
                throw err;
            });
        }
    },
];

module.exports = ProcedureTables;
