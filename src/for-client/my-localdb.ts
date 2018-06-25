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

/****
 * Atención en la implementación de este módulo se tiene en cuenta que según
 * https://caniuse.com/#feat=indexeddb ocurren dos cosas trágicas:
 *   1) en IE y EDGE no hay claves de tipo array
 *   2) en iOS de 8 a 9.3 hay un error que no permite que en dos objetos distintos haya una misma Pk
 * 
 * más explicaciones en:
 *   1) https://stackoverflow.com/questions/14283257/dataerror-when-creating-an-index-with-a-compound-key-in-ie-10
 *   2) https://www.raymondcamden.com/2014/09/25/IndexedDB-on-iOS-8-Broken-Bad/
 * 
 * hay un test en:
 *   a) https://codepen.io/cemerick/pen/Itymi
 * 
 * workarround para contemplar IE, y iOS viejos:
 *   1) se transforman las claves antes de usarlas en un string (JSON.stringify del array para el problema del IE)
 *   2) se prefija el string con el nombre del objectStore (para que todas las claves sean distintas y no haya problemas con el iOS viejo)
 * 
 * detección
 *   1) por ahora solo probamos la detección del problema del array de claves
 *   2) TODO: Falta programar la detección del problema de iOS viejo, quizás haya que ser explícito, hay que probarlo con varios iPad
 */

import * as likeAr from "like-ar";

export type Key = string[];
export type Stores = {[key:string]:IDBObjectStore};
export type StoreDefs = {[key:string]:Key|string};
export type Record = {[key:string]:any};

export interface TableDefinition{
    name:string
    primaryKey:string[]
} 

type VersionInfo = {
    var:'version',
    num:1, 
    timestamp:string,
    stores:StoreDefs
}

type RegisterResult={new?:true, dataErased?:true, changed:boolean};

type DetectFeatures={
    needToUnwrapArrayKeys:boolean|null
}

export var detectedFeatures:DetectFeatures={
    needToUnwrapArrayKeys:null
}

