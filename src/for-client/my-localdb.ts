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
import { ForeignKey, FieldDefinition } from "backend-plus";

export type Key = string[];
export type Stores = {[key:string]:IDBObjectStore};
export type StoreDefs = {[key:string]:Key|string};
export type Record = {[key:string]:any};

export interface TableDefinition{
    name:string
    primaryKey:string[]
    foreignKeys?:ForeignKey[]
    softForeignKeys?:ForeignKey[]
    fields:FieldDefinition[]
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

export class LocalDb{
    private wait4db:Promise<IDBDatabase>;
    private wait4detectedFeatures:Promise<DetectFeatures>;
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
                    if(tableName=='$internals'){
                        store.put(initialVersionInfo);
                    }
                    if(tableName=='$detect'){
                        ldb.wait4detectedFeatures = ldb.detectFeatures(store);
                    }
                })
            }
        }
        ldb.wait4db = ldb.IDBX(requestDB);
    }
    public static deleteDatabase(name:string):Promise<void>{
        var request = indexedDB.deleteDatabase(name);
        return new Promise(function(resolve,reject){
            request.onsuccess=function(){
                resolve()
            }
            request.onerror=function(event){
                reject()
            }
        })
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
                alertPromise(request.error.message || request.error.name);
                reject(request.error);
            }
        })
    }
    async registerStructure(tableDef:TableDefinition):Promise<RegisterResult>{
        var ldb = this;
        var wait4dbCurrent=this.wait4db;
        var registerTask=this.registerStructureInside(tableDef, wait4dbCurrent);
        this.wait4db = registerTask.then(result=>result.wait4db);
        var result=await registerTask; 
        return result.result;
    }
    async detectFeatures(store:IDBObjectStore):Promise<DetectFeatures>{
        return new Promise<DetectFeatures>((resolve) => {
            try{
                // @ts-ignore
                var os: string = window.myOwn.config.useragent.os;
                // @ts-ignore
                var version: number = parseInt(window.myOwn.config.useragent.version.split('.')[0]);
            }catch(err){
                throw Error("unknowed OS or version");
            }
            if(os === 'OS X' && version < 11){
                detectedFeatures.needToUnwrapArrayKeys=true
                resolve (detectedFeatures)
            }else{
                var request = store.put({detectKey:'one'});
                request.onsuccess=function(){
                    var key=request.result;
                    if(typeof key === "string"){
                        detectedFeatures.needToUnwrapArrayKeys=true;
                    }else{
                        detectedFeatures.needToUnwrapArrayKeys=false;
                    }
                    resolve (detectedFeatures)
                };
                request.onerror=function(){
                    detectedFeatures.needToUnwrapArrayKeys=true;
                    resolve (detectedFeatures)
                };
            }
        });
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
        if(!ldb.wait4detectedFeatures){
            ldb.wait4detectedFeatures = ldb.detectFeatures(db.transaction('$detect',"readwrite").objectStore('$detect'));
        }
        await ldb.wait4detectedFeatures;
        var infoStore=detectedFeatures.needToUnwrapArrayKeys?null:tableDef.primaryKey;
        var versionInfo = await this.IDBX<VersionInfo>(db.transaction('$internals',"readonly").objectStore('$internals').get('version'))
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
        var db=await ldb.wait4db;
        if(!ldb.wait4detectedFeatures){
            ldb.wait4detectedFeatures = ldb.detectFeatures(db.transaction('$detect',"readwrite").objectStore('$detect'));
        }
        await ldb.wait4detectedFeatures;
        var tableDef = await ldb.IDBX<TableDefinition>(
            db.transaction('$structures',"readonly").objectStore('$structures').get(tableName)
        );
        return tableDef;
    }
    async existsStructure(tableName:string):Promise<boolean>{
        var tableDef = await this.getStructure(tableName);
        return tableDef?true:false;
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
            internalKey=parentKey?parentKey:'';
        }
        var cursor = db.transaction([tableName],'readonly').objectStore(tableName).openCursor(parentKey==null?null:IDBKeyRange.lowerBound(internalKey));
        return new Promise<T[]>(function(resolve, reject){
            cursor.onsuccess=function(event){
                // @ts-ignore target no conoce result en la definición de TS. Verificar dentro de un tiempo si TS mejoró
                var cursor:IDBCursorWithValue = event.target.result;
                if(cursor && ((parentKey == null) || (
                    detectedFeatures.needToUnwrapArrayKeys ? 
                        internalKey == (cursor.key as string).slice(0,internalKey.length) : 
                        ! parentKey.find(function(expectedValue,i){
                            var storedValue = (cursor.key as any[])[i]
                            return expectedValue != storedValue
                        })
                    ))
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
        return this.getChild<T>(tableName,tableName[0]=='$'?null:[]);
    }
    async getAllStructures<T>():Promise<T[]>{
        return this.getAll('$structures');
    }
    async isEmpty(tableName:string):Promise<boolean>{
        var ldb=this;
        var db=await ldb.wait4db;
        var count:number = await ldb.IDBX<number>(db.transaction(tableName,"readonly").objectStore(tableName).count());
        return count == 0;
    }
    private async putOneAndGetIfNeeded<T extends Record>(tableName:string, element:T, needed:true):Promise<T>
    private async putOneAndGetIfNeeded<T extends Record>(tableName:string, element:T, needed:false):Promise<void>
    private async putOneAndGetIfNeeded<T extends Record>(tableName:string, element:T, needed:boolean):Promise<T|void>{
        var ldb=this;
        var db=await ldb.wait4db
        var tableDef=await ldb.getStructure(tableName);
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
        return Promise.all(promisesArray).then(async function(){
            if(detectedFeatures.needToUnwrapArrayKeys){
                var newKey=tableName+JSON.stringify(tableDef.primaryKey.map(function(name){
                    return element[name];
                }));
                var storeTask=db.transaction(tableName,"readwrite").objectStore(tableName).put(element,newKey);
            }else{
                var storeTask=db.transaction(tableName,"readwrite").objectStore(tableName).put(element);
            }
            if(needed){
                var key=await ldb.IDBX<Key>(storeTask)
                return await ldb.IDBX<T>(db.transaction(tableName,"readonly").objectStore(tableName).get(key))
            }else{
                return null;
            }
        });
    }
    async putOne<T>(tableName:string, element:T):Promise<T>{
        return this.putOneAndGetIfNeeded(tableName, element, true);
    }
    async putMany<T>(tableName:string, elements:T[]):Promise<void>{
        var ldb=this;
        var db=await ldb.wait4db
        var tableDef=await ldb.getStructure(tableName);
        
        var transaction=db.transaction(tableName,"readwrite");
        var objectStore=transaction.objectStore(tableName);
        var i = 0;
        putNext();
        function putNext() {
            if(i<elements.length){
                if(detectedFeatures.needToUnwrapArrayKeys){
                    var newKey=tableName+JSON.stringify(tableDef.primaryKey.map(function(name){
                        return elements[i][name];
                    }));
                    objectStore.put(elements[i],newKey).onsuccess=putNext;
                }else{
                    objectStore.put(elements[i]).onsuccess=putNext;
                }
                ++i;
            }else{
                return Promise.resolve();
            }
        } 
    }
    async close():Promise<void>{
        var db=await this.wait4db;
        db.close();
        this.wait4db={
            then:function(){
                throw new Error("the database is closed")
            },
            catch:function(){
                throw new Error("the database is closed")
            }
        }
    }
    async clear(tableName:string):Promise<void>{
        var ldb=this;
        var db=await ldb.wait4db;
        await ldb.IDBX(db.transaction(tableName,"readwrite").objectStore(tableName).clear());
    }
}

export class LocalDbTransaction {
    private oneByOneChain:Promise<any>=Promise.resolve();
    constructor(public localDbName: string){
        this.oneByOneChain = Promise.resolve();
    }
    async inTransaction<T>(callback:(ldb:LocalDb)=>Promise<T>):Promise<T>{
        var name=this.localDbName;
        this.oneByOneChain = this.oneByOneChain.then(async function(){
            var ldb = new LocalDb(name);
            async function closeLdb(err:Error):Promise<never>;
            async function closeLdb():Promise<void>;
            async function closeLdb(previousError?:Error):Promise<void|never>{
                try{
                    await ldb.close();
                    if(previousError){
                        // @ts-ignore 
                        previousError.ldbWasClosed=true;
                    }
                }catch(errClose){
                    if(previousError){
                        // @ts-ignore 
                        previousError.ldbWasNotClosedBecause=errClose;
                    }else{
                        throw errClose;
                    }
                }
            }
            try{
                var result=await callback(ldb);
            }catch(err){
                await closeLdb(err);
                throw err;
            }
            //await closeLdb();
            return result;
    });
        return this.oneByOneChain;
    }
    getBindedInTransaction<T>():(callback:(ldb:LocalDb)=>Promise<T>)=>Promise<T>{
        var this4bind = this;
        return function(ldb){
            return this4bind.inTransaction(ldb);
        }
    }
}
