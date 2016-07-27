## Cómo verificar el funcionamiento del cliente de ejemplo ante cambios en la conexión con el servidor
Los resultados específicos de los tests hechos en javascript para los navegadores testeados se encuentran en [este documento](https://github.com/codenautas/pruebas_de_concepto/blob/master/onlinestatus/pruebas_en_navegadores.md "Pruebas en navegadores")

### Instrucciones para realizar la verificación:
1. Verifique que su pc tenga instalado el software correspondiente:
  * git
  * node
  * [PostgreSQL server](https://www.postgresql.org/download/ "Descargar PostgreSQL") 
  * navegadores que desée testear (Firefox, Chrome, Safari, etc)
2. Descargue y prepare el proyecto:
  1. git clone https://github.com/codenautas/backend-plus.git
  2. npm install
3. Prepare el servidor de base de datos:
  1. Cree la base y sus tablas con [create_db.sql](../../examples/tables/install/create_db.sql)
  2. Copie [def-server-tables-config.yaml](../../examples/tables/server/def-server-tables-config.yaml) a local-config.yaml y modifíquelo, de ser necesario
3. Inicie el servidor:
  * npm run-script example-tables
  
