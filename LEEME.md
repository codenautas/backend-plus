<!--multilang v0 es:LEEME.md en:README.md -->


<!--lang:es-->
<!--lang:en--]
[!--lang:*-->
# backend-plus

<!--lang:es-->
Backend for typed-controls

<!--lang:en--]
Backend for typed-controls

[!--lang:*-->

<!-- cucardas -->
![extending](https://img.shields.io/badge/stability-extending-orange.svg)
[![npm-version](https://img.shields.io/npm/v/backend-plus.svg)](https://npmjs.org/package/backend-plus)
[![downloads](https://img.shields.io/npm/dm/backend-plus.svg)](https://npmjs.org/package/backend-plus)
[![build](https://img.shields.io/travis/codenautas/backend-plus/master.svg)](https://travis-ci.org/codenautas/backend-plus)
[![coverage](https://img.shields.io/coveralls/codenautas/backend-plus/master.svg)](https://coveralls.io/r/codenautas/backend-plus)
[![climate](https://img.shields.io/codeclimate/github/codenautas/backend-plus.svg)](https://codeclimate.com/github/codenautas/backend-plus)
[![dependencies](https://img.shields.io/david/codenautas/backend-plus.svg)](https://david-dm.org/codenautas/backend-plus)
[![qa-control](http://codenautas.com/github/codenautas/backend-plus.svg)](http://codenautas.com/github/codenautas/backend-plus)

<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](README.md)

<!--lang:es-->

Es un framework para desarrollar aplicaciones web basadas en base de datos PostgreSQL. Sus características destacadas son:

   1. Está basado en metadatos centralizados que definen:
      1. La estructura de datos (estructura de tablas y vistas)
      2. La estructura de procesos (definición de parámetros, permisos, encoding)
      3. La estructura de menúes
   2. Provee:
      1. grillas editables (ordenables y filtrables), para editar en formato XLSX
      2. mecanismo de login
      3. menúes
      4. posibilidad de definir skins
      
<!--lang:en--]


It's a framework for developing web applications based on PostgreSQL database. It's main features are:

   1. It is based on centralized metadata that defines:
      1. The data structure (tables and views structure)
      2. The procedures structure (param definition, permissions, encoding)
      3. The menus structure
   2. It provides:
      1. Editable grids (orderable and filterable), with support for edit data using XLSX format files
      2. Login mechanism
      3. Menus
      4. Skins definition

[!--lang:*-->

## API

<!--lang:es-->

### Definición de tablas

Se definen tablas, vistas (que correspondan a una VIEW de la base de datos) 
o vistas (que son simplemente una query que conoce la aplicación pero que no generó una VIEW).

En el futuro habrá tablas que no sean originadas en la base de datos, por ejemplo una lista de campos tendría que poder verse en una tabla. 

#### tableDef:

propiedad   | tipo | predeterminado | uso
------------|------|----------------|----------------------------------------------------------------------------------------------
name        | T    |                | nombre que va a tener la tabla en el sistema
title       | T    | `name`         | título en la grilla
editable    | L    | `false`        | los permisos
allow       | OP   | `editable`     | objeto de permisos individuales
primaryKey  | A    | `[]`           | lista de nombres de campos que son PK
foreignKeys | A    | `[]`           | lista las definiciones de las FK
constraints | A    | `[]`           | lista de constraints (salvo las Pk, FK que van en otra lista)
sql         | O    | *deducido*     | sintaxis SQL para casos especiales
  isTable   | L    | `true`         | si es una tabla y por lo tanto hay que hacer el dump para el create table y si se le deben deducir los campos name de sus FK
  tableName | T    | `name`         | nombre de la tabla física (generalmente es el mismo name de definición de la tabla en el sistema)
layout      | O    | {}             | opciones de despliegue
  vertical  | L    | `false`        | si el despliegue predeterminado es vertical
forInsertOnlyMode | L | `false`     | si es una tabla de solo inserción

ejemplos lista  | formato elemento
----------------|--------------------------------------
 foreignKeys    | {references:'ptable', fields:['atomic_number']}
 constraints    | {constraintType:'unique', fields:['atomic_number','order']}

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

#### fieldDef:

propiedad | tipo | predeterminado | uso
----------|------|----------------|-------------------
name      | T    |                | nombre en la base de datos y id de campo
typeName  | T    |                | tipo
title     | T    | `name`         | título para la grilla cuando no se quiere el name

<!--lang:en--]

### Tables definition

Are defined tables, database views (which correspond to a database VIEW), or query views (which are simply a query that knows the application but didn't generate a VIEW).
In the future there will be available to create tables which not have data originated by the database, for example a list of fields would have to be able to be seen in a table.

#### tableDef:

property    | type | default value  | use
------------|------|----------------|----------------------------------------------------------------------------------------------
name        | T    |                | table name in database. this name is the table id inside the system
title       | T    | `name`         | grid title
editable    | L    | `false`        | permissions
allow       | PO   | `editable`     | individual permissions object
primaryKey  | A    | `[]`           | PK name field list
foreignKeys | A    | `[]`           | FK definition list
constraints | A    | `[]`           | constraints list (except PK and FK)
sql         | O    | *deduced*      | SQL syntax for special cases
  isTable   | L    | `true`         | (see Spanish)

list examples   | element format
----------------|--------------------------------------
 foreignKeys    | {references:'ptable', fields:['atomic_number']}
 constraints    | {constraintType:'unique', fields:['atomic_number','order']}

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

#### fieldDef:

property | type | default value | use
---------|------|---------------|-------------------
name     | T    |               | name in database and field id
typeName | T    |               | data type
title    | T    | `name`        | title in the grid if you don't want to use name property default value


<!--lang:es-->
Ejemplo integrador:

<!--lang:en--]
Integrating example:

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
            {name:'atomic_number', title:'A#', typeName:'integer', width:100, nullable:false,               },
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
<!--lang:es-->
### Definición de menúes

menuType | uso
---------|----------
menu     | menú o submenú
table    | una grilla o tabla
proc     | procedimientos
    
propiedad   | tipo | predeterminado | menuType | uso
------------|------|----------------|----------|---------
menuType    | T    |                |          | tipo de menu
name        | T    |                |          | nombre de la opción (id)
menuContent | A    |                | menu     | contenido del menú
table       | T    | `name`         | table    | nombre de la tabla 
label       | T    | `name`         |          | lo que se ve en el menú

<!--lang:en--]
### Menus definition

menuType | use
---------|----------
menu     | menu or submenu
table    | grid or table
proc     | procedures
    
property    | type | default value  | menuType | use
------------|------|----------------|----------|---------
menuType    | T    |                |          | menu Type
name        | T    |                |          | option name (id)
menuContent | A    |                | menu     | menu content
table       | T    | `name`         | table    | table name
label       | T    | `name`         |          | if you don't want to use default value to display in menu

<!--lang:es-->
Ejemplo integrador:

<!--lang:en--]
Integrating example:

[!--lang:*-->
```js
    getMenu(context){
        return {menu:[
            {menuType:'menu', name:'periodic table', menuContent:[
                {menuType:'table', name:'ptable'  , label:'elements'},
                {menuType:'table', name:'pgroups' , label:'groups'  },
                {menuType:'table', name:'isotopes', label:'isotopes'},
                {menuType:'proc' , name:'count/without-isotopes', label:'count'}
            ]},
            {menuType:'table', name:'images', table:'element_images'},
            {menuType:'menu', name:'test', menuContent:[
                {menuType:'table', name:'bigint'},
            ]},
            {menuType:'menu', name:'config', menuContent:[
                {name:'users', menuType:'table'},
            ]},
        ]}
    }

```
<!--lang:es-->
### Definición de procedimientos

#### procDef:

propiedad   | tipo | predeterminado | uso
------------|------|----------------|-----------------------------------------------------
action      | T    |                | Nombre con que va a ser invocado el procedimiento
parameters  | AOP  | `[]`           | Array de Objetos parámetro
coreFunction| F    |                | Función que implementa el procedimiento

#### paramDef:

propiedad     | tipo           | predeterminado | uso
--------------|----------------|----------------|-------------------
name          | T              |                | nombre del parámetro que se le envía al procedimiento
defaultValue  | según typeName |                | valor por defecto del parámetro
typeName      | T              |                | tipo de dato
label         | T              | name           | etiqueta del parámetro

<!--lang:en--]
### Procedures definition

#### procDef:

property    | type | default value  | use
------------|------|----------------|-----------------------------------------------------
action      | T    |                | Name that will be invoked the procedure
parameters  | POA  | `[]`           | Param Objects Array
coreFunction| F    |                | Function that implements the procedure

#### paramDef:

property      | type           | default value  | use
--------------|----------------|----------------|-------------------
name          | T              |                | name of the parameter that is sent to the procedure
defaultValue  | según typeName |                | parameter default value
typeName      | T              |                | to define the data type
label         | T              | name           | if you don't want to use default value to display on screen

[!--lang:es-->
Ejemplo de definición de proceso:

<!--lang:en--]
Process definition example:

[!--lang:*-->
```js
    {
        action:'count/without-isotopes',
        parameters:[
            {name:'first_atomic_number', defaultValue:10, typeName:'integer'},
            {name:'last_atomic_number' , defaultValue:99, typeName:'integer'},
        ],
        coreFunction:function(context, parameters){
            return context.client.query(
                `SELECT count(*) as number_of_elements 
                   FROM ptable p left join isotopes i on p.atomic_number=i.atomic_number 
                   WHERE i.atomic_number IS NULL
                     AND p.atomic_number between coalesce($1,0) and coalesce($2,999)`,
                [parameters.first_atomic_number, parameters.last_atomic_number]
            ).fetchUniqueRow().then(function(result){
                return result.row.number_of_elements;
            });
        }
    },
```

<!--lang:*-->
## def-config.yaml

<!--lang:es-->
entrada                      | uso
-----------------------------|---------------
install                      | opciones de instalación
  dump                       | opciones del dump de instalación
    db.user                  | usuario dueño de la base de datos
    scripts.post-adapt       | lista de nombres de archivos para adaptar la estructura de la base de datos
devel                        | conjunto de opciones para el ambiente de desarrollo y testing
  delay                      | tiempo de espera promedio adicional (para simular un servidor lento)
  cache-content              | hace caché de imágenes y archivos en general (si no está en modo "devel" siempre hace caché, no se puede apagar el caché fuera del modo devel)
  forceShowAsEditable        | fuerza mostrar las grillas como grillas editables para mostrar cómo el servidor impide la modificación
login                        | opciones de login
  plus                       | opciones a pasar al módulo login-plus
    allowHttpLogin           | si permite loguerse desde conexiones HTTP
    store                    | opciones de store de sesion
      module-name            | nombre del módulo (ej: file)
log                          | log por consola
  req                        | muestra cada requerimiento
  session                    | muestra info de las sesiones

<!--lang:en--]
entry                        | usage
-----------------------------|---------------
install                      | (see Spanish)
  dump                       | (see Spanish)
    db.user                  | (see Spanish)
    scripts.post-adapt       | (see Spanish)
devel                        | (see Spanish)
  delay                      | (see Spanish)
  cache-content              | (see Spanish)
  forceShowAsEditable        | (see Spanish)
login                        | (see Spanish) 
  plus                       | (see Spanish) 
    allowHttpLogin           | (see Spanish) 
    store                    | (see Spanish) 
      module-name            | (see Spanish) 
log                          | (see Spanish) 
  req                        | (see Spanish) 
  session                    | (see Spanish) 

[!--lang:*-->
```yaml
install:
  dump:
    db:
      owner: user_owner
    scripts:
      post-adapt: [special_triggers.sql, other_contraints.sql]      
login:
  plus:
    allowHttpLogin: true
    store:
      module-name: file
log:
  req: true
  session: true
devel:
  cache-content: true
```

<!--lang:es-->
## Instalación

<!--lang:en--]
## Install

[!--lang:*-->
```sh
$ npm install backend-plus
```

## License

[MIT](LICENSE)

----------------


