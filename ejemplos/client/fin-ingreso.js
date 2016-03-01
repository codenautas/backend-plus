var html=jsToHtml.html;



window.addEventListener("load",function(){
    //document.getElementById('status').innerHTML = "Listo.";
   // console.log("HOLA MUNDO");
   // AjaxBestPromise.post({
   //     url:'/fin-ingreso',
   //     data:{info:"{}"}
   // }).then(function(resultJson){
   //     var result=JSON.parse(resultJson);
        // presentarFormulario(result.estructura.formularios[result.id["for"]]).then(function(divFormulario){
            // divFormulario.idRegistro = result.id;
            // ponerDatos(result.datos);
        // });
    // });
    pantallaIngreso.appendChild(html.div('Gracias por completar la encuesta').create());
});