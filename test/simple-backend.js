"use strict";

var Path = require('path');
var backendPlus = require("../lib/backend-plus");
var MiniTools = require('mini-tools');
var changing = require('best-globals').changing;

class AppExample extends backendPlus.AppBackend{
    constructor(opts){
        super();
        this.rootPath=Path.resolve(__dirname,'..');
        this.tableStructures = {};
        this.tableStructures.simple = require('./table-simple.js');
        this.tableStructures.employees = require('./table-employees.js');
        this.optsForConfigList=opts;
    }
    configList(){
        return super.configList().concat([
            __dirname+'/simple-config.yaml',
            __dirname+'/local-config.yaml',
            this.optsForConfigList
        ]);
    }
    addLoggedServices(){
        var be = this;
        super.addLoggedServices();
        this.app.get('/echo', function(req,res){
            res.end('echo');
        });
    }
    getProcedures(){
        var be = this;
        return super.getProcedures().then(function(procedures){
            return procedures.concat(localProcedures.map(be.procedureDefCompleter, be));
        });
    };
};

var localProcedures=[
    {
        action:'double-update-employees',
        parameters:[
            {name: 'value', encoding:'plain'}
        ],
        coreFunction:function(context, parameters){
            return context.client.query("UPDATE employees SET last_name='Perkins' WHERE id=123456").execute().then(function(result){
                if(result.rowCount!==1){
                    throw new Error("fail to update id=123456");
                }
                return context.client.query("UPDATE employees SET id='Perkins' WHERE id=123456").execute();
            }).then(function(rta){
                console.log('xxxxx',rta);
            }).catch(function(rta){
                console.log('xxxxx catch',rta);
                throw rta;
            });
        }
    },
];

module.exports = function(opts){
    var app = new AppExample(changing(opts,{server:{"silent-startup":true}}));
    return app.start({readConfig:{whenNotExist:'ignore'}, testing:true}).then(function(){
        return app;
    });
};