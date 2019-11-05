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

propiedad         | tipo | predeterminado        | uso
------------------|------|-----------------------|----------------------------------------------------------------------------------------------
name              | T    |                       | nombre que va a tener la tabla en el sistema
title             | T    | `name`                | título en la grilla
editable          | L    | `false`               | los permisos
allow             | OP   | `editable`            | objeto de permisos individuales
primaryKey        | [T]  | `[]`                  | lista de nombres de campos que son PK
foreignKeys       | [O]  | `[]`                  | lista las definiciones de las FK
softForeignKeys   | [O]  | `[]`                  | lista las definiciones de las SFK. Especifica FKs (uno a uno) que no se define en la BBDD
constraints       | [O]  | `[]`                  | lista de constraints (salvo las Pk, FK que van en otra lista)
sql               | O    | *deducido*            | sintaxis SQL para casos especiales
tableName         | T    | `name`                | nombre de la tabla física (generalmente es el mismo name de definición de la tabla en el sistema)
layout            | O    | {}                    | opciones de despliegue
vertical          | L    | `false`               | si el despliegue predeterminado es vertical
forInsertOnlyMode | L    | `false`               | si es una tabla de solo inserción
filterColumns     | [O]  | `[]`                  | lista de objetos de la forma {column, operator, value} para que sea el filtro predeterminado de la grilla
registerImports   | [O]  | (registerImportsDef)  | lista de objetos. Configura opciones para guardar la definicion de los "otros" campos al importar un archivo (*para que funcione **debe existir un campo seteado como "defaultForOtherFields"** (ver fieldDef)*)
sortColumns       | [O]  | `[]`                  | ordenamiento predeterminado
detailTables      | [O]  | `[]`                  | lista de tablas que permitirán desplegar subgrillas (estilo maestro/detalle)
functionDef       | O    | `null`                | definición de SQL paramétrico o funcional 
lookupFields      | [T]  | `[f.isName]`          | lista de los nombres de campo que se muestran al desplegar la lista deplegable para elegir

ejemplos lista       | formato elemento
---------------------|--------------------------------------
 foreignKeys         | {references:'ptable', fields:['atomic_number']}
 softForeignKeys     | {references:'ptable', fields:['atomic_number']}
 constraints         | {constraintType:'unique', fields:['atomic_number','order'], consName:'repeating order in atomic_number'}
 filterColumns       | {column:'atomic_number', operator:'=', value:7}
 sortColumns         | {column:'discovery_date', order:-1}
 detailTables        | {table:'ptable', fields:['atomic_number'], abr:'A', refreshParent:true}

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
constraintsDeferred|true equivale a ejecutar SET CONSTRAINTS ALL DEFERRED al comienzo de la transacción al hacer upload
isTable        |true si es una tabla y por lo tanto hay que hacer el dump para el create table y si se le deben deducir los campos name de sus FK
<!--lang:en--]

property          | type | default value         | use
------------------|------|-----------------------|----------------------------------------------------------------------------------------------
name              | T    |                       | table name in database. this name is the table id inside the system
title             | T    | `name`                | grid title
editable          | L    | `false`               | permissions
allow             | PO   | `editable`            | individual permissions object
primaryKey        | [T]  | `[]`                  | PK name field list
foreignKeys       | [O]  | `[]`                  | FK definition list
softForeignKeys   | [O]  | `[]`                  | SFK definition list. It's used to specify FKs (one to one) not defined in database.
constraints       | [O]  | `[]`                  | constraints list (except PK and FK)
sql               | O    | *deduced*             | SQL syntax for special cases
isTable           | L    | `true`                | (see Spanish)
layout            | O    | {}                    | (see Spanish)
vertical          | L    | `false`               | (see Spanish)
forInsertOnlyMode | L    | `false`               | (see Spanish)
filterColumns     | [O]  | `[]`                  | (see Spanish)
registerImports   | [O]  | (registerImportsDef)  | Object list. It is uset to configure how "others" fields are stored when any person imports a file (*it works* **__only if you set to true one field with "defaultForOtherFields"__** *(see fieldDef)*)
sortColumns       | [O]  | `[]`                  | default order
detailTables      | [O]  | `[]`                  | master/detail subgrids based in other tables
functionDef       | O    | `null`                | functional SQL or parametric definition
lookupFields      | [T]  | `[f.isName]`          | lookup fieldnames

