declare module "backend-plus"{

import * as net from "net";
import * as express from "express";
import {Client} from "pg-promise-strict";
import * as pg from "pg-promise-strict";

export * from "pg-promise-strict";
export type MotorDb = typeof pg;

export type LangId = 'en'|'es'|'etc...';

export type Server=net.Server;

export interface CoreFunctionParameters{
    [key:string]: any
}

export type MarkdownDoc = 'markdown documentation with `` can content newlines. The identation of the first line is deleted in all others'|'etc...'; 

export interface ProcedureParameter {
    name: string
    encoding?: string 
    defaultValue?: any
    typeName?: string
    references?: string
    options?: string[]
    specialDefaultValue?: string
    label?: string
    description?: string
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
    method?: 'get'|'post'
    coreFunction: CoreFunction 
    encoding?:'JSON4all'|'JSON'|'download'
    multipart?:true
    progress?:true
    files?:{count?:number}
    roles?:string[]
    cacheable?:true
    resultOk?:string
    bitacora?:{always?:boolean, error?:boolean}
    unlogged?:boolean
    setCookies?:boolean
    proceedLabel?:string
    policy?:string
    uniqueUse?:boolean
    forExport?:{
        fileName?:string
        csvFileName?:string
    }
}

export interface User {
    [key: string]: string
}

export interface Context {
    be:AppBackend, 
    user:User, 
    session:{[K:string]:any}, 
    username:string, 
    machineId:string, 
    navigator:string
}

export interface ContextForDump extends Context {
    forDump?:boolean
}

export type InformProgressFunction=(opts:Error|{data:any}|{start:any}|{message:string}|{message?:string, lengthComputable:boolean, loaded:number, total:number, force?:boolean})=>void

export interface ProcedureContext extends Context{
    client:Client
    doing:string
    informProgress:InformProgressFunction
    setCookie:(name:string, value:string, opts:express.CookieOptions)=>void
    clearCookie:(name:string, opts:express.CookieOptions)=>void
    cookies:{[key:string]: string}
    regenerateSession():void
}
export interface Request extends express.Request {
    user?:User
    session:express.Request["session"]
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
    selectedByDefault?:true
    [k:string]:any
}
export type MenuInfoMinimo={
    // menuType:string // 'menu'|'table'|'proc'
    name:string
    label?:string
    selectedByDefault?:true
}
export type MenuInfoMenu = {
    menuType:'menu'
    menuContent:MenuInfo[]
} & MenuInfoMinimo;
export type MenuInfoTable = {
    menuType:'table'
    table?:string
    ff?:{fieldName:string, value:any, show?:boolean}[]
    fc?:{fieldName:string, operator:string, value:any}[]
    pf?:any
    td?:TableDefinition
    detailing?:any
} & MenuInfoMinimo;
export type MenuInfoProc={
    menuType:'proc'
    proc?:string
    autoproced?:boolean
} & MenuInfoMinimo;
export type MenuInfoPath={
    menuType:'path'
    path:string
} & MenuInfoMinimo;
export interface ClientModuleDefinition{
    type:'js'|'css'|'ttf'
    module?:string // module where to search in node_modules (node_modules/module/modPath/file) to serve
    modPath?:string // path inside module where to find file to serve
    src?:string  // full path where browser search file (path/file)
    path?:string // browser path where the file is
    file?:string // filename in browser and server
    ts?:{
        url:string
        path:string
    }
    // fileProduction?:string // DEPRECATED, USE fileDevelopment
    fileDevelopment?:string
}
export interface WScreens{
//    "!": {}
}
export type MenuInfoWScreen = {
    menuType: keyof WScreens & string
} &  MenuInfoMinimo
export type MenuInfo = MenuInfoMenu | MenuInfoTable | MenuInfoProc | MenuInfoPath | MenuInfoWScreen;
// type MenuDefinition = {menu:Readonly<MenuInfoBase[]>}
export type MenuDefinition = {menu:MenuInfoBase[]}
// types for Table definitions
export interface TableContext extends Context{
    superuser?:true
    forDump?:boolean
}
export type PgKnownTypes='decimal'|'text'|'boolean'|'integer'|'bigint'|'date'|'interval'|'timestamp'|'jsonb'|'double'|'bytea'|'jsona';
export type PgKnownDbValues='current_timestamp'|'current_user'|'session_user';
export type SequenceDefinition = {
    name:string
    firstValue:number
    prefix?:string /* Prefix for the generated value */
}
export type ExportMetadataDefinition={ /* TODO: define */ }
export type FieldDefinition = EditableDbDefinition & {
    name:string
    typeName:PgKnownTypes|'ARRAY:text'
    label?:string
    title?:string
    nullable?:boolean
    dbNullable?:boolean        /* dbNullable === false is not nullabla at DB level, but not at CLIENT LEVEL */
    defaultValue?:any
    defaultDbValue?:PgKnownDbValues|string
    clientSide?:string         /* keyof: myOwn.clientSides */
    isName?:boolean
    isPk?:number               /* internal: pos in the primaryKey array */
    serverSide?:boolean        /* default:!clientSide if the value is retrived from the database */
    inTable?:boolean           /* default:!clientSide && !sql.fields[...].expr. Is a real fisical field in the table */
    /* sizeByte?:number  deprecated size in bytes for numbers */
    allowEmtpyText?:boolean    /* if a text field accepts '' as a valid value */
    mobileInputType?:string     
    extraRow?:number
    inexactNumber?:number      /* default:depends on typeName  if = means abs(x-v)<espilon
    /* ------------ For client: -------------- */
    visible?:boolean
    width?:number              /* Width in pixels for the grid */
    references?:string         /* table name */ 
    referencesField?:string  
    aggregate?:'avg'|'sum'|'count'|'min'|'max'|'countTrue'          /* keyof myOwn.TableAggregates */
    specialDefaultValue?:string /* keyof myOwn.specialDefaultValues
    defaultForOtherFields?:boolean   /* the field that stores the "other fields" of a flexible imported table */
    specialValueWhenInsert?:string 
    exportMetadata?:ExportMetadataDefinition 
    description?:string
    dataLength?:number
    options?:(string|{option:string|number, label:string})[]
    inView?:boolean
    sortMethod?:string
    generatedAs?:string
    inJoin?:string /* alias from sql.join; implies inTable:false */
    transformer?:string
    table?:string
    inherited?:boolean
    nameForUpsert?:string
    alwaysShow?:boolean /* show when appears in fixed fields */
} & ({} | {
    sequence:SequenceDefinition
    nullable:true
    editable:false
})
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
        "vertical-edit"?: boolean
    }
}
export type FieldsForConnect = (string | {source:string, target:string})[]
export type FieldsForConnectDetailTable = (string | {source:string, target:string, nullMeansAll?:boolean} | {value:any, target:string})[]

