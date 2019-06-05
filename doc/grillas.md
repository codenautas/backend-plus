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

## grillas basadas en otras (desde el servidor)

Se puede definir una grilla basándose en otra de base y cambiándole pocas cosas. Los casos de uso son:
   1. Cambiar los permisos o visibilización para ciertas filas o columnas, 
   por ejemplo la definición de la tabla empleados podría no mostrar. 
   En este caso se podría basar la grilla *mis empleados* sobre la grilla *empleados* agregando las columnas necesarias. 
   2. Agregar una columna especial con `clientSide`.
   3. Usar una tabla para seleccionar details. Por ejemplo podría haber una opción de menú llamado *movimientos del cliente*
   que abra una vista basada en clientes no editable que tenga como `detailTable` los movimientos.

En [definicion-tablas](definicion-tablas.md) se pueden ver todas las opciones para definir la tabla en el servidor. 

**Atención**: la llamada a `context.be.tableDefAdapt` es opcional, pero para basar grillas en otras no hay que usarlo en la tabla base ni en la redefinida. 

Ejemplo:
```ts

export function clientes_activos(context:TableContext):TableDefinition {
    var defTable =context.be.tableStructures.clientes(context);
    defTable.name='clientes_activos';
    defTable.title='clientes activos';
    defTable.table='clientes'; // esto significa que se va a usar la misma tabla física de base
    defTable.elementName='cliente';
    defTable.fields.forEach(function(fieldDef){
        if(fieldDef.name=='saldo'){
            fieldDef.visible=true;
        }
    })
    defTable.fields.push({
        name:'dar_de_baja', typeName:'boolean', clientSide:'clienteDarDeBaja'
    }); // cuando esté basado en una tabla física solo se pueden agregar campos que no sean campos físicos
    defTable.sql.where="(activo = true)";
    return context.be.tableDefAdapt(defTable,context);
} 

```