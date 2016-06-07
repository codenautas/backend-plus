var html=jsToHtml.html;

function presentarPlacaFin(textoFinIngreso){
    var placa=[];
    var mensaje=textoFinIngreso
    placa.push(html.h3('¡MUCHAS GRACIAS!'));
    placa.push(('Usted ha completado satisfactoriamente el formulario y se encuentra registrado en la base de datos de ABONADOS al TEATRO COLON 2016.'));
    //    placa.push(html.div({id:"fin-ingreso"},mensaje));
    pantallaIngreso.appendChild(html.div(placa).create());
}

window.addEventListener("load",function(){
    document.getElementById('status').textContent = "Finalizando...";
    AjaxBestPromise.post({
        url:'info-enc-act',
        data:{info:"{}"}
    }).then(function(resultJson){
        var result=JSON.parse(resultJson);
        var textoFinIngreso=result.estructura.textos.placas['fin-ingreso'];
        presentarPlacaFin(textoFinIngreso);
        document.getElementById('status').textContent = "";
    }).catch(function(err){
        document.getElementById('status').textContent = "Error "+err.message;
    });
});