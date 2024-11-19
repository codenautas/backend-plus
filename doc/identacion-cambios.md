# Identación y cambios de código en Backend-Plus y relacionados

## Cambios en en código

Parte del trabajo es estar al tanto de lo que otros cambiaron. Antes de empezar a trabajar todos deberíamos mirar qué cambió el otro. 
Entonces para facilitarle la tarea al otro hay que tratar de hacer solo los cambios necesarios para la funcionalidad agregada.

Para lograrlo lo mejor es *siempre antes de commitear mirar las diferencias en cada uno de los archivos que uno está por commitear*. Y pregúntense ¿este cambio es necesario?. 

Es más, con este método se ahorran meter cosas que fueron cambiando "por si era eso". 

Cambios que hay que tratar de evitar:  
   * cambiar mayúscuclas por minúsculas o al revés si ambas son necesarias.   
   * cambiar todo el estilo de lo que el otro hizo en un archivo (llaves pegadas o no al if, espacio después de los dos puntos) porque no nos gusta.  
   * dar vuelta el if y poner el else arriba (si no agrega ningún valor)  
   * ordenar alfabéticamente miembros en una clase o funciones en un archivo, etc...  
   * decirle al editor que reformatee automáticamente todo y subirlo. 

Cambios que sí son deseables:  
   * corregir la identación de un paréntesis, llave o lo que sea que no coinciden con la apertura  
   * agregar unos pocos espacios en poquitos lugares del archivo para hacerlo coherente con lo que ya había si mejor la lectura de esa partecita (no si es algo general)  
   * cambiar el nombre de una variable o de una función para que su nuevo nombre refleje mejor su contenido u objetivo (no importa si hay que cambiar por todos lados)

Y respecto al estilo, básicamente respetamos el estilo del otro.   
   * Si vamos a un archivo que tiene las comas encolumnadas tratamos dentro de lo razonable de mantener el estilo,   
   * Si hay una lista de objetos y el orden de los atributos del objeto es name, typeName, nullable, editable respetamos eso (sí eso obliga a mirar un poquito para arriba y para abajo), si los valores están todos entre comillas simples (o la gran mayoría) los ponemos entre comillas simples (o al revés). 

Lo único que es regla desde hace mucho es el criterio de identación y de cerrado de llaves.

## Identación

El criterio de Backend-plus es, la llave que abre, si la longitud lo permite va en el primer renglón, no abajo; 
y lo que cierra va a la altura del primer caracter de la linea que abre. 

### Ejemplos

Está bien:

```ts
if (a == b) {
    while(
        algoMuyLargo(a+b+c) < 3 &&
        otra_cosa_larga
    ){ // como hubo que partir la condición del while se la pone en varios renglones dentro de un par de paréntesis que cumplen la regla
        if(!sigo){
            var x = a + b + (
                mas && muchas(masCuentas)
            ); // el paréntesis cierra cumpliendo la regla            
            var y = a + b +
                otraCuentaMuy Larga; // acá no hay paréntesis que abre, pero lo que cae del renglón pertenece al var, por lo tanto va identado
        }
    }
} // a la altura del if
```

Están mal:

```ts
if (a == b) 
{ // esta llave va con el if
    while(
        algoMuyLargo(a+b+c) < 3 &&
        otra_cosa_larga) // el paréntesis debería estar en la columna de la w de while
    { // esta va en la línea de arriba
    if(!sigo){
        var = a + b + (
            mas && muchas(masCuentas)); // el paréntesis debería ir en la próxima línea
        } // esta llave no coincide con el if que cierra
        } // esta llave no coincide con el while que cierra
    } // a la altura del if
```

### identación en SQL

En SQL no hay llaves. Las reglas son las mismas. 

Pero además hay que considerar una instrucción (SELECT, INSERT, etc...) como una unidad
que arranca en un renglón y todas las líneas siguientes deben estar indentadas.
Ej:
```sql
SELECT *
  FROM tabla
  WHERE nivel > 3
  ORDER BY fecha;
```

También las partes internas de cada instrucción son partes que si empiezan en un renglón 
y deben partirse los renglones subsiguientes van identados. Ej:

```sql
  SELECT persona, nombre, apellido, documento, fecha_nacimiento,
      oficina, cargo, nivel -- Acá hay doble identación para como excepción
    FROM personas p
      INNER JOIN cargos c USING (cargo) -- El join es parte del FROM
      LEFT JOIN responsabilidades r 
        ON r.nivel = p.nivel -- El ON es parte del JOIN
          AND r.publicos IS TRUE -- Este AND está continúa lo que empezó en el ON
          AND c.activo IS TRUE -- El AND puede comenzar el renglón por razones históricas
      INNER JOIN LATERAL ( -- Si hay una subquery se mete dentro de parémtesis 
        SELECT max(fecha)
          FROM fichadas f
          WHERE f.persona = p.persona
      ) x ON TRUE -- El paréntesis que cierra está a la altura del primer caracter de la sección que abre
    ORDER BY persona; -- Está dentro del from o sea va a la altura del SELECT
```

