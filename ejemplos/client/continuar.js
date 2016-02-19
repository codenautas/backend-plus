"use script";

var html=jsToHtml.html;

window.addEventListener("load",function(){
   // console.log("HOLA MUNDO");
    AjaxBestPromise.get({
        url:'/info-enc-act',
        data:{}
    }).then(function(result){
        var test=JSON.parse(result);
        var titulo=[];
        var preguntasYrespuestas;
        var cuestionario=[];
        var preguntas=[];
        test=test.estructura.forEach(function(fila){
            if(fila.tipo=='TITULO'){
                titulo.push(html.div({id:"titulo"},JSON.stringify(fila.texto)))
//                titulo=html.h1({id:"titulo"},JSON.stringify(fila.texto));
            }
            if(fila.tipo=='PREGUNTA'){
                preguntas.push(html.tr({"class":"preguntas",id:fila.id},JSON.stringify(fila.texto)));
                var respuestas=[];
                preguntas.push(html.br());
                fila.opciones.forEach(function(opcion){
                    preguntas.push(html.td([         
                        html.label({"for":"opciones"},JSON.stringify(opcion.texto)),
                        html.input({"class":"opc-resp",type:"checkbox"})
                    ]));
                    preguntas.push(html.br());
                });
                preguntas.push(html.br());
            }
            console.log(preguntas);
        });

        pantalla.appendChild(html.div([
            html.tr(titulo),
            html.div({"class":"bloque"},preguntas),
            html.hr(),
            html.pre(JSON.stringify(result)),
            html.pre(JSON.stringify(JSON.parse(result),null,'  ')),
        ]).create());
        
    });
});