export type FkActions = 'no action'|'restrict'|'cascade'|'set null'|'set default';
export type ForeignKey = {
    references:string, 
    fields:FieldsForConnect, 
    onUpdate?: FkActions, 
    onDelete?: FkActions, 
    displayAllFields?: boolean, 
    alias?:string, 
    displayFields?:string[], 
    consName?:string, 
    initiallyDeferred?:boolean
    displayAfterFieldName?:string|boolean
    forceDeferrable?:boolean
    noInherit?:boolean
}
export type Constraint = {constraintType:string, consName?:string} & (
    {constraintType:'unique', fields:string[], where?:string} |
    {constraintType:'check', expr?:string} 
)
export type OtherTableDefs = Record<string,Partial<TableDefinition & {prefilledField:Record<string,any>}>>
export type TableDefinition = EditableDbDefinition & {
    name:string
    elementName?:string
    tableName?:string
    schema?:string
    title?:string
    fields:FieldDefinition[],
    primaryKey:string[],
    refrescable?: boolean;
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
        fields?:{
            [k:string]:{
                expr:string
            }
        },
        orderBy?:string[]
        viewBody?:string
        insertIfNotUpdate?:boolean
        policies?:{
            all   ?:{name?:string, using?:string, check?:string}
            select?:{name?:string, using?:string}
            insert?:{name?:string,                check?:string}
            update?:{name?:string, using?:string, check?:string}
            delete?:{name?:string, using?:string}
        }
        join?:string
        constraintsDeferred?:boolean
        otherTableDefs?:OtherTableDefs
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
    hiddenColumns?:string[]
    layout?:{
        vertical?:boolean
        styleColumns?:string[]
    }
    sortColumns?:{column:string, order?:1|-1}[]
    policy?:string
    firstDisplayCount?:number
    firstDisplayOverLimit?:number
    description?:MarkdownDoc
    exportJsonFieldAsColumns?:string
    importCuidado?:boolean
    specialValidator?:string
    saveAfter?:boolean
    selfRefresh?:boolean
    filterColumns?:{column:string, operator:string, value:any}[],
    gridAlias?:string   /* front-end css my-table = gridAlias */
}
export interface DetailTable { table?: string, fields: FieldsForConnectDetailTable, abr: string, label?: string, refreshParent?:boolean, refreshFromParent?:boolean, wScreen?:string, condition?:string }
export type TableDefinitionFunction = (context: ContextForDump, opts?:any) => TableDefinition;
export type TableItemDef=string|{name:string, path?:string, tableGenerator?:(context:TableContext)=>TableDefinition}
// {{name: string; path?:string; fileName?: string; source?: string; tableGenerator?:()=>void; title?:string; mixin?:any[]}} TableItem
export interface TableDefinitions {
    [k: string]: TableDefinitionFunction
}
export interface ClientSetup {
    setup:Record<string, any>
    procedures:ProcedureDef[]
}
export type StartOptions={
    readConfig?:{whenNotExist:'ignore'}, 
    config?:string|object
    "dump-db"?:boolean
    testing?:true
}
export type TableDefinitionsGetters = {
    [key:string]: (context:TableContext) => TableDefinition
}
export type UnloggedRequest = {
    useragent:{
        os?:string
        version?:string
    }
}
export interface OptsClientPage {
    hideBEPlusInclusions?:boolean
    skipMenu?:boolean
    manifestPath?:string
    webManifestPath?:string
    extraFiles?:ClientModuleDefinition[]
    icon?:string
    icons?:Record<string,string>
}

