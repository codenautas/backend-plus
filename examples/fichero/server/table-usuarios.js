"use strict";

module.exports = function(context){
    return context.be.tableDefAdapt({
        name:'usuarios',
        title:'usuarios',
        editable:context.user.rol==='admin',
        fields:[
            {name:'username'        , typeName:'text'   , nullable:false},
            {name:'md5pass'         , typeName:'text'                   },
            {name:'active_until'    , typeName:'date'                   },
            {name:'locked_since'    , typeName:'date'                   },
            {name:'rol'             , typeName:'text'                   },
        ],
        primaryKey:['usuario'],
    });
}