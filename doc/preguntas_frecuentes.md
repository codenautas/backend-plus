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

Se debe definir un `wScreen` en `my.wScreens.proc.result`.
En la definición del procedimiento se debe indicar en `resultOk` el nombre de la definición. 

**Del lado del cliente poner (podría ser en `menu.js`)**
```js
function mostrarGrillaComoResultado(nombreGrilla, divResult, filtro){
    var fixedFields={};
    likeAr(filtro).forEach(function(value, attrName){
        if(value!=null){
            fixedFields.push({fieldName: attrName, value: value});
        }
    });
    return my.tableGrid(nombreGrilla, divResult,{fixedFields:fixedFields});
}

my.wScreens.proc.result.muestra_grilla_provincias=function(result, divResult){
    var fitro=result;
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