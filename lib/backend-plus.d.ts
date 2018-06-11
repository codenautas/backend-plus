declare module "backend-plus"{

    import * as net from "net";
    import * as express from "express";
    import * as pg from "pg-promise-strict";

    export type Server=net.Server;

    export interface coreFunctionParameters{
        [key:string]: any
    }
    export interface ProcedureParameter {
        name: string
        encoding?: string 
        defaultValue?: any
        typeName?: string
        references?: string
    }
    export type CoreFunction = (context: ProcedureContext, parameters: coreFunctionParameters) => Promise<any>;

    export interface ProcedureDef {
        action: string
        parameters: ProcedureParameter[]
        coreFunction: CoreFunction 
        encode?:string
    }

    export interface User {
        [key: string]: string
    }

    export interface Context {
        be:AppBackend, user:User, session:object, 
        username:string, machineId:string, 
        navigator:string
    }

    export interface ContextForDump extends Context {
        forDump: boolean
    }

    export type ProcedureContext=Context & {
        client:pg.Client
    }
    export type Request = express.Request & {
        user:User
        session:{[key:string]:any}
        connection:{
            remoteAddress:string
        }
    }
    export interface Response extends express.Response{}
    export interface Express extends express.Express{}
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
        isName?:boolean
        isPk?:number  /* internal: pos in the primaryKey array */
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
    export type ForeignKey = {references:string, fields:FieldsForConnect, onDelete?: string, displayAllFields?: boolean, alias?:string}
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
            tableName?:string
        }
        foreignKeys?:ForeignKey[]
        softForeignKeys?:ForeignKey[]
        constraints?:Constraint[]
        detailTables?:DetailTable[]
    }
    export interface DetailTable { table: string, fields: FieldsForConnect, abr: string, label?: string }
    export type TableDefinitionFunction = (context: ContextForDump) => TableDefinition;
    export type TableItemDef=string|{name:string}&({tableGenerator:(context:TableContext)=>TableDefinition})
    interface TableDefinitions {
        [k: string]: TableDefinition | TableDefinitionFunction
    }
    export type ClientSetup= {
        procedures:ProcedureDef[]
    }
    export class AppBackend{
        procedures:ProcedureDef[]
        procedure:{ [key:string]:ProcedureDef }
        app:express.Express
        tableStructures: TableDefinitions
        db:typeof pg
        config: any
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
        dumpDbSchemaPartial(partialTableStructures:TableDefinitions, opts?:{complete?:boolean, skipEnance?:boolean}):Promise<{mainSql:string; enancePart:String}> 
        getContextForDump(): ContextForDump
        getClientSetupForSendToFrontEnd(req:Request):ClientSetup
    }

}