//import { TableDefinition } from "backend-plus";
"use strict";
//x// <amd-dependency path="../../../node_modules/like-ar/like-ar.d.ts" name="likeAr"/>
//x// <reference path="../../node_modules/like-ar/like-ar.d.ts" />
/// <reference path="../node_modules/types.d.ts/modules/myOwn/in-myOwn.d.ts" />
/// <reference path="../../../lib/in-backend-plus.d.ts" />
/// <reference path="../../../lib/backend-plus.d.ts" />
/// <reference path="../../lib/in-backend-plus.d.ts" />
/// <reference path="../../lib/backend-plus.d.ts" />
/// <reference path="../lib/in-backend-plus.d.ts" />
/// <reference path="../lib/backend-plus.d.ts" />
/// <reference path="lib/in-backend-plus.d.ts" />
/// <reference path="lib/backend-plus.d.ts" />

import * as likeAr from "like-ar";
import { ForeignKey, TableDefinition, FieldDefinition } from "backend-plus";
import { changing } from "best-globals";
import * as SqlTools from "sql-tools";

export type Key = string[];

type DetectFeatures={
    needToCopyResults:boolean
}

export var detectedFeatures:DetectFeatures={
    needToCopyResults:null
}

export class WebsqlDb{
    private db:Database;
    private wait4detectedFeatures:Promise<DetectFeatures>;
    constructor(public name:string){
        var version = 1.0;
        var dbName = this.name;
        var dbDisplayName = this.name;
        var dbSize = 2 * 1024 * 1024;
        try{
            this.db = openDatabase(dbName, version, dbDisplayName, dbSize);
            this.wait4detectedFeatures = this.detectFeatures();
        }catch(err){
            console.log(err.message);
            throw err;
        }
    }
    private async detectFeatures():Promise<DetectFeatures>{
        var detectedFeatures:DetectFeatures = {needToCopyResults: false};
        var detectElement = {feature: 'need_to_copy_results', value:false};
        try{
            var tableDef:TableDefinition={
                name:'_detect',
                fields:[
                    {name:'feature', typeName:'text'},
                    {name:'value'  , typeName:'boolean'}
                ],
                primaryKey:['feature']
            };
            await this.registerStructure(tableDef);
            await this.putOne('_detect', detectElement);
            await this.getOne('_detect',['need_to_copy_results'], true);
        }catch(err){
            detectElement.value=true;
            detectedFeatures.needToCopyResults = true;
            await this.putOne('_detect', detectElement);
        }
        return detectedFeatures;
    }
    private generateSqlForTableDef(tableDef:TableDefinition):string{
        var typeDb={
            integer: 'integer',
            number: 'real',
            date: 'text',
            boolean: 'text',
            text: 'text',
            jsonb: 'text',
            json: 'text'
        };
        var lines = [];
        var consLines:string[] = [];
        lines.push('CREATE TABLE IF NOT EXISTS '+SqlTools.quoteIdent(tableDef.name)+' (');
        var fields:any[]=[];
        tableDef.fields.forEach(function(fieldDef:FieldDefinition){
            var fieldType=typeDb[fieldDef.typeName]||'"'+fieldDef.typeName+'"';
            if(fieldDef.sizeByte==4){
                fieldType = 'integer';
            }
            fields.push(
                '  '+SqlTools.quoteIdent(fieldDef.name)+
                ' '+fieldType+
                (fieldDef.defaultValue!=null?' default '+SqlTools.quoteLiteral(fieldDef.defaultValue):'')+
                (fieldDef.defaultDbValue!=null?' default '+fieldDef.defaultDbValue:'')
            );
            if(fieldDef.typeName==='text' && !fieldDef.allowEmptyText){
                consLines.push(
                    'alter table '+SqlTools.quoteIdent(tableDef.name)+
                    ' add constraint '+SqlTools.quoteIdent(fieldDef.name+"<>''")+
                    ' check ('+SqlTools.quoteIdent(fieldDef.name)+"<>'');"
                );
            }
            if(fieldDef.nullable===false){
                consLines.push(
                    'alter table '+SqlTools.quoteIdent(tableDef.name)+
                    ' alter column '+SqlTools.quoteIdent(fieldDef.name)+' set not null;'
                );
            }
        });
        lines.push(fields.join(', \n'));
        if(tableDef.primaryKey){
            lines.push(', primary key ('+tableDef.primaryKey.map(function(name){ return SqlTools.quoteIdent(name); }).join(', ')+')');
        }
        lines.push(');');
        return lines.join('\n')//+'\n-- conss\n' + consLines.join('\n')
    }
    public static deleteDatabase(name:string):Promise<void>{
        //TODO
        return Promise.resolve()
    }
    async executeQuery(sql:string, params:null|{}[]):Promise<SQLResultSetRowList>{
        var db = this.db;
        return new Promise(function(resolve, reject){
            if (!db) return reject('no database.');
            var result:SQLResultSetRowList;
            db.transaction(function(tx:SQLTransaction){
                tx.executeSql(sql, params||[], function(_tx,res){
                    result=res.rows;
                });
            },function(err){
                reject(err);
            },function success(){
                resolve(result);
            });
        });
    };
    async executeQueries(sql:string, data:{}[]){
        var db = this.db;
        return new Promise(function(resolve, reject){
            if (!db) return reject('no database.');
            db.transaction(async function(tx:SQLTransaction){
                data.forEach(async function(data){
                    tx.executeSql(sql, data)
                })
            },function(tx,err){
                reject(err);
            },function(tx,res){
                resolve();
            })
        });
    };
    async registerStructure(tableDef:TableDefinition):Promise<any>{
        await this.executeQuery(`CREATE TABLE IF NOT EXISTS _structures (name string primary key, def string not null);`,[]);
        await this.executeQuery(`INSERT OR REPLACE INTO _structures (name, def) values (?, ?);`
        ,[tableDef.name, JSON.stringify(tableDef)]);
        await this.executeQuery(`DROP TABLE IF EXISTS `+ SqlTools.quoteIdent(tableDef.name),[]);
        await this.executeQuery(this.generateSqlForTableDef(tableDef),[]);
    }
    async getStructure(tableName:string):Promise<TableDefinition|undefined>{
        var result:SQLResultSetRowList = await this.executeQuery("SELECT * from _structures where name = ?",[tableName]);
        if(result.length){
            return JSON.parse(result.item(0).def);
        }else{
            return undefined
        }
    }
    async existsStructure(tableName:string):Promise<boolean>{
        var tableDef = await this.getStructure(tableName);
        return tableDef?true:false;
    }
    private convertSQLResultSetRowListToArray(rowResultSetList:SQLResultSetRowList, copyResults:boolean):any[]{
        var arr:any[]=[];
        for(var i=0; i<rowResultSetList.length;i++){
            var result = rowResultSetList.item(i);
            if(copyResults){
                result = changing(result,{})
            }
            arr.push(result);
        }
        return arr;
    }
    private fieldIsNotSupported(fieldName:string, notSupportedFields:FieldDefinition[]):boolean{
        var isNotSupported = notSupportedFields.find(function(field){
            return field.name==fieldName;
        })
        return isNotSupported?true:false
    }
    private getNotSupportedFields(tableDef:TableDefinition):FieldDefinition[]{
        var jsonbFields = tableDef.fields.filter(function(field){
            return field.typeName=='jsonb' || field.typeName=='date' || field.typeName=='timestamp' || field.typeName=='boolean';
        })
        return jsonbFields;
    }
    private convertNotSupportedFields(records:any[], notSupportedFields:FieldDefinition[]):any[]{
        records.forEach(function(row){
            if(notSupportedFields){
                notSupportedFields.forEach(function(notSupportedField){
                    var fieldName = notSupportedField.name;
                    row[fieldName]=JSON.parse(row[fieldName]);
                })    
            }
        })
        return records
    }
    async getOneIfExists<T>(tableName:string, key:Key):Promise<T|undefined>{
        try{
            return await this.getOne(tableName,key);
        }catch(err){
            return undefined
        }
    }
    async getOne<T>(tableName:string, key:Key, ignoreDetectFeatures?:boolean):Promise<T>{
        ignoreDetectFeatures=ignoreDetectFeatures||false; 
        var tableDef = await this.getStructure(tableName);
        var jsonbFields = this.getNotSupportedFields(tableDef);
        var fieldNames=tableDef.primaryKey;
        var whereExpr:string[] = [];
        fieldNames.forEach(function(fieldName, i){
            whereExpr.push(fieldName + '=' + SqlTools.quoteLiteral(key[i]))
        })
        var sql = 
            `SELECT * 
                from `+SqlTools.quoteIdent(tableName)+`
                where ` + whereExpr.join(' and ');
        var result = await this.executeQuery(sql,[]);
        var detectedFeatures;
        if(!ignoreDetectFeatures){
            detectedFeatures = await this.wait4detectedFeatures;
        }
        var copyResults = !ignoreDetectFeatures && detectedFeatures.needToCopyResults;
        var convertedResult = this.convertNotSupportedFields(this.convertSQLResultSetRowListToArray(result,copyResults), jsonbFields);
        if(convertedResult[0]){
            return convertedResult[0];
        }else{
            throw Error('no existe el elemento');
        }
    }
    async getChild<T>(tableName:string, parentKey:Key):Promise<T[]>{
        var tableDef = await this.getStructure(tableName);
        var jsonbFields = this.getNotSupportedFields(tableDef);
        var fieldNames=tableDef.primaryKey;
        var whereExpr:string[] = [];
        parentKey.forEach(function(key, i){
            whereExpr.push(fieldNames[i] + '=' + SqlTools.quoteLiteral(key))
        })
        var sql = `SELECT * from `+SqlTools.quoteIdent(tableName);
        if(parentKey.length){
            sql+= ` where ` + whereExpr.join(' and ');
        }
        var result = await this.executeQuery(sql,[]);
        var detectedFeatures = await this.wait4detectedFeatures;
        return this.convertNotSupportedFields(this.convertSQLResultSetRowListToArray(result, detectedFeatures.needToCopyResults), jsonbFields);
    }
    async getAll<T>(tableName:string):Promise<T[]>{
        var tableDef = await this.getStructure(tableName);
        var jsonbFields = this.getNotSupportedFields(tableDef);
        var results = await this.executeQuery(`SELECT * from `+SqlTools.quoteIdent(tableName),[]);
        var detectedFeatures = await this.wait4detectedFeatures;
        return this.convertNotSupportedFields(this.convertSQLResultSetRowListToArray(results, detectedFeatures.needToCopyResults), jsonbFields);
    }
    async getAllStructures():Promise<TableDefinition[]>{
        var results = await this.executeQuery(`SELECT * from _structures where name <> '_detect'`,[]);
        var structures:TableDefinition[]=[];
        for(var i=0; i<results.length;i++){
            structures.push(JSON.parse(results.item(i).def));
        }
        return structures;
    }
    async isEmpty(tableName:string):Promise<boolean>{
        var result:SQLResultSetRowList = await this.executeQuery(`SELECT count(*) as cantidad from `+SqlTools.quoteIdent(tableName),[]);
        return result.item(0).cantidad == 0;
    }
    async putOne<T>(tableName:string, element:T):Promise<T>{
        var ldb = this;
        var createPromiseForFK = function createPromiseForFK(fk:ForeignKey){
            return Promise.resolve().then(async function(){
                var fkTableDef=await ldb.getStructure(fk.references);
                if(fkTableDef){
                    var pk:string[] = [];
                    fk.fields.forEach(function(field:{source:string,target:string}){
                        pk.push(element[field.source]);
                    })
                    var isFKCompleteInSource = fk.fields.filter(function(field:{source:string,target:string}){
                        return element[field.source] == null
                    }).length == 0
                    if(isFKCompleteInSource){
                        var fkRecord:any = await ldb.getOneIfExists(fk.references, pk);
                        if(fkRecord){
                            fk.displayFields.forEach(function(field){
                                element[fk.alias + '__' + field] = fkRecord[field];
                            })
                        }
                    }
                }
            })
        }
        var tableDef=await ldb.getStructure(tableName);
        var jsonbFields = this.getNotSupportedFields(tableDef);
        var promisesArray: Promise<void>[] = [];
        if(tableDef.foreignKeys){
            tableDef.foreignKeys.forEach(async function(fk){
                promisesArray.push(createPromiseForFK(fk));
            });
        }
        if(tableDef.softForeignKeys){
            tableDef.softForeignKeys.forEach(async function(fk){
                promisesArray.push(createPromiseForFK(fk));
            });
        }
        return await Promise.all(promisesArray).then(async function(){
            var fieldNames:string[]=[];
            var fieldValues:string[]=[];
            var unquotedFieldValues:string[]=[];
            likeAr(element).forEach(function(value,key){
                fieldNames.push(SqlTools.quoteIdent(key));
                fieldValues.push(SqlTools.quoteLiteral(ldb.fieldIsNotSupported(key,jsonbFields)?JSON.stringify(value):value));
                unquotedFieldValues.push(value);
            })
            await ldb.executeQuery(
                `INSERT OR REPLACE INTO `+SqlTools.quoteIdent(tableName)+
                    ` (`+ fieldNames.join(',')+`) values (`+ fieldValues.join(',')+`);`
            ,[]);
            return element
        });
    }
    async putMany<T extends {}>(tableName:string, elements:T[]):Promise<void>{
        var sql:string;
        var ldb = this;
        var data:(any[])[]=[];
        var tableDef=await this.getStructure(tableName);
        var jsonbFields = this.getNotSupportedFields(tableDef);
        elements.forEach(function(element){
            if(!sql){
                var fieldNames:string[]=[];
            }
            var values:any[]=[];
            likeAr(element).forEach(function(value,key){
                if(!sql){
                    fieldNames.push(SqlTools.quoteIdent(key));
                }
                values.push(ldb.fieldIsNotSupported(key,jsonbFields)?JSON.stringify(value):value);
            })
            if(!sql){
                sql = `INSERT OR REPLACE INTO `+SqlTools.quoteIdent(tableName)+
                        ` (`+ fieldNames.join(',')+`) values (`+ values.map(_=>'?').join(',')+`);`;
            }
            data.push(values);
        });
        await this.executeQueries(sql, data);
    }
    async close():Promise<void>{
        //TODO
        return Promise.resolve()    
    }
    async clear(tableName:string):Promise<void>{
        await this.executeQuery(
            `DELETE FROM `+SqlTools.quoteIdent(tableName)+`;`
        ,[]);
    }
}
