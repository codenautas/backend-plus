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

### [Definición de tablas](doc/definicion-tablas.md)

<!--lang:en--]

### [table definitions](doc/table-definitions.md)

[!--lang:es-->
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

propiedad   | tipo | predeterminado                | uso
------------|------|-------------------------------|-----------------------------------------------------
action      | T    |                               | Nombre con que va a ser invocado el procedimiento
bitacora    | OB   | { error:false, always:false } | Objeto bitacora de procedimientos
parameters  | AOP  | `[]`                          | Array de Objetos parámetro
coreFunction| F    |                               | Función que implementa el procedimiento

#### bitacoraDef:

propiedad                         | tipo           | predeterminado             | uso
-------------------------         |----------------|----------------------------|-------------------
error                             | B              | false                      | Si es true, se guardan datos en la bitacora solo si hay error en la ejecucion del proceso
always                            | B              | false                      | Si es true, se guardan datos en la bitacora siempre (tiene prioridad sobre 'error')
targetTable                       | T              | null                       | Nombre de tabla para actualizar los datos de ejecucion (debe existir un registro a actualizar) (ver **targetTableBitacoraFields**). Si es null no se replica
targetTableBitacoraFields         | O              | { **init_date**: 'init_date', **end_date**: 'end_date', **has_error**: 'has_error', **end_status**: 'end_status'} | Objeto que define en que campos de **'targetTable'** se replican los campos de la bitacora (solo si se define una tabla en targetTable)
targetTableUpdateFieldsCondition  | A              | null                       | Arreglo de campos que definen la condicion de actualizacion (**el valor de cada uno debe pasarse como parametro con el mismo nombre**)

#### paramDef:

propiedad     | tipo           | predeterminado | uso
--------------|----------------|----------------|-------------------
name          | T              |                | nombre del parámetro que se le envía al procedimiento
defaultValue  | según typeName |                | valor por defecto del parámetro
typeName      | T              |                | tipo de dato
label         | T              | name           | etiqueta del parámetro

#### coreFunction(context, parameters)

context  | uso
---------|----------------------
be       | objeto de la aplicación que se está corriendo
username | nombre de usuario

<!--lang:en--]
### Procedures definition

#### procDef:

property    | type | default value                 | use
------------|------|-------------------------------|-----------------------------------------------------
action      | T    |                               | Name that will be invoked the procedure
bitacora    | BO   | { error:false, always:false } | Bitacora Object for core functions register
parameters  | POA  | `[]`                          | Param Objects Array
coreFunction| F    |                               | Function that implements the procedure

#### bitacoraDef:

propiedad                         | tipo           | default value              | uso
----------------------------------|----------------|----------------------------|-------------------
error                             | B              | false                      | If true, bitacora saves data of error ocurred during core function execution
always                            | B              | false                      | If true, bitacora saves all data ocurred during core function execution (overrides error)
targetTable                       | T              | null                       | Tablename for update result of execution data (must to exists a record for update) (see **targetTableBitacoraFields**). Use null for ignore option
targetTableBitacoraFields         | O              | { **init_date**: 'init_date', **end_date**: 'end_date', **has_error**: 'has_error', **end_status**: 'end_status'} | Objects who defines the fields where **'targetTable'** will reply bitacora fields (If targetTable is null it's ommited)
targetTableUpdateFieldsCondition  | A             | null                       | Fields array to define update condition (each value must to be passed as parameter with the same field name)


#### paramDef:

property      | type           | default value  | use
--------------|----------------|----------------|-------------------
name          | T              |                | name of the parameter that is sent to the procedure
defaultValue  | según typeName |                | parameter default value
typeName      | T              |                | to define the data type
label         | T              | name           | if you don't want to use default value to display on screen

#### coreFunction(context, parameters)

context  | uso
---------|----------------------
be       | backendApp object
username | username

[!--lang:es-->
Ejemplo de definición de proceso:

<!--lang:en--]
Process definition example:

[!--lang:*-->
```js
    {
        action:'count/without-isotopes',
        bitacora:{ 
                   error:true, 
                   always:true, 
                   targetTable:'other_table', 
                   targetTableBitacoraFields: {
                                                init_date: 'fecha_hora_inicio', 
                                                end_date: 'fecha_hora_final', 
                                                has_error: 'hubo_error', 
                                                end_status: 'resultado'
                                              }, 
                   targetTableUpdateFieldsCondition: ['id']
                 },
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
client-setup                 | opciones para el front-end
  cursors                    | (en preparación) dice si usa curores para mostrar dónde (con el cursor en qué registro) está cada usuario
  skin                       | nombre del skin
  menu                       | si usa los menúes integrados
  title                      | título de la pantalla
  lang                       | idioma (y locale) del frontend, por ahora "es" o "en"


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


