"use strict";

var proceduresDefCompleter = require('./procedures-def-completer.js');

module.exports = proceduresDefCompleter('table',{
    structure:{
        params:[
            {name: 'table'}
        ],
        encoding:'JSON',
        coreFunction:function(params){
            console.log('core',params,params.table,this.tableStructures[params.table]);
            return this.tableStructures[params.table];
        }
    }
});