# Preguntas frecuentes

## ¿Cómo hago para dibujar una pantalla cualquiera después de ejecutar un procedimiento?

Si al final de la ejecución exitosa de un procedimiento se desea mostrar 
algo mejor que el texto del resutlado, por ejemplo dibujando una pantalla bonita, 
se le puede indicar al procedimiento que tiene un comportamiento especial
el resultado ok. 

Se debe definir un `wScreen` en `my.wScreens.proc.result`.
En la definición del procedimiento se debe indicar en `resultOk` el nombre de la definición. 

```js
my.wScreens.proc.result.dibujar_grafico_resulados=function(result, divResult){
    var graficoHtml = algunaFuncionGrafica(result);
    divResult.appendChild(graficoHtml.create());
}
```

**Del lado del servidor poner (podría ser en `procedures-app.js`)**
```js
{
    action: 'provincias_grafico',
    parameters: [
        {name:'region', typeName:'integer', references:'regiones'}
    ],
    resultOk:'dibujar_grafico_resulados',
    coreFunction:async function(context, parameters){
        var result = await context.client.query('select datos_provincias_region($1)', [parameters.region]).fetchAll();
        return result.rows;
    }
}
```

## ¿Cómo hago para abrir una grilla después de ejecutar un procedimiento?

Si al final de la ejecución exitosa de un procedimiento se desea mostrar 
una grilla (basada en table-algo.js, ya sea tabla o vista), 
se le puede indicar al procedimiento que tiene un comportamiento especial
el resultado ok. 

En la definición del procedimiento poner: `resultOk: 'showGrid'`, y en
el return definir un objeto de tipo `MenuInfoTable`

Otra alternativa es: definir un `wScreen` en `my.wScreens.proc.result`.
En la definición del procedimiento se debe indicar en `resultOk` el nombre de la definición. 

**Del lado del cliente poner (podría ser en `menu.js`)**
```js
function mostrarGrillaComoResultado(nombreGrilla, divResult, filtro){
    var fixedFields=[];
    likeAr(filtro).forEach(function(value, attrName){
        if(value!=null){
            fixedFields.push({fieldName: attrName, value: value});
        }
    });
    return my.tableGrid(nombreGrilla, divResult,{fixedFields:fixedFields});
}

my.wScreens.proc.result.muestra_grilla_provincias=function(result, divResult){
    var filtro=result;
    mostrarGrillaComoResultado('provincias',divResult,filtro)
}

my.wScreens.proc.result.muestra_grilla_usuarios=function(result, divResult){
    mostrarGrillaComoResultado('usuarios',divResult,{})
}
```

**Del lado del servidor poner (podría ser en `procedures-app.js`)**
```js
{
    action: 'provincias_actualizar',
    parameters: [
        {name:'region', typeName:'integer', references:'regiones'}
    ],
    resultOk:'muestra_grilla_provincias',
    coreFunction:function(context, parameters){
        return context.client.query('select actualizar_provincias_region($1)', [parameters.region]).execute().then(function(){
            return {region: parameters.region};
        })
    }
}
```

En el ejemplo se puede:
  * ver el `resultOk` en la definición del procedimiento
  * que se definió una función genérica para abrir cualquier grilla
  * que el procedimiento colgado del `wScreen` llama al genérico
  * que el resultado del procedimiento se puede usar para elegir qué ver (en este caso filtrar la grilla)

## ¿Cómo hago para ejecutar un procedimiento automáticamente desde el menú (sin presionar el botón)?

En la definición del procedimiento hay que poner valores predeterminados a los parámetros obligatorios
(salvo que no haya parámetros). 

```ts
{
    action: 'estado_resumen',
    parameters: [
        {name:'regiones', typeName:'text', defaultValue:'#todas'}
    ],
    proceedLabel:'refrescar',
    coreFunction:async function(context, parameters){
        var {row} = await context.client.query(
            'select count(*) filter (where es_inconsistente) as inconsistencias', 
            [parameters.regiones]
        ).fetchUniqueRow();
        return row;
    }
}
```

En el menú hay que poner `autoproced:true`:
```ts
    {menuType:'proc', name:'er', label:'resúmen', proc:'estado_resumen', autoproced:true}
```

