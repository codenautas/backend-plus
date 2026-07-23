import { ForeignKey, FieldDefinition } from "backend-plus";
export type Key = string[];
export type Stores = {
    [key: string]: IDBObjectStore;
};
export type StoreDefs = {
    [key: string]: Key | string;
};
export type Record = {
    [key: string]: any;
};
export interface TableDefinition {
    name: string;
    primaryKey: string[];
    foreignKeys?: ForeignKey[];
    softForeignKeys?: ForeignKey[];
    fields: FieldDefinition[];
}
type RegisterResult = {
    new?: true;
    dataErased?: true;
    changed: boolean;
};
type DetectFeatures = {
    needToUnwrapArrayKeys: boolean;
};
export declare var detectedFeatures: DetectFeatures;
export declare class LocalDb {
    name: string;
    private wait4db;
    private wait4detectedFeatures;
    constructor(name: string);
    static deleteDatabase(name: string): Promise<void>;
    private IDBX;
    registerStructure(tableDef: TableDefinition): Promise<RegisterResult>;
    detectFeatures(store: IDBObjectStore): Promise<DetectFeatures>;
    private registerStructureInside;
    getStructure(tableName: string): Promise<TableDefinition>;
    existsStructure(tableName: string): Promise<boolean>;
    getOneIfExists<T>(tableName: string, key: Key): Promise<T | undefined>;
    getOne<T>(tableName: string, key: Key): Promise<T>;
    getChild<T>(tableName: string, parentKey: Key): Promise<T[]>;
    getAll<T>(tableName: string): Promise<T[]>;
    getAllStructures<T>(): Promise<T[]>;
    isEmpty(tableName: string): Promise<boolean>;
    private putOneAndGetIfNeeded;
    putOne<T>(tableName: string, element: T): Promise<T>;
    putMany<T>(tableName: string, elements: T[]): Promise<void>;
    close(): Promise<void>;
    clear(tableName: string): Promise<void>;
}
export declare class LocalDbTransaction {
    localDbName: string;
    private oneByOneChain;
    constructor(localDbName: string);
    inTransaction<T>(callback: (ldb: LocalDb) => Promise<T>): Promise<T>;
    getBindedInTransaction<T>(): (callback: (ldb: LocalDb) => Promise<T>) => Promise<T>;
}
export {};
