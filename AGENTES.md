# AGENTES.md — trabajar en una aplicación backend-plus

Este archivo es para que **Claude**, **Github Copilot**, **Gemini** (u otro agente)
trabaje sobre una aplicación que usa `backend-plus` como framework.

---

## Qué es backend-plus

Es un framework para aplicaciones web sobre PostgreSQL, basado en **metadatos centralizados**.
A partir de la definición de una tabla, el framework genera:

- la estructura de base de datos (el `CREATE TABLE`, las constraints, las FK)
- una grilla editable en el navegador (ordenable, filtrable, importable/exportable a XLSX)
- la API REST que la alimenta
- el lugar de esa tabla en el menú

**Consecuencia práctica para un agente:** casi nunca se escribe el CRUD a mano.
Si estás por escribir un endpoint para listar/insertar/actualizar registros de una tabla,
es casi seguro que lo estás haciendo mal: eso lo da la definición de la tabla.

---

## Reglas de trabajo

### Antes de escribir código

1. **Leé la definición de la tabla involucrada.** Cada tabla vive en su propio archivo
   `table-<nombre>.ts` en la carpeta del servidor. Ahí están los nombres exactos
   de columnas, tipos, títulos, permisos y validaciones. No adivines nombres de columnas.
2. **Buscá si la regla ya existe en la base de datos.** En estas aplicaciones es habitual
   que la lógica de negocio crítica esté en **funciones y triggers de PostgreSQL**, no en
   TypeScript. Esa suele ser una decisión deliberada: garantiza que la regla no se saltee
   aunque cambie el backend. Reimplementarla en TypeScript introduce duplicación e
   inconsistencia. Buscá en `install/` antes de asumir que la lógica no existe.
3. **Mirá una tabla parecida ya existente** y seguí ese estilo. La consistencia entre
   los `table-*.ts` de un proyecto vale más que cualquier preferencia personal.

### Qué no hacer

- **No escribas SQL de CRUD a mano** para algo que la definición de tabla ya resuelve.
- **No modifiques `node_modules/backend-plus`.** Si parece que la única salida es tocar
  el framework, pará y preguntá: casi siempre hay un punto de extensión previsto.
- **No inventes propiedades** de `TableDefinition` o `FieldDefinition`. Si no estás seguro
  de que una propiedad existe, verificala en `node_modules/backend-plus/lib/backend-plus.d.ts`,
  que es la fuente de verdad de la API.
- **No pongas `any`.** El framework viene tipado; usá los tipos que exporta.

---

## Estructura del proyecto

```
mi-app/
  src/
    server/
      app-mi-app.ts          clase principal: menú, tablas, procedimientos, servicios
      server-mi-app.ts       punto de entrada: instancia la clase y hace start()
      def-config.ts          configuración estática (YAML como string)
      types-mi-app.ts        tipos: reexporta backend-plus y extiende sus interfaces
      procedures-mi-app.ts   procedimientos (lógica que no es CRUD)
      table-clientes.ts      una tabla por archivo
      table-facturas.ts
    common/
      contracts.ts           contratos compartidos entre servidor y cliente
    client/
      client.ts              código del lado del navegador
      menu.ts
      ws-*.tsx               pantallas propias (React, si se usa)
  install/
    *.sql                    estructura, funciones y triggers
    *.tab                    datos iniciales
  local-config.yaml          configuración de ESTA instalación (NO va al repositorio)
```

Las tres carpetas bajo `src/` no son decorativas: `common/` es lo que compila para los dos
lados, y es donde viven los contratos que mantienen sincronizados servidor y cliente.

---

## `types-mi-app.ts`: el archivo de tipos

Los archivos del servidor **no importan de `backend-plus` directamente**, sino de
`types-mi-app.ts`. Ese archivo reexporta el framework y, con `declare module`, le agrega
los campos propios de la aplicación. Así `context.be` queda tipado como tu clase y
`context.user` tiene tus campos.

```ts
import { AppMiApp } from "./app-mi-app";

// reexporta las APIs de los paquetes que se usan en todo el servidor
export * from "backend-plus";
export * from "pg-promise-strict";

declare module "backend-plus"{
    interface Context {
        forDump?:boolean
        es:{admin:boolean, supervisor:boolean, operador:boolean}
    }
    interface ProcedureContext {
        be:AppMiApp
    }
    interface User {
        usuario:string
        rol:string
    }
}

export type Constructor<T> = new(...args: any[]) => T;
```

