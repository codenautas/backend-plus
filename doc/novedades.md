# novedades de _backend-plus_

**2.5.2-betha.4** se agrega allowedHosts a nivel configuración en server, es un array de strings con los dominios permitidos para acceder por api, ej: localhost, undominio.com, etc

**v2.2.2** _Los tres patitos_. Por error se ocultaban campos relacionados débilmente (en rango definido con `until`).

**v2.0.8** se agrega la cláusula `where` a la `exclude` contraint.

**v2.0.1** se agrega el tipo de contraint `exclude` igual que postgres

**v2.0.0** Las principales incompatibilidades con las versiones 1.x son la ubicación de algunas tablas.
bitacora, tokens, locks y summaries ahora están en el esquema _his_.
Las aplicaciones basadas en _backend-plus_ deberían mover a _his_ tablas con logs,
opciones de usuario y datos temporales (caches).
Haciendo eso el esquema principal solo cambia con datos sustantivos.
Un backup que exlcuya el esquema _his_ debería servir para funcionar correctamente
(porque solo se exluye información temporaria o de auditoría).

Los suguientes cambios vienen con la versión 2.0.0:
   * Se agregar un registro de inicios de sesión (procedure = "@login" en la tabla bitácora).
   * En local-config, _true_ en `install.dump["drop-his"]` implica agregar `drop schema his` en el `local-db-dump.psql`.
   * Se agrega `fieldDef.allwaysShow` para que no se oculte en subgrillas cuando es el campo relacionado
   * `be.getDataDumpTransformations(rawData)` sirve para transformar datos de un dump en el nuevo `local-db-dump.psql` 
   en un deploy de una nueva versión que incluye cambios en la base de datos que necesitan cambios en los datos. 
   * el parámetro `pick` procedimiento `table_data` recibe un string que busca en todos los campos (búsqueda global)
   * incluye automáticamente todos los archivos `install/*-fun.sql`
   * la función `be.shutdownCallbackListAdd(f)` sirve para agregar funciones de limpieza. 
   Si bien una aplicación _Backend-Plus_ está destinada a correr por siempre, 
   se podría tener una manera elegante de terminarla sin matar el servicio,
   además se necesita poder apagar la aplicación cuando se están corriendo casos de prueba.
   `be.shutDownBackend` es la función que se usa para apagar el servidor, 
   esa función se encarga de llamar a todas las funciones de limpieza. 
   * en `local-config` `install.dump.scripts.pre-adapt` se puede poner la lista de `.sql` que hay que correr después de insertar los datos.
   * en `defConfig` se puede indicar la versión mínima necesaria de postgres en `db.min-version`

**v2.0.0-beta1** Se prepara una nueva versión de backend-plus con cambios que requieren 
ajustes en los sistemas basados en la **v1**. Cambia la tabla bitácora de lugar
(las tablas de bitácoras, históricos, tokens, estados del frontend, preferencias de usuario,
y otras no asociadas a las reglas del _negocio_ hay que pasarlas al esquema _his_).

La bitácora incluyee el registro de inicio de sesión `@login`.

**v1.19.6** Las columnas de una subgrilla que relacionan con la grilla principal están ocultas.
Desde esta versión esas columnas son editables (lo que permitiría cambiar un subregisto y 
hacerlo depender de otro registro de la tabla principal). 

**v1.19.3** Se agrega la posibilidad de definir programáticamente qué usuarios tienen permiso
para cambiar la clave de otros usuarios. Por defecto son los que tiene rol=admin.
La aplicación puede sobreescribir la función `canChangePass(context, user)` para indicar
si el usuario del contexto actual puede cambiar la del usuario `user`. 

**v1.19.0** Se arregla la exportación de fechas en XLSX.

**v1.18.13** Se despliega la URL en modo "user friendly" (minimizando caracteres que necesitan encoding
como las comillas).

**v1.18.8** Se agrega el parámetro td a la URL para poder enviar configuraciónes de TableDef a las grillas.
(configuraciones que se permitan desde el front-end).

**v1.18.7** Se agrega la posibilidad de definir un `tablespace` a la configuracion de la base de datos si es necesario crear la base dentro de un tablespace específico

**v1.18.0** Se agrega en la definición de columnas de las tablas `nameForUpsert`. Se usa en las tablas
compuestas basadas en consultas complejas editables que actualizan más de una tabla, 
cuando se quiere actualizar una columna cuyo nombre original no corresponde con el `'name'`. 

**v1.17.17** Se agrega el parámetro `--dump-includes` para mostrar al arrancar los módulos que se sirven y
se incluyen en el _front-end_. 

**v1.17.14** Se mejora la seguridad cambiando el módulo `xlsx-style` (que dejó de tener actualizaciones) por `xlsx`

**v1.17.4~13** Se mejora el auto refresco en las grillas para respetar el orden cuando aparecen nuevos renglones,
y señalizar con color los nuevos renglones. 

## Filtros en grillas

Todas las grillas se pueden fltrar con el botón filtro. Al presionar el botón aparece una línea donde escribir
los filtros, por defecto la operación es búsqueda por similar (parcial del texto). 
Si en la línea de filtro hay dos valores se deben cumplir ambos (operación AND). 
Si se desea que cumpla uno u otro filtro (no ambos a la vez o sea operación OR) se pueden agregar renglones al filtro. 

**v1.6.5** Además permite borrar líneas del filtro (cuando se agregaron para OR y no se necesitan más). 

**v1.6.4** Se mejora la búsqueda con acentos y mayúsculas y minúsculas.


## Acciones auotmáticas al finalizar un procedimiento

