"use strict";

module.exports = function(context){
    var admin=context.user.rol==='boss';
    return context.be.tableDefAdapt({
        name:'cursors',
        title:'cursors on table rows',
        editable:admin,
        fields:[
            {name:'table_name'        , typeName:'text'      },
            {name:'pk_values'         , typeName:'text'      },
            {name:'username'          , typeName:'text'      },
            {name:'machineId'         , typeName:'text'      },
            {name:'navigator'         , typeName:'text'      },
            {name:'since'             , typeName:'timestamp' },
            {name:'loocked'           , typeName:'boolean'   },
        ]
    });
}
