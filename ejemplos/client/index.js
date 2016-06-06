"use script";

var html=jsToHtml.html;

function presentarPlaca(estado) {
    //console.log("estado", estado);
    var mensaje;
    var placa = [];
    var encContinuar = html.input({type:'button', id:'continuar', value:'Continuar'}).create();
    var encNueva = html.input({type:'button', id:'nueva', value:'nueva'}).create();
    var encFinalizar=html.input({type:'button',id:'ingresado-fin',value:'finalizar'}).create();
    var metadatos = html.input({type:'button', id:'metadatos', value:'Ir a los metadatos'}).create();
    //var metadatos = html.input({type:'button', style:"color:magenta", id:'metadatos', value:'Ir a los metadatos'}).create();
    switch(estado.estado) {
    case 'pendiente':
        placa.push(html.h3('¡BIENVENIDO NUEVAMENTE!'));
        placa.push(html.p('En nuestros registros usted ya completo un formulario y se encuentra registrado. ¿Qué desea hacer?'));
        placa.push(encContinuar);
        placa.push(html.span(' ').create());
        placa.push(encNueva);
        break;
    case 'ingresado':
        placa.push(html.h3('¡BIENVENIDO NUEVAMENTE!'));
        placa.push(html.p('En nuestros registros usted ya ha iniciado  un formulario. ¿Qué desea hacer?'));
        placa.push(encNueva);
        placa.push(encFinalizar);
        break;
    case 'vacio':
        placa.push(html.h3('¡BIENVENIDO!'));
        placa.push(html.p('Lo invitamos a completar algunos datos para el Registro de Abonados al Teatro Colón. La información que solicitamos es sobre sus abonos y su asistencia al Teatro Colón. Serán solo unos minutos y nos ayudará a conocer mejor a nuestros abonados y sus preferencias. La encuesta es personal. La información solicitada será utilizada con fines estadísticos y para aplicar acciones para mejorar la oferta del teatro.'));
        placa.push(html.p('Los datos que brinde son confidenciales, de acuerdo con la Ley de Protección de los Datos Personales (PONER NUMERO).'));
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
       postAction('blanquear', {id:estado.id,estado:'vacio'}).then(function(res) {
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
    encFinalizar.addEventListener('click',function(){
        window.location='fin-ingreso'
    })
    pantalla.appendChild(html.div(placa).create());
}

window.addEventListener("load",function(){
    postAction('info-enc-act', {}).then(function(resultJson){
        var estado=JSON.parse(resultJson);
        presentarPlaca(estado);
    });
});