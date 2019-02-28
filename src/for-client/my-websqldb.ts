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
import { quoteIdent } from "pg-promise-strict";

export type Key = string[];
export type Stores = {[key:string]:IDBObjectStore};
export type StoreDefs = {[key:string]:Key|string};
export type Record = {[key:string]:any};

//QUITAR DE ACÁ y tratar de importar sql-tools
var sqlTools = {};
sqlTools.quoteIdent = function(dbObjectName){
    return '"'+dbObjectName.toString().replace(/"/g,'""')+'"';
}

sqlTools.quoteLiteral = function(dbAnyValue){
    return dbAnyValue==null?"null":"'"+dbAnyValue.toString().replace(/'/g,"''")+"'";
}


type VersionInfo = {
    var:'version',
    num:1, 
    timestamp:string,
    stores:StoreDefs
}

type RegisterResult={new?:true, dataErased?:true, changed:boolean};

type DetectFeatures={
    needToUnwrapArrayKeys:boolean
}

export var detectedFeatures:DetectFeatures={
    needToUnwrapArrayKeys:null
}

export class WebsqlDb{
    private db:Database;
    constructor(public name:string){
        var version = 1.0;
        var dbName = this.name;
        var dbDisplayName = this.name;
        var dbSize = 2 * 1024 * 1024;
        try{
            this.db = openDatabase(dbName, version, dbDisplayName, dbSize);
        }catch(err){
            console.log(err.message);
            throw err;
        }
    }
    private generateSqlForTableDef(tableDef:TableDefinition):string{
        var typeDb={
            integer: 'integer',
            number: 'real',
            date: 'date',
            boolean: 'boolean',
            text: 'text',
            jsonb: 'text',
            json: 'text'
        };
        var lines = [];
        var consLines:string[] = [];
        lines.push('CREATE TABLE IF NOT EXISTS '+sqlTools.quoteIdent(tableDef.name)+' (');
        var fields:any[]=[];
        //REVISAR
        //tableDef.fields.unshift({ name:"$dirty", typeName: 'boolean' });
        tableDef.fields.forEach(function(fieldDef:FieldDefinition){
            var fieldType=typeDb[fieldDef.typeName]||'"'+fieldDef.typeName+'"';
            if(fieldDef.sizeByte==4){
                fieldType = 'integer';
            }
            fields.push(
                '  '+sqlTools.quoteIdent(fieldDef.name)+
                ' '+fieldType+
                (fieldDef.defaultValue!=null?' default '+sqlTools.quoteLiteral(fieldDef.defaultValue):'')+
                (fieldDef.defaultDbValue!=null?' default '+fieldDef.defaultDbValue:'')
            );
            if(fieldDef.typeName==='text' && !fieldDef.allowEmptyText){
                consLines.push(
                    'alter table '+sqlTools.quoteIdent(tableDef.name)+
                    ' add constraint '+sqlTools.quoteIdent(fieldDef.name+"<>''")+
                    ' check ('+sqlTools.quoteIdent(fieldDef.name)+"<>'');"
                );
            }
            if(fieldDef.nullable===false){
                consLines.push(
                    'alter table '+sqlTools.quoteIdent(tableDef.name)+
                    ' alter column '+sqlTools.quoteIdent(fieldDef.name)+' set not null;'
                );
            }
        });
        lines.push(fields.join(', \n'));
        if(tableDef.primaryKey){
            lines.push(', primary key ('+tableDef.primaryKey.map(function(name){ return sqlTools.quoteIdent(name); }).join(', ')+')');
        }
        lines.push(');');
        return lines.join('\n')//+'\n-- conss\n' + consLines.join('\n')
    }
    public static deleteDatabase(name:string):Promise<void>{
        return Promise.resolve()
    }
    async executeQuery(sql:string, params:null|{}[]){
        var db = this.db;
        return new Promise(function(resolve, reject){
            if (!db) return reject('no database.');
            var result:{}[];
            db.transaction(function(tx:SQLTransaction){
                tx.executeSql(sql, params||[], function(_tx,res){
                    result=Array.prototype.slice.call(res.rows);
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
        await this.executeQuery(`DROP TABLE IF EXISTS `+ sqlTools.quoteIdent(tableDef.name),[]);
        await this.executeQuery(this.generateSqlForTableDef(tableDef),[]);
    }
    async getStructure(tableName:string):Promise<TableDefinition|undefined>{
        var result = await this.executeQuery("SELECT * from _structures where name = ?",[tableName]);
        if(result[0]){
            return JSON.parse(result[0].def);
        }else{
            return undefined
        }
    }
    async existsStructure(tableName:string):Promise<boolean>{
        var tableDef = await this.getStructure(tableName);
        return tableDef?true:false;
    }
    private fieldIsJsonb(fieldName:string, jsonbFields:FieldDefinition[]):boolean{
        var isJsonb = jsonbFields.find(function(field){
            return field.name==fieldName;
        })
        return isJsonb?true:false
    }
    private getJsonbFieldsFields(tableDef:TableDefinition):FieldDefinition[]{
        var jsonbFields = tableDef.fields.filter(function(field){
            return field.typeName=='jsonb';
        })
        return jsonbFields;
    }
    private convertJsonbFields(records:any[], jsonbFields:FieldDefinition[]):any[]{
        records.forEach(function(row){
            if(jsonbFields){
                jsonbFields.forEach(function(jsonbField){
                    var fieldName = jsonbField.name;
                    row[fieldName]=JSON.parse(row[fieldName]);
                })    
            }
        })
        return records
    }
    async getOneIfExists<T>(tableName:string, key:Key):Promise<T|undefined>{
        var tableDef = await this.getStructure(tableName);
        var jsonbFields = this.getJsonbFieldsFields(tableDef);
        var fieldNames=tableDef.primaryKey;
        var whereExpr:string[] = [];
        fieldNames.forEach(function(fieldName, i){
            whereExpr.push(fieldName + '=' + sqlTools.quoteLiteral(key[i]))
        })
        var sql = `SELECT * 
                    from `+sqlTools.quoteIdent(tableName)+`
                    where ` + whereExpr.join(' and ');
        var result = await this.executeQuery(sql,[]);
        var convertedResult = this.convertJsonbFields(likeAr(result).array(), jsonbFields);
        return convertedResult[0]?convertedResult[0]:undefined;
    }
    async getOne<T>(tableName:string, key:Key):Promise<T>{
        var tableDef = await this.getStructure(tableName);
        var jsonbFields = this.getJsonbFieldsFields(tableDef);
        var fieldNames=tableDef.primaryKey;
        var whereExpr:string[] = [];
        fieldNames.forEach(function(fieldName, i){
            whereExpr.push(fieldName + '=' + sqlTools.quoteLiteral(key[i]))
        })
        var sql = 
            `SELECT * 
                from `+sqlTools.quoteIdent(tableName)+`
                where ` + whereExpr.join(' and ');
        var result = await this.executeQuery(sql,[]);
        var convertedResult = this.convertJsonbFields(likeAr(result).array(), jsonbFields);
        return convertedResult[0];
    }
    async getChild<T>(tableName:string, parentKey:Key):Promise<T[]>{
        var tableDef = await this.getStructure(tableName);
        var jsonbFields = this.getJsonbFieldsFields(tableDef);
        var fieldNames=tableDef.primaryKey;
        var whereExpr:string[] = [];
        parentKey.forEach(function(key, i){
            whereExpr.push(fieldNames[i] + '=' + sqlTools.quoteLiteral(key))
        })
        var sql = `SELECT * from `+sqlTools.quoteIdent(tableName);
        if(parentKey.length){
            sql+= ` where ` + whereExpr.join(' and ');
        }
        var result = await this.executeQuery(sql,[]);
        return this.convertJsonbFields(likeAr(result).array(), jsonbFields);
    }
    async getAll<T>(tableName:string):Promise<T[]>{
        var tableDef = await this.getStructure(tableName);
        var jsonbFields = this.getJsonbFieldsFields(tableDef);
        var results = await this.executeQuery(`SELECT * from `+sqlTools.quoteIdent(tableName),[]);
        return this.convertJsonbFields(likeAr(results).array(), jsonbFields);
    }
    async getAllStructures<T>():Promise<T[]>{
        var results = await this.executeQuery(`SELECT * from _structures`,[]);
        return likeAr(results).array().map(function(element:any){
            return JSON.parse(element.def);
        })
    }
    async isEmpty(tableName:string):Promise<boolean>{
        var result = await this.executeQuery(`SELECT count(*) as cantidad from `+sqlTools.quoteIdent(tableName),[]);
        return result[0].cantidad == 0;
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
        var jsonbFields = this.getJsonbFieldsFields(tableDef);
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
            var fieldNames=[];
            var fieldValues=[];
            likeAr(element).forEach(function(value,key){
                fieldNames.push(sqlTools.quoteIdent(key));
                fieldValues.push(sqlTools.quoteLiteral(ldb.fieldIsJsonb(key,jsonbFields)?JSON.stringify(value):value));
            })
            await ldb.executeQuery(
                `INSERT OR REPLACE INTO `+sqlTools.quoteIdent(tableName)+
                    ` (`+ fieldNames.join(',')+`) values (`+ fieldValues.join(',')+`);`
            ,[]);
            return element;
        });
    }
    async putMany<T extends {}>(tableName:string, elements:T[]):Promise<void>{
        var sql:string;
        var ldb = this;
        var data:(any[])[]=[];
        var tableDef=await this.getStructure(tableName);
        var jsonbFields = this.getJsonbFieldsFields(tableDef);
        elements.forEach(function(element){
            if(!sql){
                var fieldNames:string[]=[];
            }
            var values:any[]=[];
            likeAr(element).forEach(function(value,key){
                if(!sql){
                    fieldNames.push(sqlTools.quoteIdent(key));
                }
                values.push(ldb.fieldIsJsonb(key,jsonbFields)?JSON.stringify(value):value);
            })
            if(!sql){
                sql = `INSERT OR REPLACE INTO `+sqlTools.quoteIdent(tableName)+
                        ` (`+ fieldNames.join(',')+`) values (`+ values.map(_=>'?').join(',')+`);`;
            }
            data.push(values);
        });
        await this.executeQueries(sql, data);
    }
//    async close():Promise<void>{
//        var db=await this.db;
//        db.close();
//        this.db={
//            then:function(){
//                throw new Error("the database is closed")
//            },
//            catch:function(){
//                throw new Error("the database is closed")
//            }
//        }
//    }
    async clear(tableName:string):Promise<void>{
        await this.executeQuery(
            `DELETE FROM `+sqlTools.quoteIdent(tableName)+`;`
        ,[]);
    }
}
