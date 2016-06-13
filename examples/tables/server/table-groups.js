"use strict";

module.exports = {
    name:'pgroups',
    title:'groups of elements of periodic table',
    fields:[
        {name:'group'              , type:'text'   , nullable:false},
        {name:'class'              , type:'text'                   },
    ],
    primaryKey:['group'],
};
