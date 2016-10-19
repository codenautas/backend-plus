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
        name:'publicaciones',
        title:'publicaciones',
        editable:context.user.rol==='admin',
        fields:[
            {name:'fichanro'       ,typeName:'integer' ,label:'Nro de ficha'         , allow:W},
            {name:'dondepublicado' ,typeName:'text'    ,label:'¿Dónde fue publicado?', allow:W},
        ],
        primaryKey:['fichanro', 'dondepublicado'],
    });
}


