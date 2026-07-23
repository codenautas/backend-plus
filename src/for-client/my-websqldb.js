//import { TableDefinition } from "backend-plus";
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsqlDb = exports.detectedFeatures = void 0;
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
const likeAr = __importStar(require("like-ar"));
const best_globals_1 = require("best-globals");
const SqlTools = __importStar(require("sql-tools"));
exports.detectedFeatures = {
    needToCopyResults: null
};
class WebsqlDb {
    constructor(name) {
        this.name = name;
        var version = 1.0;
        var dbName = this.name;
        var dbDisplayName = this.name;
        var dbSize = 2 * 1024 * 1024;
        try {
            this.db = openDatabase(dbName, version, dbDisplayName, dbSize);
            this.wait4detectedFeatures = this.detectFeatures();
        }
        catch (err) {
            console.log(err.message);
            throw err;
        }
    }
    detectFeatures() {
        return __awaiter(this, void 0, void 0, function* () {
            var detectedFeatures = { needToCopyResults: false };
            var detectElement = { feature: 'need_to_copy_results', value: false };
            try {
                var tableDef = {
                    name: '_detect',
                    fields: [
                        { name: 'feature', typeName: 'text' },
                        { name: 'value', typeName: 'boolean' }
                    ],
                    primaryKey: ['feature']
                };
                yield this.registerStructure(tableDef);
                yield this.putOne('_detect', detectElement);
                yield this.getOne('_detect', ['need_to_copy_results'], true);
            }
            catch (err) {
                detectElement.value = true;
                detectedFeatures.needToCopyResults = true;
                yield this.putOne('_detect', detectElement);
            }
            return detectedFeatures;
        });
    }
    generateSqlForTableDef(tableDef) {
        var typeDb = {
            integer: 'integer',
            number: 'real',
            date: 'text',
            boolean: 'text',
            text: 'text',
            jsonb: 'text',
            json: 'text'
        };
        var lines = [];
        var consLines = [];
        lines.push('CREATE TABLE IF NOT EXISTS ' + SqlTools.quoteIdent(tableDef.name) + ' (');
        var fields = [];
        tableDef.fields.forEach(function (fieldDef) {
            var fieldType = typeDb[fieldDef.typeName] || '"' + fieldDef.typeName + '"';
            if (fieldDef.sizeByte == 4) {
                fieldType = 'integer';
            }
            fields.push('  ' + SqlTools.quoteIdent(fieldDef.name) +
                ' ' + fieldType +
                (fieldDef.defaultValue != null ? ' default ' + SqlTools.quoteLiteral(fieldDef.defaultValue) : '') +
                (fieldDef.defaultDbValue != null ? ' default ' + fieldDef.defaultDbValue : ''));
            if (fieldDef.typeName === 'text' && !fieldDef.allowEmptyText) {
                consLines.push('alter table ' + SqlTools.quoteIdent(tableDef.name) +
                    ' add constraint ' + SqlTools.quoteIdent(fieldDef.name + "<>''") +
                    ' check (' + SqlTools.quoteIdent(fieldDef.name) + "<>'');");
            }
            if (fieldDef.nullable === false) {
                consLines.push('alter table ' + SqlTools.quoteIdent(tableDef.name) +
                    ' alter column ' + SqlTools.quoteIdent(fieldDef.name) + ' set not null;');
            }
        });
        lines.push(fields.join(', \n'));
        if (tableDef.primaryKey) {
            lines.push(', primary key (' + tableDef.primaryKey.map(function (name) { return SqlTools.quoteIdent(name); }).join(', ') + ')');
        }
        lines.push(');');
        return lines.join('\n'); //+'\n-- conss\n' + consLines.join('\n')
    }
    static deleteDatabase(name) {
        //TODO
        return Promise.resolve();
    }
    executeQuery(sql, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var db = this.db;
            return new Promise(function (resolve, reject) {
                if (!db)
                    return reject('no database.');
                var result;
                db.transaction(function (tx) {
                    tx.executeSql(sql, params || [], function (_tx, res) {
                        result = res.rows;
                    });
                }, function (err) {
                    reject(err);
                }, function success() {
                    resolve(result);
                });
            });
        });
    }
    ;
    executeQueries(sql, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var db = this.db;
            return new Promise(function (resolve, reject) {
                if (!db)
                    return reject('no database.');
                db.transaction(function (tx) {
                    return __awaiter(this, void 0, void 0, function* () {
                        data.forEach(function (data) {
                            return __awaiter(this, void 0, void 0, function* () {
                                tx.executeSql(sql, data);
                            });
                        });
                    });
                }, function (tx, err) {
                    reject(err);
                }, function (tx, res) {
                    resolve();
                });
            });
        });
    }
    ;
    registerStructure(tableDef) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.executeQuery(`CREATE TABLE IF NOT EXISTS _structures (name string primary key, def string not null);`, []);
            yield this.executeQuery(`INSERT OR REPLACE INTO _structures (name, def) values (?, ?);`, [tableDef.name, JSON.stringify(tableDef)]);
            yield this.executeQuery(`DROP TABLE IF EXISTS ` + SqlTools.quoteIdent(tableDef.name), []);
            yield this.executeQuery(this.generateSqlForTableDef(tableDef), []);
        });
    }
    getStructure(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            var result = yield this.executeQuery("SELECT * from _structures where name = ?", [tableName]);
            if (result.length) {
                return JSON.parse(result.item(0).def);
            }
            else {
                return undefined;
            }
        });
    }
    existsStructure(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            var tableDef = yield this.getStructure(tableName);
            return tableDef ? true : false;
        });
    }
    convertSQLResultSetRowListToArray(rowResultSetList, copyResults) {
        var arr = [];
        for (var i = 0; i < rowResultSetList.length; i++) {
            var result = rowResultSetList.item(i);
            if (copyResults) {
                result = (0, best_globals_1.changing)(result, {});
            }
            arr.push(result);
        }
        return arr;
    }
    fieldIsNotSupported(fieldName, notSupportedFields) {
        var isNotSupported = notSupportedFields.find(function (field) {
            return field.name == fieldName;
        });
        return isNotSupported ? true : false;
    }
    getNotSupportedFields(tableDef) {
        var jsonbFields = tableDef.fields.filter(function (field) {
            return field.typeName == 'jsonb' || field.typeName == 'date' || field.typeName == 'timestamp' || field.typeName == 'boolean';
        });
        return jsonbFields;
    }
    convertNotSupportedFields(records, notSupportedFields) {
        records.forEach(function (row) {
            if (notSupportedFields) {
                notSupportedFields.forEach(function (notSupportedField) {
                    var fieldName = notSupportedField.name;
                    row[fieldName] = JSON.parse(row[fieldName]);
                });
            }
        });
        return records;
    }
    getOneIfExists(tableName, key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.getOne(tableName, key);
            }
            catch (err) {
                return undefined;
            }
        });
    }
    getOne(tableName, key, ignoreDetectFeatures) {
        return __awaiter(this, void 0, void 0, function* () {
            ignoreDetectFeatures = ignoreDetectFeatures || false;
            var tableDef = yield this.getStructure(tableName);
            var jsonbFields = this.getNotSupportedFields(tableDef);
            var fieldNames = tableDef.primaryKey;
            var whereExpr = [];
            fieldNames.forEach(function (fieldName, i) {
                whereExpr.push(fieldName + '=' + SqlTools.quoteLiteral(key[i]));
            });
            var sql = `SELECT * 
                from ` + SqlTools.quoteIdent(tableName) + `
                where ` + whereExpr.join(' and ');
            var result = yield this.executeQuery(sql, []);
            var detectedFeatures;
            if (!ignoreDetectFeatures) {
                detectedFeatures = yield this.wait4detectedFeatures;
            }
            var copyResults = !ignoreDetectFeatures && detectedFeatures.needToCopyResults;
            var convertedResult = this.convertNotSupportedFields(this.convertSQLResultSetRowListToArray(result, copyResults), jsonbFields);
            if (convertedResult[0]) {
                return convertedResult[0];
            }
            else {
                throw Error('no existe el elemento');
            }
        });
    }
    getChild(tableName, parentKey) {
        return __awaiter(this, void 0, void 0, function* () {
            var tableDef = yield this.getStructure(tableName);
            var jsonbFields = this.getNotSupportedFields(tableDef);
            var fieldNames = tableDef.primaryKey;
            var whereExpr = [];
            parentKey.forEach(function (key, i) {
                whereExpr.push(fieldNames[i] + '=' + SqlTools.quoteLiteral(key));
            });
            var sql = `SELECT * from ` + SqlTools.quoteIdent(tableName);
            if (parentKey.length) {
                sql += ` where ` + whereExpr.join(' and ');
            }
            var result = yield this.executeQuery(sql, []);
            var detectedFeatures = yield this.wait4detectedFeatures;
            return this.convertNotSupportedFields(this.convertSQLResultSetRowListToArray(result, detectedFeatures.needToCopyResults), jsonbFields);
        });
    }
    getAll(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            var tableDef = yield this.getStructure(tableName);
            var jsonbFields = this.getNotSupportedFields(tableDef);
            var results = yield this.executeQuery(`SELECT * from ` + SqlTools.quoteIdent(tableName), []);
            var detectedFeatures = yield this.wait4detectedFeatures;
            return this.convertNotSupportedFields(this.convertSQLResultSetRowListToArray(results, detectedFeatures.needToCopyResults), jsonbFields);
        });
    }
    getAllStructures() {
        return __awaiter(this, void 0, void 0, function* () {
            var results = yield this.executeQuery(`SELECT * from _structures where name <> '_detect'`, []);
            var structures = [];
            for (var i = 0; i < results.length; i++) {
                structures.push(JSON.parse(results.item(i).def));
            }
            return structures;
        });
    }
    isEmpty(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            var result = yield this.executeQuery(`SELECT count(*) as cantidad from ` + SqlTools.quoteIdent(tableName), []);
            return result.item(0).cantidad == 0;
        });
    }
    putOne(tableName, element) {
        return __awaiter(this, void 0, void 0, function* () {
            var ldb = this;
            var createPromiseForFK = function createPromiseForFK(fk) {
                return Promise.resolve().then(function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        var fkTableDef = yield ldb.getStructure(fk.references);
                        if (fkTableDef) {
                            var pk = [];
                            fk.fields.forEach(function (field) {
                                pk.push(element[field.source]);
                            });
                            var isFKCompleteInSource = fk.fields.filter(function (field) {
                                return element[field.source] == null;
                            }).length == 0;
                            if (isFKCompleteInSource) {
                                var fkRecord = yield ldb.getOneIfExists(fk.references, pk);
                                if (fkRecord) {
                                    fk.displayFields.forEach(function (field) {
                                        element[fk.alias + '__' + field] = fkRecord[field];
                                    });
                                }
                            }
                        }
                    });
                });
            };
            var tableDef = yield ldb.getStructure(tableName);
            var jsonbFields = this.getNotSupportedFields(tableDef);
            var promisesArray = [];
            if (tableDef.foreignKeys) {
                tableDef.foreignKeys.forEach(function (fk) {
                    return __awaiter(this, void 0, void 0, function* () {
                        promisesArray.push(createPromiseForFK(fk));
                    });
                });
            }
            if (tableDef.softForeignKeys) {
                tableDef.softForeignKeys.forEach(function (fk) {
                    return __awaiter(this, void 0, void 0, function* () {
                        promisesArray.push(createPromiseForFK(fk));
                    });
                });
            }
            return yield Promise.all(promisesArray).then(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    var fieldNames = [];
                    var fieldValues = [];
                    var unquotedFieldValues = [];
                    likeAr(element).forEach(function (value, key) {
                        fieldNames.push(SqlTools.quoteIdent(key));
                        fieldValues.push(SqlTools.quoteLiteral(ldb.fieldIsNotSupported(key, jsonbFields) ? JSON.stringify(value) : value));
                        unquotedFieldValues.push(value);
                    });
                    yield ldb.executeQuery(`INSERT OR REPLACE INTO ` + SqlTools.quoteIdent(tableName) +
                        ` (` + fieldNames.join(',') + `) values (` + fieldValues.join(',') + `);`, []);
                    return element;
                });
            });
        });
    }
    putMany(tableName, elements) {
        return __awaiter(this, void 0, void 0, function* () {
            var sql;
            var ldb = this;
            var data = [];
            var tableDef = yield this.getStructure(tableName);
            var jsonbFields = this.getNotSupportedFields(tableDef);
            elements.forEach(function (element) {
                if (!sql) {
                    var fieldNames = [];
                }
                var values = [];
                likeAr(element).forEach(function (value, key) {
                    if (!sql) {
                        fieldNames.push(SqlTools.quoteIdent(key));
                    }
                    values.push(ldb.fieldIsNotSupported(key, jsonbFields) ? JSON.stringify(value) : value);
                });
                if (!sql) {
                    sql = `INSERT OR REPLACE INTO ` + SqlTools.quoteIdent(tableName) +
                        ` (` + fieldNames.join(',') + `) values (` + values.map(_ => '?').join(',') + `);`;
                }
                data.push(values);
            });
            yield this.executeQueries(sql, data);
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            //TODO
            return Promise.resolve();
        });
    }
    clear(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.executeQuery(`DELETE FROM ` + SqlTools.quoteIdent(tableName) + `;`, []);
        });
    }
}
exports.WebsqlDb = WebsqlDb;
//# sourceMappingURL=my-websqldb.js.map