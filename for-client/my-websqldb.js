var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    //import { TableDefinition } from "backend-plus";
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.detectedFeatures = {
        needToUnwrapArrayKeys: null
    };
    var WebsqlDb = /** @class */ (function () {
        function WebsqlDb(name) {
            this.name = name;
            var version = 1.0;
            var dbName = this.name;
            var dbDisplayName = this.name;
            var dbSize = 2 * 1024 * 1024;
            try {
                this.db = openDatabase(dbName, version, dbDisplayName, dbSize);
            }
            catch (err) {
                console.log(err.message);
                throw err;
            }
        }
        /*public static deleteDatabase(name:string):Promise<void>{
            var request = indexedDB.deleteDatabase(name);
            return new Promise(function(resolve,reject){
                request.onsuccess=function(){
                    resolve()
                }
                request.onerror=function(event){
                    reject()
                }
            })
        }*/
        WebsqlDb.prototype.executeQuery = function (sql, params) {
            return __awaiter(this, void 0, void 0, function () {
                var db;
                return __generator(this, function (_a) {
                    db = this.db;
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            if (!db)
                                return reject('no database.');
                            db.transaction(function (tx) {
                                tx.executeSql(sql, params || [], function (tx, res) {
                                    resolve(res.rows);
                                }, function (tx, err) {
                                    reject(err.message);
                                });
                            });
                        })];
                });
            });
        };
        ;
        /*
        private async IDBX(request: IDBOpenDBRequest):Promise<IDBDatabase>
        private async IDBX(request: IDBTransaction):Promise<void>
        private async IDBX<T>(request: IDBRequest):Promise<T>
        private async IDBX(request: IDBRequest|IDBOpenDBRequest|IDBTransaction):Promise<any>{
            return new Promise(function(resolve, reject){
                if('onsuccess' in request){
                    request.onsuccess=function(){
                        resolve(request.result);
                    }
                }else{
                    request.oncomplete=function(){
                        resolve();
                    }
                }
                request.onerror=function(){
                    alertPromise(request.error.message || request.error.name);
                    reject(request.error);
                }
            })
        }*/
        WebsqlDb.prototype.registerStructure = function (tableDef) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.executeQuery("CREATE TABLE IF NOT EXISTS _structures (name string primary key, def json not null)", [])];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.executeQuery("insert into _structures (name, def) values (?, ?)", [tableDef.name, tableDef])];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        WebsqlDb.prototype.getStructure = function (tableName) {
            return __awaiter(this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.executeQuery("select * from _structures where name = (?)", [tableName])];
                        case 1:
                            result = _a.sent();
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        return WebsqlDb;
    }());
    exports.WebsqlDb = WebsqlDb;
});
//# sourceMappingURL=my-websqldb.js.map