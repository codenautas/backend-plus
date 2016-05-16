"use script";
var html=jsToHtml.html;
var coalesce = bestGlobals.coalesce;
/*var fs = require('fs');
fs.readFile('continuar.styl','utf8',function(err,data){
    console.log(data);
})*/

function leer(){
    AjaxBestPromise.get({
            url:'/metadatos/obtener',
            data:{/*a:'prueba1', b:'prueba2'*/}
        }).then(function(result){
        preDiv.textContent=result;
    });
}

window.addEventListener("load",function(){
    var divStatus=html.div({id:'status'},'status').create();
    var preTag=[];
    var variable='variable:'
    var texto=variable+'  pregunta';
    preTag.push(html.div({id:'preDiv'},[html.pre(texto)]));
    var bloque=html.div({id:'formulario'},preTag).create();
    pantalla.appendChild(bloque);
    pantalla.appendChild(divStatus);

    document.getElementById('preDiv').setAttribute('contenteditable',true)
    leer();
});


// window.addEventListener("load",function(){
    // document.getElementById('status').textContent = "Cargando...";
    // AjaxBestPromise.post({
        // url:'metadatos',
        // data:{info:"{}"}
    // }).then(function(resultJson){
        // var result=JSON.parse(resultJson);
        // presentarFormulario(result.estructura.formularios[result.id["for"]], result.datos).then(function(divFormulario){
            // divFormulario.idRegistro = result.id;
        // });
    // }).catch(function(err){
        // document.getElementById('status').textContent = "Error "+err.message;
    // });
// });