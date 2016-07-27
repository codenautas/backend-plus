## Cómo verificar el funcionamiento del cliente de ejemplo ante cambios en la conexión con el servidor
Los resultados específicos de los tests hechos en javascript para los navegadores testeados se encuentran en [este documento](https://github.com/codenautas/pruebas_de_concepto/blob/master/onlinestatus/pruebas_en_navegadores.md "Pruebas en navegadores")

### Instrucciones para realizar la verificación:
1. Verifique que su pc tenga instalado el software correspondiente:
  * git
  * node
  * [PostgreSQL server](https://www.postgresql.org/download/ "Descargar PostgreSQL") 
2. Descargue y prepare el proyecto:
  1. git clone https://github.com/codenautas/backend-plus.git
  2. *npm install*
3. Prepare el servidor de base de datos:
  1. Cree el usuario, la base y sus tablas con [create_db.sql](../../examples/tables/install/create_db.sql)
  2. Copie [def-server-tables-config.yaml](../../examples/tables/server/def-server-tables-config.yaml) a local-config.yaml y modifíquelo, de ser necesario
3. Inicie el servidor abriendo una terminal de ms-dos o bash en la raíz del proyecto:
  * *npm run-script example-tables*
4. En otra pc, inicie sesión con el navegador:
  * Vaya a la url <ip del servidor>:3033/index
  * La primera vez será direccionado a /login, ingrese usuario y clave, acepte que el navegador recuerde la contraseña
  * Elija un botón para ver una grilla, por ejemplo "ptable"
  * Este es el "**Estado A**"
5. **Lista de estados**
  
  Estado | Descripción | Cómo generarlo | Cómo eliminarlo
  ----|----|----|----
  **A** | Sin error | El navegador puede ver los datos y modificarlos | -
  **B** | Invalidar sesión | Eliminar físicamente el archivo correspondiente de la carpeta "sessions" en la raíz del proyecto | Realizar el /login
  **C** | Detener servidor | Presionar Control+C en la terminal donde está corriendo el servidor | Ejecutar npm run-script example-tables
  **D** | Interrumpir la conexión de red | Desenchufar el cable de red en la máquina del cliente | Enchufar el cable

6. Pruebe cada uno de los casos de la siguiente tabla y verifique los resultados:
  
  Caso | Estado | Mensaje esperado (arriba, en la página)
  ----|----|----
  **1** | **A** | Ninguno

