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
exports.LocalDbTransaction = exports.LocalDb = exports.detectedFeatures = void 0;
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
/****
 * Atención en la implementación de este módulo se tiene en cuenta que según
 * https://caniuse.com/#feat=indexeddb ocurren dos cosas trágicas:
 *   1) en IE y EDGE no hay claves de tipo array
 *   2) en iOS de 8 a 9.3 hay un error que no permite que en dos objetos distintos haya una misma Pk
 *
 * más explicaciones en:
 *   1) https://stackoverflow.com/questions/14283257/dataerror-when-creating-an-index-with-a-compound-key-in-ie-10
 *   2) https://www.raymondcamden.com/2014/09/25/IndexedDB-on-iOS-8-Broken-Bad/
 *
 * hay un test en:
 *   a) https://codepen.io/cemerick/pen/Itymi
 *
 * workarround para contemplar IE, y iOS viejos:
 *   1) se transforman las claves antes de usarlas en un string (JSON.stringify del array para el problema del IE)
 *   2) se prefija el string con el nombre del objectStore (para que todas las claves sean distintas y no haya problemas con el iOS viejo)
 *
 * detección
 *   1) por ahora solo probamos la detección del problema del array de claves
 *   2) TODO: Falta programar la detección del problema de iOS viejo, quizás haya que ser explícito, hay que probarlo con varios iPad
 */
