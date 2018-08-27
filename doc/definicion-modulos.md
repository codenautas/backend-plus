<!--multilang v0 es:definicion-modulos.md en:module-definitions.md -->

<!--lang:es-->

# Definición de modulos

Javscript, css, ts y demás incluidos desde el cliente


<!--lang:en--]

# Module definition

js, css, ts, and others

[!--lang:*-->

<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](module-definitions.md)


<!--lang:es-->

Se define así:

<!--lang:en--]

Like this:

[!--lang:*-->

## clientIncludes

<!--lang:es-->

`clientIncludes` es una función que debe devolver una lista de objetos con estos atributos:

(en este contexto pedir es del lado del cliente y entregar o servir es del lado del servidor en el servicio que ofrece y buscar es en el sistema de archivos del servidor, _deducida_ significa que es la variable que al final se quiere, esta se deduce de otras cuando no está)

propiedad         | tipo | predeterminado        | uso
------------------|------|-----------------------|----------------------------------------------------------------------------------------------
type              | T    | _oblilgatorio_        | 'js', 'css'
src               | T    | path or 'lib' + file or module.main | lo que se pide del lado del cliente
module            | T    |                       | el nombre de módulo donde buscar el archivo, el path, y el nombre del js
modPath           | T    |                       | modificación del path donde ir a buscar el archivo para entregar
file              | T    |                       | nombre del archivo que se pide y que se entrega
path              | T    | 'lib'                 | es en qué carpeta lo querés servir
ts                | T    |                       | especifica el path que se tiene que habilitar para servir el .ts asociado al javascript

### casos
  * type, module: cuando todo se puede deducir del package.json del módulo a través del "main"
  * type, module, modPath, file: cuando el archivo que se necesita está en un módulo pero no es el "main" del módulo ni está en la carpeta por defecto. 

<!--lang:en--]

see spanish

[!--lang:*-->