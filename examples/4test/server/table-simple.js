"use strict";

module.exports = function(context){
    var admin = context.user.rol==='admin';
    return context.be.tableDefAdapt({
        name:'simple',
        editable:admin,
        fields:[
            {name:'simple_code'          , typeName:'text'                 },
            {name:'simple_name'          , typeName:'text'                 },
        ],
        primaryKey:['simple_code']
    });
}
