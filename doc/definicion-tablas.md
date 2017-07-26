<!--multilang v0 es:definicion-tablas.md en:table-definitions.md -->

<!--lang:es-->

# Definición de tablas

<!--lang:en--]

# Tables definition

[!--lang:*-->

<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](table-definitions.md)


<!--lang:es-->

Se definen tablas, vistas (que correspondan a una VIEW de la base de datos) 
o vistas (que son simplemente una query que conoce la aplicación pero que no generó una VIEW).

En el futuro habrá tablas que no sean originadas en la base de datos, por ejemplo una lista de campos tendría que poder verse en una tabla. 

<!--lang:en--]

Are defined tables, database views (which correspond to a database VIEW), or query views (which are simply a query that knows the application but didn't generate a VIEW).
In the future there will be available to create tables which not have data originated by the database, for example a list of fields would have to be able to be seen in a table.

[!--lang:*-->

## tableDef

<!--lang:es-->

propiedad   | tipo | predeterminado | uso
------------|------|----------------|----------------------------------------------------------------------------------------------
name        | T    |                | nombre que va a tener la tabla en el sistema
title       | T    | `name`         | título en la grilla
editable    | L    | `false`        | los permisos
allow       | OP   | `editable`     | objeto de permisos individuales
primaryKey  | [T]  | `[]`           | lista de nombres de campos que son PK
foreignKeys | [O]  | `[]`           | lista las definiciones de las FK
constraints | [O]  | `[]`           | lista de constraints (salvo las Pk, FK que van en otra lista)
sql         | O    | *deducido*     | sintaxis SQL para casos especiales
  isTable   | L    | `true`         | si es una tabla y por lo tanto hay que hacer el dump para el create table y si se le deben deducir los campos name de sus FK
  tableName | T    | `name`         | nombre de la tabla física (generalmente es el mismo name de definición de la tabla en el sistema)
layout      | O    | {}             | opciones de despliegue
  vertical  | L    | `false`        | si el despliegue predeterminado es vertical
forInsertOnlyMode | L | `false`     | si es una tabla de solo inserción
filterColumns | [O]| `[]`           | lista de objetos de la forma {column, operator, value} para que sea el filtro predeterminado de la grilla

ejemplos lista  | formato elemento
----------------|--------------------------------------
 foreignKeys    | {references:'ptable', fields:['atomic_number']}
 constraints    | {constraintType:'unique', fields:['atomic_number','order']}
 filterColumns  | {column:'atomic_number', operator:'=', value:7}

permisos | tabla | campo | indica si se permite...
---------|-------|-------|-------
insert   | x     | x     | agregar registros a la grilla
update   | x     | x     | cambiar valores en la grilla
delete   | x     |       | borrar registros
select   | x     | x     | ver datos
filter   | x     |       | filtrar la grilla
import   | x     |       | importar datos desde archivos externos
export   | x     |       | exportar datos a un archivo
orientation | x  |       | cambiar la orientación de la grilla de vertical/horizontal

sql            | uso
---------------|----------------
postCreateSqls | texto con una o varias sentencias SQL que deben ejecutarse después de la creación. Sirve para agregar constraints que el motor no soporta. 

<!--lang:en--]

property    | type | default value  | use
------------|------|----------------|----------------------------------------------------------------------------------------------
name        | T    |                | table name in database. this name is the table id inside the system
title       | T    | `name`         | grid title
editable    | L    | `false`        | permissions
allow       | PO   | `editable`     | individual permissions object
primaryKey  | [T]  | `[]`           | PK name field list
foreignKeys | [O]  | `[]`           | FK definition list
constraints | [O]  | `[]`           | constraints list (except PK and FK)
sql         | O    | *deduced*      | SQL syntax for special cases
  isTable   | L    | `true`         | (see Spanish)
layout      | O    | {}             | (see Spanish)
  vertical  | L    | `false`        | (see Spanish)
forInsertOnlyMode | L | `false`     | (see Spanish)
filterColumns | [O] | `[]`          | (see Spanish)

list examples   | element format
----------------|--------------------------------------
 foreignKeys    | {references:'ptable', fields:['atomic_number']}
 constraints    | {constraintType:'unique', fields:['atomic_number','order']}
 filterColumns  | {column:'atomic_number', operator:'=', value:7}

permissions | table | field | allows:
------------|-------|-------|-------
insert      | x     | x     | (see Spanish)
update      | x     | x     | (see Spanish)
delete      | x     |       | (see Spanish)
select      | x     | x     | (see Spanish)
filter      | x     |       | (see Spanish)
import      | x     |       | (see Spanish)
export      | x     |       | (see Spanish)
orientation | x     |       | (see Spanish)

sql            | usage
---------------|----------------
postCreateSqls | (see Spanish)


[!--lang:*-->

## fieldDef

<!--lang:es-->

propiedad | tipo | predeterminado | uso
----------|------|----------------|-------------------
name      | T    |                | nombre en la base de datos y id de campo
typeName  | T    |                | tipo
title     | T    | `name`         | título para la grilla cuando no se quiere el name
inTable   | L    | true           | si pertenece físicamente a la tabla y por lo tanto entra en el dump.

<!--lang:en--]

property | type | default value | use
---------|------|---------------|-------------------
name     | T    |               | name in database and field id
typeName | T    |               | data type
title    | T    | `name`        | title in the grid if you don't want to use name property default value

[!--lang:es-->
Ejemplo integrador:

<!--lang:en--]
Integrating example:

[!--lang:*-->

## Context

<!--lang:es-->

La definición de la tabla depende del parámetro `context` que  tiene la siguiente definición

propiedad | uso
----------|-------------------
db        | la base de datos. En principo es solo para usar quoteObject y quoteText
forDump   | indica si se pide la definición para hacer un dump de la base
user      | objeto con la información del usuario una vez que está logueado. 


<!--lang:en--]

[!--lang:*-->

```js
module.exports = function(context){
    return context.be.tableDefAdapt({
        name:'isotopes',
        title:'stable isotopes',
        allow:{
            insert:context.user.rol==='boss',
            delete:context.user.rol==='boss',
            update:context.user.rol==='boss',
        },
        fields:[
            {name:'atomic_number', title:'A#', typeName:'integer', width:100, nullable:false,          },
            {name:'mass_number'         , typeName:'integer', width:100,                               },
            {name:'order'               , typeName:'integer', width:100,                               },
            {name:'stable'              , typeName:'boolean', width:100,                               },
        ],
        primaryKey:['atomic_number','mass_number'],
        constraints:[
            {constraintType:'unique', fields:['atomic_number','order']}
        ],
        foreignKeys:[
            {references:'ptable', fields:['atomic_number']}
        ]
    },context);
}
```