list examples    | element format
-----------------|--------------------------------------
 foreignKeys     | {references:'ptable', fields:['atomic_number']}
 softForeignKeys | {references:'ptable', fields:['atomic_number']}
 constraints     | {constraintType:'unique', fields:['atomic_number','order'], consName:'repeating order in atomic_number'}
 filterColumns   | {column:'atomic_number', operator:'=', value:7}
 sortColumns     | {column:'discovery_date', order:-1}
detailTables     | {table:'ptable', fields:['atomic_number'], abr:'A', refreshParent:true}

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
constraintsDeferred|true means: "SET CONSTRAINTS ALL DEFERRED" when uploading


[!--lang:*-->

## fieldDef

<!--lang:es-->

propiedad             | tipo | predeterminado | uso
----------------------|------|----------------|-------------------
name                  | T    |                | nombre en la base de datos y id de campo
visible               | B    | true           | muestra/oculta un campo de manera predeterminada
typeName              | T    |                | tipo
title                 | T    | `name`         | título para la grilla cuando no se quiere el name
inTable               | L    | true           | si pertenece físicamente a la tabla y por lo tanto entra en el dump.
sequence              | [O]  | (sequenceDef)  | determina si el campo tendria un valor auto-incremental
defaultValue          | T    |                | Valor predeterminado
defaultDbValue        | T    |                | Expresión del valor predeterminado a nivel de la base de datos, no se ve en las tablas
defaultForOtherFields | B    | false          | establece si el campo (que debe definirse como "text") se utiliza para guardar un JSON con los "otros" campos cuando se importa un archivo (*para que funcione **debe configurarse "registerImports"** (ver tableDef)*)

<!--lang:en--]

property              | type | default value | use
----------------------|------|---------------|-------------------
name                  | T    |               | name in database and field id
visible               | B    | true          | show/hide a field by default
typeName              | T    |               | data type
title                 | T    | `name`        | title in the grid if you don't want to use name property default value
inTable               | L    | true          | determine if field belongs physically to the table and the dump.
sequence              | [O]  | (sequenceDef) | determine if field will have auto-incremental value.
defaultValue          | T    |               | default value
defaultDbValue        | T    |               | db level default value expression
defaultForOtherFields | B    | false         | determines if field (must to be defined as "text") is used to save a JSON with other fields when any person imports a file (*it works* **__only if you configures "registerImports"__** *(see tableDef)*)

[!--lang:*-->

## foreignKey/softForeignKey

<!--lang:es-->

propiedad             | tipo | predeterminado | uso
----------------------|------|----------------|-------------------
references            | T    |                | nombre de la tabla
fields                | [O]  |                | lista de nombres de campos para el join (o `{source:name, target:name}` si los nombres son distintos)
alias                 | T    | `references`   | alias para el join, es necesario cuando hay dos `foreignKeys` que referencian a la misma tabla.
displayFields         | [T]  | [`references.isName`] | lista de nombres  de campos de la tabla referida que deben mostrarse en la grilla de esta tabla. En caso de que no se especifiquen se toman los campos marcados con `isName`
displayAllFields      | B    | false          | si se deben mostrar todos los campos de la tabla referida
onUpdate              | T    | 'cascade'      | que hacer si hay un update en la tabla relacionada
onDelete              | T    |                | que hacer si hay un borrado (valor posible: `'cascade'`).
consName              | T    |                | nombre de la constraint generada
initiallyDeferred     | B    | false          | si se calcula al final la constraint

<!--lang:en--]

