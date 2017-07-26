"use strict";

module.exports = function(context){
    var admin = context.user.rol==='boss';
    return context.be.tableDefAdapt({
        name:'pgroups',
        title:'groups of elements of periodic table',
        editable:admin,
        fields:[
            {name:'group'              , typeName:'text'   , nullable:false          },
            {name:'class'              , typeName:'text'                             },
            {name:'color'              , typeName:'text'   , allow:{select:admin || context.forDump}    , isName:true},
            {name:'color_'             , typeName:'text'   , clientSide:'colorSample', allow:{update:false}},
        ],
        primaryKey:['group'],
        detailTables:[
            {table: 'ptable', fields:[{source:'group', target:'group'}], abr:'E', label:'elements in ptable'}
        ]
    });
}
