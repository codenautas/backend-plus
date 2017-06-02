<!--multilang v0 es:LEEME.md en:README.md -->
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

<!--lang:*-->

## API

<!--lang:es-->

### Definición de tablas

Se definen tablas, vistas (que correspondan a una VIEW de la base de datos) 
o vistas (que son simplemente una query que conoce la aplicación pero que no generó una VIEW).

En el futuro habrá tablas que no sean originadas en la base de datos, por ejemplo una lista de campos tendría que poder verse en una tabla. 

#### tableDef:

propiedad   | tipo | predeterminado | uso
------------|------|----------------|----------------------------------------------------------------------------------------------
name        | T    |                | nombre que va a tener la tabla en la base de datos y es el id de tabla dentro del sistema
title       | T    | `name`         | título en la grilla
editable    | L    | `false`        | los permisos
allow       | OP   | `editable`     | objeto de permisos individuales
primaryKey  | A    | `[]`           | lista de nombres de campos que son PK
foreignKeys | A    | `[]`           | lista las definiciones de las FK
constraints | A    | `[]`           | lista de constraints (salvo las Pk, FK que van en otra lista)

ejemplos lista  | formato elemento
----------------|--------------------------------------
 foreignKeys    | {references:'ptable', fields:['atomic_number']}
 constraints    | {constraintType:'unique', fields:['atomic_number','order']}

permisos | tabla | campo | uso
---------|-------|-------|-------
insert   | x     | x     |
update   | x     | x     |
delete   | x     |       |
select   | x     | x     |
select   | x     | x     |


#### fieldDef:

propiedad | tipo | predeterminado | uso
----------|------|----------------|-------------------
name      | T    |                | nombre en la base de datos y id de campo
typeName  | T    |                | tipo
title     | T    | `name`         | título para la grilla cuando no se quiere el name

Ejemplo integrador:
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

Ejemplo integrador:

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


<!--lang:en--]

## Install

<!--lang:es-->

## Instalación

<!--lang:en--]

## Install

[!--lang:*-->

```sh
$ npm install backend-plus
```

<!--lang:*-->

## License

[MIT](LICENSE)

----------------


