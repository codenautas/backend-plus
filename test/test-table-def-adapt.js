"use strict";

var expect = require('expect.js');

var tableDefAdapt = require('../lib/table-def-adapt.js').bind({
    db:{quoteObject:function(name){ return '"'+name+'"';}}
});

describe("table-def-adapt", function(){
    it("set all defaults", function(){
        var result = tableDefAdapt({
            action: 'all/defaults',
            name: 'the-table-name',
            fields:[{name: 'id'}]
        });
        var fieldId = {
          "allow": {
            "delete": false,
            "filter": true ,
            "import": false,
            "insert": false,
            "select": true ,
            "update": false
          },
          "name": "id",
          "defaultForOtherFields": false,
          "label": "id",
          "title": "id",
          "visible": true,
          "sequence": {
            "firstValue": 1,
            "name": null,
            "prefix": null
          }
        };
        var expected = {
            JSONFieldForOtherFields: false,
            "action": "all/defaults",
            "actionNamesList": [],
            "alias": "the-table-name",
            "allow": {
              "delete": false,
              "export": true ,
              "import": false ,
              "filter": true ,
              "insert": false,
              "orientation": false,
              "select": true ,
              "update": false,
              "vertical-edit": true
            },
            "constraints": [],
            "detailTables": [],
            "field": {
              "id": fieldId
            },
            "fields": [ fieldId ],
            "filterColumns": [],
            "foreignKeys":[],
            "layout":{
                "vertical": false
            },
            "name": "the-table-name",
            "nameFields": [],
            "softForeignKeys": [],
            "sql": {
              "fields": {},
              "from": '"the-table-name"',
              "fromWoAs": '"the-table-name"',
              "isTable": true,
              "postCreateSqls": "",
              "select": [
                '"the-table-name"."id"'
              ],
              tableName: "the-table-name"
            },
            "title": "the-table-name",
            "tableName": "the-table-name",
            "registerImports": {
              "fieldNames": {
                "fieldIndex": "field_index",
                "fieldName": "field",
                "lastUpload": null,
                "originalFileName": null,
                "serverPath": null,
                "tableName": "table_name",
              },
              "inTable": null
            }
        }
        expect(result).to.eql(expected);
    });
    it("preserves field editable in allow", function(){
        var result = tableDefAdapt({
            action: 'a/b',
            allow:{update:true, mDispo:true},
            fields:[{name: 'id', editable:false}]
        });
        expect(result.allow.select).to.eql(true);
        expect(result.field.id.allow).to.eql({
            select:true,
            update:false,
            "import": false,
            insert:false,
            delete:false,
            filter:true
        });
    });
    it("inherit allow of tableDef", function(){
        var result = tableDefAdapt({
            action: 'a/b',
            allow:{update:true, mDispo:true},
            fields:[{name: 'id'}]
        });
        expect(result.field.id.allow).to.eql({
            select:true,
            update:true,
            "import": false,
            insert:false,
            delete:false,
            filter:true
        });
    });
    it("exclude non select fields from field", function(){
        var result = tableDefAdapt({
            action: 'a/b',
            fields:[{name: 'invisible', allow:{select:false}}]
        });
        expect(result.field.invisible).to.not.be.ok();
    });
    it("detects multiple JSONFieldForOtherFields=true", function(){
        expect(function(){
            tableDefAdapt({
                fields:[
                    {name: 'one', defaultForOtherFields:true},
                    {name: 'two', defaultForOtherFields:true}
                ],
            });
        }).to.throwError('xxxAny');
    });
});
