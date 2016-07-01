"use strict";

var tableDefCompleter = require('../lib/table-def-completer.js');

module.exports = tableDefCompleter({
    name:'employees',
    title:'employees of this company',
    fields:[
        {name:'id_type'            , typeName:'text'   , nullable:false},
        {name:'id'                 , typeName:'integer', nullable:false},
        {name:'first_name'         , typeName:'integer', nullable:false},
        {name:'last_name'          , typeName:'integer', nullable:false},
        {name:'birth_date'         , typeName:'date'                   },
        {name:'salary'             , typeName:'numeric'                },
    ],
    primaryKey:['id_type','id'],
});
