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
        var expected = {
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
            "detailTables": [],
            "field": {
              "id": {
                "allow": {
                  "delete": false,
                  "filter": true ,
                  "import": false,
                  "insert": false,
                  "select": true ,
                  "update": false
                },
                "name": "id",
                "label": "id",
                "title": "id"
              }
            },
            "fields": [
              {
                "allow": {
                  "delete": false,
                  "filter": true ,
                  "import": false,
                  "insert": false,
                  "select": true ,
                  "update": false,
                },
                "name": "id",
                "label": "id",
                "title": "id"
              }
            ],
            "filterColumns": [],
            "foreignKeys":[],
            "layout":{
                "vertical": false
            },
            "name": "the-table-name",
            "nameFields": [],
            "sql": {
              "fields": {},
              "from": '"the-table-name"',
              "fromWoAs": '"the-table-name"',
              "isTable": true,
              "postCreateSqls": "",
              "select": [
                '"id"'
              ]
            },
            "title": "the-table-name",
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
});
