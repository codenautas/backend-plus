import * as net from "net";
import * as express from "express";
import * as pg from "pg-promise-strict";

export type Server=net.Server;
export interface ProcedureDef{
}
export type Context={
    be:AppBackend, user:object, session:object, 
    username:string, machineId:string, 
    navigator:string
}
export type ProcedureContext=Context & {
    client:pg.Client
}
export type Request = express.Request & {
    user:{[key:string]:any}
    session:{[key:string]:any}
    connection:{
        remoteAddress:string
    }
}
export interface Response extends express.Response{}
export interface Express extends express.Express{}
export declare function require_resolve(moduleName:string):string
// type MenuInfo = MenuInfoBase; // MenuInfoMenu | MenuInfoTable | MenuInfoProc;
// types for Menu definitions
export type MenuInfoBase={
    menuType:string // 'menu'|'table'|'proc'
    name:string
    label?:string
    [k:string]:any
}
export type MenuInfoMinimo={
    // menuType:string // 'menu'|'table'|'proc'
    name:string
    label?:string
}
export type MenuInfoMenu = {
    menuType:'menu'
    menuContent:MenuInfo[]
} & MenuInfoMinimo;
export type MenuInfoTable = {
    menuType:'table'
    table?:string
} & MenuInfoMinimo;
export type MenuInfoProc={
    menuType:'proc'
    proc?:string
} & MenuInfoMinimo;
export interface ClientModuleDefinition{
    type:'js'|'css'
    module?:string
    src?:string
    path?:string
    modPath?:string
    file?:string
}
export type MenuInfo = MenuInfoMenu | MenuInfoTable | MenuInfoProc;
// type MenuDefinition = {menu:Readonly<MenuInfoBase[]>}
export type MenuDefinition = {menu:MenuInfoBase[]}
// types for Table definitions
export interface TableContext extends Context{
    puede:object
    superuser?:true
    forDump?:boolean
    user:{
        usuario:string
        rol:string
    }
}
export type PgKnownTypes='decimal'|'text'|'boolean'|'integer'|'date'|'interval';
export type FieldDefinition = EditableDbDefinition & {
    name:string
    typeName:PgKnownTypes
    label?:string
    title?:string
    nullable?:boolean
    defaultValue?:any
    clientSide?:string
}
export type EditableDbDefinition = {
    editable?:boolean
    allow?:{
        update?:boolean
        insert?:boolean
        delete?:boolean
        select?:boolean
    }
}
export type FieldsForConnect = (string | {source:string, target:string})[]
export type ForeignKey = {references:string, fields:FieldsForConnect, alias?:string}
export type Constraint = {constraintType:'check'|'unique'|'not null', expr?:string, fields?:string[], consName?:string}
export type TableDefinition = EditableDbDefinition & {
    name:string
    elementName?:string
    tableName?:string
    title?:string
    fields:FieldDefinition[],
    primaryKey:string[],
    sql?:{
        isTable?:boolean
        from?:string
        where?:string
        postCreateSqls?:string
        logicalDeletes?:{
            fieldName:string
            valueToDelete:string
        }
        tableName?:string
    }
    foreignKeys?:ForeignKey[]
    softForeignKeys?:ForeignKey[]
    constraints?:Constraint[]
    detailTables?:{table:string, fields:FieldsForConnect, abr:string, label?:string}[]
}
export type TableItemDef=string|{name:string}&({tableGenerator:(context:TableContext)=>TableDefinition})
export class AppBackend{
    app:express.Express
    db:typeof pg
    start():Promise<void>
    getTables():TableItemDef[]
    getContext(req:Request):Context
    clientIncludes(req:Request, hideBEPlusInclusions?:boolean):ClientModuleDefinition[]
    addSchrödingerServices(mainApp:express.Express, baseUrl:string):void
    addLoggedServices():void
    getProcedures():Promise<ProcedureDef[]>
    getMenu(context?:Context):MenuDefinition
    inDbClient<T>(req:Request|null, doThisWithDbClient:(client:pg.Client)=>Promise<T>):Promise<T>
    inTransaction<T>(req:Request|null, doThisWithDbTransaction:(client:pg.Client)=>Promise<T>):Promise<T>
    procedureDefCompleter(procedureDef:ProcedureDef):ProcedureDef
    tableDefAdapt(tableDef:TableDefinition, context:Context):TableDefinition
    pushApp(dirname:string):void
    dumpDbSchemaPartial(partialTableStructures:{[k:string]:TableDefinition}, opts?:{complete?:boolean, skipEnance?:boolean}):Promise<any> //agregar el tipo correcto
}
