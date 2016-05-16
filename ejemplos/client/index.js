"use script";

var html=jsToHtml.html;

function presentarPlaca(estado) {
    //console.log("estado", estado);
    var mensaje;
    var placa = [];
    var encContinuar = html.input({type:'button', id:'continuar', value:'Continuar'}).create();
    var encNueva = html.input({type:'button', id:'nueva', value:'nueva'}).create();
    var metadatos = html.input({type:'button', id:'metadatos', value:'Ir a los metadatos'}).create();
    switch(estado.estado) {
    case 'pendiente':
        placa.push(html.p('Desea continuar con la encuesta que tiene pendiente o comenzar una nueva?'));
        placa.push(encContinuar);
        placa.push(html.span(' ').create());
        placa.push(encNueva);
        break;
    case 'ingresado':
        placa.push(html.p('Ud. ya ha completado una encuesta, desea comenzar una nueva?'));
        placa.push(encNueva);
        break;
    case 'vacio':
        placa.push(html.p('Ud. está por empezar la encuesta'));
        placa.push(encNueva);
        break;
    default:
        throw new Error('Estado inexistente: '+estado.estado);
    }
    placa.push(metadatos);
    encContinuar.addEventListener('click', function() {
       postAction('set-status', {id:estado.id,estado:'pendiente'}).then(function(res) {
           window.location = 'continuar';
       });
    });
    encNueva.addEventListener('click', function() {
       postAction('set-status', {id:estado.id,estado:'vacio'}).then(function(res) {
           console.log("res", res);
           window.location = 'continuar';
       });
    });
    metadatos.addEventListener('click', function() {
        window.location = 'metadatos';
       /*postAction('set-status', {id:estado.id,estado:'vacio'}).then(function(res) {
           console.log("res", res);
           window.location = 'metadatos';
       });*/
    });
    pantalla.appendChild(html.div(placa).create());
}

window.addEventListener("load",function(){
    postAction('info-enc-act', {}).then(function(resultJson){
        var estado=JSON.parse(resultJson);
        presentarPlaca(estado);
    });
});