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
       // var respuestas=[];
        test=test.estructura.forEach(function(fila){
            //console.log(fila)
            if(fila.tipo=='TITULO'){
                titulo=html.h1(JSON.stringify(fila.texto));
                
            }
            if(fila.tipo=='PREGUNTA'){
                
                preguntas.push(html.div(JSON.stringify(fila.texto)));
                
                var opciones=fila.opciones;
                var respuestas=[];
                opciones.forEach(function(opcion){
                    preguntas.push(html.div(JSON.stringify(opcion.texto)));             
                });

            }
            console.log(preguntas);

            
        });

        pantalla.appendChild(html.div([
            html.pre(result),
            html.hr(),
            html.tr([titulo]),
            html.tr(preguntas),
            html.pre(JSON.stringify(JSON.parse(result),null,'  ')),
        ]).create());
        
    });
});