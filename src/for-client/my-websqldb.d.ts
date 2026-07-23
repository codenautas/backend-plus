import { TableDefinition } from "backend-plus";
export type Key = string[];
type DetectFeatures = {
    needToCopyResults: boolean;
};
export declare var detectedFeatures: DetectFeatures;
export declare class WebsqlDb {
    name: string;
    private db;
    private wait4detectedFeatures;
    constructor(name: string);
    private detectFeatures;
    private generateSqlForTableDef;
    static deleteDatabase(name: string): Promise<void>;
    executeQuery(sql: string, params: null | {}[]): Promise<SQLResultSetRowList>;
    executeQueries(sql: string, data: {}[]): Promise<unknown>;
    registerStructure(tableDef: TableDefinition): Promise<any>;
    getStructure(tableName: string): Promise<TableDefinition | undefined>;
    existsStructure(tableName: string): Promise<boolean>;
    private convertSQLResultSetRowListToArray;
    private fieldIsNotSupported;
    private getNotSupportedFields;
    private convertNotSupportedFields;
    getOneIfExists<T>(tableName: string, key: Key): Promise<T | undefined>;
    getOne<T>(tableName: string, key: Key, ignoreDetectFeatures?: boolean): Promise<T>;
    getChild<T>(tableName: string, parentKey: Key): Promise<T[]>;
    getAll<T>(tableName: string): Promise<T[]>;
    getAllStructures(): Promise<TableDefinition[]>;
    isEmpty(tableName: string): Promise<boolean>;
    putOne<T>(tableName: string, element: T): Promise<T>;
    putMany<T extends {}>(tableName: string, elements: T[]): Promise<void>;
    close(): Promise<void>;
    clear(tableName: string): Promise<void>;
}
export {};
