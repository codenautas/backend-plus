"use strict";

module.exports = function(context){
    var allow = function(roles){
        return {
            select:!!roles[context.user.rol],
            insert:context.user.rol==='admin',
            update:context.user.rol==='admin',
            delete:context.user.rol==='admin',
        };
    }
    var A=allow({admin: true});
    var U=allow({admin: true, user:true});
    var W={select:true, insert:true, update:true, delete:true};
    return context.be.tableDefAdapt({
        name:'fichas',
        title:'fichas',
        editable:true,
        editableFieldDef:true,
        fields:[
            {name:'autor'          ,typeName:'text'    ,label:'Autor de la obra'     , allow:W},
            {name:'fichanro'       ,typeName:'integer' ,label:'Número de ficha'      , allow:W},
            {name:'titulo'         ,typeName:'text'    ,label:'Título'               , allow:W},
            {name:'annio'          ,typeName:'integer' ,label:'Año de realización'   , allow:W},
            {name:'medida1'        ,typeName:'integer' ,label:'Alto en cm'           , allow:W},
            {name:'medida2'        ,typeName:'integer' ,label:'Ancho en cm'          , allow:W},
            {name:'medida3'        ,typeName:'integer' ,label:'Profundida en cm'     , allow:W},
            {name:'tecnica'        ,typeName:'text'    ,label:'Técnica'              , allow:W},
            {name:'ubicacion'      ,typeName:'text'    ,label:'Ubicación'            , allow:U},
            {name:'propietario'    ,typeName:'text'    ,label:'Propietario'          , allow:U},
            {name:'publicado'      ,typeName:'boolean' ,label:'¿Se ha publicado?'    , allow:W},
            {name:'enmarcado'      ,typeName:'text'    ,label:'¿Está enmarcado?'     , allow:U},
            {name:'imagenadelante' ,typeName:'text'    ,label:'Imagen principal'     , allow:W},
            {name:'imagenatras'    ,typeName:'text'    ,label:'Imagen secundaria'    , allow:U},
            {name:'miniatura'      ,typeName:'text'    ,label:'Imagen en miniatura'  , allow:U},
            {name:'observaciones'  ,typeName:'text'    ,label:'Observaciones'        , allow:W},
            {name:'costo'          ,typeName:'integer' ,label:'Costo estimado'       , allow:A},
            {name:'notas'          ,typeName:'text'    ,label:'Notas internas'       , allow:A},
        ],
        primaryKey:['fichanro'],
        foreignKeys:[
            {references:'autores', fields:['autor']}
        ],
        detailTables:[
            {table: 'apariciones', fields:['fichanro', 'fichanro'], abr:'A', label:'apariciones'}
        ]
    });
}


