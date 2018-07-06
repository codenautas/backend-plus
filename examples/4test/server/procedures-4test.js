"use strict";
var json4all = require('json4all');
var ProceduresExamples = {};

ProceduresExamples = [
    {
        action:'get_notices',
        parameters:[
            {name:'cantidad', typeName:'integer'},
            {name:'valor'   , typeName:'text'},
        ],
        coreFunction:function(context, parameters){
            return context.client.query(
                "SELECT get_notices($1::integer, $2::text)",
                [parameters.cantidad, parameters.valor]
            ).onNotice(context.informProgress).fetchUniqueValue().then(function(result){
                return result.value;
            });
        }
    },
];

module.exports = ProceduresExamples;