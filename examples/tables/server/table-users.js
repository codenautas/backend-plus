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
            {name:'mail'                  , typeName:'text'                   },
            {name:'mail2'                 , typeName:'text'                   },
            {name:'clave_nueva'           , typeName:'text', clientSide:'newPass', allow:{select:admin, update:false, insert:false} },
        ],
        primaryKey:['username']
    });
}
