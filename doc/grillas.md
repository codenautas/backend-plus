# Grillas de backend-plus

## desde el menú

Simplemente hay que definir la grilla en la opción del menú, por ejemplo `{menuType:'table', name:'clientes'}`. 

opc      | predeterminado  | uso
---------|-----------------|-------------
`table`  | `name`          | nombre de la grilla
`fc`     | `[]`            | Fixed Columns en formato `{column:'n', operator:'=', value: 1}` o `{column:'value'}` para mostrar solo una parte de la tabla

## desde wScreens

Se puede abrir una grilla cualquiera en forma programática desde cualquier pantalla y en cualquier momento por ejemplo desde una `wScreen` así:

```ts
var div = new html.div().create();
my.tableGrid('clientes',div);
```

La función my.tableGrid devuelve una objeto grilla (que se puede usar para acceder a la grilla desde el programa por ejemplo para refrescarla) y recibe un tercer parámetro con las opciones. 

```ts
var mi_grilla = my.tableGrid('clientes',divGrilla,{
    fixedFields:[
        {fieldName:'activo', value:true}
    ], 
    tableDef:{
        layout:{errorList:true},
        hiddenColumns:['saldo'], 
        title:'clientes activos nuevos',
        filterColumns:[
            {column:'fecha', operator:'<=', value:hasta_fecha},
        ],
        allow:{delete:false, insert:false},
        firstDisplayCount:10, 
        firstDisplayOverLimit:10
    }
});
```

En el ejemplo se ven las siguientes opciones

opc           | predeterminado  | uso
--------------|-----------------|-------------
`fixedFields` | `[]`            | Fixed Columns en formato `{column:'n', operator:'=', value: 1}` o `{column:'value'}` para mostrar solo una parte de la tabla
`tableDef`    |*sin cambios*    | Cambios que se quieren hacer en la definición de la tabla referida a la grilla que se muestra. Los cambios se refieren solo al lado del cliente. 

Y dentro de `tableDef` se pueden cambiar las mismas que en la definición (que tengan sentido del lado del cliente). Por ejemplo:

opc           |  uso
--------------|--------------
`layout`        | Opciones de despliegue
`hiddenColumns` | Columnas que empiezan ocultas (el usuario puede verlas pidiéndolo desde el menú contextual)
`title`         | Título de la grilla
`filterColumns` | Formato `{column:'c', operator:'=', value:1}` similar a `FixedFields` pero los criterios de las `filterColumns` las ve el usuario y las puede cambiar
`allow`         | Para quitar los botones de insertar y eliminar o hacer readonly los campos. Desde el servidor no se impide el cambio.
`firstDisplayCount` | Máxima cantidad de líneas a mostrar cuando la cantidad e líneas es mayor a `firstDisplayOverLimit`
`firstDisplayOverLimit` | Si la tabla tiene esta cantidad de líneas o menos se muestran todas aunque el valor sea mayor a `firstDisplayCount`. Se puede usar para provincias, en general se puede poner 20 líneas de máximo y 25 en *over limit* para que la tabla provincias aparezca entera y las largas se corten en 20.