Al final del procedimiento cuando se llama desde el menú aparece el mensaje de lo devuelto bajo el botón de procesar. 
O en rojo el mensaje de error si hubo una excepción. Esto se puede cambiar especificando en `resultOk` una función
del front-end que reciba la respuesta y ejecute una función del lado del cliente especificada en:

```ts
myOwn.wScreens.proc.result.nombre_nueva_funcion = function<T>(result:T, divResult:HTMLDivElement){
  ///...
}
```

Además hay comportamientos predefinidos:

**v1.17.0** Se agrega un caso especial para `showDownloadUrl`, se puede definir un procedimiento como `forExport` 
para que gestione la transformación de los datos resultantes en un archivo `xlsx` o `csv`, la respuesta tiene
que tener el formato `{title:string, rows:Record<string,any>}[]`. Ver [preguntas frecuentes](preguntas_frecuentes.md#¿cómo-hacer-un-procedimiento-que-devuelva-un-archivo-excel-o-csv)

**v1.13.1** `showDownloadUrl` muestra un link para hacer download, la respuesta tiene que tener el formato `{url:string}`

**v1.1.0** `showGrid` muestra una grilla `result:{tableName:string, ...opts}` donde opts es el tercer parámetro de `myOwn.tableGrid` 

**v1.6.1** `showText` muestra el contenido json (en una tabla recursiva) `result:string|object`

**v0.18.6** `showError` muestra un mensaje de error en rojo `result:Error|{message:string}`

**v0.18.6** `showText` muestra un texto en verde `result:string`

## Aggregates en grillas

Las grillas pueden calcular sumas, promedios y cualquier otro tipo de resumen al pie de la grilla. 
Para eso en la definición del campo de una tabla se puede definir el atributo `aggregate`, 
que puede ser `sum`, `avg` o alguno definido dentro de la aplicación.

```ts
    {name:'importe', typeName:'decimal', aggregate:'sum'},
    {name:'cantidad', typeName:'bigint', aggregate:'promedioArmonico'}
```

Para definir un aggregate nuevo se deben definir en el cliente las operaciones `result` y `acum`. 
Por ejemplo para definir el promedio armónico:

```ts
myOwn.TableAggregates.promedioArmonico = function(){
    this.n=0;
    this.sumInv=0;
    this.error=false;
    this.acum=function acum(value){
        if(value!=null){
            if(value==0){
                this.error = true;
            }else{
                this.n++;
                this.sumInv+=1/value;
            }
        }
    }
    this.result=function result(){
        if(!this.n) return null;
        if(this.error) return Number.NaN;
        return this.n/this.sum;
    }
};
```

**v1.11.19** se agrega `countTrue` que cuenta cuántos casos hay con true
**v0.30.20** se agregan `max` y `min`
**v0.26.3** se agrega `count`
**v0.20.22** primera version con `sum`, `avg` y `TableAggregates` programables

## _Typescript_ en backend-plus

Backend-plus se puede usar con _Typescript_ gracias a la declaración de tipos de 
`./lib/backend-plus.d.ts` que se importa automáticamente e impacta en los fuentes del backend. 
Para tener tipos en el cliente se puede incluir el paquete `types.d.ts` en las
`devDependencies` del `package.json` y agregar la definición de módulos en `tsconfig.json`
opción `typeRoots`:

```json
{
    "compilerOptions": {
        "outDir": "../../dist/unlogged",
        "inlineSourceMap": true,
        "inlineSources": true,
        "typeRoots" : ["node_modules/@types", "../../node_modules/types.d.ts/modules"],
        "lib": ["es5", "dom", "ES2015"],
        "target": "es2018",
        "jsx": "react"
    },
    "include":[
        "."
    ],
    "extends": "../../tsconfig-common.json"
}
```

**v1.11.16** se agrega el paquete `"cast-error"` para tener catch fuertemente tipados:

```ts
import { expected, unexpected } from "cast-error"
// ...

try{
  // ...
}catch(err){
  var error = unexpected(err); // error es de tipo Error & {code:string}
  console.log(error.code);
  throw error;
}

La diferncia entre `expected` o `unexpected` es que el segundo escribe en `console.log`.
Ambas puede recibir un segundo parámetro con una clase derivada de `Error` 
para indicar el tipo esperado; si el tipo no es el esperado se agrega 
(en ambos casos) un renglón en `console.log` avisando. 

```

```js
import * as castError from "cast-error"

try{
  // ...
}catch(err){
  var error = castError.expected(err, TypeError); // si error no es de tipo TypeError avisa en console.log
  console.log(error.message);
  throw error;
}
```

## Tecla <kbd>F4</kbd>

La tecla <kbd>F4</kbd> cuando el curor está detenido en una celda de una grilla 
hace una copia del valor de la celda superior y avanza el cursor a la línea siguiente.
La acción se realiza sobre el cursor.

**v1.11.5** <kbd>F4</kbd> también se puede usar en botones dentro de la grilla. 
Si un botón está en foco <kbd>F4</kbd> hace click en el botón y manda el foco al botón siguiente.
Si no hay botón en foco pero se presionó un botón en forma reciente 
<kbd>F4</kbd> manda el foco al botón siguiente.

## Nuevo framework _backend-chi_

_Backend-plus_ se va a poder usar utilizando todo el poder de _Typescript_ gracias a 
[_backend-chi_](https://github.com/codenautas/backend-chi). 

Por ahoracon  _backend-chi_ se pueden crear tablas de modo que:
   * las _Fk_ y los _DetailTables_ se deduzcan automátcamente y
   * se genere el tipo subyacente del registro almacenado en el campo.

## Secuencias `GENERATED AS IDENTITY` para valores autonuméricos

Ahora _backend-plus_ usa [`GENERATED { ALWAYS | BY DEFAULT } AS IDENTITY ( sequence_options )`](https://www.postgresql.org/docs/current/sql-createtable.html) 
para generar secuencias cuando no se especifica el nombre de la misma en la opción del campo `{sequence:{name:}}`.

**v1.10.7** Se pueden usar `.tab` en formato `YAML` para campos `generated as identity`

**v1.10.3** Cuando se levanta información de un .tab para poblar una tabla con una secuencia `GENERATED AS IDENTITY`
en vez de generarse instrucciones `INSERT TO` (que no están permitidas en este caso), 
se generan instrucciones `COPY FROM STDIN` que permiten especificar valores para campos secuencias. 
Esto trae como desventaja que el `local-db-dump.sql` no puede enviarse en una conexión común (ej: pgAdmin) 
puede usarse el `psql` por línea de comandos para estos casos:

```sql
psql -v ON_ERROR_STOP=on --single-transaction --pset pager=off --quiet --file=local-db-dump.sql databasename
```

Ya no se pueden usar `.tab` en formato `yaml` con `array` de `object` para estos casos. 
Para las tablas que no tengan campos de este tipo se siguen generando `INSERT` y 
se pueden usar `.tab` separados por `|` o `yaml` con `array` de `object`.

**v1.8.7** Se introducen las secuencias `GENERATED AS IDENTITY` cuando no está especificado el nombre en `{sequence:{name:}}`.
Se pueden seguir usando las anteriores en los casos que se quiera compartir una secuencia con dos tablas o prefijarse el valor
generado en un campo de texto. 

Lo recomendado es no usar secuencias y en caso de usarlas 
usar secuencias `GENERATED AS IDENTITY` tienen como principal ventaja que 
el ownership y los permisos de la secuencia no se definen por separado. 

**v1.5.5** Los campos definidos como `generatedAs` no son importados de los `.tab`

## Fechas con idioma Español

**v1.11.15** Se mitiga el bug de Firefox que no permite crear fechas exactas los
días que hubo cambios horarios (vía `best-globals` v1.0.0).

**v1.8.6** Independientemente del idioma en que se haya instalado la base de datos 
cuando se configurea la aplicación en español reconocerá las fechas como `dd/mm/yyyy` 
cuando no lleguen como `yyyy-mm-dd`.

**`local-config`**
```yaml
client-setup
  lang: es
```


## Envío de mails

**v1.10.0** Backend plus puede enviar mails para recupera la contraseña y 
para avisarle a un operador que el sistema ha reiniciado o no ha podido levantarse. 
Todavía está en etapa de experimenetación y requiere poder conectar el server a un
servicio SMTP. 

## Importación de datos iniciales

**v1.10.2** En vez de incluir en el `local-db-dump.sql` los archivos `.tab` de la carpeta `./install`
se podía especificar en `local-config` en la opción `install.table-data-dir` la ruta a otro lugar. 
A partir de esta versión se puede usar un arreglo de direcciones. Por ejemplo:

```yaml
install:
  table-data-dir:
    - /temp/devel-data/common
    - /temp/devel-data/example1
```

**v1.5.22** Los archivos `.tab` pueden contener el [BOM de UTF8](https://es.wikipedia.org/wiki/Marca_de_orden_de_bytes)

**v1.5.13** En los archivos `.tab` se reconoce el caracer `\` como escape del separador `|` 
y con el significado usual para `\\`, `\t`, `\n` y `\r`.

**v1.4.3** Permite importar un archivo que solo tiene especificadas las _primary key_ 
(antes no permitía porque entendía que no había nada que actualizar). 
Se usa para insertar registros nuevos. 

**v0.30.4** Se agrega la opción `install.table-data-dir`.

**v0.29.26** Se muestra el número de renglón cuando se detecta un error de importación.


## Pantalla de login

**v1.16.8** Al presionar <kbd>Enter</kbd> en la pantalla de login se va al próximo campo vacío o se acepta la página. 

**v1.9.3** En la pantalla de login un logo que identifica al sistema. 
Esto mejora la usabilidad cuando los mismos usuarios utilizan varios sistemas basados en _backend-plus_. 

El logo que está a la derecha que tiene forma de tecla enter ahora es clickeable y sirve para loguearse.
Esta mejora surgió de una revisión de UX con usuarios del sistema en tabletas de 7".

El logo debe estar en `client/img/login-logo-icon.png` (sí a pesar de estar en `client` es visibile `unlogged`).
En caso de no encontrarse la imagen ahí _backend-plus_ busca en otros lugares donde suele haber logos. 

**v0.31.2** El nombre de usuario se puede ingresar con mayúsculas y minúsculas (y se pasa a minúscula para validarlo).
Esto se hace parea mejorar la experiencia de usuario en los dispositivos móviles que arrancan automáticamente
los textos en mayúsculas. 

**v0.29.32** Al desloguearse el link a login contiene la URL para volver a loguearse en el mismo lugar.


## Tipos de archivo que se sirven automáticamente

Los archivos de las carpetas `client` (en el caso de que el usuario esté logueado) y de la carpeta `unlogged` 
son enviados automáticamente si tienen alguna de las extensiones permitidas:

```js 
var fontExts = [ 'jfproj', 'ttf', 'pfa', 'woff', 'woff2', 'fnt', 'fot', 'otf', 'odttf', 'fon']
var imgExts =  ['jpg', 'png', 'jpeg', 'ico', 'gif','svg']
var otherExts = ['', 'js', 'map', 'html', 'css', 'appcache', 'manifest', 'json', 'webmanifest', 'zip', 'pdf']
```

**v1.11.15** Se agregó `.pdf` para los sistemas de indicadores y la documentación en general.

**v1.10.15** Se agregó `.svg`.

**v1.8.4** Se agregó `.zip`.

**v1.8.1** Se agregaron las extensiones para _fonts_.

**v0.31.8** Se agregó el `.json`

## Detección de navegadores obsoletos en el login

En la pantalla de login se hacen algunos controles de compatibilidad para detectar navegadores viejos 
y avisarle al usuario.

Los principales controles son:
   * `cookies` habilitadas
   * acceso a `localStorage` y `sessionStorage`
   * soporte para `serviceWorker`
   * _arrow functions_ (`=>`)

**v1.7.4** Permite al usuario loguearse aunque se detecten algunas incompatibilidades avisándole que el navegador no es compatible.

**v1.7.3** Empieza el control de compatibilidad.

## Compatibilidad HTTP/401

**v1.16.6** se agrega el manejo de `/login?return-to-url=` para volver después del login a la URL anterior.

**v1.7.0** Cuando un archivo no se puede servir porque está `unlogged` se envía el código `401` 
y en vez de mostrar la pantalla de login se muestra una pantalla que informa que no está logueado 
(y redirecciona a la pantalla de login).

## Grillas maestro

La definición de `detailTables` en una grilla permite relacionar grillas detalle por cualquier conjunto de campos.

**v1.16.18** Se agrega la posibilidad de mostrar en el título de la grilla los valores de los campos 
que definen la condición de la grilla detalle. En la definición del campo se puede especificar 
`toCaption:'labeled'` para que aparezca el nombre del campo y su valor o 
`toCaption:'alone'` para que solo se vea el valor o `toCaption:'smart'` para que decida según el tipo.
También se puede definir en a nivel de la definición globa poniendo en `client-side.grid-smart-caption` 
alguno de esos 3 valores y valen como valor por defecto de la aplicación. 

**v1.12.4** Se permite relacionar contra constantes:
```ts
{name:'detail_table', fields:[{target:'linea', value:1}], label:'primer detail'}
```

**v1.6.17** Se permite relacionar valores en null 
(solo tiene sentido cuando alguno de los campos de ambas tablas no forma parte de las respectivas `primary keys`). 
También se puede usar el parámetro `fixedFields` en la construcción de las grillas (función `tableGrid`) 
que corresponde al parámetro abreviado `ff` de la _url_ de las grillas.

Un posible caso de uso es el despliegue de grillas de tablas cuando cierto campo en `null` representa un pendiente.
En el siguiente ejemplo se ve una opción de menú: 

```ts
{menuType:'table', name:'pendientes', table:'tareas', ff:[{fieldName:'estado', value:null}]}
```

**v1.5.4** Se agrega la definición `refreshFromParent` a `detailTables` para indicare que 
una actualización de la tabla maestra debe realizar un refresco de la tabla detalle.

## Campos not null

Los campos `not null` (definidos como `{nullable:false}` en la definición de la tabla) tienen dos efectos:
   * en las grillas lo marca como obligatorio el campo y no envía un `table_record_save` hasta que no se llene
   * al generar el `local-db-dump` se genera la restricción `NOT NULL`

**v1.10.4** se arregla un bug en la generación de la cláusula `NOT NULL`

**v1.6.16** se agrega `dbNullable` que indica que el campo no es obligatorio en la grilla pero sí está la restrcción en la base. 
Se usa por ejemplo cuando el valor es llenado por un trigger cuando se envíe el `table_record_save` en null.

## Procedimientos que insumen mucho tiempo

Cuando un procedimiento demora mucho en enviar resultados la conexión
podría cerrarse por la configuración de algún servidor. 
Para evitarlo _backend-plus_ permite enviar mensajes  de progreso. 

Un procedimiento configurado con `progress:true` recibe en el contexto 
la función `informProgress` que sirve para enviar señales de progreso al cliente. 
Esa señal puede contener un mensaje (para mostrarle al usuario el paso que se está corriendo)
o una cantidad estimada en función de un total (para que muestre un porcentaje de avance).

```ts
{
    action:'buscar_publicacion',
    parameters:[
        {name:'autor', typeName:'text'},
        {name:'texto', typeName:'text'}
    ],
    progress:true,
    uniqueUse:true,
    coreFunction: async function(context:ProcedureContext, parameters:coreFunctionParameters){
        var {client, informProgress} = context;
        var encontrados = [];
        informProgress({message:"contando publicaciones"})
        var {row:{count}} = await client.query(`
            SELECT count(*) FROM publicaciones WHERE autor = $1
        `, [parameters.autor]
        ).fetchUniqueRow();
        informProgress({message:"iniciando la búsqueda", lengthComputable:true, loaded:0, total:count})
        var revisados = 0;
        await client.query(`
            SELECT * FROM publicaciones WHERE autor = $1
        `, [parameters.autor]).onRow((row)=>{
            informProgress({message:"iniciando la búsqueda", lengthComputable:true, loaded:0, total:count});
            for(var [key, value] of Object.entries(row)){
                if(value.contains(parameters.text)){
                    encontrados.push(row);
                    break;
                }
                informProgress({lengthComputable:true, loaded:++revisados, total:count})
            }
        });
        return encontrados;
    }
}
```

**v1.6.15** Se agrega la configuración keep-alive que envía señales en forma automática 
aunque el procedimiento no llame a informProgress (aunque sí tiene que estar configurado como `progress:true`).

**v1.5.12** Se agrega información de progreso en el procedimiento `table_records_delete`.

**`local-config`**
```yaml
server:
  keep-alive: true
```

**v1.6.11** Se puede configurar un procedimiento como `uniqueUse` para que 
el frontend inhabilite el botón de ejecución hasta que el procedimiento termine.


## Que el usuario pueda hacer <kbd>ctrl</kbd>-<kbd>click</kbd> en botones para abrir otra pestaña

En _backend-plus_ se puede hacer <kbd>ctrl</kbd>-<kbd>click</kbd> sobre:
   * una opción de menú para abrir la opción en una nueva pestaña
   * una flechita que abre una grilla de detalle para ver la grilla del detalle en otra pestaña
   * la ejecución del procedimiento para obtener los resultados en otra pestaña. 

También se puede usar en el frontend de _backend-plus_ tiene la funcion `my.createForkeableButton` 
que crea un botón igual al de los menúes que reacciona al <kbd>ctrl</kbd>-<kbd>click</kbd> enviando a una nueva pestaña
utilizando los mismos parámetros que la definición del menú. 

**v1.16.20** Se arregla un error de <kbd>ctrl</kbd>-<kbd>click</kbd> en maestros detalles relacionados por fechas

**v1.6.14** Se puede utilizar el parámetro `i` (que tiene la ruta del menú) en la función `createForkeableButton`

**v1.6.10** Se agrega la función `disable(boolean)` para habilitar/inhabilitar un _forkeable button_

## Lupa en la grillas

En forma predeterminada las columnas de las grillas tienen un ancho máximo. 
Al hacer click sobre una celda aparece una lupa que permite ver el contenido completo del campo. 
A veces, como en el caso de las fechas en campos editables aparece un calendario. 

En el caso de campos que sean _foreign keys_ de otras tablas al entrar en la lupa se ve 
la lista de posibles valores para el campo (y se agregan las columnas `isName:true`). 

<kdb>F9</kbd> es la tecla de método abreviado para la lupa.

**v1.14.8** muestra una imágen en las tablas de referencia cuando tienen un campo `image`
(debe tener el nombre de archivo y encontrarse en `/img`)

**v1.13.1** La lupa también funciona en los formularios automáticos de los procedimientos

**v1.6.9** En campos `jsonb` aparece el contenido en forma tabular.

**v1.5.13** Funciona el despliegue de la tabla relacionada en tablas con campos compuestos.

## Generación de la estructura inicial de la base de datos

Con la opción `npm start -- --dump-db` se genera el archivo `local-db-dump.sql` 
que contiene las instrucciones para crear la base de datos en _postgres_ en base
a la definición de la estructura de las tablas y sus relaciones. 

**v1.16.10** Se agrega la función `dumpDbTableFields` que genera un array de definición SQL de campos.
Eso puede servir para generar _alter tables_ dinámicos para extender las estructuras de las tablas. 

**v1.10.5** Se agrega la extensión `pgcrypto`

**v1.6.6** Se puede hacer una generación parcial (solo para algunas tablas parandos sus nombres como parámetros).

```sh
$ npm start -- --dump-db tablename1 tablename2 tablename3
```

**v1.5.16** Se pueden pasar el nombre de un archivo de coniguración extra (funciona tanto para --dump-db como no).

```sh
$ npm start -- --dump-db --config other-config.yaml
```

**v1.1.0** Se agrega la función `getDbFunctions(opts:DumpOptions):Promise<{dumpText:string}[]>` 
que es invocada al momento de generar la estructura de la base de datos para incluir el texto de creación de las funciones. 

**v0.31.21** Se envía en el parámetro `context` la propiedad `forDump:true` cuando se invoca a `--dump-db`. 
Es necesario cuando se quiere ocultar un campo de la base de datos para que nunca sea enviado al _frontend_;
en ese caso se define `allow: {select: context.forDump}` de modo que se genere al momento del `--dump-db`
pero no esté incluido en los `SELECT fields FROM table` cuando se envíen datos al _frontend_.

**v0.30.20** Se generan vistas cuando se especifica `sql.viewBody`.

**v0.30.14** Se generan las instrucciones de crear extensiones _postgres_ para _gist_ y *pg_trgm*:

**`local-config`**
```yaml
install:
  dump:
    db:
      extensions:
        - gist
        - pg_trgm
```        

**v0.29.29** Cuando un campo es definido con `options:[...]` se genera una constraint que solo
permite valores especificados en la lista de opciones. Si la lista puede cambiar durante la vida del sistema
se sugiere usar una tabla relacionada para almacenar las opciones.

**v0.29.19** Se agrega la opción de configuración `install.dump.db.user4special-scripts` para indicar qué usuario
se usa en los scripts especiales de instalación y deben ser reemplazados luego por el `db.user`.

****

## Orden en las grillas

Las grillas se ordenan siempre, si no está definido el orden se usa el `primaryKey`

**v1.12.1** si no está definido `sortColumns` se usa `sql.orderBy` y si no los campos de `primaryKey`. 
**v1.6.0** si no está definido `sortColumns` se usan los campos de `primaryKey`.

## campos de otras tablas en grillas

Las grillas de _backend-plus_ junto con los campos definidos en la tabla de origen, 
muestran también los campos marcados como `isName:true` de las tablas relacionadas por
`foreignKey` o `softForeignKey`. 

Ese comportamiento se puede cambiar utilizando las opciones `displayFields:[campos...]` y `displayAllFields` 
en la definición de la `foreignKey` o `softForeignKey`.

**v1.16.21** permite definir un campo como `inherited:true` en esos casos si la tabla relacionada tiene un 
campo del mismo nombre el valor del campo se hereda al momento de editar la grilla. Por ejemplo si se tiene
la tabla de ventas (pk: fecha, producto) y la tabla de productos (pk:producto) y en ambas hay un campo oferta
el campo oferta en la tabla productos indicaría que el producto está en oferta en este momento, el campo oferta
en la tabla ventas indica si el producto estaba en oferta en ese momento. Si se utiliza una grilla con `inherited:true`
y las grillas están relacionadas con una FK el valor del campo se hereda automáticamente. Hay que tener cuidado
con reforzar el comportamiento con un trigger (por si la tabla ventas inserta registros desde otras fuentes, 
importación excel o procedimientos). La razón para que este comportamiento exista a nivel del front-end
es para usarlo cuando el registro tiene campos obligatorios que aún no fueron llenados, porque en esos casos
_backend-plus_ no envía los datos a la base de datos hasta tener todos los campos obligatorios de la grilla, 
y es por eso que el trigger no se ejecutó todavía. Ese comportamiento puede ser necesario para mejorar la UX
o para poder colorear o generar comportamientos visuales específicos. 

**v1.6.13** en la definición de un campo se puede especificar `inJoin` con el alias de una tabla o query 2que esté en el from. 
Las tablas que son `foreignKey` y `softForeignKey` están automáticamente en el from de la grilla. 
Se pueden agregar más queries especificando la propiedad `sql.join`. 

**V1.5.21** `displayAllFields` muestra también los campos calculados (marcados como `inTable:false` en la tabla relacionada).

## bitácora

La ejecución de procedimientos puede registrarse en la tabla bitacora definiendo `bitacora.always:true` o `bitacora.error:true`.

**v1.5.20** Se guarda el resultado de la ejeución (lo devuelto por el procedimiento) en la tabla bitácora.

**v1.5.19** Se registran también los procedimientos definidos como `unlogged:true`.

## importación desde Excel y txt

Las grillas de _backend-plus_ permiten la importación de datos desde archivos Excel o txt 
(para los usuarios con permiso de `insert` y `update`). Normalmente se fija (usando la PK)
si el renglón existe (y reemplaza el contenido de todas las columnas) y si no existe
inserta un nuevo registro en la tabla. Cuando una celda está vacía (y el nombre de la columna está)
el valor que exista en la tabla se pisa con un `null`.

**v1.16.0** Se agregan el excel `#cuidado`. Es un formato especial del excel donde se especifica
para cada renglón si se quiere insertar, modificar o borrar colocando en la primera columna de cada fila
`#nuevo`, `#cambio` o `#borrar` respectivamente, y el título de la columna (la celda A1 debe ser `#cuidado`). 
Eso agrega una manera de borrar registros desde el excel y agrega la seguridad de no agregar o no modificar
renglones si eso no se quería (porque se especifica la opción correspondiente). 
Para mejorar la seguridad al importar se puede especificar en la definición de ciertas tablas que solo reciban
excel cuidados poniendo `inputCuidado:true`.

**v1.13.6** Simplifica espacios y fines de línea al importar (muestra la opción en el front-end)

**v1.11.0** Se arregla un problema que en ciertas ocasiones al fallar la importación por la mitad 
el rollback no evitba la inserción del primer registro.

**v1.5.13** Se mejora el informe de progreso al importar.

**v1.5.11** Se permite al usuario elegir saltear los campos que no forman parte de la tabla, 
de no elegir esta opción y si hubiera otros campos la importación se cancelará mostrando un error
con el nombre del campo que no coincide. 

**v1.5.5** Los campos definidos como `generatedAs` son excluidos de la importación

**v1.3.1** Se pueden habilitar `imports.hashConverters:true` en `local-config` para darle a los 
valores importados empezados con `#` un significado especial:
```ts
var hashConverters={
    "#null":null,
    "#''":''
};
```

De esta manera se puede diferenciar entre el valor null y el valor de cadena vacía cuando eso sea necesario. 

**v0.31.25** Saltea líneas en blanco al importar

## exportación a Excel

Las grillas de _backend-plus_ se pueden exportar a Excel o txt cuando el usuario tenga permiso de `export` definido para la tabla.

**v1.5.6** Permite elegir si se quieren o no los campos ocultos, los campos calculados y los readonly 
(para facilitar el uso del archivo para futuras importaciones). 
Se agrega la opción de `.csv` con el significado usual, los archivos `.tab` se separan por `|` y se escapan con `\`.

## funcionamiento _offline_ del frontend

El fontend de los sistemas basados en _backend-plus_ puede funcionar _offline_ cuando a `mainPage` 
se le pasa un `webManifestPath`.

**v1.5.10** Permite ubicar el _webmanifest_ fuera de root.

**v1.5.8** Se agrega el soporte para `webManifest` antes se usaban [_offline apps_](https://caniuse.com/offline-apps).

**v0.31.6** Se parametriza el nombre del manifiesto.

## ejecución en modo desarrollo

Los sistemas _backend-plus_ pueden arrancarse en modo `devel` para facilitar la búsquedad de errores,
obtener más información sobre las corrids o simular problemas del servidor. 

**`local-config`**
```yaml
devel:
  useFileDevelopment: true
  delay: 400
  cache-content: true
  forceShowAsEditable: false
```

**v1.15.1** Cuando `client-setup.background-img` no esté especificado pone el fondo de capacitación
si la url contiene la palabra `capa` o `capacitacion` o el fondo de test cuando contenga `test`, `pru` o `prueba`
y el fondo de desarrollo cuando la url sea `devel` o `desa`. 
Además pone una franja de `caution` (negra y amarilla en diagonal) si el dominio es `localhost`. 

**v1.5.4** La opción `useFileDevelopment` sirve las versiones de _devel_ de los archivos `.js` que van al servidor
cuando están definidos en `clientIncludes` con `fileDevelopment`.

**v0.30.30** Se puede especificar una imagen de fondo para diferenciar las instancia de `devel` 
de la instancia de prueba de la instancia de capacitación de la instancia de producción. 
Se usa configura en `client-setup.background-img`.

**v0.29.52** Cuando en la configuración se pone `server.session-store: memory` en modo `devel` las sesiones
se guardan en disco para no necesitar reloguearse al reiniciar el sistema.

## definición de tablas

La definición de tablas incluye información para:
   * generar los SQL de creación de tablas, sus relaciones y _constraints_,
   * generar dinámicamente las grillas en el _frontend_,
   * generar listas desplegables para campos relacionados y parámetros,
   * generar los SQL de los procedimientos de recuperación y guardado

**v1.17.1** Se agrega la opción `selfRefresh` que refresca toda la grilla después de grabar o borrar un dato. 
Además se mejoran todos los refrescos de modo que se eliminen o agreguen filas si corresponde. 

**v1.16.16** Se puede agregar un filtro a una _unique constraint_. Por ejemplo si se quiere que
en la tabla localidades haya una principal por cada provincia (basándose en el campo lógico `principal`)
se puede escribir en la lista de constraints de la tabla localidades:
```ts
{consType:'unique', fields:['provincia'], where:`principal is true`}
```

**v1.5.3** Se agrega `displayAfterFieldName` para el agregado de un campo proveniente de otra tabla

**v1.4.9** Se agrega la opción `db.allow_double_lodash_fields:true` 
que permite visualizar campos que empiecen con dos `_` en las grillas (si no son invisibles).

**v1.0.0** Se agrega la opción `generatedAs` para campos calculados a nivel de postgres con 
[`GENERATED AS`](https://www.postgresql.org/docs/current/ddl-generated-columns.html).

**v0.31.3** Se agrega la opción `onUpdate` en las `foreignKeys` y como comprtamiento global en 
la configuración de la aplicación en `db.fkOnUpdate: cascade`.

**v0.30.20** Se agregan las funciones de agregación `min` y `max` para los pies de las grillas

**v0.30.15** Se agregan tablas `refrescables` que se actualizan automáticamente 
cuando hay cambios en la base de datos (solo para vistas y tablas _read only_).

**v0.29.20** Se puede definir `constraintsDeferred:true` para guardar datos y calcular las constraints después. 

**v0.29.15** Primera versión de `constraintsDeferred:true` que solo funciona para las restricciones
afectadas por `SET CONSTRAINTS ALL DEFERRED`.

## Grillas

**1.17.1** En `otherTableDefs[tableName]` se puede indicar si esa tabla se graba después de la tabla
principal con `saveAfter:true` (para tablas detail). 
Antes solo se grababa antes (útil para tablas referenciales con FK). 
También se puede definir `prefiledFields`. 

**v0.29.41** Cambia la forma de fijar los títulos de las grills (ahora usa css). 

**v0.29.17** Se marcan los renglones donde está el cursor y donde está el mouse.

**v0.29.0** Se pueden definir grillas basadas en varias tablas con campos editables de modo de 
que cada valor se grabe en la tabla correspondiente. 
Para ello hay que definir el atributo `table` en la columna correspondiente o `tableName` y
definir también a nivel tabla `otherTableDefs[tableName]`

## _URL_ del _frontend_

Las direcciones de la barra de navegación reflejan la opción de menú elegida 
o, en caso de haber hecho <kbd>ctrl</kbd>-<kbd>click</kbd> los parámetros de la grilla o procedimiento. 
Estas _URL_ pueden copiarse para utilizarlas después para llegar al mismo lugar 
(si el usuario está logueado y tiene los mismos permisos). 

**v1.17.0** los valores que son objetos se muestran en un formato mejorado para el usuario 
usando `JSON4all.toUrl` antes se mostraban con `JSON.stringify`. 
Por ejemplo para el parametro `ff` (fixed fields) ahora la URL se ve así:
`https://site.work/app_name/menu#table=name&ff=*,domnio:7,estado:activo,fecha:*2023-02-03`

**v1.4.8** la opción `w` de la URL (que hace referencia a la `wScreen`) ya no es obligatorio
se deduce del nombre del primer parámetro. O sea `?table=usuarios` se entiende como `?w=table&table=usuarios`. 

## Servir dos aplicaciones en el mismo dominio

Utilizar el mismo dominio (sin utilizar subdominios) para servir dos aplicaciones distintas 
es un riesgo entre otras cosas porque se comparte el `localStorage`. 

Se pueden instalar dos aplicaciones _backend-plus_ con distintas `baseUrl` teniendo la precaución
de no mezclar las variables que se guarden en `localStorage`. 

**v1.4.5** se optimizan las funciones `my.getLocalVar`, `setLocalVar`, `getSessionVar` y `setSessionVar`.
Además se agregan `existsLocalVar` y `existsSessionVar`.  

**v1.2.2** se generan las funciones en el _frontend_ para acceder a `localStorage` y `sessionStorage`
utilizando un prefijo estandarizado. Las funciones son `my.getLocalVar`, `setLocalVar`, `getSessionVar` y `setSessionVar` 
que utilizan [`JSON4all`](https://www.npmjs.com/package/json4all) para mantener el tipo de las variables. 
Además se agregan `getRawLocalVar` y `getRawSessionVar`. 

## Seguridad por filas

Los permisos `{allow:{delete:boolean, update:boolean, insert:boolean, select:boolean}}` en _backend-plus_ 
se pueden definir tanto a nivel de tabla como a nivel de columna. 

**v1.4.0** También se pueden agregar a nivel de filas usando definiendo `policies`

```ts
    policies?:{
        all   ?:{using?:string, check?:string}
        select?:{using?:string}
        insert?:{               check?:string}
        update?:{using?:string, check?:string}
        delete?:{using?:string}
    }
```

que se implementan con [`CREATE POLICY`](https://www.postgresql.org/docs/current/sql-createpolicy.html) en _postgres_ 
y se reflejan a nivel de las grillas impidiendo borrar o actualizar en función de las condiciones `check` e `using`.

## Valores por defecto

Al insertar una fila nueva en una grilla pueden aparecer valores por defecto de diferentes maneras.
A nivel de campo se puede definir
   * `defaultValue` que muestra un valor por defecto a nivel del _frontend_
   * `specialDefaultValue` que muestra un valor por defecto obtenido de la llamada a una función
   * `defaultDbValue` que define un valor por defecto a nivel de la base de datos que no se ve en el _frontend_ 
   hasta que el registro no fue insertado
   * `specialValueWhenInsert` que llama a una función a nivel del _backend_.

Las funciones que se pueden llamar a nivel del _frontend_ son las que están incluidas en `my.specialDefaultValue`.
Cada aplicación puede agregar las propias, _backend-plus_ tiene definidas:
   * `current_date`: la fecha actual,
   * `next_number`: el número siguiente teniendo en cuenta todos los números presentes en la columna. 
   Esto no impide el intento de generar duplicación de números en una clave desde el _frontend_ (el _backend_ lo rechazará).
   Pero bien usado es una ayuda al usuario que trabaja en forma ordenada.

**v1.16.3** Se mejora `next_number` para que ponga el siguiente número en función de todos los presentes en la grilla 
(visibles o no) y no solo en el superior y anterior.

**v1.16.1** Se agrega el valor `lineNumberWhenImported` en `specialValueWhenInsert` para poner el número de línea del 
archivo desde el que se inserta. 

**v1.4.0** Se agrega `specialValueWhenInsert` en la definición de campos y como variable del _backend_ con la función `currentUsername`.

**v0.29.27** Se agrega `next_number` a `my.specialDefaultValue`.

## arranque y reinicio del servicio de _backend_

El arranque del servicio se realiza invocando a `npm start`, al invocarlo se leen las opciones generales (`def-config`)
y las específicas de la instancia `local-config`.

**v1.5.16** se pueden pasar el nombre de un archivo de coniguración extra.

```sh
$ npm start -- --config other-config.yaml
```

**v1.0.0** Se agrega `checkDatabaseStructure(client:Client):Promise<void>` para verificar la estructura 
de la base de datos. _Backend-plus_ controla:
   * la versión del postgres contra la configuración de la aplicación en `db.min-version:12` (se puede especificar otra)
   * que si se usa la opción `login.forget` esté definidio `server.mailer`

Se puede `override`ar para agregar otros controles específicos de la aplicación. 

**v0.29.52** Se agrega en la configuración `server.session-store: memory` que indica dónde se guarda la información de sesión.


## Idiomas en _backend-plus_

Los mensajes y textos que muestra una aplicación de _backend-plus_ están alacenados 
de modo de permitir mostrar el sistema en inglés y castellano. 
Una aplicación basada en _backend-plus_ puede agregar ahí todos los mensajes y textos que necesite, 
puede agregar mensajes en otros idiomas e incluso ser multilingüe. 

Por ahora el idioma del _frontend_ se define al iniciar el sistema. 

**v0.31.20** Cuando el idioma de inicio no es inglés y no se encuentra un texto en el idioma elegido se usa el de inglés.

## Aplicaciones sin base de datos

**v0.31.4** Se puede utilizar _backend-plus_ para construir aplicaciones sin base de datos especificando en la configuración `nodb:true`.

## _frontend_ programable

El _frontend_ de las aplicaciones _backend-plus_ se puede programar:
   * agregando pantallas direccionables por el menú en `wScreens` y
   * agregando comportamiento especial en las celdas de las grillas en `clientSides`

**v1.13.8** Se agrega el atributo `autoProced` al `wScreen`

**v1.10.14** se agrega el clientSide.displayUrl cuando se quiere poder clickear la URL directo de la tabla;
se agrega tabmién cellDef:{tagName:string} a la definición de los clientSides

**v0.30.13** se agrega la función `gotoAddrParms` que redirecciona a una posición como si se hubiera 
clickeado en una opción de menú o un _forkeable button_. 

**v0.30.0** `my.ajax` se puede usar cuando el _frontend_ está _offline_

## procedimientos en el _backend_


**v0.30.6** Recibe en el parámetro `context` las cookies.

**v0.30.3** Se agrega `context.clearCookie`.

**v0.30.0** Se agregan los procedimientos definidos como `unlogged` que pueden invocarse aunque
el usuario no esté logueado. 

**v0.29.48** Se agrega la función `preOnClick` en las opciones del _forkeable button_ para fijarse 
si se debe interrumpir la ejecución (`preOnClick` debe devolver un texto 
en el caso de que no deba hacerse el _fork_ o proceder con el click).

**v0.29.43** Se puede elegir el texto "proceder" del botón principal de la grilla de parámetros del procedimiento. 

**v0.29.37** Se pueden definir procedimientos `cacheables` que no vuelven a ser llamados por un tiempo
si se invocan con los mismos parámetros.

**v0.29.34** Muestra la tardanza en proceidmientos que demoran mucho
