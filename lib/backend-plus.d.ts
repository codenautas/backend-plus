declare module "backend-plus"{

import * as net from "net";
import * as express from "express";
import {Client} from "pg-promise-strict";
import * as pg from "pg-promise-strict";

export * from "pg-promise-strict";
export type MotorDb = typeof pg;

export type LangId = 'en'|'es'|'etc...';

export type Server=net.Server;

export type CoreFunctionParameters<T extends Record<string, any>> = T;

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
export type CoreFunction<T> = ((context: ProcedureContext, parameters: CoreFunctionParameters<T>) => Promise<any>)
                            | ((context: ProcedureContext, parameters: CoreFunctionParameters<T>, files?:UploadedFileInfo[]) => Promise<any>);

export interface ProcedureDef<T = any> {
    action: string
    parameters: ProcedureParameter[]
    method?: 'get'|'post'
    coreFunction: CoreFunction<T> 
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

export type InformProgressFunction=(opts:Error|{data:any}|{start:any}|{message:string}|{idGroup?:string, message?:string, lengthComputable:boolean, loaded:number, total:number, force?:boolean})=>void

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
export interface RequestDb {
    user?:User
    machineId?:string
    userAgent?:{shortDescription?:string}
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
    type:'js'|'css'|'ttf'|'mjs'
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
export type PgKnownTypes='decimal'|'text'|'boolean'|'integer'|'bigint'|'date'|'interval'|'timestamp'|'jsonb'|'double'|'bytea'|'jsona'|'time'|'tsrange'|'time_range'|'daterange';
export type PgKnownDbValues='current_timestamp'|'current_user'|'session_user';
export type SequenceDefinition = {
    name:string
    firstValue:number
    prefix?:string /* Prefix for the generated value */
}
export type ExportMetadataDefinition={ /* TODO: define */ }
export type PostInputOptions='upperSpanish' | 'upperWithoutDiacritics' | 'parseDecimal'
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
    allowEmptyText?:boolean    /* if a text field accepts '' as a valid value */
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
    suggestingKeys?:string[]
    postInput?:PostInputOptions
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
    {constraintType:'check', expr?:string} |
    {constraintType:'exclude', using:'GIST', fields:(string|{fieldName:string, operator:'='|'&&'})[], where?:string}
)
export type OtherTableDefs = Record<string,Partial<TableDefinition & {prefilledField:Record<string,any>}>>
export type TableDefinition = EditableDbDefinition & {
    name:string
    elementName?:string
    tableName?:string
    schema?:string
    title?:string
    prefix?:string // this prefix will be striped out from the fields name to compute the title of the column in the grid
    fields:FieldDefinition[]
    primaryKey:string[]
    refrescable?: boolean
    sql?:{
        primaryKey4Delete?:string[]
        isTable?:boolean
        from?:string
        where?:string
        postCreateSqls?:string
        skipEnance?: boolean
        isReferable?: boolean
        logicalDeletes?:{
            fieldName:string
            valueToDelete:string
        }
        activeRecord?:{
            fieldName:string
        }
        tableName?:string
        tableName4Delete?:string
        fields?:{
            [k:string]:{
                expr:string
            }
        }
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
        setExpectedPkValues?:boolean
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
    filterColumns?:{column:string, operator:string, value:any}[]
    gridAlias?:string   /* front-end css my-table = gridAlias */
    lookupFields?:string[] /* fields that should be used in lookup dialogs; if not specified, fields with isName:true are used */
}
export interface DetailTable { table?: string, fields: FieldsForConnectDetailTable, abr: string, label?: string, refreshParent?:boolean, refreshFromParent?:boolean, wScreen?:string, condition?:string }
export type TableDefinitionFunction = (context: ContextForDump, opts?:any) => TableDefinition;
export type TableItemDef=string|{name:string, path?:string, tableGenerator?:(context:TableContext)=>TableDefinition}
// {{name: string; path?:string; fileName?: string; source?: string; tableGenerator?:()=>void; title?:string; mixin?:any[]}} TableItem
export interface TableDefinitions {
    [k: string]: TableDefinitionFunction
}
export interface ClientSetup {
    config:AppConfigClientSetup
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
    baseUrlForRelativePaths?:boolean
}

export type DumpOptions={complete?:boolean, skipEnance?:boolean, disableDBFunctions?:boolean, commonFunsToDisable?:string[]}

export interface Caches {
    procedures:Record<string, {timestamp:number, result:any}>
}

export interface AppConfigBin {                                    // executables in SO
    "zip-password-parameter-flag": string // parameter to pass the password to the zipper
    "zip-password-prefix": string         // password prefix
    "zip-fixed-parameters":string         // fixed parameters to pass to zipper
}

export interface AppConfigServer 
    {
        "base-url": string                 // rool path in the url
        port: number                       // port of the API services
        "session-store": string            // strategies to store session info
        "ip-replacer": string              // ip that can be not showed or deduced in logs
        "silent-startup": boolean          // less logs when startup
        "kill-9": string                   // a way to kill from URL with a token
        bitacoraSchema: string
        bitacoraTableName: string 
    }
export interface AppConfigDb 
    {
        motor: 'postgresql'
        database: string
        user: string
        password: string
        schema: string
        search_path: string
        tablespace: string                 // for creation scripts
        "min-version": string              // min version of the motor needed
        nodb: boolean                      // if there is no database needed in the app
        no_login: boolean                  // if no login is needed. Used only for all public sites
        "downloadable-backup-path": string // OS path of the encrypted downloadable backup
    }
export interface AppConfigLogin 
    {
        schema: string                     // schema of the user table
        table: string                      // user table
        from: string                       // complete expression to get table or join where get the user
        userFieldname: string              // fieldname in user table that stores the user name
        passFieldname: string              // fieldname in user table that stores the password hash
        rolFieldname: string               // fieldname in user table that stores the rol
        unloggedLandPage: string           // land page when there is no user logged when the backend has public services
        noLoggedUrlPath: string            // path of non logged users when the backend has no public services
        "preserve-case": boolean           // preserve the case of the user name
        activeClausule: string             // SQL expression over the user table to check if a user is active
        lockedClausule: string             // SQL expression over the user table to check if a user is locked
        disableChangePassword: boolean     // disallow password change
        skipBitacora: boolean              // don't register logins
        keepAlive: number                  // secs to keep alive a session if only keep alive request where received
        plus: {
            userFieldName:string
            store:{
                module: string
            }
        }
        forget: {                          // forget password configurations:
            urlPath: string                // url sent by mail. default: `/new-pass`
            urlPathOk: string              // confirmation page
            urlComplete: string            // the complete URL. To use when the proxy strips the req.hostname or shorts the path or ...
            mailFields: string[]           // fields for the forget pass mail

        }
        "double-dragon": boolean           // app user must match db user
    }
export interface AppConfigInstall 
    {
        "table-data-dir": string           // SO path to the .tab files in the db creation script
        dump: {                            // configuration of --dump-db, the db creation script
            "drop-his": boolean            // include drop schema his in the db creation script
            db: {                          
                owner: string              
                extensions: string[]       // extensions to be installed (gist, pg_trgm, pgcrypto)
                enances: 'file'            // if the enances must be dumped in a separate file
                // from here info to set the owner and replace owner and user used in devel when script creation
                "owner4special-scripts": string
                "user4special-scripts": string
                "apply-generic-user-replaces": string
            }
            "admin-can-create-tables": boolean // for apps that allows the user to create tables
            "skip-content": boolean        // don't create data from "table-data-dir"
            folders: string                //
            scripts: {
                prepare: string            // SO path to the prepare scripts that will be run before the functions creations and inserts
                "post-adapt": string       // SO path to the post-adapt scripts that will be run after data inserts (of .tab tables)
            }
        }
    }
export interface AppConfigClientSetup // front-end config
    {
        title:string                       // title of the app (common sufix of the title bar)
        lang:string
        version?:string
        menu?:boolean
        "background-img"?:string
        devel?:boolean
        deviceWidthForMobile?:string
        "initial-scale"?:string
        "minimum-scale"?:string
        "maximum-scale"?:string
        "user-scalable"?:string
    }
export interface AppConfig {
    package: {
        version: string
    }
    server: AppConfigServer
    db: AppConfigDb
    login: AppConfigLogin
    install: AppConfigInstall
    "client-setup": AppConfigClientSetup
    log: {
        "serve-content": never
        req: {
            "keep-alive": boolean
        }
        db: {
            "last-error": boolean          // store last db error in a log file
            devel: boolean                 //
            "on-demand": string            // if log db level can be changed on the fly
            until: string | Date           // full log until...
            results: boolean               // if query results must be included in full db logs
        }
        session: boolean                   // if all session activity must be logged
    }
    devel: {
        delay: number                      // msec avg random delay in API responses (to emulate slow nets)
        "cache-content": boolean           // if the cache header must be sent to the client (when no devel config the default is true)
        forceShowAsEditable: boolean       // force "editable" behavior in grids 
        "tests-can-delete-db": boolean
    }
    mailer: {                              // config to send mails
        conn: string                       // connection string
        "mail-info": {}                    // static mail config
        supervise: {
            to: string                     // email addres of the supervisor
            event: {
            }
        }
    }
    bin: AppConfigBin 
    data: {
        transformers: {
            text: string                   // define the inputTransformers for text comming from the fron-end via the API
        }
    }
    skipUnknownFieldsAtImport: boolean     // if unknown fields must be skipped by default in import
}

export class AppBackend{
    procedures:ProcedureDef[]
    procedure:{ [key:string]:ProcedureDef }
    app:ExpressPlus
    getTableDefinition: TableDefinitionsGetters
    tableStructures: TableDefinitions
    db: MotorDb
    config: AppConfig
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
    isAdmin(reqOrContext:Request|Context):boolean
    canChangePass():Promise<boolean>
    getMenu(context?:Context):MenuDefinition
    inDbClient<T>(req:RequestDb|null, doThisWithDbClient:(client:Client)=>Promise<T>):Promise<T>
    inTransaction<T>(req:RequestDb|null, doThisWithDbTransaction:(client:Client)=>Promise<T>):Promise<T>
    inTransactionProcedureContext<T>(req:Request|null, coreFunction:(context:ProcedureContext)=>Promise<T>):Promise<T>
    procedureDefCompleter<T>(procedureDef:ProcedureDef):ProcedureDef<T>
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
    shutdownCallbackListAdd(param:{message:string, fun:()=>Promise<void>}):void
    shutdownBackend():Promise<void>
    setLog(opts:{until:string, results?:boolean}):void
    getDataDumpTransformations(rawData:string):Promise<{rawData:string, prepareTransformationSql:string[], endTransformationSql:string[]}>
}

}