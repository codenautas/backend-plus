"use strict";

module.exports = function(context){
    return context.be.tableDefAdapt({
        name:'isotopes',
        title:'stable isotopes',
        allow:{
            insert:context.user.rol==='boss',
            delete:context.user.rol==='boss',
            update:context.user.rol==='boss',
        },
        fields:[
            {name:'atomic_number', title:'A#', typeName:'integer', width:100, nullable:false, orderForInsertOnly:'1'      },
            {name:'mass_number'         , typeName:'integer', width:100,                      orderForInsertOnly:'2'      },
            {name:'order'               , typeName:'integer', width:100,                      orderForInsertOnly:'4'      },
            {name:'stable'              , typeName:'boolean', width:100,                                                  },
        ],
        primaryKey:['atomic_number','mass_number'],
        constraints:[
            {constraintType:'unique', fields:['atomic_number','order']}
        ],
        foreignKeys:[
            {references:'ptable', fields:['atomic_number']}
        ]
    },context);
}