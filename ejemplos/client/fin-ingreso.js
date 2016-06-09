var html=jsToHtml.html;

function presentarPlacaFin(textoFinIngreso){
    var placa=[];
    var encabezado=textoFinIngreso.encabezado;
    var parrafos=textoFinIngreso.parrafos;
    placa.push(html.h3(encabezado));
    parrafos.forEach(function(parrafo){
        placa.push((parrafo));
    });
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