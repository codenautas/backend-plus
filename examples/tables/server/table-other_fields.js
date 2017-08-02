"use strict";

module.exports = function(context){
    var admin = context.user.rol==='boss';
    return context.be.tableDefAdapt({
        name:'other_fields',
        allow:{
            insert:true,
            update:true,
        },
        title:'information about other fields',
        editable:admin,
        fields:[
            {name:'table_name'          , typeName:'text'       , nullable:false  },
            {name:'field'               , typeName:'text'       , nullable:false  },
            {name:'field_index'         , typeName:'integer'    , nullable:false  },
            {name:'original_filename'   , typeName:'text'                         },
            {name:'server_filepath'     , typeName:'text'                         },
            {name:'last_upload'         , typeName:'timestamp'                    },
        ],
        primaryKey:['table_name', 'field'],
    }, context);
}
