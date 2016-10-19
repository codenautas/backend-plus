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
            {name:'fichanro'       ,typeName:'integer' ,label:'Nro de ficha'         , allow:W},
            {name:'titulo'         ,typeName:'text'    ,label:'Titulo'               , allow:W},
            {name:'annio'          ,typeName:'date'    ,label:'Año de realización'   , allow:W},
            {name:'medida1'        ,typeName:'number'  ,label:'Alto en cm'           , allow:W},
            {name:'medida2'        ,typeName:'number'  ,label:'Ancho en cm'          , allow:W},
            {name:'medida3'        ,typeName:'number'  ,label:'Profundida en cm'     , allow:W},
            {name:'tecnica'        ,typeName:'text'    ,label:'Técnica'              , allow:W},
            {name:'ubicación'      ,typeName:'text'    ,label:'Ubicación'            , allow:U},
            {name:'propietario'    ,typeName:'text'    ,label:'Propietario'          , allow:U},
            {name:'publicado'      ,typeName:'bool'    ,label:'¿Se ha publicado?'    , allow:W},
            {name:'enmarcado'      ,typeName:'text'    ,label:'¿Está enmarcado?'     , allow:U},
            {name:'imagenadelante' ,typeName:'text'    ,label:'Imagen principal'     , allow:W},
            {name:'imagenatras'    ,typeName:'text'    ,label:'Imagen secundaria'    , allow:U},
            {name:'observaciones'  ,typeName:'text'    ,label:'Observaciones'        , allow:W},
            {name:'costo'          ,typeName:'number'  ,label:'Costo estimado'       , allow:A},
            {name:'notas'          ,typeName:'number'  ,label:'Notas internas'       , allow:A},
        ],
        primaryKey:['fichanro'],
        detailTables:[
            {table: 'publicaciones', fields:[{source:'fichanro', target:'fichanro'}], abr:'P', label:'publicaciones'}
        ]
    });
}


