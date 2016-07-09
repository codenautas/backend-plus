"use strict";

module.exports = function(context){
    return context.be.tableDefCompleter({
        name:'pgroups',
        title:'groups of elements of periodic table',
        editable:context.user.rol==='boss',
        fields:[
            {name:'group'              , typeName:'text'   , nullable:false},
            {name:'class'              , typeName:'text'                   },
        ],
        primaryKey:['group'],
    });
}
