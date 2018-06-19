"use strict";
/// <reference path="../node_modules/types.d.ts/modules/myOwn/in-myOwn.d.ts" />
/// <reference path="../../lib/in-backend-plus.d.ts" />

class LocalDb{
    constructor(name:string){
        // si no existe construye $internals y $structures
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