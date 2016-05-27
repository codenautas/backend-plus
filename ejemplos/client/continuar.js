"use script";

function classToggle(element,clase, sacoAgrego ){
    if(sacoAgrego){
        element.classList.add(clase);
    }else{
        element.classList.remove(clase);
    } 
}

var html=jsToHtml.html;
var coalesce = bestGlobals.coalesce;

function validarRegistro(estructuraFormulario, registro, controles){
    // transformar en recorrer el arreglo controles y verificar la existencia de "expresion-habilitar"
    //console.log('======= controles');
    //console.log(estructuraFormulario);
    //console.log(controles);
    estructuraFormulario.celdas.forEach(function(celda){
        if(celda.tipo==='pregunta' && celda['expresion-habilitar']){
            var expresionEvaluable = celda['expresion-habilitar'].replace(Regexplicit.variables, function(variableName){
                return "registro."+variableName;
            }).replace(Regexplicit.operatorEqual, function(match,left,equal,right){
                return left+'=='+right;
            });
            // console.log(celda.variable,celda['expresion-habilitar'],expresionEvaluable,eval(expresionEvaluable));
            controles[celda.variable].disabled = !eval(expresionEvaluable);
        }
    });
}

function grabarYLuego(result){
    sennialCambios.style.backgroundColor='lightblue';
    placa_grabando.style.visibility='visible';
    return postAction('guardar',{
        id: result.id,
        almacen: result.almacen
    }).then(function(){
        tieneCambios=false;
        sennialCambios.style.backgroundColor='lightgreen';
    });
}

function grabarEIr(result, pagina, idFormulario, orden){
    grabarYLuego(result).then(function(){
        window.location=pagina+'#'+idFormulario+(orden?','+orden:'');
    });
}