Este archivo también es un buen lugar para los helpers de constraints que se repiten
entre tablas:

```ts
export function soloMayusculas(fieldName: string):Constraint{
    return {
        constraintType:'check',
        consName:`Solo mayúsculas en ${fieldName}`,
        expr: `${fieldName} similar to '[A-Z][A-Z0-9 ]*'`
    }
}
```

> Si agregás un campo al `Context`, calculalo en un método propio (por ejemplo
> `completeContext`) y llamalo desde `getContext` **y** desde `getContextForDump`.
> Si te olvidás del segundo, el dump de la base rompe.

---

## La clase de aplicación

Todo se cuelga de una clase que extiende `AppBackend`. Usá `override` explícito: si el
framework cambia una firma, TypeScript avisa.

```ts
export class AppMiApp extends AppBackend {
    override configStaticConfig(){
        super.configStaticConfig();
        this.setStaticConfig(staticConfigYaml);
    }
    completeContext(context:Context){
        var es = context.es ?? {} as Context["es"];
        es.admin      = context.user && context.user.rol == "admin";
        es.supervisor = es.admin || context.user && context.user.rol == "supervisor";
        es.operador   = es.supervisor || context.user && context.user.rol == "operador";
        context.es = es;
    }
    override getContext(req:Request):Context{
        var context = super.getContext(req);
        this.completeContext(context);
        return context;
    }
    override getContextForDump():Context{
        var context = super.getContextForDump();
        this.completeContext(context);
        return context;
    }
    override prepareGetTables(){
        super.prepareGetTables();
        this.getTableDefinition = {
            ... this.getTableDefinition,
            clientes,
            facturas,
        }
    }
    override async getProcedures(){
        var be = this;
        return [
            ...await super.getProcedures(),
            ...ProceduresMiApp
        ].map(be.procedureDefCompleter, be);
    }
    override getMenu(context:Context):MenuDefinition{
        var {es} = context;
        return {menu:[
            {menuType:'table', name:'clientes'},
            ...(es.supervisor ? [
                {menuType:'menu', name:'listados', menuContent:[
                    {menuType:'proc', name:'facturas_del_mes'},
                ]},
            ] : []),
        ]}
    }
}
```

**Registrar las tablas.** La forma actual es importar cada función de tabla y agregarla
a `getTableDefinition` dentro de `prepareGetTables()`. Se importa la función, no el string:

```ts
import { clientes } from './table-clientes';
import { facturas } from './table-facturas';
```

**Siempre llamá a `super.`** en `prepareGetTables`, `getProcedures`, `getMenu` y
`clientIncludes`, y concatená. Si reemplazás en vez de extender, perdés las tablas,
procedimientos y módulos que aporta el framework (login, usuarios, etc.).

**Los permisos se resuelven en el menú y en cada tabla**, a partir del `context`.
Ese es el lugar previsto: no inventes un middleware de permisos aparte.

Otros métodos disponibles (verificables en `backend-plus.d.ts`):

| método | uso |
|---|---|
| `appendToTableDefinition(tabla, fn)` | agregarle campos o details a una tabla que define otra capa |
| `clientIncludes(req, opts)` | qué `.js` y `.css` se sirven al navegador |
| `addLoggedServices()` | endpoints Express que requieren usuario logueado |
| `addUnloggedServices(app, baseUrl)` | endpoints sin login, sin acceso a la sesión |
| `addSchrödingerServices(app, baseUrl)` | endpoints que funcionan con y sin login (con `req.user` si lo hay) |
| `postConfig()` | arranque: pools propios, tareas periódicas |
| `isAdmin(reqOrContext)` | si el usuario es administrador |
| `inDbClient(req, fn)` / `inTransaction(req, fn)` | ejecutar con conexión o dentro de una transacción |
| `shutdownCallbackListAdd({message, fun})` | cerrar ordenadamente recursos propios |
| `sendMail(opts)` | enviar correo (requiere `mailer` configurado) |

> Si abrís un recurso propio en `postConfig` (un pool, un intervalo), registrá su cierre
> con `shutdownCallbackListAdd`. Si no, el proceso no termina limpio y los tests quedan colgados.

