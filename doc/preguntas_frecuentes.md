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