"use strict";

module.exports = function(context){
    var admin = context.user.rol==='boss';
    return context.be.tableDefAdapt({
        name:'users',
        title:'App users',
        editable:admin,
        fields:[
            {name:'username'              , typeName:'text'   , nullable:false},
            {name:'md5pass'               , typeName:'text'                   },
            {name:'active_until'          , typeName:'date'                   },
            {name:'locked_since'          , typeName:'date'                   },
            {name:'rol'                   , typeName:'text'                   },
        ],
        primaryKey:['username']
    });
}
