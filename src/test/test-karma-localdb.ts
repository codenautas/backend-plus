"use strict";

/// <reference path="../node_modules/types.d.ts/modules/myOwn/in-myOwn.d.ts" />
/// <reference path="../../lib/in-backend-plus.d.ts" />
/// <reference path="../../src/for-client/my-localdb.ts" />
/// <reference path="../../src/for-client/my-localdb.ts" />

import {LocalDb, TableDefinition} from "../for-client/my-localdb";
import "mocha";

function compare<T>(obtained:T, expected:T):boolean{
    expect(obtained).to.eql(expected);
    return true;
}

describe("local-db", function(){
    var ldb:LocalDb;
    before(function(){
        ldb = new LocalDb("the-test-name");
    });
    after(function(){
        ldb.close();
    });
    describe("structures", function(){
        it("put and get structure", async function(){
            var tableDef={
                name:'this_name',
                fields:[
                    {name: 'pk1', typeName:'text'}
                ],
                primaryKey:['pk1']
            };
            await ldb.registerStructure(tableDef);
            var newTableDef = await ldb.getStructure(tableDef.name);
            compare(tableDef, newTableDef);
        });
        it("reput and get structure", async function(){
            var tableDef={
                name:'this_name',
                fields:[
                    {name: 'pk1', typeName:'text'},
                    {name: 'field1', typeName:'text'}
                ],
                primaryKey:['pk1']
            };
            await ldb.registerStructure(tableDef);
            var newTableDef = await ldb.getStructure(tableDef.name);
            compare(tableDef, newTableDef);
        });
    });
    describe("data", function(){
        type Quantity = {
            quantity:string,
            preferedUnit:string
        }
        var tableDef:TableDefinition={
            name:'phisical_quantities',
            primaryKey:['quantity']
        }
        var mass:Quantity = {quantity: 'mass', preferedUnit:'g'};
        var quantities:Quantity[]=[
            mass,
            {quantity:'volume', preferedUnit:'l'},
            {quantity:'time', preferedUnit:'s'},
        ];
        before(async function(){
            await ldb.registerStructure(tableDef);
        });
        it("put a value", async function(){
            var obtainedMass = await ldb.putOne("phisical_quantities", mass);
            compare(mass, obtainedMass);
        })
        it("put many", async function(){
            await ldb.putMany("phisical_quantities", quantities.slice(1));
        })
        it("get one", async function(){
            var volume = await ldb.getOne<Quantity>("phisical_quantities", ["volume"]);
            compare(volume, quantities[1]);
        })
        it("get one if exists and exists", async function(){
            var time = await ldb.getOneIfExists<Quantity>("phisical_quantities", ["time"]);
            compare(time, quantities[2]);
        })
        it("get one if exists and do not exists", async function(){
            var undef = await ldb.getOneIfExists<Quantity>("phisical_quantities", ["fourth dimension"]);
            compare(undef, undefined);
        })
        it.skip("get all",async function(){
            var all = await ldb.getAll<Quantity>("phisical_quantities");
            compare(all, quantities);
        })
    });
    describe("childs",function(){
        type Units = {
            quantity:string,
            unit:string
        }
        var tableDef:TableDefinition={
            name:'units',
            primaryKey:['quantity', 'unit']
        }
        var volumeUnits=[
            {quantity:'volume', unit:'ml'},
            {quantity:'volume', unit:'l'},
            {quantity:'volume', unit:'cm3'},
            {quantity:'volume', unit:'m3'},
        ]
        var massUnits=[
            {quantity:'mass', unit:'g'},
            {quantity:'mass', unit:'kg'},
            {quantity:'mass', unit:'mg'},
        ]
        var timeUnits=[
            {quantity:'time', unit:'s'},
            {quantity:'time', unit:'h'},
        ]
        var units=volumeUnits.concat(massUnits).concat(timeUnits);
        before("",async function(){
            await ldb.registerStructure(tableDef);
            await ldb.putMany("units", units);
        })
        it("get volume childs", async function(){
            var obtainedVolumes=await ldb.getChild<Units>("units", ["volume"]);
            compare(obtainedVolumes, volumeUnits);
        })
        it("get mass childs", async function(){
            var obtainedMass=await ldb.getChild("units", ["mass"]);
            compare(obtainedMass, massUnits);
        })
    })
});