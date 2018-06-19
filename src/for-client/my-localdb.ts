//import { TableDefinition } from "backend-plus";
"use strict";
/// <reference path="../node_modules/types.d.ts/modules/myOwn/in-myOwn.d.ts" />
/// <reference path="../../lib/in-backend-plus.d.ts" />

export type Store = {[key:string]:string};

export class LocalDb{
    constructor(public name:string){
        var initialStores:Store={
            $structures:'name',
            $internals:'var'
        };
        var requestDB=indexedDB.open(this.name);
        requestDB.onupgradeneeded = function(event){
            var db = requestDB.result;
            if(event.oldVersion<1){
                var store:Store={};
                likeAr(initialStores).forEach(function(keyPath, tableName){
                    store[tableName] = db.createObjectStore(tableName, {keyPath: keyPath});
                })
                store.$internals.put({
                    var:'version',
                    num:1, 
                    timestamp:new Date().toJSON(),
                    stores:initialStores
                });
            }
        }

        var requestDB=indexedDB.open(my.ldbName);
        requestDB.onupgradeneeded = function(event){
            var db = requestDB.result;
            if(event.oldVersion<1){
                var store={};
                likeAr(initialStores).forEach(function(keyPath, tableName){
                    store[tableName] = db.createObjectStore(tableName, {keyPath: keyPath});
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
    async registerStructure(stucture:TableDefinition):Promise<void>{

    }
    async getStructure(tableName:string):Promise<TableDefinition>{

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