---

## Definición de tablas

Un `table-*.ts` exporta una función que recibe el `context` y devuelve la definición.
Recibe el contexto porque **los permisos suelen depender del usuario**.

```ts
import {TableDefinition, TableContext} from "./types-mi-app";

export function clientes(context:TableContext):TableDefinition {
    var {es} = context;
    return context.be.tableDefAdapt({
        name:'clientes',
        elementName:'cliente',
        title:'clientes',
        editable:es.supervisor,
        fields:[
            {name:'cliente'      , typeName:'integer', sequence:{name:'clientes_seq'} },
            {name:'razon_social' , typeName:'text'   , isName:true, nullable:false    },
            {name:'activo'       , typeName:'boolean', defaultValue:true              },
            {name:'provincia'    , typeName:'text'                                    },
        ],
        primaryKey:['cliente'],
        foreignKeys:[
            {references:'provincias', fields:['provincia']}
        ],
        detailTables:[
            {table:'facturas', fields:['cliente'], abr:'F', label:'facturas'}
        ],
        sortColumns:[{column:'razon_social'}],
    }, context);
}
```

### Propiedades de la tabla (`TableDefinition`)

| propiedad | uso |
|---|---|
| `name` | nombre de la tabla en el sistema (y en la base, si no se indica `tableName`) |
| `title` | título de la grilla |
| `elementName` | nombre en singular, para los mensajes al usuario |
| `editable` | permiso general de edición |
| `allow` | permisos finos: `{insert, update, delete, select, filter, import, export}` |
| `fields` | lista de campos |
| `primaryKey` | lista de nombres de campo |
| `foreignKeys` | `{references:'tabla', fields:['campo']}` |
| `softForeignKeys` | igual, pero sin crear la FK en la base |
| `constraints` | `{constraintType:'unique'\|'check', fields, expr, consName}` |
| `detailTables` | subgrillas maestro/detalle |
| `sortColumns` | orden predeterminado: `{column:'c', order:-1}` |
| `filterColumns` | filtro predeterminado: `{column, operator, value}` |
| `sql` | SQL para casos especiales (`where`, `fields`, `postCreateSqls`) |

El `consName` de una constraint **se le muestra al usuario** cuando la viola. Escribilo
como un mensaje entendible, no como un identificador técnico. Por eso conviene usar varias
constraints chicas en lugar de una grande.

### Propiedades de los campos (`FieldDefinition`)

| propiedad | uso |
|---|---|
| `name` | nombre en la base y id del campo |
| `typeName` | `text`, `integer`, `bigint`, `boolean`, `date`, `timestamp`, `decimal`… |
| `title` | título en la grilla si no querés el `name` |
| `nullable` | `false` marca el campo como obligatorio (se muestra con estrella) |
| `editable` | si el usuario puede modificarlo |
| `visible` | si se muestra de entrada |
| `isName` | el campo se muestra al lado de las FK que apuntan a esta tabla |
| `inTable` | `false` si es calculado y no existe físicamente |
| `sequence` | valor autoincremental |
| `defaultValue` | valor por omisión constante |
| `defaultDbValue` | expresión SQL por omisión, a nivel de la base |
| `specialDefaultValue` | valor calculado, por ejemplo `'current_user'` |
| `clientSide` | nombre de la función del frontend que dibuja la celda |

### Campos calculados

Se declara el campo con `inTable:false` y la expresión va en `sql.fields`:

```ts
{
    name: 'estados',
    fields: [
        {name:'estado'      , typeName:'text'                                    },
        {name:'cant_tickets', typeName:'bigint', inTable:false, editable:false   },
    ],
    primaryKey: ['estado'],
    sql:{fields:{
        cant_tickets:{ expr:`(SELECT count(*) FROM tickets t WHERE t.estado = estados.estado)` }
    }}
}
```

### Una grilla basada en otra

Para variar permisos o filtros sin repetir la definición:

```ts
export function clientes_activos(context:TableContext):TableDefinition {
    var defTable = context.be.tableStructures.clientes(context);
    defTable.name = 'clientes_activos';
    defTable.title = 'clientes activos';
    defTable.table = 'clientes';       // usa la misma tabla física
    defTable.sql.where = "(activo = true)";
    return context.be.tableDefAdapt(defTable, context);
}
```

