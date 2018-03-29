"use strict";

module.exports = function(context){
    var admin=context.user.rol==='boss';
    return context.be.tableDefAdapt({
        name:'ptable',
        title:'periodic table',
        editable:true,
        editableFieldDef:true,
        fields:[
            {name:'atomic_number', title:'A#', typeName:'integer', editable:admin, nullable:true, sequence:{name:'atomic_num_seq'}},
            {name:'symbol'              , typeName:'text'   , nullable:false, 'max-length':4 ,isName:true},
            {name:'name'                , typeName:'text'   , allow:{insert:admin}           ,isName:true},
            {name:'weight'              , typeName:'decimal', nullable:true, exact:true, decimals: true, aggregate:'avg'    },
            {name:'group'               , typeName:'text'   , editable:admin                 },
            {name:'discovered_date'     , typeName:'date'                                    },
            {name:'discovered_precision', typeName:'text'   , options:['year','day'],        },
            {name:'bigbang'             , typeName:'boolean', allowUpdates:admin             },
            {name:'column'              , typeName:'integer', editable:true                  },
            {name:'period'              , typeName:'integer'                                 },
            {name:'block'               , typeName:'text'                                    },
            {name:'state at STP'        , typeName:'text'                                    },
            {name:'ocurrence'           , typeName:'text'                                    },
            {name:'isotopes'            , typeName:'ARRAY:text', inTable: false , editable:false              },
            {name:'cant_images'         , typeName:'integer'   , inTable: false, editable:false              },
        ],
        primaryKey:['atomic_number'],
        detailTables:[
            {table: 'isotopes'      , fields:[{source:'atomic_number', target:'atomic_number'}], abr:'iso', label:'isotopes'},
            {table: 'element_images', fields:[{source:'atomic_number', target:'atomic_number'}], abr:'img', label:'images'}
        ],
        foreignKeys:[
            {references: 'pgroups' , fields:['group'], abr:'g'},
        ],
        constraints:[
            {constraintType:'unique', fields:['symbol']}
        ],
        sortColumns:[{column:'group'},{column:'atomic_number', order:-1}, ],
        actionNamesList:['showImg'],
        allow:{showImg:true},
        sql:{
            isTable:true,
            from:`(
                select * from ptable p,
                  lateral (select array_agg(mass_number::text order by "order") as isotopes from isotopes i where i.atomic_number = p.atomic_number) i,
                  lateral (select count(url)::integer as cant_images from element_images e where e.atomic_number = p.atomic_number) e
            )`
        }
    }, context);
}