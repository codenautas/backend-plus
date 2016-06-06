"use script";
var html=jsToHtml.html;
var coalesce = bestGlobals.coalesce;
/*var fs = require('fs');
fs.readFile('continuar.styl','utf8',function(err,data){
    console.log(data);
})*/

var contenidoOriginal;

function leer(){
    AjaxBestPromise.get({
        url:'/metadatos/obtener',
        data:{}
    }).then(function(result){
        preDiv.value=result;
        contenidoOriginal=result;
    });
    
}
function reescribir(){
    document.getElementById('reescrbirMetadatos').addEventListener('click',function(){
        document.getElementById('status').textContent='grabando...';
        var contenido=document.getElementById('preDiv').value;
        AjaxBestPromise.post({
            url:'/metadatos/reescribir',
            data:{contenido}
        }).then(function(result){
            document.getElementById('status').textContent=result;
            contenidoOriginal=contenido;
        }).catch(function(err){
            document.getElementById('status').appendChild(html.div([
                html.div(err.message),
                html.pre(err.stack)
            ]).create());
        });
       
    })
}
function alFormulario(){
    document.getElementById('irAlFormulario').addEventListener('click', function() {
        window.location = 'continuar';
    });
}

window.addEventListener("load",function(){
    var divStatus=html.div({id:'status'},'Estado').create();
    var preTag=[];
    preTag.push(html.textarea({id:'preDiv'}));
    var bloque=html.div({id:'formulario'},preTag).create();
    var botonReescribir=html.input({type:'button', id:'reescrbirMetadatos', value:'Guardar Metadatos'}).create();
    var botonIrAlFormulario=html.input({type:'button', id:'irAlFormulario', value:'Ir al formulario'}).create();
    pantalla.appendChild(bloque);
    pantalla.appendChild(botonReescribir);
    pantalla.appendChild(divStatus);
    pantalla.appendChild(botonIrAlFormulario);
    document.getElementById('preDiv');
    leer();
    reescribir();
    alFormulario();
    setInterval(function(){
        if(document.getElementById('preDiv')===document.activeElement){
            var contenidoActual=document.getElementById('preDiv').value;
            if(contenidoOriginal!==undefined && contenidoOriginal!==contenidoActual){
                document.getElementById('status').textContent='hay cambios sin guardar';
            }else{
                document.getElementById('status').textContent='';
            }
        }
    },2000);
});

