

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



It's a framework for developing web applications based on PostgreSQL database. Its main features are:

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

property                          | type           | default value              | use
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
defaultValue  | according to typeName |          | parameter default value
typeName      | T              |                | to define the data type
label         | T              | name           | if you don't want to use default value to display on screen

#### coreFunction(context, parameters)

context  | use
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
server                       | server level options
.port                        | port where it is listening
.base-url                    | base url added to domain name
.module-store                | name of the module that stores sessions: file, memory (in devel mode it saves to disk from time to time)
install                      | install options
.table-data-dir              | directory or list of directories where the .tabs used by the dump-db command are located (it creates inserts into the local-db-dump.sql file)
.dump                        | install dump options
..db.owner                   | database owner user
..scripts.post-adapt         | list of file names to adapt the database structure
..scripts.parts-order        | order of the parts in which the dump-db is generated
devel                        | set of options for the development and testing environment
.delay                       | additional average wait time (to simulate a slow server)
.cache-content               | caches images and files in general (when not in "devel" mode it always caches, the cache can't be turned off outside devel mode)
.forceShowAsEditable         | forces grids to be shown as editable grids to show how the server prevents modification
.useFileDevelopment          | uses the fileDevelopment versions instead of file coming from clientIncludes()
login                        | login options
.plus                        | options to pass to the login-plus module
..allowHttpLogin             | whether it allows login from HTTP connections
.table                       | name of the table where users are validated
.schema                      | schema where the users table is located
.userFieldName               | name of the field that contains the user
.passFieldName               | name of the field that contains md5(password+user)
.rolFieldName                | name of the field where the user role is
.passUpdatedAtFieldName      | name of the field where the date of the last password change is stored (optional)
.passAlgorithmFieldName      | name of the field where the password algorithm is stored (optional)
.infoFieldList               | array with the field names that go to the user field
.activeClausule              | SQL boolean expression that determines whether the user is active
.messages                    | messages to show on the login screen
.keepAlive                   | maximum logged-in duration if only keep-alive messages are received
.preserve-case               | whether it accepts users with uppercase letters
log                          | console log
.req                         | shows each request
.session                     | shows session info
.serve-content               | whether it should log everything served with `serve-content`
.db                          | database connection logs
..last-error                 | whether it should always log the last error (saved in `last-pg-error-local.sql`)
..until                      | whether it should log every executed SQL statement. In `until` you must specify how long since startup (e.g.: '1m30s') or until which day and time (e.g.: '2018-01-20 10:30')
..on-demand                  | whether the logging of all executed SQL can be restarted with `URLbase/--log-db`
..results                    | whether it includes the results in the log of all SQL
client-setup                 | front-end options
.cursors                     | (in preparation) tells whether it uses cursors to show where (with the cursor on which record) each user is
.skin                        | skin name
.menu                        | whether it uses the integrated menus
.title                       | screen title
.lang                        | frontend language (and locale), for now "es" or "en"
db                           | database options
.motor                       | for now only 'postgresql'
.database                    |
.tablespace                  | tablespace where the database is created (only if applicable)
.user                        |
.password                    |
.port                        |
.schema                      | main schema where to create the new objects
.search_path                 | array of schema names, if not specified `search_path = [schema, 'public']`
.log-last-error              | true if you want the last SQL statement that contained an error to be left in a file (only works if config.devel is specified)
.allow_double_lodash_fields  | whether fields with double `_` underscore are allowed
imports                      | options for importing to the platform
.allow-plain-xls             | whether it allows importing xlsx that don't have the #backend-plus signal in cell A1

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


