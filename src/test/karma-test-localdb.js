"use strict";
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
const best_globals_1 = require("best-globals");
require("mocha");
const my_websqldb_1 = require("../for-client/my-websqldb");
function compare(obtained, expected) {
    expect(obtained).to.eql(expected);
    return true;
}
before(function () {
    // @ts-ignore
    window.myOwn = window.myOwn || {};
    // @ts-ignore
    window.myOwn.config = window.myOwn.config || {};
    // @ts-ignore
    window.myOwn.config.useragent = new UserAgent().parse(window.navigator.userAgent);
});
describe("websql-db", function () {
    var ldb;
    before(function () {
        this.timeout(10000);
        ldb = new my_websqldb_1.WebsqlDb("the-test-name" + Math.random());
    });
    after(function () {
        //ldb.close();
    });
    describe("structures", function () {
        it("put and get structure", function () {
            return __awaiter(this, void 0, void 0, function* () {
                this.timeout(10000);
                var tableDef = {
                    name: 'this_name',
                    fields: [
                        { name: 'pk1', typeName: 'text' }
                    ],
                    primaryKey: ['pk1']
                };
                yield ldb.registerStructure(tableDef);
                var newTableDef = yield ldb.getStructure(tableDef.name);
                compare(tableDef, newTableDef);
            });
        });
        it("check if exists and exists", function () {
            return __awaiter(this, void 0, void 0, function* () {
                this.timeout(10000);
                var tableDef = {
                    name: 'this_name',
                    fields: [
                        { name: 'pk1', typeName: 'text' }
                    ],
                    primaryKey: ['pk1']
                };
                var exists = yield ldb.existsStructure(tableDef.name);
                compare(true, exists);
            });
        });
        it("check if exists and not exists", function () {
            return __awaiter(this, void 0, void 0, function* () {
                this.timeout(10000);
                var tableDef = {
                    name: 'inexistent_this_name',
                    fields: [
                        { name: 'pk1', typeName: 'text' }
                    ],
                    primaryKey: ['pk1']
                };
                var exists = yield ldb.existsStructure(tableDef.name);
                compare(false, exists);
            });
        });
        it("check empty structure", function () {
            return __awaiter(this, void 0, void 0, function* () {
                this.timeout(10000);
                var tableDef = {
                    name: 'this_name',
                    fields: [
                        { name: 'pk1', typeName: 'text' }
                    ],
                    primaryKey: ['pk1']
                };
                var isEmpty = yield ldb.isEmpty(tableDef.name);
                compare(true, isEmpty);
            });
        });
        it("reput and get structure", function () {
            return __awaiter(this, void 0, void 0, function* () {
                this.timeout(10000);
                var tableDef = {
                    name: 'this_name',
                    fields: [
                        { name: 'pk1', typeName: 'text' },
                        { name: 'field1', typeName: 'text' }
                    ],
                    primaryKey: ['pk1']
                };
                yield ldb.registerStructure(tableDef);
                var newTableDef = yield ldb.getStructure(tableDef.name);
                compare(tableDef, newTableDef);
            });
        });
        it("put another structure", function () {
            return __awaiter(this, void 0, void 0, function* () {
                this.timeout(10000);
                var tableDef = {
                    name: 'other_name',
                    fields: [
                        { name: 'pk2', typeName: 'text' }
                    ],
                    primaryKey: ['pk2']
                };
                yield ldb.registerStructure(tableDef);
                var newTableDef = yield ldb.getStructure(tableDef.name);
                compare(tableDef, newTableDef);
            });
        });
        it("get all structures", function () {
            return __awaiter(this, void 0, void 0, function* () {
                this.timeout(10000);
                var tableDef1 = yield ldb.getStructure('this_name');
                var tableDef2 = yield ldb.getStructure('other_name');
                var tableDefs = yield ldb.getAllStructures();
                compare([tableDef1, tableDef2], tableDefs);
            });
        });
    });
    describe("data", function () {
        var tableDef = {
            name: 'phisical_quantities',
            fields: [
                { name: 'quantity', typeName: 'text' },
                { name: 'preferedUnit', typeName: 'text' }
            ],
            primaryKey: ['quantity']
        };
        var mass = { quantity: 'mass', preferedUnit: 'g' };
        var quantities = [
            mass,
            { quantity: 'time', preferedUnit: 's' },
            { quantity: 'volume', preferedUnit: 'l' },
        ];
        before(function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield ldb.registerStructure(tableDef);
            });
        });
        it("put a value", function () {
            return __awaiter(this, void 0, void 0, function* () {
                var obtainedMass = yield ldb.putOne("phisical_quantities", mass);
                compare(mass, obtainedMass);
            });
        });
        it("put many", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield ldb.putMany("phisical_quantities", quantities.slice(1));
            });
        });
        it("check empty structure", function () {
            return __awaiter(this, void 0, void 0, function* () {
                var count = yield ldb.isEmpty("phisical_quantities");
                compare(false, count);
            });
        });
        it("get one", function () {
            return __awaiter(this, void 0, void 0, function* () {
                var volume = yield ldb.getOne("phisical_quantities", ["volume"]);
                compare(volume, quantities[2]);
            });
        });
        it("get one if exists and exists", function () {
            return __awaiter(this, void 0, void 0, function* () {
                var time = yield ldb.getOneIfExists("phisical_quantities", ["time"]);
                compare(time, quantities[1]);
            });
        });
        it("get one if exists and do not exists", function () {
            return __awaiter(this, void 0, void 0, function* () {
                var undef = yield ldb.getOneIfExists("phisical_quantities", ["fourth dimension"]);
                compare(undef, undefined);
            });
        });
        it("get all", function () {
            return __awaiter(this, void 0, void 0, function* () {
                var all = yield ldb.getAll("phisical_quantities");
                compare(all, quantities);
            });
        });
        it("clear all", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield ldb.clear("phisical_quantities");
                var all = yield ldb.getAll("phisical_quantities");
                compare(all, []);
            });
        });
    });
    describe("childs", function () {
        var tableDef = {
            fields: [
                { name: 'quantity', typeName: 'text' },
                { name: 'unit', typeName: 'text' }
            ],
            name: 'units',
            primaryKey: ['quantity', 'unit']
        };
        var volumeUnits = [
            { quantity: 'volume', unit: 'ml' },
            { quantity: 'volume', unit: 'l' },
            { quantity: 'volume', unit: 'cm3' },
            { quantity: 'volume', unit: 'm3' },
        ];
        var volumeUnitsSorted = [
            { quantity: 'volume', unit: 'cm3' },
            { quantity: 'volume', unit: 'l' },
            { quantity: 'volume', unit: 'm3' },
            { quantity: 'volume', unit: 'ml' },
        ];
        var massUnits = [
            { quantity: 'mass', unit: 'g' },
            { quantity: 'mass', unit: 'kg' },
            { quantity: 'mass', unit: 'mg' },
        ];
        var timeUnits = [
            { quantity: 'time', unit: 's' },
            { quantity: 'time', unit: 'h' },
        ];
        var units = volumeUnits.concat(massUnits).concat(timeUnits);
        before("", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield ldb.registerStructure(tableDef);
                yield ldb.putMany("units", units);
            });
        });
        it("get cm3", function () {
            return __awaiter(this, void 0, void 0, function* () {
                var obtainedVolumes = yield ldb.getOne("units", ["volume", "cm3"]);
                compare(obtainedVolumes, volumeUnits[2]);
            });
        });
        it("get volume childs", function () {
            return __awaiter(this, void 0, void 0, function* () {
                var obtainedVolumes = yield ldb.getChild("units", ["volume"]);
                compare(obtainedVolumes, volumeUnitsSorted);
            });
        });
        it("get mass childs", function () {
            return __awaiter(this, void 0, void 0, function* () {
                var obtainedMass = yield ldb.getChild("units", ["mass"]);
                compare(obtainedMass, massUnits);
            });
        });
    });
    describe("foreignKeys", function () {
        this.timeout(10000);
        var unitsTableDef = {
            name: 'units',
            fields: [
                { name: 'quantity', typeName: 'text' },
                { name: 'unit', typeName: 'text' },
                { name: 'description', typeName: 'text' }
            ],
            primaryKey: ['quantity', 'unit']
        };
        var productsTableDef = {
            name: 'products',
            fields: [
                { name: 'product', typeName: 'text' },
                { name: 'name', typeName: 'text' },
                { name: 'price', typeName: 'decimal' },
                { name: 'quantity_number', typeName: 'integer' },
                { name: 'quantity', typeName: 'text' },
                { name: 'unit', typeName: 'text' },
                { name: 'units__description', typeName: 'text' }
            ],
            primaryKey: ['product'],
            foreignKeys: [{ references: 'units', fields: [{ source: 'quantity', target: 'quantity' }, { source: 'unit', target: 'unit' }], displayFields: ['description'], alias: 'units' }]
        };
        var volumeUnits = [
            { quantity: 'volume', unit: 'ml', description: 'millilitre' },
            { quantity: 'volume', unit: 'l', description: 'litre' },
            { quantity: 'volume', unit: 'cm3', description: 'cubic centimetre' },
            { quantity: 'volume', unit: 'm3', description: 'cubic metre' },
        ];
        var massUnits = [
            { quantity: 'mass', unit: 'g', description: 'gram' },
            { quantity: 'mass', unit: 'kg', description: 'kilogram' },
            { quantity: 'mass', unit: 'mg', description: 'milligram' },
        ];
        var timeUnits = [
            { quantity: 'time', unit: 's', description: 'second' },
            { quantity: 'time', unit: 'm', description: 'minute' },
            { quantity: 'time', unit: 'h', description: 'hour' },
        ];
        var products = [
            { product: 'P11111', name: 'Gaseosa', price: 35.50, quantity_number: 750, quantity: 'volume', unit: 'cm3', units__description: 'cubic centimetre' },
            { product: 'P22222', name: 'Naranjas', price: 25, quantity_number: 1, quantity: 'mass', unit: 'kg', units__description: 'kilogram' },
            { product: 'P33333', name: 'Pelicula', price: 150, quantity_number: 1.5, quantity: 'time', unit: 'h', units__description: 'hour' },
        ];
        var units = volumeUnits.concat(massUnits).concat(timeUnits);
        before("", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield ldb.registerStructure(unitsTableDef);
                yield ldb.registerStructure(productsTableDef);
                yield ldb.putMany("units", units);
                yield ldb.putMany("products", products);
            });
        });
        it("get product and change unit", function () {
            return __awaiter(this, void 0, void 0, function* () {
                var myProduct = yield ldb.getOne("products", ["P11111"]);
                myProduct.unit = 'ml';
                var myChangedProduct = yield ldb.putOne("products", myProduct);
                compare(myChangedProduct, (0, best_globals_1.changing)(products[0], { unit: 'ml', units__description: 'millilitre' }));
            });
        });
    });
});
//# sourceMappingURL=karma-test-localdb.js.map