export class LocalDb{
    private wait4db:Promise<IDBDatabase>;
    constructor(public name:string){
        var ldb=this;
        var initialStores:StoreDefs={
            $structures:'name',
            $internals:'var',
            $detect:['detectKey'],
        };
        var initialVersionInfo:VersionInfo={
            var:'version',
            num:1, 
            timestamp:new Date().toJSON(),
            stores:initialStores
        }
        var requestDB=indexedDB.open(this.name);
        requestDB.onupgradeneeded = function(){
            var db = requestDB.result;
            if(!db.objectStoreNames.contains("$internals")){
                likeAr(initialStores).forEach(function(keyPath: string, tableName: string){
                    var store = db.createObjectStore(tableName, {keyPath: keyPath});
                    if(detectedFeatures.needToUnwrapArrayKeys==null){
                        if(tableName=='$detect'){
                            var request = store.put({detectKey:'one'});
                            request.onsuccess=function(){
                                var key=request.result;
                                if(typeof key === "string"){
                                    detectedFeatures.needToUnwrapArrayKeys=true;
                                }else{
                                    detectedFeatures.needToUnwrapArrayKeys=false;
                                }
                            };
                            request.onerror=function(){
                                detectedFeatures.needToUnwrapArrayKeys=true;
                            };
                        }
                        if(tableName=='$internals'){
                            store.put(initialVersionInfo);
                        }
                    }
                })
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
    async registerStructure(tableDef:TableDefinition):Promise<RegisterResult>{
        var wait4dbCurrent=this.wait4db;
        var registerTask=this.registerStructureInside(tableDef, wait4dbCurrent);
        this.wait4db = registerTask.then(result=>result.wait4db);
        var result=await registerTask; 
        return result.result;
    }
    private async registerStructureInside(tableDef:TableDefinition, wait4db:Promise<IDBDatabase>):Promise<{
        wait4db:Promise<IDBDatabase>,
        result:RegisterResult
    }>{
        var ldb=this;
        var db=await wait4db;
        var result:{wait4db:Promise<IDBDatabase>,result:RegisterResult}={wait4db, result:{changed:null}};
        var oldValue = await this.IDBX(db.transaction('$structures',"readonly").objectStore('$structures').get(tableDef.name));
        if(!oldValue){
            result.result.new=true;
        }
        await ldb.IDBX(db.transaction('$structures',"readwrite").objectStore('$structures').put(tableDef));
        result.result.changed=JSON.stringify(tableDef)!=JSON.stringify(oldValue);
        var infoStore=detectedFeatures.needToUnwrapArrayKeys?null:tableDef.primaryKey;
        var versionInfo = await this.IDBX<VersionInfo>(db.transaction('$internals',"readwrite").objectStore('$internals').get('version'))
        if(JSON.stringify(versionInfo.stores[tableDef.name])!=JSON.stringify(infoStore)){
            db.close();
            versionInfo.num++;
            var requestDB = indexedDB.open(this.name,versionInfo.num);
            requestDB.onupgradeneeded = function(){
                var db=requestDB.result;
                if(versionInfo.stores[tableDef.name]){
                    db.deleteObjectStore(tableDef.name);
                }
                if(infoStore!=null){
                    db.createObjectStore(tableDef.name,{keyPath:infoStore})
                }else{
                    db.createObjectStore(tableDef.name)
                }
            }
            result.wait4db = ldb.IDBX(requestDB);
            db = await result.wait4db;
            versionInfo.stores[tableDef.name]=infoStore;
            await ldb.IDBX(db.transaction('$internals',"readwrite").objectStore('$internals').put(versionInfo));
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
    async getOneIfExists<T>(tableName:string, key:Key):Promise<T|undefined>{
        var ldb=this;
        var db=await ldb.wait4db;
        var internalKey:Key|string;
        if(detectedFeatures.needToUnwrapArrayKeys){
            internalKey=tableName+JSON.stringify(key);
        }else{
            internalKey=key;
        }
        var result = await ldb.IDBX<T>(db.transaction(tableName,"readonly").objectStore(tableName).get(internalKey));
        return result;
    }
    async getOne<T>(tableName:string, key:Key):Promise<T>{
        var result = await this.getOneIfExists<T>(tableName, key);
        if(!result){
            throw new Error("no result");
        }
        return result;
    }
    async getChild<T>(tableName:string, parentKey:Key):Promise<T[]>{
        var ldb=this;
        var db=await ldb.wait4db
        var rows:T[]=[];
        var internalKey:string|Key;
        if(detectedFeatures.needToUnwrapArrayKeys){
            internalKey=tableName+JSON.stringify(parentKey);
            internalKey=internalKey.substr(0,internalKey.length-1);
        }else{
            internalKey=parentKey
        }
        var cursor = db.transaction([tableName],'readonly').objectStore(tableName).openCursor(IDBKeyRange.lowerBound(internalKey));
        return new Promise<T[]>(function(resolve, reject){
            cursor.onsuccess=function(event){
                // @ts-ignore target no conoce result en la definición de TS. Verificar dentro de un tiempo si TS mejoró
                var cursor:IDBCursorWithValue = event.target.result;
                if(cursor && (
                    detectedFeatures.needToUnwrapArrayKeys ? 
                        internalKey == (cursor.key as string).slice(0,internalKey.length) : 
                        ! parentKey.find(function(expectedValue,i){
                            var storedValue = (cursor.key as any[])[i]
                            return expectedValue != storedValue
                        })
                    )
                ){
                    rows.push(cursor.value);
                    cursor.continue();
                }else{
                    resolve(rows);
                }
            }
            cursor.onerror=function(){
                reject(cursor.error);
            }
        });
    }
    async getAll<T>(tableName:string):Promise<T[]>{
        return this.getChild<T>(tableName,[]);
    }
    private async putOneAndGetIfNeeded<T extends Record>(tableName:string, element:T, needed:true):Promise<T>
    private async putOneAndGetIfNeeded<T extends Record>(tableName:string, element:T, needed:false):Promise<void>
    private async putOneAndGetIfNeeded<T extends Record>(tableName:string, element:T, needed:boolean):Promise<T|void>{
        var ldb=this;
        var db=await ldb.wait4db
        if(detectedFeatures.needToUnwrapArrayKeys){
            var tableDef=await ldb.IDBX<TableDefinition>(db.transaction('$structures',"readwrite").objectStore('$structures').get(tableName));
            var newKey=tableName+JSON.stringify(tableDef.primaryKey.map(function(name){
                return element[name];
            }));
            var storeTask=db.transaction(tableName,"readwrite").objectStore(tableName).put(element,newKey);
        }else{
            var storeTask=db.transaction(tableName,"readwrite").objectStore(tableName).put(element);
        }
        var key=await ldb.IDBX<Key>(storeTask)
        if(needed){
            return await ldb.IDBX<T>(db.transaction(tableName,"readwrite").objectStore(tableName).get(key))
        }
    }
    async putOne<T>(tableName:string, element:T):Promise<T>{
        return this.putOneAndGetIfNeeded(tableName, element, true);
    }
    async putMany<T>(tableName:string, elements:T[]):Promise<void>{
        var i=0;
        while(i<elements.length){
            await this.putOneAndGetIfNeeded(tableName, elements[i], false);
            i++;
        }
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