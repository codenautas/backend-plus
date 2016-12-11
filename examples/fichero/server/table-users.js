"use strict";

module.exports = function(context){
    var admin = context.user.rol==='admin';
    console.log('xxxxxxx users');
    console.log(context.user);
    return context.be.tableDefAdapt({
        name:'users',
        title:'usuarios',
        editable:admin,
        fields:[
            {name:'username'        , typeName:'text'   , nullable:false},
            {name:'md5pass'         , typeName:'text'   , allow:{select:context.forDump} },
            {name:'active_until'    , typeName:'date'                   },
            {name:'locked_since'    , typeName:'date'                   },
            {name:'rol'             , typeName:'text'                   },
            {name:'clave_nueva'     , typeName:'text', clientSide:'newPass', allow:{select:admin, update:false, insert:false} },
        ],
        primaryKey:['username'],
        sql:{
            where:admin?'true':"username = "+context.be.db.quoteText(context.user.username)
        }
    });
}