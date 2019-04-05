declare module "backend-plus"{

import * as net from "net";
import * as express from "express";
import {Client} from "pg-promise-strict";
import * as pg from "pg-promise-strict";

export * from "pg-promise-strict";
export type MotorDb = typeof pg;

export type Server=net.Server;

export interface CoreFunctionParameters{
    [key:string]: any
}
export type coreFunctionParameters=CoreFunctionParameters; // deprecated. Typo

export interface ProcedureParameter {
    name: string
    encoding?: string 
    defaultValue?: any
    typeName?: string
    references?: string
}
export type UploadedFileInfo={
    originalFilename: string
    path: string

}
export type CoreFunction = ((context: ProcedureContext, parameters: CoreFunctionParameters) => Promise<any>)
                         | ((context: ProcedureContext, parameters: CoreFunctionParameters, files?:UploadedFileInfo[]) => Promise<any>);

export interface ProcedureDef {
    action: string
    parameters: ProcedureParameter[]
    coreFunction: CoreFunction 
    encode?:string
    multipart?:true
    progress?:true
    files?:{count?:number}
    roles?:string[]
}

export interface User {
    [key: string]: string
}

export interface Context {
    be:AppBackend, 
    user:User, 
    session:object, 
    username:string, 
    machineId:string, 
    navigator:string
}

export interface ContextForDump extends Context {
    forDump?:boolean
}

export type InformProgressFunction=(opts:Error|{data:any}|{message:string}|{message?:string, lengthComputable:boolean, loaded:number, total:number})=>void

export type ProcedureContext=Context & {
    client:Client,
    doing:string,
    informProgress:InformProgressFunction
}
export interface Request extends express.Request {
    user?:User
}
export {Response, Express} from "express";
export interface ResponsePlus extends express.Response{}
export interface ExpressPlus extends express.Express{}

export function require_resolve(moduleName:string):string
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
    module?:string // module where to search in node_modules (node_modules/module/modPath/file) to serve
    modPath?:string // path inside module where to find file to serve
    src?:string  // full path where browser search file (path/file)
    path?:string // browser path where the file is
    file?:string // filename in browser and server
    ts?:{
        url:string
        path:string
    }
}
export type MenuInfo = MenuInfoMenu | MenuInfoTable | MenuInfoProc;
// type MenuDefinition = {menu:Readonly<MenuInfoBase[]>}
export type MenuDefinition = {menu:MenuInfoBase[]}
// types for Table definitions
export interface TableContext extends Context{
    puede:object
    superuser?:true
    forDump?:boolean
}
export type PgKnownTypes='decimal'|'text'|'boolean'|'integer'|'bigint'|'date'|'interval'|'timestamp'|'jsonb';
export type PgKnownDbValues='current_timestamp'|'current_user'|'session_user';
export type SequenceDefinition = {
    name:string
    firstValue:number
    prefix?:string /* Prefix for the generated value */
}
export type ExportMetadataDefinition={ /* TODO: define */ }
export type FieldDefinition = EditableDbDefinition & {
    name:string
    typeName:PgKnownTypes
    label?:string
    title?:string
    nullable?:boolean
    defaultValue?:any
    defaultDbValue?:PgKnownDbValues
    clientSide?:string         /* keyof: myOwn.clientSides */
    isName?:boolean
    isPk?:number               /* internal: pos in the primaryKey array */
    serverSide?:boolean        /* default:!clientSide if the value is retrived from the database */
    inTable?:boolean           /* default:!clientSide && !sql.fields[...].expr. Is a real fisical field in the table */
    /* sizeByte?:number  deprecated size in bytes for numbers */
    allowEmtpyText?:boolean    /* if a text field accepts '' as a valid value */
    sequence?:SequenceDefinition
    mobileInputType?:string     
    extraRow?:number
    inexactNumber?:number      /* default:depends on typeName  if = means abs(x-v)<espilon
    /* ------------ For client: -------------- */
    visible?:boolean
    width?:number              /* Width in pixels for the grid */
    references?:string         /* table name */ 
    referencesField?:string  
    aggregate?:string          /* keyof myOwn.TableAggregates */
    specialDefaultValue?:string /* keyof myOwn.specialDefaultValues
    defaultForOtherFields?:boolean   /* the field that stores the "other fields" of a flexible imported table */
    exportMetadata?:ExportMetadataDefinition 
    description?:string
    dataLength?:number
}
export type EditableDbDefinition = {
    editable?:boolean
    allow?:{
        update?:boolean
        insert?:boolean
        delete?:boolean
        select?:boolean
        deleteAll?: boolean
        import?: boolean
        export?: boolean
    }
}
export type FieldsForConnect = (string | {source:string, target:string})[]
export type ForeignKey = {
    references:string, 
    fields:FieldsForConnect, 
    onDelete?: string, 
    displayAllFields?: boolean, 
    alias?:string, 
    displayFields?:string[], 
    consName?:string, 
    initiallyDeferred?:boolean
}
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
        skipEnance?: boolean,
        isReferable?: boolean,
        logicalDeletes?:{
            fieldName:string
            valueToDelete:string
        }
        activeRecord?:{
            fieldName:string
        }
        tableName?:string
    }
    foreignKeys?:ForeignKey[]
    softForeignKeys?:ForeignKey[]
    constraints?:Constraint[]
    detailTables?:DetailTable[]
    offline?:{
        mode:'reference'|'master'|'detail' 
        details:string[]
    }
    clientSide?:string         /* keyof: myOwn.clientSides */
}
export interface DetailTable { table: string, fields: FieldsForConnect, abr: string, label?: string }
export type TableDefinitionFunction = (context: ContextForDump) => TableDefinition;
export type TableItemDef=string|{name:string}&({tableGenerator:(context:TableContext)=>TableDefinition})
export interface TableDefinitions {
    [k: string]: TableDefinitionFunction
}
export type ClientSetup= {
    procedures:ProcedureDef[]
}
export type StartOptions={
    readConfig?:{whenNotExist:'ignore'}, 
    testing?:true
}
export type TableDefinitionsGetters = {
    [key:string]: (context:TableContext) => TableDefinition
}
export class AppBackend{
    procedures:ProcedureDef[]
    procedure:{ [key:string]:ProcedureDef }
    app:ExpressPlus
    getTableDefinition: TableDefinitionsGetters
    tableStructures: TableDefinitions
    db: MotorDb
    config: any
    rootPath: string
    start(opts?: StartOptions):Promise<void>
    getTables():TableItemDef[]
    prepareGetTables():void
    appendToTableDefinition(tableName:string, appenderFunction:(tableDef:TableDefinition, context?:TableContext)=>void):void
    getContext(req:Request):Context
    postConfig(...params: any[]):any
    clientIncludes(req:Request|null, hideBEPlusInclusions?:boolean):ClientModuleDefinition[]
    addSchrödingerServices(mainApp:ExpressPlus, baseUrl:string):void
    addUnloggedServices(mainApp:ExpressPlus, baseUrl:string):void
    addLoggedServices():void
    getProcedures():Promise<ProcedureDef[]>
    getMenu(context?:Context):MenuDefinition
    inDbClient<T>(req:Request|null, doThisWithDbClient:(client:Client)=>Promise<T>):Promise<T>
    inTransaction<T>(req:Request|null, doThisWithDbTransaction:(client:Client)=>Promise<T>):Promise<T>
    procedureDefCompleter(procedureDef:ProcedureDef):ProcedureDef
    tableDefAdapt(tableDef:TableDefinition, context:Context):TableDefinition
    pushApp(dirname:string):void
    dumpDbSchemaPartial(partialTableStructures:TableDefinitions, opts?:{complete?:boolean, skipEnance?:boolean}):Promise<{mainSql:string; enancePart:string}> 
    getContextForDump(): ContextForDump
    getClientSetupForSendToFrontEnd(req:Request):ClientSetup
    configList(): (object|string)[]
    configStaticConfig():void
    setStaticConfig(defConfigYamlString:string):void
}

}