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
    var RO={select:true, udpate:false, delete:false, insert:false};
    return context.be.tableDefAdapt({
        name:'publicaciones-f',
        title:'publicaciones',
        editable:context.user.rol==='admin',
        fields:[
            {name:'autor'          ,typeName:'text'    ,label:'Autor de la obra'     , allow:RO},
            {name:'fichanro'       ,typeName:'integer' ,title:'ficha',label:'Nro de ficha'         , allow:W},
            {name:'titulo'         ,typeName:'text'    ,label:'Título'               , allow:RO},
            {name:'annio'          ,typeName:'integer' ,label:'Año de realización'   , allow:RO},
            {name:'dondepublicado' ,typeName:'text'    ,title:'lugar',label:'¿Dónde fue publicado?', allow:W},
            {name:'anniopublicado' ,typeName:'integer' ,title:'año'  ,label:'Año de publicación'   , allow:W},
        ],
        primaryKey:['fichanro', 'dondepublicado'],
        sql:{
            from:"(select p.*, autor, titulo, annio from publicaciones p inner join fichas f on f.fichanro = p.fichanro) x"
        }
    });
}


