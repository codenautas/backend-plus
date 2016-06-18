"use strict";

var tableDefCompleter = require('./table-def-completer.js');

module.exports = tableDefCompleter({
    name:'pgroups',
    title:'groups of elements of periodic table',
    fields:[
        {name:'group'              , typeName:'text'   , nullable:false},
        {name:'class'              , typeName:'text'                   },
    ],
    primaryKey:['group'],
});
