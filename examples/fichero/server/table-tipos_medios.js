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
        name:'tipos_medios',
        title:'tipos de medios',
        editable:context.user.rol==='admin',
        fields:[
            {name:'tipo_medio'  ,typeName:'text'    , allow:A},
        ],
        primaryKey:['tipo_medio'],
        detailTables:[
            {table: 'medios', fields:['tipo_medio'], abr:'M', label:'medios'}
        ], 
    });
}


