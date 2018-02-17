"use strict";

module.exports = function(context){
    var admin = context.user.rol==='admin';
    return context.be.tableDefAdapt({
        name:'with_fk',
        editable:admin,
        fields:[
            {name:'simple_code'          , typeName:'text',       },
            {name:'wf_code'              , typeName:'text',       },
            {name:'wf_name'              , typeName:'text'        },
        ],
        primaryKey:['simple_code','wf_code'],
        foreignKeys:[
            {references:'simple', fields:['simple_code'], allowNewRecords:true}
        ],
    },context);
}
