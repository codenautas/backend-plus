"use script";
var html=jsToHtml.html;
var coalesce = bestGlobals.coalesce;
/*var fs = require('fs');
fs.readFile('continuar.styl','utf8',function(err,data){
    console.log(data);
})*/

function leer(){
    AjaxBestPromise.get({
            url:'/metadatos/obtener',
            data:{}
        }).then(function(result){
            preDiv.textContent=result;
    });
    
}
function reescribir(){
    document.getElementById('reescrbirMetadatos').addEventListener('click',function(){
        var contenido=document.getElementById('preDiv').firstChild.data;

        AjaxBestPromise.post({
            url:'/reescribir',
            data:{contenido}
        }).then(function(result){
            console.log('reescribirMetadatos')
        }).catch(function(err){
            console.log(err);
        });
       
    })
}

window.addEventListener("load",function(){
    var divStatus=html.div({id:'status'},'status').create();
    var preTag=[];
    preTag.push(html.pre({id:'preDiv'}));
    var bloque=html.div({id:'formulario'},preTag).create();
    var botonReescribir=html.input({type:'button', id:'reescrbirMetadatos', value:'Ir a la encuesta'}).create();
    pantalla.appendChild(bloque);
    pantalla.appendChild(botonReescribir);
    pantalla.appendChild(divStatus);
    document.getElementById('preDiv').setAttribute('contenteditable',true)
    leer();
    reescribir();
});

