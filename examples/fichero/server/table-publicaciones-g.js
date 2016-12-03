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
        name:'publicaciones-g',
        title:'publicaciones',
        editable:context.user.rol==='admin',
        fields:[
            {name:'publicacion' ,typeName:'text'    , allow:RO},
            {name:'cantidad'    ,typeName:'integer' , allow:RO},
            {name:'annio'       ,typeName:'text'    , title:'año', allow:RO},
        ],
        primaryKey:['publicacion'],
        detailTables:[
            {table: 'publicaciones-f', fields:[{source:'publicacion', target:'dondepublicado'}], abr:'F', label:'fichas'}
        ],
        sql:{
            from:`(select dondepublicado as publicacion, count(*)::integer as cantidad, 
                    case when count(distinct anniopublicado)=1 then min(anniopublicado)::text
                      when count(distinct anniopublicado)=2 then min(anniopublicado) ||', '|| max(anniopublicado)
                      else min(anniopublicado) ||'...'|| max(anniopublicado)
                    end as annio
                from publicaciones group by publicacion) p`
        }
    });
}


