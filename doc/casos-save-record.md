# casos de save-record

1. Viaja al servidor solo los valores de los campos que quiero cambiar y la pk. 
2. Vuelve del servidor los valores de todo el registro con el objetivo de:
    1. Mostrar los cambios que pueda haber habido a nivel del servidor (pasaje a mayúsculas, cambio en el valor de algún campo)
    2. Detectar conflictos en el caso de que dos usuarios modificaron el mismo registro casi al mismo tiempo
3. Como el grabado es asincrónico el usuario puede seguir modificando la grilla sin haber recibido la respuesta. Por ello es común qué:
    1. El back-end informe sobre valores de campos que ya fueron modificados en la pantalla (eso no tiene que genera ruido para el usuario, es un comportamiento normal)

## qué hacer con la fila que viene del backend:

Se compara campo a campo. Se procede así: 
1. Si ese campo está marcado como pendiente de grabar:
    1. Si lo que viene coincide con lo que estaba pendiente de grabar, se marca como grabado ok
    2. Si lo que viene coincide con el valor mandado a grabar, no hay conflicto pero sigue pendiente
2. Si hay algo pendiente de graba
1. Si el campo no fue tocado por el usuario la grilla muestra el cambio en la grilla
2. Si el campo había sido tocado por el usuario el sistema no cambia lo ingresado por el usuario pero le avisa