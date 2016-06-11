"use strict";

module.exports = {
    name:'ptable',
    title:'periodic table',
    fields:[
        {name:'atomic_number'       , type:'integer', nullable:false,                },
        {name:'symbol'              , type:'text'   , nullable:false, 'max-length':4 },
        {name:'name'                , type:'text'                                    },
        {name:'weight'              , type:'numeric'                                 },
        {name:'group'               , type:'text'                                    },
        {name:'discovered_date'     , type:'date'                                    },
        {name:'discovered_precision', type:'enum'   , options:['year','day'],        },
        {name:'bigbang'             , type:'boolean'                                 },
    ],
    primaryKey:['atomic_number'],
    constraints:[
        {constraintType:'unique', fields:['symbol']}
    ]
};
