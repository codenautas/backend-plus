"use strict";

module.exports = function(context){
    var admin = context.user.rol==='admin'
    return context.be.tableDefAdapt({
        name:'users',
        title:'usuarios',
        editable:admin,
        fields:[
            {name:'username'        , typeName:'text'   , nullable:false},
            {name:'md5pass'         , typeName:'text'   , allow:{select:false} },
            {name:'active_until'    , typeName:'date'                   },
            {name:'locked_since'    , typeName:'date'                   },
            {name:'rol'             , typeName:'text'                   },
        ],
        primaryKey:['username'],
        sql:{
            where:admin?'true':"username = "+context.be.db.quoteText(context.user.username)
        }
    });
}