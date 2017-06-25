"use strict";

var ProceduresExamples = {};

ProceduresExamples = [
    {
        action:'getpictureurl',
        parameters:[
            {name:'atomic_number'},
        ],
        coreFunction:function(context, parameters){
            return context.client.query(
                "SELECT url FROM element_images WHERE atomic_number=$1 ORDER BY kind",
                [parameters.atomic_number]
            ).fetchAll().then(function(result){
                return result.rows;
            });
        }
    },
    {
        action:'count/without-isotopes',
        parameters:[
            {name:'first_atomic_number', defaultValue:10, typeName:'integer', references:'ptable'},
            {name:'last_atomic_number' , defaultValue:99, typeName:'integer', references:'ptable'},
            {name:'group'         , defaultValue:'Actinide', typeName:'text', references:'pgroups'},
        ],
        coreFunction:function(context, parameters){
            return context.client.query(
                `SELECT count(*) as number_of_elements 
                   FROM ptable p left join isotopes i on p.atomic_number=i.atomic_number 
                   WHERE i.atomic_number IS NULL
                     AND p.atomic_number between coalesce($1,0) and coalesce($2,999)`,
                [parameters.first_atomic_number, parameters.last_atomic_number]
            ).fetchUniqueRow().then(function(result){
                return result.row.number_of_elements;
            });
        }
    },
];

module.exports = ProceduresExamples;