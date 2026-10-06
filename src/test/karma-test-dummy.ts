// No es un test. Existe para que tsconfig-client.json compile archivos de dos
// carpetas (src/for-client y src/test): tsc toma como raíz la carpeta común a
// todo lo que compila, y si solo quedara src/for-client la salida iría a la
// raíz del proyecto en vez de a ./for-client.
// TODO: Cambiar la configuración para uqe este archivo no sea necesario.
export {};
