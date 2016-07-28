# Pruebas manuales de status

## objetivo

Para comprobar cómo reacciona un software en concidiones especiales 
como la desconexión de la red se necesitan ***prueba manuales***. 

Vamos a llamar ***status*** al estado respecto a la conexión, este puede ser:

 1. `logged` (conectado a la red, al servidor y logueado
 2. `notLogged` (cuando la sesión caducó)
 3. `noServer` (cuando el backend está caído, colgado o no contesta)
 4. `noNetwork` (cuando no hay conexión de red)
 
Según las [pruebas de concepto](https://github.com/codenautas/pruebas_de_concepto/blob/master/onlinestatus/pruebas_en_navegadores.md) 
para identificar `noNetwork` se usa `!window.onLine` y para `noServer` `!!err.originalError` de `AjaxBestPromise`.

## cosas a probar

La pruebas manuales servirán para verificar:
 
 1. que la detección de estados sea correcta
 2. que la reacción al cambio de estados sea correcta (que se muestren u oculten los mensajes correctos)
 
### preparación

Para poder ver un cartel con el estado actual (y un contador de cantidad de detecciones intentadas)
hay que habilitar `myOwn.debuggingStatus`. Para ello el par de renglones que dice:

```js
myOwn.debuggingStatus=false; /* 
if(new Date()<bestGlobals.datetime.ymdHms(2016,7,27,20,0,0)){
```

cambiarlos por 

```js
myOwn.debuggingStatus=false; // /* 
if(new Date()<bestGlobals.datetime.ymdHms(2016,7,27,20,0,0)){
```

o sea agregar un par de `//` delante de `/*` 
para anular el comentariado del `if` de la definición de `myOwn.debuggingStatus`. 
Además hay que poner la fecha y hora hasta la que va a estar habilitada la prueba
(la fecha y hora no tiene que ser más de un par de horas desde la hora actual,
porque si se sube así al servidor el debug no queda habilitado para siempre).

Vamos a llamar *current stauts* a un rectangulito amarillo de borde punteado verde con el status.

## casos de prueba

1. Correr `npm run example-tables`, loguearse con administrado `bob` e ir a tabla `ptable`
    1. [_] Verificar `actual status: logged`.
2. Abrir otra solapa en la pantalla de `/login` de modo de **deconectar** y volver a la pantalla donde se está probando
    1. [_] Verificar `actual status: unLogged`.
    2. [_] Aparece el cartel `not logged in Sign in`
3. Interrumpir el servidor (**Ctrl C**)
    1. [_] Verificar `actual status: noServer`.
    2. [_] Aparece el cartel `the server is inaccesible`
4. Re **arrancar** el servidor 
    1. [_] Verificar `actual status: unLogged`.
    2. [_] Vuelve el cartel `not logged in Sign in`
5. Volver a **loguearse** (en otra solapa)
    1. [_] Verificar `actual status: logged`.
    2. [_] Desaparece el cartel
6. Para ver el **scroll** (hacia el cartel) pedimos el contenido de ptable +50 (o +100) vamos hasta abajo de manera que ya no se vean los títulos
7. Interrumpir el servidor (**Ctrl C**)
    1. [_] Verificar `actual status: noServer`.
    2. [_] Se produce un SCROLL y se ve `the server is inaccesible`
6. Volvemos a hacer **scroll** para asegurarnos que se hace aún cuando haya habido ya un cartel. 
8. Romper la red. En windows es en panel de control, centro de redes y recursos compartidos, cambiar configuración del adaptador, estado, deshabilitar
    1. [_] Verificar `actual status: noNetwork` (ojo que si se activa otra red, el wifi u otra placa, vuelve a tener red).
    2. [_] Se produce un SCROLL y se ve `the server is inaccesible`
9. Rearmar la red. Activar la placa
    1. [_] Verificar `actual status: noServer` 
