"use script";

var html=jsToHtml.html;

window.addEventListener("load",function(){
   // console.log("HOLA MUNDO");
    AjaxBestPromise.get({
        url:'/info-enc-act',
        data:{}
    }).then(function(result){
        var test=JSON.parse(result);
        var titulo;
        var preguntasYrespuestas;
        var cuestionario=[];
        var preguntas=[];
        test=test.estructura.forEach(function(fila){
            if(fila.tipo=='TITULO'){
                titulo=html.h1(JSON.stringify(fila.texto));
            }
            if(fila.tipo=='PREGUNTA'){
                preguntas.push(html.tr({id:fila.id},JSON.stringify(fila.texto)));
                preguntas.push(html.ol({class:"respuestas"}));
                var opciones=fila.opciones;
                var respuestas=[];
                opciones.forEach(function(opcion){
                    preguntas.push(html.li({class:"opciones"},JSON.stringify(opcion.texto)));  
                });
                preguntas.push(html.br());
            }
            console.log(preguntas);
        });

        pantalla.appendChild(html.div([
            html.pre(result),
            html.hr(),
            html.tr([titulo]),
            html.div(preguntas),
            html.pre(JSON.stringify(JSON.parse(result),null,'  ')),
        ]).create());
        
    });
});