export type DumpOptions={complete?:boolean, skipEnance?:boolean, disableDBFunctions?:boolean}

export interface Caches {
    procedures:Record<string, {timestamp:number, result:any}>
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
    caches:Caches
    fieldDomain:{[k:string]:Partial<FieldDefinition>}
    exts:{img:string[], normal:string[]}
    optsGenericForAll:{allowedExts?:string[]}
    sqls:{[k:string]:string}
    messages:{[k:string]:string}
    dbUserNameExpr:string
    dbUserRolExpr:string
    specialValueWhenInsert:{[k:string]:(context:ProcedureContext, defField:FieldDefinition, parameters:object)=>any}
    clearCaches():void
    start(opts?: StartOptions):Promise<void>
    getTables():TableItemDef[]
    prepareGetTables():void
    appendToTableDefinition(tableName:string, appenderFunction:(tableDef:TableDefinition, context?:TableContext)=>void):void
    getContext(req:Request):Context
    postConfig(...params: any[]):Promise<void>
    clientIncludes(req:Request|null, hideBEPlusInclusions?:OptsClientPage):ClientModuleDefinition[]
    addSchrödingerServices(mainApp:ExpressPlus, baseUrl:string):void
    addUnloggedServices(mainApp:ExpressPlus, baseUrl:string):void
    addLoggedServices():void
    getProcedures():Promise<ProcedureDef[]>
    isAdmin():boolean
    canChangePass():Promise<boolean>
    getMenu(context?:Context):MenuDefinition
    inDbClient<T>(req:Request|null, doThisWithDbClient:(client:Client)=>Promise<T>):Promise<T>
    inTransaction<T>(req:Request|null, doThisWithDbTransaction:(client:Client)=>Promise<T>):Promise<T>
    inTransactionProcedureContext<T>(req:Request|null, coreFunction:(context:ProcedureContext)=>Promise<T>):Promise<T>
    procedureDefCompleter(procedureDef:ProcedureDef):ProcedureDef
    tableDefAdapt(tableDef:TableDefinition, context:Context):TableDefinition
    pushApp(dirname:string):void
    dumpDbTableFields(tableDefinition:TableDefinition):string[]
    dumpDbSchemaPartial(partialTableStructures:TableDefinitions, opts?:DumpOptions):Promise<{mainSql:string; enancePart:string}> 
    getContextForDump(): ContextForDump
    getClientSetupForSendToFrontEnd(req:Request):Promise<ClientSetup>
    configList(): (object|string)[]
    configStaticConfig():void
    setStaticConfig(defConfigYamlString:string):void
    mainPage(req:Request|{},offlineMode?:boolean,opts?:OptsClientPage):{
        toHtmlDoc:()=>string
    }
    isThisProcedureAllowed<T>(context:Context, procedureDef:ProcedureDef, params:{[key:string]:T}):Promise<boolean>
    checkDatabaseStructure(client:Client):Promise<void>
    getDbFunctions(opts:DumpOptions):Promise<{dumpText:string}[]>
    i18n:{
        messages:Record<LangId,Record<string, string>>
    }
    shootDownBackend():Promise<void>
    setLog(opts:{until:string, results?:boolean}):void
    getDataDumpTransformations(rawData:string):Promise<{rawData:string, prepareTransformationSql:string[], endTransformationSql:string[]}>
}

}