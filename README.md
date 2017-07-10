

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


Integrating example:


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

Process definition example:

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


