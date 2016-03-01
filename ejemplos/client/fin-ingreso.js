var html=jsToHtml.html;

function presentarPlacaFin(){
    var placa=[];
    var mensaje='Gracias por completar la encuesta'
    placa.push(html.div({id:"fin-ingreso"},mensaje));
    pantallaIngreso.appendChild(html.div(placa).create());
}

window.addEventListener("load",function(){
    presentarPlacaFin();
    //pantallaIngreso.appendChild(html.div('Gracias por completar la encuesta').create());
});