//import { TableDefinition } from "backend-plus";
"use strict";
/// <amd-dependency path="../../../node_modules/like-ar/like-ar.d.ts" name="likeAr"/>
//x// <reference path="../../node_modules/like-ar/like-ar.d.ts" />
/// <reference path="../node_modules/types.d.ts/modules/myOwn/in-myOwn.d.ts" />
/// <reference path="../../lib/in-backend-plus.d.ts" />

export type Store = {[key:string]:string};

export class LocalDb{
    private db:IDBDatabase;
    constructor(public name:string){
        var ldb=this;
        var initialStores:Store={
            $structures:'name',
            $internals:'var'
        };
        var requestDB=indexedDB.open(this.name);
        requestDB.onupgradeneeded = function(event){
            ldb.db = requestDB.result;
            if(event.oldVersion<1){
                var store:Store={};
                likeAr(initialStores).forEach(function(keyPath, tableName){
                    store[tableName] = ldb.db.createObjectStore(tableName, {keyPath: keyPath});
                })
                store.$internals.put({
                    var:'version',
                    num:1, 
                    timestamp:new Date().toJSON(),
                    stores:initialStores
                });
            }
        }
    }
    private async IDBX(request: IDBRequest){
        return new Promise(function(resolve, reject){
            if('onsuccess' in request){
                request.onsuccess=function(event){
                    resolve(request.result);
                }
            }else{
                request.oncomplete=function(event){
                    resolve(request.result);
                }
            }
            request.onerror=function(reject){
                alertPromise(request.error.message)
                reject(request.error);
            }
        })
    }
    async registerStructure(tableDef:TableDefinition):Promise<{new?:true, dataErased?:true, changed:boolean}>{
        var ldb=this;
        var result:{new?:true, dataErased?:true, changed:boolean}={};
        var tx=ldb.db.transaction(['$structures','$internals'],"readwrite");
        var oldValue = await this.IDBX(tx.objectStore('$structures').get(tableDef.name));
        if(!oldValue){
            result.new=true;
        }
        await ldb.IDBX(tx.objectStore('$structures').put(tableDef));
        result.changed=JSON.stringify(tableDef)!=JSON.stringify(oldValue);
        var infoStore=tableDef.primaryKey;
        var versionInfo = await IDBX(tx.objectStore('$internals').get('version'))
        if(JSON.stringify(versionInfo.stores[tableDef.tableName])!=JSON.stringify(infoStore)){
            await ldb.IDBX(tx);
            ldb.db.close();
            versionInfo.num++;
            var request = indexedDB.open(my.ldbName,versionInfo.num);
            request.onupgradeneeded = function(event){
                var db=request.result;
                if(versionInfo.stores[connector.tableName]){
                    db.deleteObjectStore(connector.tableName);
                }
                db.createObjectStore(connector.tableName,{keyPath:infoStore})
            }
            ldb.db = await ldb.IDBX(request);
            versionInfo.stores[connector.tableName]=infoStore;
            await ldb.IDBX(ldb.db.transaction('$internals',"readwrite").objectStore('$internals').put(versionInfo));
        }else{
            await ldb.IDBX(tx);
        }
        return result;
    }
    async getStructure(tableName:string):Promise<TableDefinition>{
        var ldb=this;
        var tableDef = await ldb.IDBX(ldb.db.transaction('$structures',"readwrite").objectStore('$structures').get(tableName));
        return tableDef;
    }
    async getOneIfExists<T>(tableName:string, key:string[]):Promise<T|undefined>{
        var result = await this.getChild<T>(tableName, key);
        if(result.length>1){
            throw new Error("too many results");
        }
        return result[0];
    }
    async getOne<T>(tableName:string, key:string[]):Promise<T>{
        var result = await this.getOneIfExists<T>(tableName, key);
        if(!result){
            throw new Error("no result");
        }
        return result;
    }
    async getChild<T>(tableName:string, parentKey:string[]):Promise<T[]>{

    }
    async getAll<T>(tableName:string):Promise<T[]>{
        return this.getChild([]);
    }
    async putOne<T>(tableName:string, elements:T):Promise<T>{

    }
    async putMany<T>(tableName:string, elements:T[]):Promise<void>{

    }
}