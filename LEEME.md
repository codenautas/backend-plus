<!--multilang v0 es:LEEME.md en:README.md -->


<!--lang:es-->
<!--lang:en--]
[!--lang:*-->
# backend-plus

<!--lang:es-->
Backend para la antirregla de Pareto.

<!--lang:en--]
Backend for the anti Pareto rule.

[!--lang:*-->

<!-- cucardas -->
![stable](https://img.shields.io/badge/stability-stable-blue.svg)
[![npm-version](https://img.shields.io/npm/v/backend-plus.svg)](https://npmjs.org/package/backend-plus)
[![downloads](https://img.shields.io/npm/dm/backend-plus.svg)](https://npmjs.org/package/backend-plus)
[![build](https://img.shields.io/travis/codenautas/backend-plus/master.svg)](https://travis-ci.org/codenautas/backend-plus)
[![coverage](https://img.shields.io/coveralls/codenautas/backend-plus/master.svg)](https://coveralls.io/r/codenautas/backend-plus)
[![dependencies](https://img.shields.io/david/codenautas/backend-plus.svg)](https://david-dm.org/codenautas/backend-plus)

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


<!--lang:es-->

### [Definición de modulos](doc/definicion-modulos.md)

<!--lang:en--]

### [module definitions](doc/module-definitions.md)

<!--lang:es-->

### [Definición del lado del cliente](doc/definicion-lado-cliente.md)

<!--lang:en--]

### [client side definitions](doc/client-side-definitions.md)

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
selectedByDefault | B |             |          | si es la opción predeterminada
autoproced  | B    | `false`        | proc     | si debe ejecutarse el procedimiento

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
selectedByDefault | B |             |          | is the selected by default option
autoproced  | B    | `false`        | proc     | if yo want to execute the procedure without clicking the proced button

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
                {menuType:'proc' , name:'count_without_isotopes', label:'count'}
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
cacheable   | Bool | false                         | El resultado puede ser cacheado para siempre (solo depende de los parámetros, no del tiempo)
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
cacheable   | Bool | false                         | The result can be cached
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
        action:'count_without_isotopes',
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
## def-config

```js
/// def-config.ts
export defConfig=`
server:
  port: 3000
  base-url: /my-app
db:
  motor: postgresql
  host: localhost
  database: my_app_db
  user: my_app_user
install:
  dump:
    db:
      owner: my_app_owner
client-setup:
  title: My app
  lang: es
`;

/// main.ts
import {defConfig} from "./def-config"

export function emergeMyApp<T extends Constructor<AppBackend>>(Base:T){
    /// ...
    configStaticConfig(){
        super.configStaticConfig();
        this.setStaticConfig(defConfig);
    }
    ///...
}

```

<!--lang:es-->
La configuración general de la aplicación debe pasarse a la función `setStaticConfig` en formato texto-yaml. 
Las distintas instancias instaladas pueden cambiar las opciones poniéndolas en el archivo `local-config.yaml` 
(por ejemplo se podrían tener dos instancias de testing en el mismo servidor colgado de puertos distintos 
apuntando a distntas bases de datos).

La variable de ambiente `BACKEND_PLUS_LOCAL_CONFIG` puede especificar un tercer archivo de configuración yaml
que será aplicado después de `setStaticConfig` y de `local-config.yaml`. 
Eso permite tener dos instancias corriendo en la misma carpeta (pero para ello el sistema no debería usar el 
sistema de archivos para almacenar ningún tipo de  información). 

<!--lang:en--]
The general application config is setted with `setStaticConfig`. 
Any option can be overwrited in `local-config.yaml` file.

`BACKEND_PLUS_LOCAL_CONFIG` enviroment variable can be a `filename.yaml` with more config options. 

<!--lang:es-->
### formato de la configuración:

entrada                      | uso
-----------------------------|---------------
server                       | opciones a nivel del servidor
.port                        | puerto en el que atiende el servidio
.module-store                | nombre del módulo que guarda sesiones: file, memory (en modo devel guarda en disco cada tanto)
install                      | opciones de instalación
.table-data-dir              | directorio o lista de directorios donde están los .tabs que se usarán en el comando dump-db (que crea inserte en archivo local-db-dump.sql)
.dump                        | opciones del dump de instalación
..db.owner                   | usuario dueño de la base de datos
..scripts.post-adapt         | lista de nombres de archivos para adaptar la estructura de la base de datos
..scripts.parts-order        | orden de las partes en que se genera el dump-db
devel                        | conjunto de opciones para el ambiente de desarrollo y testing
.delay                       | tiempo de espera promedio adicional (para simular un servidor lento)
.cache-content               | hace caché de imágenes y archivos en general (si no está en modo "devel" siempre hace caché, no se puede apagar el caché fuera del modo devel)
.forceShowAsEditable         | fuerza mostrar las grillas como grillas editables para mostrar cómo el servidor impide la modificación
.useFileDevelopment          | usa las versiones de fileDevelopment en vez de file provenientes de clientIncludes()
login                        | opciones de login
.plus                        | opciones a pasar al módulo login-plus
..allowHttpLogin             | si permite loguerse desde conexiones HTTP
.table                       | nombre de la tabla donde validar usuarios
.schema                      | esquema donde se encuentra la tabla de usuarios
.userFieldName               | nombre del campo que contiene el usuario
.passFieldName               | nombre del campo que contiene el md5(password+usuario)
.rolFieldName                | nombre del campo donde está el rol del usuario 
.infoFieldList               | array con los nombres de campo que van a al campo user
.activeClausule              | expresión booleana SQL que determina si el usuario está activo
.messages                    | mensajes a mostrar en la pantalla de login
.keepAlive                   | máxima duración logueado si solo se reciben mensajes keep-alive
.preserve-case               | si acepta usuarios con mayúsculas
log                          | log por consola
.req                         | muestra cada requerimiento
.session                     | muestra info de las sesiones
.serve-contet                | si debe loguear todo lo que se sirve con `serve-content`
.db                          | logs de la conexión de base de datos
..last-error                 | si debe loguear siempre el último error (se guarda en `last-pg-error-local.sql`)
..until                      | si debe loguear cada sentencia SQL ejecutada. En `until` debe especificar cuánto tiempo desde el arranque (ej: '1m30s') o hasta que día y hora (ej: '2018-01-20 10:30')
..on-demand                  | si se puede reiniciar el logueo de todos los SQL ejecutados con `URLbase/--log-db`
..results                    | si incluye en el log de todos los SQL los resultados
client-setup                 | opciones para el front-end
.cursors                     | (en preparación) dice si usa curores para mostrar dónde (con el cursor en qué registro) está cada usuario
.skin                        | nombre del skin
.menu                        | si usa los menúes integrados
.title                       | título de la pantalla
.lang                        | idioma (y locale) del frontend, por ahora "es" o "en"
db                           | opciones de la base de datos
.motor                       | por ahora solo 'postgresql'
.database                    |
.tablespace                  | tablespace donde se crea la base (solo si corresponde)
.user                        |
.password                    |
.port                        | 
.schema                      | esquema principal donde crear los objetos nuevos
.search_path                 | array de nombres de esquemas, si no se especifica `search_path = [schema, 'public']`
.log-last-error              | true si se desea que se deje en un archivo la última sentencia SQL que contuvo error (solo funciona si config.devel está especficiada)
.allow_double_lodash_fields  | si se permiten campos con doble `_` underscore
imports                      | opciones de importación a la plataforma
.allow-plain-xls             | si permite importar xlsx que no tienen la señal #backend-plus en la celda A1


<!--lang:en--]
### config format:

entry                        | usage
-----------------------------|---------------
server                       |
.port                        | port where is listening
.base-url                    | base url added to domain name
.module-store                |
install                      | (see Spanish)
.dump                        | (see Spanish)
..db.owner                   | (see Spanish)
..scripts.post-adapt         | (see Spanish)
..scripts.parts-order        | (see Spanish)
devel                        | (see Spanish)
.delay                       | (see Spanish)
.cache-content               | (see Spanish)
.forceShowAsEditable         | (see Spanish)
login                        | (see Spanish) 
.plus                        | (see Spanish) 
..allowHttpLogin             | (see Spanish) 
log                          | (see Spanish) 
.req                         | (see Spanish) 
.session                     | (see Spanish) 
client-setup                 | (see Spanish) 
.cursors                     | (see Spanish) 
.skin                        | (see Spanish) 
.menu                        | (see Spanish) 
.title                       | (see Spanish) 
.lang                        | (see Spanish) 

[!--lang:*-->  
```yaml  
install:  
  dump:
    db:
      owner: user_owner
    scripts:
      post-adapt: [special_triggers.sql, other_constraints.sql]      
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