property              | type | default value | use
----------------------|------|---------------|-------------------
references            | T    |                | referenced table
fields                | [O]  |                | fields of unique constraint
alias                 | T    | `references`   | alias of the table in the build sqls
displayFields         | [T]  | [`references.isName`] | with fields will display in grids
displayAllFields      | B    | false          | display all fields in grids
onUpdate              | T    | 'cascade'      | on update clause
onDelete              | T    |                | on delete clause
consName              | T    |                | constraint name
initiallyDeferred     | B    | false          | intitially deferred clause

[!--lang:*-->

## registerImportsDef

<!--lang:es-->

propiedad             | tipo | predeterminado  | uso
----------------------|------|-----------------|-------------------
inTable               | T    | null            | nombre de tabla para guardar definicion de "otros" campos. Debe definirse si se quiere guardar la informacion (la tabla debe existir, ver ejemplo integrador)
fieldNames            | [O]  | (fieldNamesDef) | Objeto con configuracion de campos de la tabla definida

<!--lang:en--]

property              | type | default value   | use
----------------------|------|-----------------|-------------------
inTable               | T    | null            | table name used to save "other" fields. It's necessary to define if you want to save information (the table must exist, see integrating example)
fieldNames            | [O]  | (fieldNamesDef) | Object with table fields configuration.

[!--lang:*-->

## sequenceDef

<!--lang:es-->

Un json que contiene información para generar una secuencia auto-incremental

property              | type | default value   | use
----------------------|------|-----------------|-------------------
name                  | T    | null            | (REQUIRED) nombre de la secuencia
firstValue            | Number | 1             | primer número de la secuencia
prefix                | T    | null            | prefijo de la secuencia 

<!--lang:en--]

A json containing the info for the generated sequence

property              | type | default value   | use
----------------------|------|-----------------|-------------------
name                  | T    | null            | (REQUIRED) sequence name
firstValue            | Number | 1             | sequence first number
prefix                | T    | null            | sequence prefix

[!--lang:*-->


## fieldNamesDef

<!--lang:es-->

Cada propiedad define que nombre de campo de tabla seteada en "registerImports.inTable" se va a utilizar para guardar la información referida a "otros" campos importados

propiedad           | tipo | predeterminado  | uso y restricciones
--------------------|------|-----------------|-------------------
tableName           | T    | 'table_name'    | tabla de origen del campo (no puede ser null y se debe definir como text y PK en "registerImports.inTable")
fieldName           | T    | 'field'         | nombre del campo (no puede ser null y se debe definir como text y PK en "registerImports.inTable")
fieldIndex          | T    | 'field_index'   | posición del campo en el archivo (no puede ser null y debe definirse como integer en "registerImports.inTable")
originalFileName    | T    | null            | nombre del archivo al que pertenece el campo(puede ser null y debe definirse como text en "registerImports.inTable")
serverPath          | T    | null            | path del archivo al que pertenece el campo(puede ser null y debe definirse como text en "registerImports.inTable")
lastUpload          | T    | null            | fecha de ultima subida del archivo al que pertenece el campo(puede ser null y debe definirse como timestamp en "registerImports.inTable")

Los campos que son null pueden no estar en la definicion de campos de la tabla definida en "registerImports.inTable", los demás son obligatorios y deben respetar las restricciones. Si no se setean los optativos (los que pueden ser null), la información no se registra por mas que existan en la tabla definida en "registerImporst.inTable".

<!--lang:en--]

Each property defines the field name of the table previously setted in "registerImports.inTable" that will be used to store information about "other" fields imported.

