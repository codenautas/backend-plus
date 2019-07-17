# Preguntas frecuentes

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