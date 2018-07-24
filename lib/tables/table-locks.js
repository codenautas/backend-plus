"use strict";

module.exports = function(context){
    return context.be.tableDefAdapt({
        name:'locks',
        allow:{
            insert:false,
            delete:false,
            update:false,
        },
        editable:false,
        fields:[
            {name:'id'                , typeName:'integer'    , nullable:false,  sequence:{name: 'secuencia_tokens', firstValue: 1}},
            {name:'table_name'        , typeName:'text'       , nullable:false  },
            {name:'record_pk'         , typeName:'jsonb'      , nullable:false  },
            {name:'token'             , typeName:'text'       , nullable:false  },
            {name:'lock_datetime'     , typeName:'timestamp'  , nullable:false  },
            {name:'unlock_datetime'   , typeName:'timestamp'                    },
        ],
        primaryKey:['id'],
    }, context);
}