"use strict";

module.exports = function(context){
    var admin = context.user.rol==='admin';
    return context.be.tableDefAdapt({
        name:'simple',
        editable:admin,
        fields:[
            {name:'simple_code'          , typeName:'text', sequence:{name:'simpe_seq', firstValue:3}},
            {name:'simple_name'          , typeName:'text', isName: true          },
        ],
        primaryKey:['simple_code']
    },context);
}
