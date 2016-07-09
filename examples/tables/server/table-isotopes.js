"use strict";

module.exports = function(context){
    return context.be.tableDefCompleter({
        name:'isotopes',
        title:'stable isotopes',
        allowInserts:context.user.rol==='boss',
        allowDeletes:context.user.rol==='boss',
        allowUpdates:context.user.rol==='boss',
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
}