"use strict";

function procedureDefCompleter(group, name, procedureDef){
    procedureDef.method=procedureDef.method||'post';
    procedureDef.method=procedureDef.method||'post';
    procedureDef.action=procedureDef.action||'/'+group+'/'+name;
}

function proceduresDefCompleter(group, groupDef){
    for(var name in groupDef){
        procedureDefCompleter(group, name, groupDef[name]);
    }
    return groupDef;
}

module.exports = proceduresDefCompleter;