function presentarFormulario(result, idFormulario, orden){
    var estructuraFormulario=result.estructura.formularios[idFormulario];
    var registro;
    var almacen=result.almacen;
    if(estructuraFormulario.multiple){
        registro=almacen.formularios[idFormulario][orden-1].registro;
    }else{
        registro=almacen.formularios[idFormulario].registro;
    }
    var celdasDesplegadas=[];
    var controles={};
    var divFormulario=html.div({"tedede-formulario":"trac"}).create();
    var luego = Promise.resolve();
    var contador=0;
    var divsOpcionesMultiples=[];
    var tieneCambios=false;
    var grabarAlmacen=function(){
        if(tieneCambios){
            sennialCambios.style.backgroundColor='lightblue';
            postAction('guardar',{
                id: result.id,
                almacen: almacen
            });
            tieneCambios=false;
            sennialCambios.style.backgroundColor='lightgreen';
        }
    }
    estructuraFormulario.celdas.forEach(function(celda){
        var contenidoCelda=[];
        if(celda.tipo=='titulo'){
            contenidoCelda.push(html.div({"class":"titulo", id:"titulo"},celda.titulo))
        }
        if(celda.tipo=='texto'){
            contenidoCelda.push(html.div({"class":"texto"},celda.texto))
        }
        if(celda.tipo=='pregunta'){
            if(celda.subtipo && celda.subtipo=='multiple' && !"por si tenemos que usar una tabla real"){
                if(!document.getElementById("multiple"+celda.pregunta)){
                    divsOpcionesMultiples.push(html.div({"class":"divsMultiples",id:"multiple"+celda.pregunta}));
                }
                divsOpcionesMultiples.push(html.div({"class":celda.subtipo,id:celda.pregunta},celda.texto));
                if(celda.aclaracion){
                    divsOpcionesMultiples.push(html.div({"class":"aclaracion"},celda.aclaracion));
                }
                var controlVariableMultiple = Tedede.bestCtrl(celda.typeInfo).create();
                if(!(celda.variable in registro)){
                    registro[celda.variable] = coalesce(celda.defaultValue, null);
                }
                divsOpcionesMultiples.push(html.div({"class":["opciones", celda.typeInfo.typeName]}, [controlVariableMultiple]));
            }else{
                contenidoCelda.push(html.div({"class":"codigo"},celda.pregunta));
                contenidoCelda.push(html.div({"class":celda.subtipo||"preguntas",id:celda.pregunta},celda.texto));
                if(celda.aclaracion){
                    contenidoCelda.push(html.div({"class":"aclaracion"},celda.aclaracion));
                }
                var controlVariable = Tedede.bestCtrl(celda.typeInfo).create();
                if(!(celda.variable in registro)){
                    registro[celda.variable] = coalesce(celda.defaultValue, null);
                }
                contenidoCelda.push(html.div({"class":["opciones", celda.typeInfo.typeName]}, [controlVariable]));
                luego = luego.then(function(){
                    Tedede.adaptElement(controlVariable,celda.typeInfo);
                    controlVariable.setTypedValue(registro[celda.variable]);
                    controlVariable.setAttribute("tedede-var", celda.variable);
                    controlVariable.addEventListener('update',function(){
                        tieneCambios=true;
                        sennialCambios.style.backgroundColor='orange';
                        if(timerCambios){
                            clearTimeout(timerCambios);
                        }
                        var timerCambios=setTimeout(grabarAlmacen,5000);
                        var value = this.getTypedValue();
                        registro[celda.variable] = value;
                        postAction('guardar-cambios',{
                            id: divFormulario.idRegistro,
                            ruta: {formulario: idFormulario, orden: orden, variable:celda.variable},
                            valor:value
                        });
                        validarRegistro(estructuraFormulario, registro, controles);
                    });
                    controles[celda.variable] = controlVariable;
                }).then(function(){
                    (celda.typeInfo.options||[]).forEach(function(option){
                        if(option.salto){
                            controlVariable.moreInfo[option.option].textContent=' pase a '+option.salto.tipo+' '+option.salto[option.salto.tipo];
                        }
                    });
                });
            }
        }
        var divCelda=html.div({"class":"celda"}, contenidoCelda);
        if(celda.tipo=='pregunta' && celda.subtipo=='multiple'){
            divsOpcionesMultiples.push(divCelda);
        }else{
            if(divsOpcionesMultiples.length){
                celdasDesplegadas.push(html.div({"class":"conjunto-preguntas-multiples"}, divsOpcionesMultiples));
                divsOpcionesMultiples=[];
            }
            celdasDesplegadas.push(divCelda);
        }
    });
    if(divsOpcionesMultiples.length){
        celdasDesplegadas.push(html.div({"class":"conjunto-preguntas-multiples"}, divsOpcionesMultiples));
        divsOpcionesMultiples=[];
    }
    divFormulario.appendChild(html.div({"class":["bloque","provisorio"], id:"div-modo-revisar"},[
        html.label({"for": "modo-revisar", id:"sennialCambios"}, "modo revisar"),
        html.input({type: "checkbox", "id": "modo-revisar"}),
    ]).create());
    divFormulario.appendChild(html.div({"class":"bloque"},celdasDesplegadas).create());
    pantalla.innerHTML='';
    pantalla.appendChild(divFormulario);
    pantalla.appendChild(html.input({type:"button",id:"botonFin", value:"Continuar"}).create());
    return luego.then(function(){
        if(result["modo-devel"]){
            var divModoRevisar = document.getElementById('div-modo-revisar');
            divModoRevisar.style.display='inherit';
            console.log(divModoRevisar)
        }
        var bFin = document.getElementById('botonFin');
        bFin.addEventListener('click', function() {
            var data = {
                id: divFormulario.idRegistro,
                almacen: almacen
            };
            if("no estoy en el ultimo"){
                grabarEIr(result,'continuar', result.status.siguiente.formulario, result.status.siguiente.orden)
            }else{
                postAction('finalizar', data).then(function(){
                    tieneCambios=false;
                    window.location = 'continuar';
                });
            }
        });
        document.getElementById("modo-revisar").addEventListener('change', function(){
            var divContenedor=this;
            while(divContenedor && !divContenedor.getAttribute("tedede-formulario")){
                divContenedor=divContenedor.parentNode;
            }
            if(!divContenedor){
                throw new Error("No encontre en tedede-formulario");
            }
            classToggle(divContenedor, "modo-revisar", this.checked);
        });
        return divFormulario;
    });
}