> **Atención:** para basar una grilla en otra, **no** hay que llamar a `tableDefAdapt`
> en la tabla base. La llamada va solo en la redefinida.

---

## Procedimientos

Un procedimiento es la lógica que **no** es CRUD: un cálculo, un proceso masivo, un reporte,
o cualquier cosa que el frontend necesite pedirle al servidor.

```ts
{
    action:'facturas_del_mes',
    parameters:[
        {name:'mes', typeName:'date'},
    ],
    coreFunction: async function(context:ProcedureContext, parameters){
        var result = await context.client.query(
            `SELECT count(*) as cantidad FROM facturas WHERE date_trunc('month', fecha) = $1`,
            [parameters.mes]
        ).fetchUniqueRow();
        return result.row;
    }
}
```

`ProcedureDef` (en `backend-plus.d.ts`) acepta:

| propiedad | uso |
|---|---|
| `action` | nombre con el que se invoca (y con el que se lo llama desde el cliente) |
| `parameters` | `{name, typeName, defaultValue, label, references, description}` |
| `coreFunction(context, parameters)` | la implementación |
| `roles` | roles habilitados |
| `unlogged` | accesible sin login (responde a POST, pensado para AJAX) |
| `cacheable` | el resultado depende solo de los parámetros |
| `resultOk` | nombre de la `wScreen` que dibuja el resultado |
| `proceedLabel` | texto del botón |
| `forExport` | `{fileName, csvFileName}` para devolver XLSX o CSV |
| `bitacora` | `{always, error}` para registrar las ejecuciones |
| `progress` | habilita informar progreso con `context.informProgress` |
| `files` / `multipart` | para recibir archivos |

En `coreFunction`, `context.client` es la conexión a la base (`pg-promise-strict`).
Los métodos habituales son `.fetchAll()`, `.fetchUniqueRow()`, `.fetchUniqueValue()`
y `.execute()`. **Siempre parametrizar con `$1`, `$2`** — nunca concatenar valores en el SQL.

Para errores esperables (que el usuario debe ver como mensaje, no como crash),
lanzá un error con `code`; el framework lo transporta hasta el navegador.

---

## Procedimientos y `my.ajax`: el circuito completo

Esta es la parte que más conviene entender, porque conecta las dos mitades de la aplicación.

**Cada procedimiento del servidor es automáticamente invocable desde el navegador** como
`my.ajax.<action>(params)`. No hay que escribir ni una ruta, ni un `fetch`, ni un handler:
alcanza con que el procedimiento esté declarado en `getProcedures()`.

```ts
// SERVIDOR — procedures-mi-app.ts
{
    action: 'calendario_persona',
    parameters: [
        {name:'idper', typeName:'text'   },
        {name:'annio', typeName:'integer'},
        {name:'mes'  , typeName:'integer'},
    ],
    coreFunction: async function(context:ProcedureContext, params){ /* ... */ }
}
```

```ts
// CLIENTE — se invoca por el nombre de la action
const dias = await my.ajax.calendario_persona({idper, annio, mes});
```

El objeto se llama `my.ajax` (o `myOwn.ajax`, o `conn.ajax` si recibís un `Connector`
como prop en un componente React: los tres son el mismo mecanismo).

### Cómo se tipa

`frontend-plus` declara la interfaz `BEAPI`, que ya trae los procedimientos integrados
del framework:

| procedimiento integrado | uso |
|---|---|
| `table_data({table, fixedFields, paramfun})` | leer filas de una tabla |
| `table_structure({table})` | traer la definición de una tabla |
| `table_record_save({table, primaryKeyValues, newRow, oldRow, status})` | grabar un registro |
| `option_lists({table})` | listas de opciones para los combos |

Para que tus propios procedimientos estén tipados, **extendé `BEAPI`** con `declare module`
del lado del cliente:

```ts
// CLIENTE
declare module "frontend-plus" {
    interface BEAPI {
        calendario_persona: (params:{idper:string, annio:number, mes:number})
            => Promise<CalendarioResult[]>;
        info_usuario: () => Promise<InfoUsuario>;
    }
}
```

A partir de ahí el editor autocompleta `my.ajax.calendario_persona` y verifica parámetros
y resultado.

### Contratos compartidos en `common/`

