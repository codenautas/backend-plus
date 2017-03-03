"use strict";

var changing = require('best-globals').changing;
var sleep = require('best-globals').sleep;
var XLSX = require('xlsx-style');
var fs = require('fs-promise');

var ProcedureTables = {};

ProcedureTables = [
    {
        action:'table/structure',
        parameters:[
            {name: 'table', encoding:'plain'}
        ],
        coreFunction:function(context, parameters){
            var struct=context.be.tableStructures[parameters.table](context);
            if(context.be.config.devel && context.be.config.devel.forceShowAsEditable){
                struct=changing(struct, {allow:{
                    delete:true,
                    update:true,
                    insert:true,
                }});
            }
            return changing(struct, {sql: undefined},changing.options({deletingValue:undefined}));
        }
    },
    {
        action:'table/data',
        parameters:[
            {name: 'table', encoding:'plain'},
            {name: 'fixedFields', defValue:[]}
        ],
        coreFunction:function(context, parameters){
            var be=context.be;
            var defTable=be.tableStructures[parameters.table](context);
            if(!defTable){
                throw new Error('no table def for '+parameters.table)
            }
            var sql;
            var queryValues=[];
            var fixedClausule=parameters.fixedFields.map(function(pair, iPair){
                if(!defTable.field[pair.fieldName]){
                    throw new Error('field does not exists '+pair.fieldName);
                }
                queryValues.push(pair.value);
                return ' AND '+be.db.quoteObject(pair.fieldName)+ " = $" + queryValues.length;
            }).join("");
            return context.client.query( sql=
                "SELECT "+defTable.sql.select.join(', ')+
                " FROM "+defTable.sql.from+
                " WHERE "+(defTable.sql.where||'true')+fixedClausule+
                // " ORDER BY "+defTable.primaryKey.map(be.db.quoteObject.bind(be.db)).join(',')
                " ORDER BY "+(defTable.sql.orderBy||defTable.primaryKey).map(function(fieldName){ return be.db.quoteObject(fieldName); }).join(','),
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
        coreFunction:function(context, parameters){
            var be=context.be;
            var defTable=be.tableStructures[parameters.table](context);
            var action=parameters.status=='new'?'insert':'update';
            if(!defTable.allow[action]){
                throw changing(new Error(action+" not allowed"),{status:403});
            }
            var primaryKeyValues=parameters.primaryKeyValues;
            var fieldNames=[];
            var values=[];
            for(var name in parameters.newRow){
                if(!defTable.field[name].allow[action] && (
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
                returningClausule="RETURNING "+defTable.primaryKey.join(', ');
            }else{
                returningClausule="RETURNING "+defTable.sql.select.join(', ');
            }
            var insertFun=function(){
                return context.client.query(
                    "INSERT INTO "+be.db.quoteObject(defTable.name)+
                    " ("+fieldNames.map(function(name,i){ return be.db.quoteObject(name); }).join(', ')+
                    ") VALUES ("+fieldNames.map(function(name,i){ return '$'+(i+1); }).join(', ')+
                    ") "+returningClausule,
                    values
                ).fetchUniqueRow();
            }
            return Promise.resolve().then(function(){
                if(defTable && parameters.status=='new'){
                    return insertFun();
                }else if(defTable && primaryKeyValues.length==defTable.primaryKey.length){
                    var sql;
                    return context.client.query(sql=
                        "UPDATE "+be.db.quoteObject(defTable.name)+
                        " SET "+fieldNames.map(function(name,i){ return be.db.quoteObject(name)+" = $"+(i+1); }).join(', ')+
                        " WHERE "+defTable.primaryKey.map(function(fieldName, i){
                            return be.db.quoteObject(fieldName)+" = $"+(i+1+fieldNames.length);
                        }).join(" AND ")+" "+
                        returningClausule,
                        values.concat(primaryKeyValues)
                    )[parameters.insertIfNotUpdate?'fetchOneRowIfExists':'fetchUniqueRow']().then(function(result){
                        if(parameters.insertIfNotUpdate){
                            if(result.rowCount==1){
                                return result;
                            }else{
                                return insertFun();
                            }
                        }
                        return result;
                    });
                }else{
                    console.log("invalid request", parameters);
                    throw new Error("invalid request");
                }
            // }).then(sleep(1000)).then(function(result){
            //     console.log('xxxxxxxxxxxxxxx result');
            //     console.log(result);
            //     return result;
            }).then(function(result){
                return result.row;
            }).then(function(row){
                if(defTable.sql.from){
                    return context.client.query(
                        "SELECT "+defTable.sql.select.join(', ')+
                        " FROM "+defTable.sql.from+
                        " WHERE "+defTable.primaryKey.map(function(fieldName, i){
                            return be.db.quoteObject(fieldName)+" = $"+(i+1);
                        }).join(" AND "),
                        defTable.primaryKey.map(function(fieldName, i){
                            return row[fieldName];
                        })
                    ).fetchUniqueRow().then(function(result){
                        return result.row;
                    });
                }else{
                    return row;
                }
            //}).catch(function(err){
            //    console.log('xxxxxxxxxxx sql');
            //    console.log(sql);
            //    console.log(err);
            //    throw err;
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
                return context.client.query(
                    "DELETE FROM "+be.db.quoteObject(defTable.name)+
                    " WHERE "+defTable.primaryKey.map(function(fieldName, i){
                        return be.db.quoteObject(fieldName)+" = $"+(i+1);
                    }).join(" AND ")+
                    " RETURNING "+defTable.sql.select.join(', '),
                    primaryKeyValues
                ).fetchUniqueRow().then(function(result){
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
            if(!defTable.allow.delete){
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
                        if(value==null){
                            whereParts.push(be.db.quoteObject(fieldName)+" IS NULL");
                        }else{
                            dataParams.push(value);
                            whereParts.push(be.db.quoteObject(fieldName)+" = $"+dataParams.length);
                        }
                    }
                });
                return context.client.query(
                    "DELETE FROM "+be.db.quoteObject(defTable.name)+
                    " WHERE "+whereParts.join(" AND "),
                    dataParams
                ).execute();
            };
            return Promise.all(parameters.rowsToDelete.map(deleteOneRow)).then(function(){
                return context.client.query(
                    "SELECT count(*) FROM "+be.db.quoteObject(defTable.name)
                ).fetchUniqueValue().then(function(result){
                    return result.value;
                });
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
                    "INSERT INTO "+be.db.quoteObject(defTable.name)+
                    " ("+fieldNames.map(function(name,i){ return be.db.quoteObject(name); }).join(', ')+
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
        action:'table/delete-enter',
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
                "DELETE FROM "+be.db.quoteObject(defTable.name)+
                " WHERE "+fieldNames.map(function(name,i){
                    return be.db.quoteObject(name)+' = $'+(i+1)}).join( ' AND '),values
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
            if(context.user.rol==='admin' && context.user[context.be.config.login.userFieldName]!=parameters.user){
                var qUser = context.be.db.quoteObject(context.be.config.login.userFieldName);
                var qPass = context.be.db.quoteObject(context.be.config.login.passFieldName);
                var qTable = context.be.db.quoteObject(context.be.config.login.table);
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
        encoding:'plain',
        parameters:[
            {name: 'table', encoding:'plain'},
        ],
        files:{count:1},
        coreFunction:function(context, parameters, files){
            var be=context.be;
            var doing="opening file";
            return Promise.resolve().then(function(){
                console.log('xxxxxxxx files', files);
                var defTable=be.tableStructures[parameters.table](context);
                if(!defTable.allow.import){
                    throw changing(new Error("import not allowed"),{status:403});
                }
                context.informProgress(be.messages.fileUploaded);
                return fs.readFile(files[0].path).then(function(content){
                    context.informProgress(be.messages.fileReaded);
                    doing="reading file";
                    var wb = XLSX.read(content);
                    doing="accessing first sheet";
                    var ws = wb.Sheets[wb.SheetNames[0]];
                    var range = XLSX.utils.decode_range(ws['!ref']);
                    var fields=[];
                    doing="detecting fields";
                    for(var iColumn=range.s.c; iColumn<=range.e.c; iColumn++){
                        var fieldName;
                        try{
                            fieldName=ws[XLSX.utils.encode_cell({r:0, c:iColumn})].v;
                            var defField=defTable.field[fieldName];
                            if(defField && defField.allow.insert){
                                fields.push(changing(defField,{column:iColumn}));
                            }
                        }catch(err){
                            console.log('zzzzz column',iColumn,'addr',XLSX.utils.encode_cell({r:0, c:iColumn}),'does not has column name');
                        }
                    }
                    doing="retrieving rows";
                    var promiseChain=Promise.resolve();
                    for(var iRow=range.s.r+1; iRow<=range.e.r; iRow++){
                        var skip=false;
                        var newRow={};
                        var primaryKeyValues=[];
                        fields.forEach(function(field){
                            var cell=ws[XLSX.utils.encode_cell({r:iRow, c:field.column})];
                            var value=cell?cell.v:null;
                            newRow[field.name]=value;
                            if(field.isPk){
                                primaryKeyValues[field.isPk-1]=value;
                                if(value==null){
                                    skip=true;
                                }
                            }
                        });
                        if(!skip){
                            (function(newRow, primaryKeyValues){
                                promiseChain = promiseChain.then(function(){
                                    return be.procedure['table/save-record'].coreFunction(
                                        context,{
                                            table: parameters.table, 
                                            primaryKeyValues,
                                            newRow,
                                            oldRow:[],
                                            status:'update',
                                            insertIfNotUpdate:true
                                        }
                                    );
                                });
                            })(newRow, primaryKeyValues);
                        }
                    }
                    return promiseChain;
                }).then(function(){
                    return 'ok, temporary info uploaded';
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