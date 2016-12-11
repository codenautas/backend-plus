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
        name:'autores',
        editable:true,
        editableFieldDef:true,
        fields:[
            {name:'autor'            ,typeName:'text'    ,label:'¿Cómo se lo conoce?'  , allow:A},
            {name:'apellido'         ,typeName:'text'                                  , allow:U},
            {name:'nombre'           ,typeName:'text'                                  , allow:U},
            {name:'lugar_nacimiento' ,typeName:'text'    ,label:'Lugar de nacimiento'  , allow:U},
            {name:'fecha_nacimiento' ,typeName:'date'    ,label:'Fecha de nacimiento'  , allow:U},
            {name:'fecha_fallecido'  ,typeName:'date'    ,label:'Fallecimiento'        , allow:U},
        ],
        primaryKey:['autor'],
        detailTables:[
            {table: 'fichas', fields:[{source:'autor', target:'autor'}], abr:'F', label:'fichas'}
        ]
    });
}


