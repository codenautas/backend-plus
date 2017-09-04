

# backend-plus

Backend for typed-controls


![extending](https://img.shields.io/badge/stability-extending-orange.svg)
[![npm-version](https://img.shields.io/npm/v/backend-plus.svg)](https://npmjs.org/package/backend-plus)
[![downloads](https://img.shields.io/npm/dm/backend-plus.svg)](https://npmjs.org/package/backend-plus)
[![build](https://img.shields.io/travis/codenautas/backend-plus/master.svg)](https://travis-ci.org/codenautas/backend-plus)
[![coverage](https://img.shields.io/coveralls/codenautas/backend-plus/master.svg)](https://coveralls.io/r/codenautas/backend-plus)
[![climate](https://img.shields.io/codeclimate/github/codenautas/backend-plus.svg)](https://codeclimate.com/github/codenautas/backend-plus)
[![dependencies](https://img.shields.io/david/codenautas/backend-plus.svg)](https://david-dm.org/codenautas/backend-plus)
[![qa-control](http://codenautas.com/github/codenautas/backend-plus.svg)](http://codenautas.com/github/codenautas/backend-plus)


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

Integrating example:

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

Process definition example:

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

## def-config.yaml

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

## Install

```sh
$ npm install backend-plus
```

## License

[MIT](LICENSE)

----------------


