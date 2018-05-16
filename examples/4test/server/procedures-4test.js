"use strict";
var json4all = require('json4all');
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
    {
        action:'example/date',
        parameters:[
            {name:'date', typeName:'date'},
        ],
        resultClass:'result-pre',
        coreFunction:function(context, parameters){
            var answer=[]
            answer.push(parameters.date);
            answer.push(parameters.date.isRealDate);
            answer.push(json4all.stringify(parameters.date));
            answer.push(json4all.parse(json4all.stringify(parameters.date)));
            answer.push(json4all.parse(json4all.stringify(parameters.date)).isRealDate);
            console.log(answer);
            return answer;
        }
    },
    {
        action:'bitacora/prueba',
        parameters:[
            {name:'first_atomic_number', defaultValue:10, typeName:'integer', references:'ptable'},
            {name:'last_atomic_number' , defaultValue:99, typeName:'integer', references:'ptable'},
            {name:'group'         , defaultValue:'Actinide', typeName:'text', references:'pgroups'},
        ],
        bitacora:{error:true, always:true},
        coreFunction:function(context, parameters){
            return context.client.query(
                `SELECT count(*) as number_of_elements 
                   FROM ptable p left join isotopes i on p.atomic_number=i.atomic_number 
                   WHERE i.atomic_number IS NULL
                     AND p.atomic_number between coalesce($1,0) and coalesce($2,999)`,
                [parameters.first_atomic_number, parameters.last_atomic_number]
            ).fetchUniqueRow().then(function(result){
                return result.row.number_of_elements + " - Se registró ejecución en bitácora.";
            });
        }
    },
    {
        action:'bitacora/prueba-error',
        parameters:[
            {name:'first_atomic_number', defaultValue:10, typeName:'integer', references:'ptable'},
            {name:'last_atomic_number' , defaultValue:99, typeName:'integer', references:'ptable'},
            {name:'group'         , defaultValue:'Actinide', typeName:'text', references:'pgroups'},
        ],
        bitacora:{error:true, always:true},
        coreFunction:function(context, parameters){
            throw Error("Error al ejecutar el procedimiento. Se registró ejecución en la bitácora.");
        }
    },
];

module.exports = ProceduresExamples;