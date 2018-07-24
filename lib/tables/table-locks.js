"use strict";

module.exports = function(context){
    return context.be.tableDefAdapt({
        name:'locks',
        allow:{
            insert:true,
            delete:false,
            update:true,
        },
        editable:false,
        fields:[
            {name:'table_name'        , typeName:'text'       , nullable:false  },
            {name:'record_pk'         , typeName:'jsonb'      , nullable:false  },
            {name:'token'             , typeName:'text'       , nullable:false  },
            {name:'lock_datetime'     , typeName:'timestamp'  , nullable:false  },
            {name:'unlock_datetime'   , typeName:'timestamp'                    },
        ],
        primaryKey:['table_name', 'record_pk'],
        foreignKeys:[
            {references:'tokens', fields:['token']},
        ],
    }, context);
}