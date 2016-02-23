"use script";

var html=jsToHtml.html;

function presentarFormulario(estructura){
    var celdas=[];
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
                    AjaxBestPromise.post({
                        url:'/guardar',
                        data:{ info:JSON.stringify({
                            id: divFormulario.idRegistro,
                            variable: fila.variable,
                            valor:value 
                        })}
                    }).then(function(resultJson){
                        var result=resultJson;
                        document.getElementById('status').textContent = result;
                    }).catch(function(err) {
                        document.getElementById('status').textContent = "Error: " + err;
                    });
                    // alert('el value '+value+' para la variable '+fila.variable);
                });
            });
        }
    });
    divFormulario.appendChild(html.div({"class":"bloque"},celdas).create());
    pantalla.appendChild(divFormulario);
    return luego.then(function(){
        return divFormulario;
    });
}

function ponerDatos(estructura, datos){
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