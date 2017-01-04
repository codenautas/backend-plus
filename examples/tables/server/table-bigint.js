"use strict";

module.exports = function(context){
    var admin = context.user.rol==='boss';
    return context.be.tableDefAdapt({
        name:'bigint',
        title:'prueba de bigint type',
        editable:admin,
        fields:[
            {name:'id'              , typeName:'number'   , nullable:false},
            {name:'nombre'          , typeName:'text'                     },
            {name:'col_bigint'      , typeName:'bigint'                   },
        ],
        primaryKey:['id']
    });
}
