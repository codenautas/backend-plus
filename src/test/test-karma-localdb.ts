"use strict";

/// <reference path="../node_modules/types.d.ts/modules/myOwn/in-myOwn.d.ts" />
/// <reference path="../../lib/in-backend-plus.d.ts" />
/// <reference path="../../src/for-client/my-localdb.ts" />
/// <reference path="../../src/for-client/my-localdb.ts" />

import {LocalDb} from "../for-client/my-localdb";
import "mocha";

describe("local-db", function(){
    var ldb:LocalDb;
    before(function(){
        ldb = new LocalDb("the-test-name");
    });
    after(function(){
        ldb.close();
    });
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
        expect(tableDef).to.eql(newTableDef);
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
        expect(tableDef).to.eql(newTableDef);
    });
});