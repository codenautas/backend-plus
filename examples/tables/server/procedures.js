"use strict";

var procedures ={};

procedures.defCompleter = function defCompleter(procedureDef){
    procedureDef.method=procedureDef.method||'post';
    console.log('///////////// visto',procedureDef);
    return procedureDef;
}

module.exports = procedures;