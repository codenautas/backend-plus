"use strict";

module.exports = function(context){
    var admin=context.be.isAdmin(context);
    return context.be.tableDefAdapt({
        name:'tokens',
        elementName:'token',
        editable:admin,
        fields:[
            {name:'token'      , typeName:'text'      , nullable:false },
            {name:'date'       , typeName:'timestamp' , nullable:false },
            {name:'username'   , typeName:'text'      , nullable:false },
            {name:'useragent'  , typeName:'jsonb'     , nullable:false },
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