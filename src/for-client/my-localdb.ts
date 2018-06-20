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

export type Stores = {[key:string]:IDBObjectStore};
export type StoreDefs = {[key:string]:string|string[]};

interface TableDefinition{
    name:string
    primaryKey:string[]
} 

type VersionInfo = {
    var:'version',
    num:1, 
    timestamp:string,
    stores:StoreDefs
}

export class LocalDb{
    private wait4db:Promise<IDBDatabase>;
    constructor(public name:string){
        var ldb=this;
        var initialStores:StoreDefs={
            $structures:'name',
            $internals:'var'
        };
        var initialVersionInfo:VersionInfo={
            var:'version',
            num:1, 
            timestamp:new Date().toJSON(),
            stores:initialStores
        }
        var requestDB=indexedDB.open(this.name);
        requestDB.onupgradeneeded = function(event){
            var db = requestDB.result;
            if(event.oldVersion<1){
                var store:Stores={};
                likeAr(initialStores).forEach(function(keyPath: string, tableName: string){
                    store[tableName] = db.createObjectStore(tableName, {keyPath: keyPath});
                })
                store.$internals.put(initialVersionInfo);
            }
        }
        ldb.wait4db = ldb.IDBX(requestDB);
    }
    private async IDBX(request: IDBOpenDBRequest):Promise<IDBDatabase>
    private async IDBX(request: IDBTransaction):Promise<void>
    private async IDBX<T>(request: IDBRequest):Promise<T>
    private async IDBX(request: IDBRequest|IDBOpenDBRequest|IDBTransaction):Promise<any>{
        return new Promise(function(resolve, reject){
            if('onsuccess' in request){
                request.onsuccess=function(){
                    resolve(request.result);
                }
            }else{
                request.oncomplete=function(){
                    resolve();
                }
            }
            request.onerror=function(){
                alertPromise(request.error.message);
                reject(request.error);
            }
        })
    }
    async registerStructure(tableDef:TableDefinition):Promise<{new?:true, dataErased?:true, changed:boolean}>{
        var ldb=this;
        var db=await ldb.wait4db;
        var result:{new?:true, dataErased?:true, changed:boolean}={changed:null};
        var tx=db.transaction(['$structures','$internals'],"readwrite");
        var oldValue = await this.IDBX(tx.objectStore('$structures').get(tableDef.name));
        if(!oldValue){
            result.new=true;
        }
        await ldb.IDBX(tx.objectStore('$structures').put(tableDef));
        result.changed=JSON.stringify(tableDef)!=JSON.stringify(oldValue);
        var infoStore=tableDef.primaryKey;
        var versionInfo = await this.IDBX<VersionInfo>(tx.objectStore('$internals').get('version'))
        if(JSON.stringify(versionInfo.stores[tableDef.name])!=JSON.stringify(infoStore)){
            await ldb.IDBX(tx);
            db.close();
            versionInfo.num++;
            var requestDB = indexedDB.open(this.name,versionInfo.num);
            requestDB.onupgradeneeded = function(){
                var db=requestDB.result;
                if(versionInfo.stores[tableDef.name]){
                    db.deleteObjectStore(tableDef.name);
                }
                db.createObjectStore(tableDef.name,{keyPath:infoStore})
            }
            ldb.wait4db = ldb.IDBX(requestDB);
            db = await ldb.wait4db;
            versionInfo.stores[tableDef.name]=infoStore;
            await ldb.IDBX(db.transaction('$internals',"readwrite").objectStore('$internals').put(versionInfo));
        }else{
            await ldb.IDBX(tx);
        }
        return result;
    }
    async getStructure(tableName:string):Promise<TableDefinition>{
        var ldb=this;
        var db=await ldb.wait4db
        var tableDef = await ldb.IDBX<TableDefinition>(
            db.transaction('$structures',"readwrite").objectStore('$structures').get(tableName)
        );
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
        var ldb=this;
        var db=await ldb.wait4db
        var result = await ldb.IDBX<T[]>(db.transaction('$structures',"readonly").objectStore(tableName).get(parentKey));
        return result;
    }
    async getAll<T>(tableName:string):Promise<T[]>{
        return this.getChild<T>(tableName,[]);
    }
    async putOne<T>(tableName:string, elements:T):Promise<T>{

    }
    async putMany<T>(tableName:string, elements:T[]):Promise<void>{

    }
    async close():Promise<void>{
        var db=await this.wait4db;
        db.close();
        this.wait4db=async function():Promise<IDBDatabase>{
            return Promise.reject(
                new Error("the database is closed")
            )
        }();
    }
}