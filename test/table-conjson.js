"use strict";

module.exports = function(context){
    return context.be.tableDefAdapt({
        name:'conjson',
        editable:true,
        fields:[
            {name:'idn'                , typeName:'integer', nullable:false},
            {name:'idj'                , typeName:'jsonb'  , nullable:false},
            {name:'data'               , typeName:'text'   },
        ],
        primaryKey:['idn','idj'],
    });
};
