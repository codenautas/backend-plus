"use script";

var html=jsToHtml.html;

function presentarFormulario(result){
    var estructura = result.estructura;
    var titulo=[];
    var preguntas=[];
    estructura.forEach(function(fila){
        if(fila.tipo=='TITULO'){
            titulo.push(html.div({id:"titulo"},JSON.stringify(fila.texto)))
        }
        if(fila.tipo=='PREGUNTA'){
            preguntas.push(html.tr({"class":"preguntas",id:fila.id},fila.texto));
            var opciones={};
            fila.opciones.forEach(function(opcion){
                opciones[opcion.opcion]={label:opcion.texto};
            });
            preguntas.push(Tedede.optionsCtrl(fila.variable,opciones));
        }
    });
    pantalla.appendChild(html.div([
        html.tr(titulo),
        html.div({"class":"bloque"},preguntas),
    ]).create());
    estructura.forEach(function(fila){
        var domElement;
        var typeInfo={};
        typeInfo.typeName="enum";
        typeInfo.options={};
        if(fila.tipo=='PREGUNTA'){
            domElement=document.getElementById(fila.variable);
            fila.opciones.forEach(function(opcion){
                typeInfo.options[opcion.opcion]={label:opcion.texto};
            });
            Tedede.adaptElement(domElement,typeInfo);
            domElement.addEventListener('update',function(){
                var value = this.getTypedValue();
                AjaxBestPromise.post({
                    url:'/guardar',
                    data:{ info:JSON.stringify({
                        id: result.id.enc,
                        variable: fila.variable,
                        valor:value 
                    })}
                }).then(function(resultJson){
                    var result=resultJson;
                    document.getElementById('status').innerHTML = result;
                }).catch(function(err) {
                    document.getElementById('status').innerHTML = "Error: " + err;
                });
                // alert('el value '+value+' para la variable '+fila.variable);
            });
        }
    })
}

function ponerDatos(datos){
    
}

window.addEventListener("load",function(){
    document.getElementById('status').innerHTML = "Listo.";
   // console.log("HOLA MUNDO");
    AjaxBestPromise.get({
        url:'/info-enc-act',
        data:{}
    }).then(function(resultJson){
        var result=JSON.parse(resultJson);
        presentarFormulario(result);
        ponerDatos(result.datos);
    });
});