## ¿Cómo hago para refrescar una grilla hija desde el padre cuando sé que los datos cambiaron?

Por ejemplo si en la grilla padre al modifiar el valor de un campo se disparará un trigger 
que actualice algún dato en los registros relacionados, si la grilla hija se está visualizando
se querrá que se actualice. 

Esto se puede hacer cuando el cambio se realiza en la misma pantalla (no cuando otro usuario 
o el mismo usuario en otra sesión haga el cambio).

En la definición del detail hay que poner `refreshFromParent:true` 

## ¿Cómo hago para tener una sección o página pública que no necesite login? (y que sea la predeterminada)

Si se quiere que cuando se ponga la `base-url` en el navegador y no haya usuario logueado 
el sistema redireccione hacia ella:

En en el `defConfig` o en el archivo `local-config.yaml`:
```yaml
login:
  unloggedLandPage: false
  plus:
    noLoggedUrlPath: /pub
```

De este modo se redireccionará a la dirección **_base-url_/pub**. 

Para que se vea debe haber un archivo `pub.jade` o un servicio `/pub`. 

Si se quieren tener servicios que puedan leer la base de datos y devolver datos sin estar logueado el usuario.
Se pueden utilizar las funciones `addUnloggedServices` o `addSchrödingerServices` 
o bien definir un procedimiento como `unlogged: true`. Las diferencias son:
   1. **procedimiento `unlogged: true`**, en forma predeterminada contestan al verbo `'POST'` y están
   diseñados para usarse mediante una llamada AJAX. Si bien pueden enviar y modificar `cookies`
   no pueden cambiar el resto de los headers ni indicar que se está devolviendo un `text/HTML`.
   2. **addUnloggedServices**, tiene acceso al objeto `application` de `Express` y por lo tanto puede
   llamar a `use` o `get` o lo que se necesite. Pueden por lo tanto modificar los headers de la manera que deseen.
   Esos servicios no pueden acceder a los datos de sesión del usuario aún cuando haya alguien logueado. 
   3. **addSchrödingerServices**, similar a _addUnloggedServices_ pero tiene acceso a la sesión del usuario
   si hubiera uno logueado (en `req.user`). 
   Dentro de la ejeución de un servicio Schrödinger el usuario podría o no estar logueado. 

## ¿Cómo hago para modificar la estructura de una tabla heredada?

Se usa la función **appendToTableDefinition** desde dentro de la función **prepareGetTables** 
como se ve en este ejemplo:

```ts
prepareGetTables(){
    super.prepareGetTables();
    this.getTableDefinition={
        ...this.getTableDefinition,
        tabla_datos_comp
    }
    this.appendToTableDefinition('parametros', function(tableDef){
        tableDef.fields.push(
            {name:'esquema_tablas_externas', typeName:'text', defaultValue:'ext', editable:false}
        );
    });
    this.appendToTableDefinition('tabla_datos', function(tableDef){
        tableDef.fields.push(
            {name:"generar"           , typeName:'bigint' , editable:false, clientSide:'generarTD'}
        );
        tableDef.detailTables?.push(
            {table:'tabla_datos_comp', fields:['operativo', 'tabla_datos'], abr:'⚕', label:'consistencias'}
        )
    });
}
```

## ¿Cómo hago para extender los tipos, por ejemplo Context?

Por ejemplo si queremos agregar campos a Context para usar en `getContext(req)` 
y que `context.be` sea del tipo de tu app hay que usar el archivo `types-my-app.ts`
y agregar ahí algo como:

```ts
import { AppMyApp } from "app-my-app";

// exposes APIs from this package
export * from "backend-plus";
export * from "pg-promise-strict";

declare module "backend-plus"{
    interface Context {
        forDump?:boolean
        esAdmin:boolean, 
        esOficina:boolean
    }
    interface ProcedureContext {
        be:AppMyApp
    }
}

export type Constructor<T> = new(...args: any[]) => T;
```

y asegurarse de importar los tipos desde `types-my-app.ts` en vez de `backend-plus.ts`

## ¿Cómo hago para especificar columnas obligatorias en condicionadas al resto?

