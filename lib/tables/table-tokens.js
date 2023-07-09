"use strict";

module.exports = function(context){
    var admin=context.be.isAdmin(context);
    return context.be.tableDefAdapt({
        name:'tokens',
        elementName:'token',
        schema:'his',
        editable:admin,
        fields:[
            {name:'token'      , typeName:'text'      , nullable:false },
            {name:'date'       , typeName:'timestamp' , nullable:false },
            {name:'username'   , typeName:'text'      , nullable:false },
            {name:'useragent'  , typeName:'jsonb'     , nullable:false },
            {name:'tokentype'  , typeName:'text'                       },
            {name:'due'        , typeName:'timestamp'                  },
            {name:'info'       , typeName:'jsonb'                      },
        ],
        primaryKey:['token'],
        foreignKeys:[
            //{references:'usuarios', fields:['usuario']},
        ],
        sql:{
            isTable: true,
            from: `(select * from tokens order by date desc)`
        },
    }, context);
}