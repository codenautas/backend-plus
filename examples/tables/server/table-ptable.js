"use strict";

var basicInterfaces = new (require('basic-interfaces'));

var defTables = new CollectionPlus({plural: 'tables', singular:'table'});

defTables.ptable = {
    title:'periodic table',
    fields:{
        atomic_number        :basicInterfaces.integer,
        symbol               :basicInterfaces.string.maxLength(4),
        name                 :basicInterfaces.string,
        weight               :basicInterfaces.nullable.numeric,
        "group"              :basicInterfaces.nullable.string,
        discovered_date      :basicInterfaces.nullable.date,
        discobered_precision :basicInterfaces.nullable.string.enum(['year','day']),
        bigbang              :basicInterfaces.nullable.boolean
    },
    primaryKey:['atomic_number'],
    constraints:[
        {constraintType:'unique', fields:['symbol']}
    ]
};

function completeDefTables(tableNameList){
    
}

completeDefTables(['ptable']);

return tablePtable;

});