property            | type | default value   | use y restrictions
--------------------|------|-----------------|-------------------
tableName           | T    | 'table_name'    | Origin table of field (can't be null and must to be defined as text and PK in "registerImports.inTable")
fieldName           | T    | 'field'         | Fieldname (can't be null and must to be defined as text and PK in "registerImports.inTable")
fieldIndex          | T    | 'field_index'   | Field position in file (can't be null and must to be defined as integer in "registerImports.inTable")
originalFileName    | T    | null            | Filename to which belongs the field (can be null and must to be defined as text in "registerImports.inTable")
serverPath          | T    | null            | File path to whitch belongs the field (can be null and must to be defined as text in "registerImports.inTable")
lastUpload          | T    | null            | Timestamp of last import (can be null and must to be defined as timestamp in "registerImports.inTable")


Null fields can be undefined in "registerImports.inTable". Not Null fields are required and must respect restrictions. If you don't define optatives properties (Which can be null), information not will be registered although you defines them in "registerImporst.inTable".

[!--lang:*-->

## functionDef

<!--lang:es-->

Llamamos SQL paramétrico cuando la propiedad `from` está definidia tiene parámetros `$1`, `$2`, etc.
Y Llamamos que la tabla es funcional cuando el `tableName` es el nombre de una función que devuelve un `recordset`.

propiedad  | tipo               | uso
-----------|--------------------|-----
parameters | [{name, typeName}] | 


<!--lang:en--]

property   | type               | usage
-----------|--------------------|-----
parameters | [{name, typeName}] | 


[!--lang:*-->

## Context

<!--lang:es-->

La definición de la tabla depende del parámetro `context` que  tiene la siguiente definición

propiedad | uso
----------|-------------------
db        | la base de datos. En principo es solo para usar quoteIdent, y quoteNullable
forDump   | indica si se pide la definición para hacer un dump de la base
user      | objeto con la información del usuario una vez que está logueado. 


<!--lang:en--]


[!--lang:es-->
Ejemplo integrador, primero en javascript luego en typescript con `other tables`:

<!--lang:en--]
Integrating example:

[!--lang:*-->
```js
module.exports = function(context){
    return {
        name:'isotopes',
        title:'stable isotopes',
        allow:{
            insert:context.user.rol==='boss',
            delete:context.user.rol==='boss',
            update:context.user.rol==='boss',
        },
        registerImports:{
            inTable:'other_fields', 
            fieldNames:{
                originalFileName:'original_filename',
                serverPath:'server_filepath',
                lastUpload:'last_upload',
            }
        },
        fields:[
            {name:'atomic_number', title:'A#', typeName:'integer' , width:100, nullable:false,      orderForInsertOnly:'1' },
            {name:'mass_number'              , typeName:'integer' , width:100,                      orderForInsertOnly:'2' },
            {name:'order'                    , typeName:'integer' , width:100,                      orderForInsertOnly:'4' },
            {name:'stable'                   , typeName:'boolean' , width:100,                                             },
            {name:'others'                   , typeName:'text'    , width:700, defaultForOtherFields: true                },
        ],
        filterColumns:[
            {column:'atomic_number', operator:'>', value:context.be.internalData.filterAtomicNumberForIsotopes}
        ],
        primaryKey:['atomic_number','mass_number'],
        constraints:[
            {constraintType:'unique', fields:['atomic_number','order'], consName:'repeating order in atomic_number'}
        ],
        foreignKeys:[
            {references:'ptable', fields:['atomic_number']}
        ]
    };
}
```

```ts
"use strict";

import {TableDefinition, TableContext} from "backend-plus";

export function table_with_otherfields(context:TableContext):TableDefinition {
    var admin = context.user.rol==='boss';
    return {
        name:'table_with_otherfields',
        allow:{
            insert:true,
            update:true,
        },
        title:'information about other fields',
        editable:admin,
        fields:[
            {name:'table_name'          , typeName:'text'       , nullable:false  },
            {name:'field'               , typeName:'text'       , nullable:false  },
            {name:'field_index'         , typeName:'integer'    , nullable:false  },
            {name:'original_filename'   , typeName:'text'                         },
            {name:'server_filepath'     , typeName:'text'                         },
            {name:'last_upload'         , typeName:'timestamp'                    },
        ],
        primaryKey:['table_name', 'field'],
    };
}
```