Escribir el tipo dos veces (una en el servidor y otra en el cliente) es una fuente segura
de desincronización. La forma de evitarlo es declarar el contrato una sola vez en
`src/common/contracts.ts` y que las dos puntas lo importen. Con
[guarantee-type](https://github.com/emilioplatzer/guarantee-type) el contrato sirve
además para **validar en runtime**, no solo para tipar:

```ts
// COMMÚN — src/common/contracts.ts
import { DefinedType, is } from 'guarantee-type'

export const calendario_persona = {
    procedure: 'calendario_persona',
    parameters: is.object({
        idper: is.string,
        annio: is.number,
        mes:   is.number,
    }),
    result: is.object({
        fecha:    is.Date,
        dia:      is.number,
        cod_nov:  is.string,
        novedad:  is.string,
        fichadas: is.nullable.string,
    })
}

export type CalendarioResult = DefinedType<typeof calendario_persona.result>
```

Y las dos puntas derivan sus tipos de ahí:

```ts
// SERVIDOR
coreFunction: async function(
    context:ProcedureContext,
    params:DefinedType<typeof calendario_persona.parameters>
){ /* ... */ }
```

```ts
// CLIENTE
declare module "frontend-plus" {
    interface BEAPI {
        calendario_persona:
            (params:DefinedType<typeof ctts.calendario_persona.parameters>)
                => Promise<ctts.CalendarioResult[]>;
    }
}
```

Así, cambiar el contrato rompe la compilación en los dos lados a la vez, que es
exactamente lo que se quiere.

> **`CoreFunctionParameters` es genérico**: se usa como `CoreFunctionParameters<T>`.
> En la práctica conviene tipar los parámetros con el contrato
> (`DefinedType<typeof x.parameters>`) en vez de usarlo pelado.

### Qué procedimiento llamar para leer una tabla

Si solo necesitás las filas de una tabla, **no escribas un procedimiento nuevo**:
usá `table_data`, que ya existe y respeta los permisos.

```ts
const annios = await my.ajax.table_data<Annio>({table:'annios', fixedFields:[], paramfun:{}});
```

Escribí un procedimiento propio cuando hay un cálculo, un join no trivial, una regla
de negocio o una escritura que no es el alta/baja/modificación simple de una fila.

---

## Menú

```ts
{menuType:'menu', name:'ventas', menuContent:[
    {menuType:'table', name:'clientes'},
    {menuType:'table', name:'activos', table:'clientes_activos', label:'clientes activos'},
    {menuType:'proc' , name:'facturas_del_mes', label:'facturas del mes', autoproced:true},
]}
```

| `menuType` | uso |
|---|---|
| `menu` | menú o submenú (usa `menuContent`) |
| `table` | una grilla |
| `proc` | un procedimiento |

Para que un procedimiento se ejecute al entrar (sin apretar el botón), todos sus parámetros
obligatorios necesitan `defaultValue`, y la opción de menú lleva `autoproced:true`.

Las aplicaciones pueden definir además sus propios `menuType` para pantallas propias
(por ejemplo una pantalla React registrada como `wScreen`).

---

## Configuración

La configuración estática va en el código (YAML como string) y se pasa a `setStaticConfig`.
Cada instalación la sobreescribe con `local-config.yaml`.

```yaml
server:
  port: 3000
  base-url: /mi-app
db:
  motor: postgresql
  host: localhost
  database: mi_app_db
  schema: mi_app
  user: mi_app_user
login:
  table: usuarios
  userFieldName: usuario
  passFieldName: md5clave
  rolFieldName: rol
  infoFieldList: [usuario, rol]
client-setup:
  title: Mi aplicación
  lang: es
  menu: true
```

> **`local-config.yaml` no va al control de versiones**: tiene contraseñas y datos
> propios de cada instalación. Verificá que esté en `.gitignore` antes de crearlo.

La variable de entorno `BACKEND_PLUS_LOCAL_CONFIG` permite un tercer archivo YAML,
útil para correr dos instancias desde la misma carpeta.

---

## Frontend

El frontend estándar lo genera el framework. Se lo extiende por puntos definidos,
no reescribiéndolo.

```ts
// dibujar una celda a medida (se declara con clientSide:'link_a_factura' en la tabla)
myOwn.clientSides.link_a_factura = {
    prepare:function(_depot, _fieldName){ },
    update:function(depot, fieldName){
        var td = depot.rowControls[fieldName];
        td.innerHTML = '';
        if(depot.row.factura){
            td.appendChild(html.a({href:`menu#w=facturas&ff=,factura:${depot.row.factura}`},
                `${depot.row.factura}`).create());
        }
    }
}

