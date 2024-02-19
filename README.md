

# backend-plus

Backend for the anti Pareto rule.


![stable](https://img.shields.io/badge/stability-stable-blue.svg)
[![npm-version](https://img.shields.io/npm/v/backend-plus.svg)](https://npmjs.org/package/backend-plus)
[![downloads](https://img.shields.io/npm/dm/backend-plus.svg)](https://npmjs.org/package/backend-plus)
[![build](https://img.shields.io/travis/codenautas/backend-plus/master.svg)](https://travis-ci.org/codenautas/backend-plus)
[![coverage](https://img.shields.io/coveralls/codenautas/backend-plus/master.svg)](https://coveralls.io/r/codenautas/backend-plus)
[![dependencies](https://img.shields.io/david/codenautas/backend-plus.svg)](https://david-dm.org/codenautas/backend-plus)


language: ![English](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)
also available in:
[![Spanish](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)](LEEME.md)



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


## API


### [table definitions](doc/table-definitions.md)



### [module definitions](doc/module-definitions.md)


### [client side definitions](doc/client-side-definitions.md)

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

Integrating example:

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

Process definition example:

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

The general application config is setted with `setStaticConfig`.
Any option can be overwrited in `local-config.yaml` file.

`BACKEND_PLUS_LOCAL_CONFIG` enviroment variable can be a `filename.yaml` with more config options.

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

## Install

```sh
$ npm install backend-plus
```

## License

[MIT](LICENSE)

----------------


