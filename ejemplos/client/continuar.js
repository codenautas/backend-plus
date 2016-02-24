"use script";

var html=jsToHtml.html;

function status(msg) {
    document.getElementById('status').textContent = msg;    
}

function postAction(url, data) {
    return AjaxBestPromise.post({
        url:url,
        data:{ info:JSON.stringify(data)}
    }).then(function(resultJson){
        var result=resultJson;
        status(result);
        return result;
    }).catch(function(err) {
        status("Error: " + err);
    });
}

function presentarFormulario(estructura){
    var celdas=[];
    var controles=[];
    var divFormulario=html.div({"tedede-formulario":"trac"}).create();
    var luego = Promise.resolve();
    estructura.forEach(function(fila){
        if(fila.tipo=='TITULO'){
            celdas.push(html.div({id:"titulo"},JSON.stringify(fila.texto)))
        }
        if(fila.tipo=='PREGUNTA'){
            celdas.push(html.div({"class":"preguntas",id:fila.id},fila.texto));
            var opciones={};
            var typeInfo={};
            typeInfo.typeName="enum";
            typeInfo.options={};
            fila.opciones.forEach(function(opcion){
                opciones[opcion.opcion]={label:opcion.texto};
                typeInfo.options[opcion.opcion]={label:opcion.texto};
            });
            var controlOpciones = Tedede.optionsCtrl(fila.variable,opciones).create();
            celdas.push(controlOpciones);
            luego = luego.then(function(){
                Tedede.adaptElement(controlOpciones,typeInfo);
                controlOpciones.addEventListener('update',function(){
                    var value = this.getTypedValue();
                    return postAction('/guardar',
                                      {id: divFormulario.idRegistro,
                                       variable: fila.variable,
                                       valor:value});
                });
                controles.push(controlOpciones);
            });
        }
    });
    divFormulario.appendChild(html.div({"class":"bloque"},celdas).create());
    pantalla.appendChild(divFormulario);
    pantalla.appendChild(html.input({type:"button",id:"bFinalizar", value:"Finalizar"}).create());
    pantalla.appendChild(html.span(' ').create());
    pantalla.appendChild(html.input({type:"button",id:"bBlanquear", value:"Blanquear"}).create());
    return luego.then(function(){
        var bFin = document.getElementById('bFinalizar');
        bFin.addEventListener('click', function() {
            var data = {
                id: divFormulario.idRegistro,
                datos: {}
            };
            controles.forEach(function(control){
                data.datos[control.id] = control.getTypedValue();
            });
            return postAction('/finalizar', data);
        });
        var bBlan = document.getElementById('bBlanquear');
        bBlan.addEventListener('click', function() {
            return postAction('/blanquear', {id: divFormulario.idRegistro});
        });
        return divFormulario;
    });
}

function ponerDatos(datos) {
    
}

window.addEventListener("load",function(){
    document.getElementById('status').innerHTML = "Listo.";
   // console.log("HOLA MUNDO");
    AjaxBestPromise.get({
        url:'/info-enc-act',
        data:{}
    }).then(function(resultJson){
        var result=JSON.parse(resultJson);
        presentarFormulario(result.estructura).then(function(divFormulario){
            divFormulario.idRegistro = result.id;
            ponerDatos(result.datos);
        });
    });
});