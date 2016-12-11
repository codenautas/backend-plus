"use strict";

module.exports = function(context){
    var allow = function(roles){
        return {
            select:!!roles[context.user.rol],
            insert:!!roles[context.user.rol],
            update:!!roles[context.user.rol],
            delete:!!roles[context.user.rol],
        };
    }
    var A=allow({admin: true});
    var U=allow({admin: true, user:true});
    var W={select:true, udpate:false, delete:false, insert:false};
    return context.be.tableDefAdapt({
        name:'apariciones',
        editable:context.user.rol==='admin',
        fields:[
            {name:'medionro'       ,typeName:'integer' ,title:'medio'        ,label:'Nro de medio'         , allow:W},
            {name:'fichanro'       ,typeName:'integer' ,title:'ficha'        ,label:'Nro de ficha'         , allow:W},
            {name:'observaciones'  ,typeName:'text'    ,title:'observaciones'                              , allow:W},
        ],
        primaryKey:['medionro', 'fichanro'],
    });
}


