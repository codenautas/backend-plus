"use strict";

var tableDefCompleter = require('./table-def-completer.js');

module.exports = tableDefCompleter({
    name:'ptable',
    title:'periodic table',
    fields:[
        {name:'atomic_number'       , typeName:'integer', nullable:false,                },
        {name:'symbol'              , typeName:'text'   , nullable:false, 'max-length':4 },
        {name:'name'                , typeName:'text'                                    },
        {name:'weight'              , typeName:'number'                                  },
        {name:'group'               , typeName:'text'                                    },
        {name:'discovered_date'     , typeName:'date'                                    },
        {name:'discovered_precision', typeName:'enum'   , options:['year','day'],        },
        {name:'bigbang'             , typeName:'boolean'                                 },
    ],
    primaryKey:['atomic_number'],
    constraints:[
        {constraintType:'unique', fields:['symbol']}
    ]
});