A nivel de los datos, lo mejor es utilizar una serie de check constraints en la definición de la tabla. 
```ts
var provinciasConstraints = [
    {
        constraintType:'check', 
        expr:`provincia = 'CABA' or localidad is not null`, 
        consName:`debe especificar la localidad (salvo en CABA')`
    },
    {
        constraintType:'check', 
        expr:`provincia <> 'CABA' or comuna is not null`, 
        consName:`en CABA debe especificar la comuna`
    }
]
```
Recordar que al consName se muestra como error de validación cuando se viola la constraint
(por eso es recomendable usar más de una constraint según la complejidad de la condición).

Si la lógica es más compleja también se puede utilizar un trigger que 
rechace el registro si falta completar un campo en la ciercunstancia dada. 

### La experiencia de usuario (el front end)

Backend plus muestra los campos obligatorios `nullable: false` con una estrella 
(eso se puede cambiar en el css con el estilo `my-mandatory`).

Cuando las columnas condicionales dependen de condiciones debidas a lo cargado previamente
se debe indicar un `specialValidator` en la definición de la tabla, 
y programar el comportamiento a nivel del backend el miembro `validators`. 

En el backend:
```ts
function personas(context:TableContext):TableDefinition{
    return {
        name:'personas',
        special
        fields:[
            {name:'id', typeName:'bigint'},
            {name:'nombre', typeName:'text', nullable:false},
            {name:'apellido', typeName:'text', nullable:false},
            {name:'provincia', typeName:'text', nullable:false},
            {name:'localidad', typeName:'text'},
            {name:'comuna', typeName:'text'},
        ],
        primaryKey:['id'], 
        constraints: provinciasConstraints,
        specialValidator: 'provincias'
    }
}
```

En el frontend:
```ts
myOwn.validators.provincias = {
    getMandatoryMap(row:Record<string, any>){
        var specialMandatories = {
           localidad: row.provincia != 'CABA',
           comuna: row.provincia == 'CABA'
        }
        return specialMandatories;
    }
}
```

En el .css:
```css
td[my-special]:empty {
    background: url("../img/mandatory.png") top right no-repeat;
    background-size: 12px 12px;
}
```

## ¿Cómo hago para anular en algunas filas el detail tables de alguna columna?

Si por ejemplo hay una columna de details para expandir las localidades de una provincia
pero no se quiere el desplegable para la Ciudad de Buenos Aires se puede 
declarar una condición del lado del backend y definirla del lado del frontend. 

En el backend:
```ts
    // ...
    detailTables:[
        {name:'localidades', fields:['provincia'], abr:'L', condition:'noCABA'}
    ]
```
En el frontend:
```ts
myOwn.conditions.noCABA = function(depot:Depot){
    return depot.row.provincia != 'CABA';
}
```

## ¿Cómo hacer un procedimiento que devuelva un archivo excel o csv?

Al procedimiento se le puede agregar en la definición la propiedad `forExport`. 
Y se pueden poner el nombre del archivo excel o del csv (o de ambos).
El procedimiento tiene que devolver un arreglo de tablas (una por hoja del excel)
o un arreglo con una sola tabla (para el CSV).

¿Por qué se pueden especificar ambos? Porque en caso de que la generación del Excel dé error
(por ser muy grande) el archivo .CSV se genera igual (o sea es la opción más segura).

Si el procedimiento se llama dos veces seguidas (con menos de 10 minutos de diferencia)
se ofrece el archivo generado con anterioridad y no se vuelve a generar. 

```ts
    {
        action:"ejemplo_dos_hojas",
        parameters:[],
        forExport:{
            fileName:'usuariosYfechas.xlsx',
            csvFileName:'usuariosYfechas.csv'
        },
        coreFunction:async function(context:ProcedureContext, _parameters:CoreFunctionParameters){
            return [
                {
                    title:'usuarios',
                    rows: (
                        await context.client.query(`select * from usuarios order by usuario`).fetchAll()
                    ).rows.map(r=>{ delete r.md5clave; return r; })
                },
                {
                    title:'signos',
                    rows: (
                        await context.client.query(`select * from signos order by 1`).fetchAll()
                    ).rows
                }
            ]
        }
    }
