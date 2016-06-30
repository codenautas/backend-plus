"use strict";

var tableDefCompleter = require('./table-def-completer.js');

module.exports = tableDefCompleter({
    name:'isotopes',
    title:'stable isotopes',
    fields:[
        {name:'atomic_number'       , typeName:'integer', nullable:false,                },
        {name:'mass_number'         , typeName:'integer'                                 },
        {name:'order'               , typeName:'integer'                                 },
        {name:'stable'              , typeName:'boolean'                                 },
    ],
    primaryKey:['atomic_number','mass_number'],
    constraints:[
        {constraintType:'unique', fields:['atomic_number','order']}
    ]
});
