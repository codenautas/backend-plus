<!--multilang v0 es:definicion-tablas.md en:table-definitions.md -->

<!--lang:es-->

# Definición del lado del cliente

<!--lang:en--]

# Tables definition

[!--lang:*-->

<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](client-side-definitions.md)


<!--lang:es-->

Del lado del cliente se heredan grillas (de las definiciones de las tablas), 
menúes (de las definiciones de los menúes) y formularios para invocar procesos (ídem).

Además se pueden agregar comprtamiento visual utilizando esta API.

<!--lang:en--]

See spanish...

[!--lang:*-->

## my.tableGrid(gridName, layoutElement [,opts])

<!--lang:es-->

Despliega una grilla de nombre `gridName` dentro del div `layoutElement` (borra lo que hubiere en ese elemento antes de desplegar).

Opciones:
opción               | uso
---------------------|-----
`fixedFields`        | es la lista de campo/valor (en formato `{fieldName, value}`) que determinan el "filtro fijo" (que no se puede cambiar)
`parameterFunctions` | es la lista de parámetros que recibe una grilla que utiliza una función para desplegarse
`tableDef`           | es un complemento a la definición original de la tabla (se pueden cambiar cosas de la definición original)