```

## ¿Cómo funciona clientIncludes? ¿qué hacer si en el navegador no aparece un .js de un módulo incluido?

La función clientIncludes se encargar de informar al backend la lista de módulos que deben servirse e
incluirse en los tags `<script ...>` y `<link ... rel=stylesheet>` de la página principal. 
Cada aplicación debe sobreescribir esta función para incluir sus propios módulos. 

Por ejemplo en
```ts
clientIncludes(req:Request|null, opts:OptsClientPage):ClientModuleDefinition[]{
    var list: ClientModuleDefinition[] = [
        { type: 'js', module: 'react', modPath: 'umd', fileDevelopment:'react.development.js', file:'react.production.min.js' },
        ...super.clientIncludes(req, opts),
        { type: 'css', file: 'app-pages.css' },
        { type: 'js', file: 'app-pages.js' },
    return list;
}
```

   * `type` indica si es un `js` o un `css` (que podrían venir de `.ts` y `.styl`)
   * `module` se refiere a un módulo externo (mencionado en `package.json` y resuelto con el algoritmo de `require` de _Node.js_) si no se especifica se entiende que es un módulo propio de la aplicación
   * `file` se refiere al nombre del archivo que se va incluir (puede omitirse en módulos externos si el módulo tiene al archivo deseado como principal, eso no suele ocurrir en los archivos mimificados)
   * `modPath` sirve para corregir el _path_ del servidor cuando la carpeta a servir no es la que resuelve _Node.js_
   * `fileDevelopment` el archivo a incluir en modo development (que se habilita en el local config con `devel.useFileDevelopment`) 
   * `path` el _path_ en la URL donde se va a servir (si no se indica es `lib` para `js` y `css` para `css`)

A veces con nuevas versiones de algunos paquetes las ubicaciones o nombres de los archivos mimificados pueden cambiar. 
Cuando el navegador no encuentra el archivo `.js` o `.css` o el que sea 
se puede arrancar la aplicación pidiéndole que muestre la lista de módulos incluidos

```sh
npm start -- --dump-includes
```



## ¿Cómo se agrega un campo calculado con la cuenta de los registros relacionados en una tabla hija?

Se debe agregar la property ``sql:{fields:{string:{expr:`(expr_sql)`}}}`` donde string puede ser renombrado y será el resultado de la expresión `expr`, a continuación se puede ver expr_sql como una expresión sql que va entre parentesis.
Para visualizar el resultado como una columna de la tabla se debe agregar en el array fields un FieldDefinition cuya property `name` contenga el mismo nombre que el string definido anteriormente y el typename debe ser igual que el tipo de dato del resultado.
A continuación se muestra un ejemplo donde se quiere contar la cantidad de tickets por cada estado de la tabla estados.

Tabla tickets
```ts
    {
        name: 'tickets',
        fields: [
            {name:'ticket', type: 'text'},
            {name:'estado', typeName: "text"}, 
        ],
        primaryKey: ['ticket'],
        foreignKeys: [
            {references: "estados", fields: ['estado']}
        ],
    }
```

Tabla estados
```ts
    {
        name: 'estados',
        fields: [
            {name:'estado', type: 'text'},
            {name:'cant_tickets', typeName: "bigint", inTable:false, editable:false}, 
        ],
        primaryKey: ['pk'],
        sql:{fields:{ cant_tickets:{ expr: `(SELECT count(*) FROM tickets t WHERE t.estado = estados.estado)` }}}
    }
```

## ¿Cómo se configura un correo saliente?

Las aplicaciones backend-plus pueden enviar corres desde cualquier lugar. 

Está pensado para usar en los procedimientos o los servicios para avisar de situaciones excepcionales.

Hay un procedimiento integrado a backend-plus para recuperar la contraseña. 

En ``local-config.yaml`` en `mailer.conn` agregar la configuración de conexión según el format [mailer](https://nodemailer.com/smtp/). 

**Ejemplo de conexión SSL y habilitación del recuperador de contraseña**

```yaml
mailer:
  motor: smtp
  conn:
    host: smtp.servidordecorreo.com
    port: 465
    secure: true
    auth:
      user: usuario@servidordecorreo.com
      pass: **********
  mail-info:
    from: 'usuario <usuario@servidordecorreo.com>'
login:
  forget:
    urlPath: /forget
    mailFields: [mail, mail_alternativo] #columnas de mail de la tabla usuarios
```

**Si el proxy no deja pasar el hostname**
Si el mail recibido en el vínculo para cambiar la contraseña no figura
la dirección de la página (en vez dice `localhost://`)
se debe indicar la URL completa en la configuración del `forget`, por ejemplo:
```yaml
    urlDomainAndRoot: https://www.nuestro-dominio.com/aplicacion/new-pass
```


**Ejemplo de conexión TSL, sin habilitación del recuperador de contraseña**

```yaml
mailer:
  motor: smtp
  conn:
    host: mail.servidordecorreo.com
    port: 587
    secure: false
    auth:
      user: usuario@servidordecorreo.com
      pass: **********
    tls:
      rejectUnauthorized: true,
      minVersion: TLSv1.2
      ciphers: SSLv3
  mail-info:
    from: 'usuario <usuario@servidordecorreo.com>'
```

**Ejemplo de uso dentro del backend**

```ts
await be.sendMail({
    to: "jefe-operativo@nuestro-dominio.com.ar",
    subject: `El cálculo ${id_calculo} finalizó.
    text:Hora de finalización: ${new Date().toJSON()}.
    
    Proceso: ${id_calculo}.
    Resultado: ${resultado}.
    `
});
```

## ¿Cómo aumentar el tamaño de carga de archivos en bp?

En backendplus.js buscar ``mainApp.use(bodyParser.urlencoded({extended:true, limit: '50mb'}));`` y aumentar limit. Esto es en backendplus pero tenga en cuenta que también deberá aumentar el tamaño en el servidor web que tenga configurado (nginx, Apache).

## ¿hay forma de ponerle estilos a las celdas o filas de una grilla?

Si, cada celda tiene  agregados en su elemento HTML atributos especificos del nombre de la columna, además de las clases genéricas que indican que es una celda. Con esa información se puede utilizar para escribir selectores CSS que se ajusten a lo que se requiera darle estilos

## ¿Como hago que un campo donde se guarda una url se muestre como link/enlace?

Para eso hay que redefinir el atributo clientSide:'displayUrl' y serverSide:true
En el siguiente ejemplo se muestra como un campo que contiene una url (generado en base a un campo de una tabla foranea (no presente en esta tabla) + un campo propio), se transforma en una url clickeable

table-aplicacion:
```ts
    //seteo campos clientSide:'displayUrl', serverSide:true para que ese field se muestre como un link clickeable
    fields: [
        { name: "instancia"           , typeName: 'text'    },
        { name: "base_url"            , typeName: 'text'    },
        { name: "url_generada"        , typeName: 'text', inTable:false, clientSide:'displayUrl', serverSide:true, label:'server.base_url + instapp.base_url'},
        { name: "servidor"            , typeName: 'text'    },
    ...

    // seteo fk a tabla servidores
    foreignKeys:[
            {references: 'servidores'   , fields:['servidor']},
    ...

    //seteo expresión que construirá campo url_generada juntando el campo "base_url" de la tabla foranea "servidores" con el campo propio "base_url"
    sql:{
        fields:{
            url_generada:{
                expr:"(NULLIF(COALESCE(servidores.base_url, '') || COALESCE(instapp.base_url, ''), ''))"
            }
        }
    }

```

## Pero si quisiera que el texto del link no muestre la url sino otro texto, de hecho me gustaría poder modificar el html de la celda a mi antojo para tener un link customizable u otros elementos  html e incluso agregarle comportamiento con JS ¿hay forma de modificar el comportamiento o estructura HTML de celdas de una grilla?

Si, es programando un clientSide a medida o custom.
Por ejemplo si tenemos una tabla anotaciones (anotaciones de tickets) con una columna que se usará para poner un enlace a un ticket relacionado, entonces setearemos en dicho field clientSide:'link_a_ticket'

En src/server/table-anotaciones.ts 
```ts
export function anotaciones(context:TableContext):TableDefinition{
    const td:TableDefinition = {
        editable: true,
        name: 'anotaciones',
        elementName: 'anotación',
        fields: [
            {name:'proyecto', typeName:'text'},
            {name:'ticket', typeName:'bigint' },
            {name:'anotacion', typeName:'bigint', nullable:true, title:'anotación', editable:false, defaultDbValue:'0'},
            {name:'usuario', typeName:'text', editable:false, defaultValue: context.user.usuario  },
            {name:'detalle', typeName:'text'},
            {name:'proyecto_relacionado', typeName:'text', title:'link_proyecto'},
            {name:'ticket_relacionado', typeName:'bigint', title:'link_ticket'},
            {name:'link_a_ticket', typeName:'text', clientSide:'link_a_ticket', editable:false, title:'link'},
...
```

Luego escribiremos la estructura HTML y el comportamiento TS
En src/client/client.ts :
```ts
myOwn.clientSides.link_a_ticket = {
    update:function(depot:myOwn.Depot, fieldName:string):void{
        const td=depot.rowControls[fieldName];
        td.innerHTML='';
        if(depot.row.proyecto_relacionado && depot.row.ticket_relacionado){
            td.appendChild(html.a({class:'link-descarga-archivo', href:`menu#w=ticket&autoproced=true&ff=,proyecto:${depot.row.proyecto_relacionado},ticket:${depot.row.ticket_relacionado}`},`${depot.row.proyecto_relacionado}-${depot.row.ticket_relacionado}`).create());            
        }
    },
    prepare:function(_depot:myOwn.Depot, _fieldName:string):void{
    }
}
```

## ¿En una tabla que tiene una fk, como puedo mostrar un campo extra (además de la FK) de la tabla foranea?

En la tabla foranea se tiene que setear el atributo isName:true en el fieldDefinition de cada campo que se desea mostrar al lado de la fk

por ejemplo:

tabla servidores:
```ts
    fields: [
        { name: "servidor"           , typeName: 'text'    },
        { name: "ip"                 , typeName: 'text', isName:true   },
...
```

tabla aplicaciones:
```ts
    fields: [
        { name: "aplicacion"         , typeName: 'text'    },
        { name: "servidor"           , typeName: 'text'    },
    ...
    foreignKeys:[
        {references: 'servidores'    , fields:['servidor']},
    ...
```
Esto hará que en la tabla aplicaciones además de mostrarse el campo servidor (fk) se muestre una nueva columna a la derecha "ip" que contendrá el valor del campo ip de la tabla foranea


## ¿Se puede cambiar atributos isName de tablas foraneas como si fueran atributos propios?

Si, para eso hay que redefinir el atributo is name de la tabla foranea en la tabla que tiene la fk, la redefinición debe hacerse seteando el atributo nombre del fieldDefinition con el formato <tabla_foranea>__<nombre_campo_is_name> 

por ejemplo:

tabla databases:
```ts
    fields: [
        { name: "database"           , typeName: 'text'    },
        { name: "owner"              , typeName: 'text', isName:true   },
...
```

tabla aplicaciones:
```ts
    fields: [
        { name: "aplicacion"         , typeName: 'text'    },
        { name: "database"           , typeName: 'text'    },
        { name: "databases__owner"   , typeName: 'text'    , title:'owner_base_de_datos'},
    ...
    foreignKeys:[
        {references: 'databases'    , fields:['database']},
    ...
```
Como se puede ver en el ejemplo al redefinir el campo foraneo "owner" se pudo setear el title

## ¿En una grilla como logro setear el orden por defecto?

usando el atributo sortColumns a nivel de tabla:
```
...
fields: [
    { name: "database",               editable: false, typeName: 'text' },
    { name: "servidor",               editable: false, typeName: 'text' },
    { name: "port",                   editable: false, typeName: 'integer' },
    { name: "fecha",                  editable: false, typeName: 'timestamp' },
],
foreignKeys:[
    {references: 'databases'      , fields:['database','servidor','port']},
],
sortColumns:[{column:'fecha', order:-1}, {column:'servidor'}, {column:'port', order:1}, {column:'databases__owner', order:1}],
...
```
En el ejemplo se ordenará por fecha mas reciente (-1), luego por servidor, port y por el campo owner (isName) de la tabla foranea databases
