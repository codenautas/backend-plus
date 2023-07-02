"use strict";

module.exports = function(context){
    const BITACORA_TABLENAME = context.be.config.server.bitacoraTableName;
    return context.be.tableDefAdapt({
        name:'bitacora',
        title:'Bitacora',
        tableName: BITACORA_TABLENAME,
        editable:context.forDump,
        fields:[
            {name:'id'                    , typeName:'bigint'     , nullable:false, sequence:{name: 'secuencia_bitacora', firstValue: 1}},
            {name:'procedure_name'        , typeName:'text'       , nullable:false                                                      },
            {name:'parameters_definition' , typeName:'text'       , nullable:false                                                      },
            {name:'parameters'            , typeName:'text'       , nullable:false                                                      },
            {name:'username'              , typeName:'text'       , nullable:false                                                      },
            {name:'machine_id'            , typeName:'text'       , nullable:false                                                      },
            {name:'navigator'             , typeName:'text'       , nullable:false                                                      },
            {name:'init_date'             , typeName:'timestamp'  , nullable:false                                                      },
            {name:'end_date'              , typeName:'timestamp'                                                                        },
            {name:'has_error'             , typeName:'boolean'                                                                          },
            {name:'end_status'            , typeName:'text'                                                                             },
        ],
        primaryKey:['id'],
        sortColumns:[{column:'id', order:-1}]
    }, context);
}
