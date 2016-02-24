"use script";

var html=jsToHtml.html;

function presentarPlaca(estado) {
    //console.log("estado", estado);
    var mensaje;
    var placa = [];
    var encContinuar = html.a({href:'/continuar'}, 'Continuar').create();
    var encNueva = html.a({href:'/nueva'}, 'Nueva').create();
    switch(estado) {
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
    // case 'vacio':
        // placa.push(html.p('Ud. ya ha completado una encuesta, desea comenzar una nueva?'));
        // placa.push(encNueva);
        // break;
    default:
        throw new Error('Estado inexistente: '+estado);
    }
    pantalla.appendChild(html.div(placa).create());
}

window.addEventListener("load",function(){
    AjaxBestPromise.get({
        url:'/enc-status',
        data:{}
    }).then(function(resultJson){
        var estado=JSON.parse(resultJson);
        presentarPlaca(estado);
    });
});