const likeAr = __importStar(require("like-ar"));
exports.detectedFeatures = {
    needToUnwrapArrayKeys: null
};
class LocalDb {
    constructor(name) {
        this.name = name;
        var ldb = this;
        var initialStores = {
            $structures: 'name',
            $internals: 'var',
            $detect: ['detectKey'],
        };
        var initialVersionInfo = {
            var: 'version',
            num: 1,
            timestamp: new Date().toJSON(),
            stores: initialStores
        };
        var requestDB = indexedDB.open(this.name);
        requestDB.onupgradeneeded = function () {
            var db = requestDB.result;
            if (!db.objectStoreNames.contains("$internals")) {
                likeAr(initialStores).forEach(function (keyPath, tableName) {
                    var store = db.createObjectStore(tableName, { keyPath: keyPath });
                    if (tableName == '$internals') {
                        store.put(initialVersionInfo);
                    }
                    if (tableName == '$detect') {
                        ldb.wait4detectedFeatures = ldb.detectFeatures(store);
                    }
                });
            }
        };
        ldb.wait4db = ldb.IDBX(requestDB);
    }
    static deleteDatabase(name) {
        var request = indexedDB.deleteDatabase(name);
        return new Promise(function (resolve, reject) {
            request.onsuccess = function () {
                resolve();
            };
            request.onerror = function (event) {
                reject();
            };
        });
    }
    IDBX(request) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(function (resolve, reject) {
                if ('onsuccess' in request) {
                    request.onsuccess = function () {
                        resolve(request.result);
                    };
                }
                else {
                    request.oncomplete = function () {
                        resolve();
                    };
                }
                request.onerror = function () {
                    alertPromise(request.error.message || request.error.name);
                    reject(request.error);
                };
            });
        });
    }
    registerStructure(tableDef) {
        return __awaiter(this, void 0, void 0, function* () {
            var ldb = this;
            var wait4dbCurrent = this.wait4db;
            var registerTask = this.registerStructureInside(tableDef, wait4dbCurrent);
            this.wait4db = registerTask.then(result => result.wait4db);
            var result = yield registerTask;
            return result.result;
        });
    }
    detectFeatures(store) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                try {
                    // @ts-ignore
                    var os = window.myOwn.config.useragent.os;
                    // @ts-ignore
                    var version = parseInt(window.myOwn.config.useragent.version.split('.')[0]);
                }
                catch (err) {
                    throw Error("unknowed OS or version");
                }
                if (os === 'OS X' && version < 11) {
                    exports.detectedFeatures.needToUnwrapArrayKeys = true;
                    resolve(exports.detectedFeatures);
                }
                else {
                    var request = store.put({ detectKey: 'one' });
                    request.onsuccess = function () {
                        var key = request.result;
                        if (typeof key === "string") {
                            exports.detectedFeatures.needToUnwrapArrayKeys = true;
                        }
                        else {
                            exports.detectedFeatures.needToUnwrapArrayKeys = false;
                        }
                        resolve(exports.detectedFeatures);
                    };
                    request.onerror = function () {
                        exports.detectedFeatures.needToUnwrapArrayKeys = true;
                        resolve(exports.detectedFeatures);
                    };
                }
            });
        });
    }
    registerStructureInside(tableDef, wait4db) {
        return __awaiter(this, void 0, void 0, function* () {
            var ldb = this;
            var db = yield wait4db;
            var result = { wait4db, result: { changed: null } };
            var oldValue = yield this.IDBX(db.transaction('$structures', "readonly").objectStore('$structures').get(tableDef.name));
            if (!oldValue) {
                result.result.new = true;
            }
            yield ldb.IDBX(db.transaction('$structures', "readwrite").objectStore('$structures').put(tableDef));
            result.result.changed = JSON.stringify(tableDef) != JSON.stringify(oldValue);
            if (!ldb.wait4detectedFeatures) {
                ldb.wait4detectedFeatures = ldb.detectFeatures(db.transaction('$detect', "readwrite").objectStore('$detect'));
            }
            yield ldb.wait4detectedFeatures;
            var infoStore = exports.detectedFeatures.needToUnwrapArrayKeys ? null : tableDef.primaryKey;
            var versionInfo = yield this.IDBX(db.transaction('$internals', "readonly").objectStore('$internals').get('version'));
            if (JSON.stringify(versionInfo.stores[tableDef.name]) != JSON.stringify(infoStore)) {
                db.close();
                versionInfo.num++;
                var requestDB = indexedDB.open(this.name, versionInfo.num);
                requestDB.onupgradeneeded = function () {
                    var db = requestDB.result;
                    if (versionInfo.stores[tableDef.name]) {
                        db.deleteObjectStore(tableDef.name);
                    }
                    if (infoStore != null) {
                        db.createObjectStore(tableDef.name, { keyPath: infoStore });
                    }
                    else {
                        db.createObjectStore(tableDef.name);
                    }
                };
                result.wait4db = ldb.IDBX(requestDB);
                db = yield result.wait4db;
                versionInfo.stores[tableDef.name] = infoStore;
                yield ldb.IDBX(db.transaction('$internals', "readwrite").objectStore('$internals').put(versionInfo));
            }
            return result;
        });
    }
    getStructure(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            var ldb = this;
            var db = yield ldb.wait4db;
            if (!ldb.wait4detectedFeatures) {
                ldb.wait4detectedFeatures = ldb.detectFeatures(db.transaction('$detect', "readwrite").objectStore('$detect'));
            }
            yield ldb.wait4detectedFeatures;
            var tableDef = yield ldb.IDBX(db.transaction('$structures', "readonly").objectStore('$structures').get(tableName));
            return tableDef;
        });
    }
    existsStructure(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            var tableDef = yield this.getStructure(tableName);
            return tableDef ? true : false;
        });
    }
    getOneIfExists(tableName, key) {
        return __awaiter(this, void 0, void 0, function* () {
            var ldb = this;
            var db = yield ldb.wait4db;
            var internalKey;
            if (exports.detectedFeatures.needToUnwrapArrayKeys) {
                internalKey = tableName + JSON.stringify(key);
            }
            else {
                internalKey = key;
            }
            var result = yield ldb.IDBX(db.transaction(tableName, "readonly").objectStore(tableName).get(internalKey));
            return result;
        });
    }
    getOne(tableName, key) {
        return __awaiter(this, void 0, void 0, function* () {
            var result = yield this.getOneIfExists(tableName, key);
            if (!result) {
                throw new Error("no result");
            }
            return result;
        });
    }
    getChild(tableName, parentKey) {
        return __awaiter(this, void 0, void 0, function* () {
            var ldb = this;
            var db = yield ldb.wait4db;
            var rows = [];
            var internalKey;
            if (exports.detectedFeatures.needToUnwrapArrayKeys) {
                internalKey = tableName + JSON.stringify(parentKey);
                internalKey = internalKey.substr(0, internalKey.length - 1);
            }
            else {
                internalKey = parentKey ? parentKey : '';
            }
            var cursor = db.transaction([tableName], 'readonly').objectStore(tableName).openCursor(parentKey == null ? null : IDBKeyRange.lowerBound(internalKey));
            return new Promise(function (resolve, reject) {
                cursor.onsuccess = function (event) {
                    // @ts-ignore target no conoce result en la definición de TS. Verificar dentro de un tiempo si TS mejoró
                    var cursor = event.target.result;
                    if (cursor && ((parentKey == null) || (exports.detectedFeatures.needToUnwrapArrayKeys ?
                        internalKey == cursor.key.slice(0, internalKey.length) :
                        !parentKey.find(function (expectedValue, i) {
                            var storedValue = cursor.key[i];
                            return expectedValue != storedValue;
                        })))) {
                        rows.push(cursor.value);
                        cursor.continue();
                    }
                    else {
                        resolve(rows);
                    }
                };
                cursor.onerror = function () {
                    reject(cursor.error);
                };
            });
        });
    }
    getAll(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getChild(tableName, tableName[0] == '$' ? null : []);
        });
    }
    getAllStructures() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getAll('$structures');
        });
    }
    isEmpty(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            var ldb = this;
            var db = yield ldb.wait4db;
            var count = yield ldb.IDBX(db.transaction(tableName, "readonly").objectStore(tableName).count());
            return count == 0;
        });
    }
    putOneAndGetIfNeeded(tableName, element, needed) {
        return __awaiter(this, void 0, void 0, function* () {
            var ldb = this;
            var db = yield ldb.wait4db;
            var tableDef = yield ldb.getStructure(tableName);
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
            return Promise.all(promisesArray).then(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    if (exports.detectedFeatures.needToUnwrapArrayKeys) {
                        var newKey = tableName + JSON.stringify(tableDef.primaryKey.map(function (name) {
                            return element[name];
                        }));
                        var storeTask = db.transaction(tableName, "readwrite").objectStore(tableName).put(element, newKey);
                    }
                    else {
                        var storeTask = db.transaction(tableName, "readwrite").objectStore(tableName).put(element);
                    }
                    if (needed) {
                        var key = yield ldb.IDBX(storeTask);
                        return yield ldb.IDBX(db.transaction(tableName, "readonly").objectStore(tableName).get(key));
                    }
                    else {
                        return null;
                    }
                });
            });
        });
    }
    putOne(tableName, element) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.putOneAndGetIfNeeded(tableName, element, true);
        });
    }
    putMany(tableName, elements) {
        return __awaiter(this, void 0, void 0, function* () {
            var ldb = this;
            var db = yield ldb.wait4db;
            var tableDef = yield ldb.getStructure(tableName);
            var transaction = db.transaction(tableName, "readwrite");
            var objectStore = transaction.objectStore(tableName);
            var i = 0;
            putNext();
            function putNext() {
                if (i < elements.length) {
                    if (exports.detectedFeatures.needToUnwrapArrayKeys) {
                        var newKey = tableName + JSON.stringify(tableDef.primaryKey.map(function (name) {
                            return elements[i][name];
                        }));
                        objectStore.put(elements[i], newKey).onsuccess = putNext;
                    }
                    else {
                        objectStore.put(elements[i]).onsuccess = putNext;
                    }
                    ++i;
                }
                else {
                    return Promise.resolve();
                }
            }
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            var db = yield this.wait4db;
            db.close();
            this.wait4db = {
                then: function () {
                    throw new Error("the database is closed");
                },
                catch: function () {
                    throw new Error("the database is closed");
                }
            };
        });
    }
    clear(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            var ldb = this;
            var db = yield ldb.wait4db;
            yield ldb.IDBX(db.transaction(tableName, "readwrite").objectStore(tableName).clear());
        });
    }
}
exports.LocalDb = LocalDb;
class LocalDbTransaction {
    constructor(localDbName) {
        this.localDbName = localDbName;
        this.oneByOneChain = Promise.resolve();
        this.oneByOneChain = Promise.resolve();
    }
    inTransaction(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            var name = this.localDbName;
            this.oneByOneChain = this.oneByOneChain.then(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    var ldb = new LocalDb(name);
                    function closeLdb(previousError) {
                        return __awaiter(this, void 0, void 0, function* () {
                            try {
                                yield ldb.close();
                                if (previousError) {
                                    // @ts-ignore 
                                    previousError.ldbWasClosed = true;
                                }
                            }
                            catch (errClose) {
                                if (previousError) {
                                    // @ts-ignore 
                                    previousError.ldbWasNotClosedBecause = errClose;
                                }
                                else {
                                    throw errClose;
                                }
                            }
                        });
                    }
                    try {
                        var result = yield callback(ldb);
                    }
                    catch (err) {
                        yield closeLdb(err);
                        throw err;
                    }
                    //await closeLdb();
                    return result;
                });
            });
            return this.oneByOneChain;
        });
    }
    getBindedInTransaction() {
        var this4bind = this;
        return function (ldb) {
            return this4bind.inTransaction(ldb);
        };
    }
}
exports.LocalDbTransaction = LocalDbTransaction;
//# sourceMappingURL=my-localdb.js.map