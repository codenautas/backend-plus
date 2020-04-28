"use strict";

module.exports = function(context){
    var $1_is_num=`$1 ~ '^\\s*(\\d+(\\.\\d*)?|\\.\\d+)\\s*$'`
    return context.be.tableDefAdapt({
        name:'summary',
        editable:context.forDump,
        fields:[
            {name:'table_name'            , typeName:'text'       , visible:false},
            {name:'name'                  , typeName:'text'       },
            {name:'data_type'             , typeName:'text'       },
            {name:'ordinal_position'      , typeName:'bigint'     , visible:false },
            // {name:'typeName'              , typeName:'text'       },
            // {name:'nullable'              , typeName:'boolean'    },
            // {name:'label'                 , typeName:'text'       },
            // {name:'title'                 , typeName:'text'       },
            // {name:'description'           , typeName:'text'       },
            {name:'not_nulls'             , typeName:'bigint'     ,summary:{expr:`count($1)`}},
            {name:'nulls'                 , typeName:'bigint'     ,summary:{expr:`sum(case when $1 is null then 1 else 0 end)`}},
            {name:'distincts'             , typeName:'bigint'     ,summary:{expr:`count(distinct $1)`}},
            {name:'uniques'               , typeName:'bigint'     ,summary:{sql:`select count(*) from (select from $2 group by $1 having count(*)=1) x`}},
            {name:'not_uniques'           , typeName:'bigint'     ,summary:{sql:`select count(*) from (select from $2 group by $1 having count(*)>1) x`}},
            {name:'min'                   , typeName:'text'       ,summary:{expr:`min($1)`, excludeTypes:['boolean']}},
            {name:'mean'                  , typeName:'text'       ,summary:{sql:`select $1 from $2 order by $1 offset $not_nulls/2 limit 1`}},
            {name:'max'                   , typeName:'text'       ,summary:{expr:`max($1)`, excludeTypes:['boolean']}},
            {name:'avg'                   , typeName:'decimal'    ,summary:{expr:`avg($1)`, types4:['bigint','integer','decimal']}},
            {name:'modes'                 , typeName:'text'       ,summary:{sql:`select string_agg(value||'→'||rep, ',  ' order by rep desc, value) from (select $1 as value, count(*) as rep from $2 where $1 is not null group by $1 order by count(*) desc,$1 limit 10) x`}},
            {name:'num_avg'               , typeName:'decimal'    ,summary:{expr:`avg(case when ${$1_is_num} then $1::text::decimal else null end)`, types4:['text']}},
            {name:'numbers'               , typeName:'bigint'     ,summary:{expr:`sum(case when ${$1_is_num} then 1 else null end)`, types4:['text']}},
            {name:'longests'              , typeName:'text'       ,summary:{sql:`select string_agg($1, ', ') from (select distinct $1, length($1) from $2 order by length($1) desc, $1 limit 3) x`, types4:['text','decimal']}},
            {name:'shortests'             , typeName:'text'       ,summary:{sql:`select string_agg($1, ', ') from (select distinct $1, length($1) from $2 order by length($1), $1 limit 10) x`, types4:['text','decimal']}},
        ],
        primaryKey:['table_name', 'name'],
        // hiddenColunns:['typeName', 'nullable', 'label', 'title', 'description'],
        sortColumns:[{column:'ordinal_position', order:1}]
    }, context);
}