// obligatoriedad condicional (se declara specialValidator:'provincias' en la tabla)
myOwn.validators.provincias = {
    getMandatoryMap(row){
        return {
            localidad: row.provincia != 'CABA',
            comuna:    row.provincia == 'CABA',
        }
    }
}

// condición para mostrar u ocultar el detail de una fila
myOwn.conditions.noCABA = function(depot){
    return depot.row.provincia != 'CABA';
}
```

Los módulos que se sirven al navegador se declaran en `clientIncludes`, extendiendo
lo que ya trae el framework:

```ts
override clientIncludes(req:Request|null, opts:OptsClientPage):ClientModuleDefinition[]{
    return [
        { type:'js', module:'react', modPath:'umd',
          fileDevelopment:'react.development.js', file:'react.production.min.js' },
        ...super.clientIncludes(req, opts),
        { type:'js' , file:'client/mis-pantallas.js' },
        { type:'css', file:'menu.css' },
    ];
}
```

Para abrir una grilla programáticamente desde una pantalla propia:

```ts
var mi_grilla = my.tableGrid('clientes', divGrilla, {
    fixedFields:[{fieldName:'activo', value:true}],
    tableDef:{
        title:'clientes activos',
        hiddenColumns:['saldo'],
        allow:{delete:false, insert:false},
    }
});
```

> Los cambios que se hacen en `tableDef` desde el cliente son **solo de presentación**.
> El servidor sigue aplicando sus propios permisos: no son un mecanismo de seguridad.

---

## Diagnóstico

| síntoma | qué mirar |
|---|---|
| error de SQL en pantalla | `last-pg-error-local.sql` en la raíz del proyecto |
| quiero ver todo el SQL ejecutado | `log: db: on-demand: true`, entrar a `URLbase/--log-db`, mirar `local-log-all.sql` |
| un `.js` o `.css` no llega al navegador | `npm start -- --dump-includes` para ver la lista de módulos incluidos |
| un procedimiento no aparece en `my.ajax` | verificá que esté en `getProcedures()` y que llamaste a `super.getProcedures()` |

---

## Cuándo parar y preguntar

Estas situaciones casi siempre significan que el camino elegido no es el previsto.
Pará y consultá en vez de seguir:

- Estás por modificar algo dentro de `node_modules/backend-plus`.
- Estás escribiendo SQL de `INSERT`/`UPDATE`/`DELETE` para algo que una grilla ya hace.
- Estás por escribir un `fetch` o una ruta Express para algo que un procedimiento resuelve.
- Estás por leer el código fuente del framework para descubrir cómo esquivar lo que la
  documentación dice que hay que hacer.
- Una propiedad que necesitás no aparece en `backend-plus.d.ts`.
- Vas a duplicar en TypeScript una regla que ya está en un trigger o una función de la base.
- La documentación dice una cosa y el comportamiento observado es otro: eso es una
  contradicción en una fuente de verdad y hay que resolverla en el origen, no rodearla.

---

## Referencia

La documentación completa del framework está en `node_modules/backend-plus/doc/`:

| archivo | contenido |
|---|---|
| `definicion-tablas.md` | todas las propiedades de tablas y campos |
| `definicion-modulos.md` | `clientIncludes` |
| `grillas.md` | grillas desde el menú, desde `wScreens` y basadas en otras |
| `preguntas_frecuentes.md` | recetas concretas, muy útil |
| `reportes-conteo.md` | reportes de conteo |
| `casos-save-record.md` | cómo se resuelven los conflictos al grabar |

Y la fuente de verdad de la API es `node_modules/backend-plus/lib/backend-plus.d.ts`
(y `node_modules/frontend-plus/dist/lib/frontend-plus.d.ts` para el lado del cliente).
Ante una duda entre la documentación y el `.d.ts`, **manda el `.d.ts`** — pero avisá
de la discrepancia en vez de resolverla en silencio.