function presentarAlmacen(result, formAMostrar, ordenAMostrar){
    menu_bar.innerHTML='';
    var botonera=[];
    var principal='';
    result.status.siguiente={formulario:null, orden:null};
    // cambiar ese forEach por un forEach que devuelva primero el idFormulario (en el primer parámetro de function
    // var formulario = result.almacen.formularios[idFormulario]
    _.forEach(result.estructura['con-for'][result.id["tipo-abonado"]].formularios,function(idFormulario){
        var defFor = result.estructura.formularios[idFormulario];
        if((defFor.grupo||{"tipo-abonado":null})["tipo-abonado"]===result.id["tipo-abonado"]){
            if(defFor.principal && !principal){
                principal = idFormulario;
            }
            var listaFormularios;
            var sumarAlOrden;
            if(!defFor.multiple){
                sumarAlOrden=0;
                listaFormularios=[result.almacen.formularios[idFormulario]];
            }else{
                sumarAlOrden=1;
                listaFormularios=result.almacen.formularios[idFormulario];
            }
            _.forEach(listaFormularios, function(formulario, index){
                var orden=index+sumarAlOrden;
                var boton = html.button({class:'boton-abrir-formulario'}, idFormulario+" "+(orden||'')).create();
                boton.addEventListener('click', function(){
                    grabarEIr(result, 'continuar', idFormulario, orden);
                });
                if(formAMostrar===idFormulario && orden == ordenAMostrar){
                    boton.style.fontWeight='bold';
                    result.status.siguiente={formulario:null, orden:null};
                }else{
                    if(!result.status.siguiente.formulario){
                        result.status.siguiente.formulario=idFormulario;
                        result.status.siguiente.orden=orden;
                    }
                }
                botonera.push(boton);
            });
            if(defFor.multiple){
                if(result["modo-devel"]){ // OJO: OCULTAR AL USUARIO FINAL
                    var boton = html.button({class:['boton-abrir-formulario','provisorio']}, idFormulario+" nuevo").create();
                    boton.addEventListener('click', function(){
                        var length = result.almacen.formularios[idFormulario].push({
                            registro:bestGlobals.changing(result.estructura.registrosVacios[idFormulario],{})
                        });
                        grabarEIr(result, 'continuar', idFormulario, length);
                    });
                    botonera.push(boton);
                }
            }
        }
    });
    menu_bar.appendChild(html.div(botonera).create());
    formAMostrar = formAMostrar || principal;
    var defFor = result.estructura.formularios[formAMostrar];
    presentarFormulario(result, formAMostrar, ordenAMostrar).then(function(divFormulario){
        divFormulario.idRegistro = result.id;
    });
};

function alCargarOCambiarHash(){
    document.getElementById('status').textContent = "Cargando...";
    placa_grabando.style.visibility='hidden';
    AjaxBestPromise.post({
        url:'info-enc-act',
        data:{info:"{}"}
    }).then(function(resultJson){
        var result=JSON.parse(resultJson);
        result.status={};
        var idFormulario;
        var orden;
        if(window.location.hash){
            var partes=window.location.hash.substr(1).split(',');
            idFormulario=partes[0];
            orden=partes[1]-0||0;
        }
        presentarAlmacen(result,idFormulario,orden);
    }).catch(function(err){
        document.getElementById('status').textContent = "Error "+err.message;
        document.getElementById('status').textContent += "\n"+err.stack;
    });
};

window.addEventListener("load",alCargarOCambiarHash);
window.addEventListener("haschange",alCargarOCambiarHash);
window.addEventListener("popstate",alCargarOCambiarHash);

