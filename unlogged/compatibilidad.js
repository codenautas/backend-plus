/* UTF-8:Sí
   compatibilidad.js
*/
"use strict";

var controles_de_compatibilidad={
// Mejorados siguiendo los consejos de http://diveintohtml5.info/detect.html
    'soporte JSON':{gravedad:'incompatible'
    ,controlar:function(){
        return '["esto"]'==JSON.stringify(['esto']);
    }},
    'soporte para cookies':{gravedad:'incompatible'
    ,controlar:function(){
        return navigator.cookieEnabled;
    }},
    'almacenamiento local (localStorage)':{gravedad:'incompatible'
    ,controlar:function(){
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        }catch(e){
            return false;
        }
    }},
    'almacenamiento local por ventana (sessionStorage)':{gravedad:'incompatible'
    ,controlar:function(){
        sessionStorage.setItem('prueba_de_soporte_sessionStorage','soportado');
        return sessionStorage.getItem('prueba_de_soporte_sessionStorage')=='soportado';
    }},
    'almacenamiento de atributos internos (setAttribute)':{gravedad:'incompatible'
    ,controlar:function(parametros){
        parametros.div.setAttribute('prueba_attribute','soportado');
        return parametros.div.getAttribute('prueba_attribute')=='soportado';
    }},
    'posicionamiento inicial del cursor (autofocus HTML5)':{gravedad:'incomodidad'
    ,controlar:function(parametros){
        var input=document.createElement('input');
        return 'autofocus' in input;
    }},
    'movimiento lateral de teclas de cursor dentro de grillas (window.getSelection)':{gravedad:'incomodidad'
    ,controlar:function(parametros){
        return window.getSelection;
    }},
    'soporte para trabajo fuera de línea (offline)':{gravedad:'incompatiblidad'
    ,controlar:function(parametros){
        return 'serviceWorker' in navigator;
    }},
    'soporte para tratar eventos internos':{gravedad:'incompatible'
    ,controlar:function(parametros){
        return !!window.addEventListener;
    }},
    'conectividad via fetch':{gravedad:'incompatible'
    ,controlar:function(params){
        return 'fetch' in window
    }},
    'funciones => sin this':{gravedad:'incompatible'
    ,controlar:function(params){
        try{
            return eval("[1].map((x)=>x+1)")[0] == 2;
        }finally{}
    }}
};

function controlar_compatibilidad(ya){
"use strict";
    var boton=document.getElementById('login');
    var id = 'resultado_incompatibilidad'
    var div=document.getElementById(id);
    if(!div){
        div = document.createElement('div');
        div.id = id;
        document.body.appendChild(div);
        div.textContent='controlando la compatibilidad del navegador';
    }
    if(!ya){
        boton.disabled=true;
        setTimeout(function(){
            controlar_compatibilidad(true)
        },100)
        return;
    }
    var hubo_errores=false;
    var hubo_errores_tipo={};
    div.innerHTML="";
    for(var control in controles_de_compatibilidad){
        var ok=false;
        var def_control=controles_de_compatibilidad[control];
        try{
            ok=def_control.controlar({div:div});
        }catch(err){
        }
        if(!ok){
            var mensaje=document.createElement('div');
            mensaje.textContent="Falla en "+control;
            div.appendChild(mensaje);
            hubo_errores=true;
            hubo_errores_tipo[def_control.gravedad]=true;
        }
    };
    if(!hubo_errores_tipo['incompatible']){
        login.disabled=false;
        boton.disabled=false;
    }
    if(hubo_errores){
        var alertDiv = document.createElement('h3');
        alertDiv.textConent="El sistema no fue probado en este modelo de navegador. Si encuentra problemas durante el uso por favor avise que estaba usando un modelo no probado. Se recomienda usar una versión actualizada del navegador Google Chrome";
        div.appendChild(alertDiv);
    }
}