"use script";

function classToggle(element,clase, sacoAgrego ){
    if(sacoAgrego){
        element.classList.add(clase);
    }else{
        element.classList.remove(clase);
    } 
}

function dropAllChilds(element){
    var childrenToDrop = Array.prototype.slice.call(element.childNodes)
    childrenToDrop.forEach(function(child){
        element.removeChild(child);
    });
    // element.innerHTML="";
}

var html=jsToHtml.html;
var coalesce = bestGlobals.coalesce;

function validarRegistro(estructuraFormulario, registro, controles){
    // transformar en recorrer el arreglo controles y verificar la existencia de "expresion-habilitar"
    //console.log('======= controles');
    //console.log(estructuraFormulario);
    //console.log(controles);
    estructuraFormulario.celdas.forEach(function(celda){
        if(celda.tipo==='pregunta' && celda['expresion-habilitar'] ){
            var expresionEvaluable = celda['expresion-habilitar'].replace(Regexplicit.variables, function(variableName){
                return "registro."+variableName;
            }).replace(Regexplicit.operatorEqual, function(match,left,equal,right){
                return left+'=='+right;
            });
            var disabled = !eval(expresionEvaluable);
            controles[celda.variable].disabled = disabled;
            if(disabled){
                controles[celda.variable].celda.setAttribute('typed-controls-disabled','disabled');
                controles[celda.variable].disable(true);
                controles[celda.variable].setTypedValue(null)
            }else{
                controles[celda.variable].celda.removeAttribute('typed-controls-disabled');
                controles[celda.variable].disable(false);
            }
        }
    });
}

function grabarYLuego(result){
   // sennialCambios.style.backgroundColor='lightblue';
    placa_grabando.style.visibility='visible';
    return postAction('guardar',{
        id: result.id,
        almacen: result.almacen
    }).then(function(){
        tieneCambios=false;
       // sennialCambios.style.backgroundColor='lightgreen';
    }).then(function(){
        setTimeout(function(){
            placa_grabando.style.visibility='hidden';
        },100);
    });
}

function grabarEIr(result, pagina, idFormulario, orden){
    grabarYLuego(result).then(function(){
        window.scrollTo(0,0);
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
    var divFormulario=html.div({"typed-controls-formulario":"trac"}).create();
    var luego = Promise.resolve();
    var contador=0;
    var divsOpcionesMultiples=[];
    var tieneCambios=false;
    var celdasEspecificarParaVariablesMultiples={};
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
        if(celda.tipo == 'especial'){
            if(celda.texto=='harcodeado'){
                if(orden<=10){
                    var diccionario={'1': 'PRIMER',
                                     '2': 'SEGUNDO',
                                     '3': 'TERCER',
                                     '4': 'CUARTO',
                                     '5': 'QUINTO',
                                     '6': 'SEXTO',
                                     '7': 'SEPTIMO',
                                     '8': 'OCTAVO',
                                     '9': 'NOVENO',
                                     '10': 'DECIMO'
                    }
                    contenidoCelda.push( html.div({"class":"especial"},[
                        html.span({"class":"especial"},'Las siguientes preguntas refieren al '),
                        html.span({"class":"especial-resaltar"},diccionario[orden]),
                        html.span({"class":"especial"},' abono')
                    ]));
                }else{
                    contenidoCelda.push( html.div({"class":"especial"},[
                        html.span({"class":"especial"},'Las siguientes preguntas refieren al abono '),
                        html.span({"class":"especial-resaltar"},orden)
                    ]));
                }
            }else{
                if(orden=='1'){
                    contenidoCelda.push(html.div({"class":"orden-1"},celda.texto))
                }
            }
        }

        if(celda.tipo=='titulo'){
            contenidoCelda.push(html.div({"class":"titulo", id:"titulo"},celda.titulo))
            if(celda.aclaracion){
                contenidoCelda.push(html.div({"class":"aclaracion"},celda.aclaracion));
            }
        }
        if(celda.tipo=='texto'){
            contenidoCelda.push(html.div({"class":"texto"},celda.texto))
            if(celda.aclaracion){
                contenidoCelda.push(html.div({"class":"aclaracion"},celda.aclaracion));
            }
                
        }
        var divCelda;
        if(celda.tipo=='pregunta'){
            contenidoCelda.push(html.div({"class":"codigo"},celda.pregunta));
            contenidoCelda.push(html.div({"class":celda.subtipo||"preguntas",id:celda.pregunta},celda.texto));
            if(celda.aclaracion){
                contenidoCelda.push(html.div({"class":"aclaracion"},celda.aclaracion));
            }
            var controlVariable = TypedControls.bestCtrl(celda.typeInfo).create();
            if(!(celda.variable in registro)){
                registro[celda.variable] = coalesce(celda.defaultValue, null);
            }
            contenidoCelda.push(html.div({"class":["opciones", celda.typeInfo.typeName]}, [controlVariable]));
            if(celda.subtipo=='multiple'){
                var masInfoMultiple=html.div({"class":["mas-info-multiple"]}).create();
                contenidoCelda.push(masInfoMultiple);
                celdasEspecificarParaVariablesMultiples[celda.variable]=masInfoMultiple;
            }
            luego = luego.then(function(){
                TypedControls.adaptElement(controlVariable,celda.typeInfo);
                controlVariable.setTypedValue(registro[celda.variable]);
                controlVariable.setAttribute("typed-controls-var", celda.variable);
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
                controlVariable.celda = divCelda;
                controles[celda.variable] = controlVariable;
            })/*.then(function(){
                (celda.typeInfo.options||[]).forEach(function(option){
                    if(option.salto){
                        controlVariable.moreInfo[option.option].textContent=' pase a '+option.salto.tipo+' '+option.salto[option.salto.tipo];
                    }
                });
            })*/;
        }
       // console.log("celda.subtipo",celda.subtipo)
        divCelda=html.div({"class":"celda", "typed-controls-tipo":celda.tipo, "typed-controls-subtipo":celda.subtipo}, contenidoCelda).create();
        // divCelda=html.div({"class":"celda"}, contenidoCelda).create();
        if(celda.deshabilitado){
            divCelda.setAttribute('deshabilitado',celda.deshabilitado);
        }
        if(celdasEspecificarParaVariablesMultiples[celda["subordinado-a"]||celda["expresion-habilitar"]]){
            celdasEspecificarParaVariablesMultiples[celda["subordinado-a"]||celda["expresion-habilitar"]].appendChild(divCelda)
        }else if(celda.tipo=='pregunta' && celda.subtipo=='multiple'){
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
    dropAllChilds(pantalla);
    pantalla.appendChild(divFormulario);
    pantalla.appendChild(html.input({
        type:"button",
        id:"botonFin", 
        value:result.status.siguiente.formulario?"Continuar":"Finalizar"
    }).create());
    return luego.then(function(){
        if(result["modo-devel"]){
            var divModoRevisar = document.getElementById('div-modo-revisar');
            divModoRevisar.style.display='inherit';
            //console.log(divModoRevisar)
        }
        var bFin = document.getElementById('botonFin');
        bFin.addEventListener('click', function() {
            var data = {
                id: divFormulario.idRegistro,
                almacen: almacen
            };
            if(result.status.siguiente.formulario){
                grabarEIr(result,'continuar', result.status.siguiente.formulario, result.status.siguiente.orden);
            }else{
                postAction('finalizar', data).then(function(){
                    tieneCambios=false;
//                    window.location = 'continuar';
                    window.location = 'fin-ingreso';
                });
            }
        });
        document.getElementById("modo-revisar").addEventListener('change', function(){
            var divContenedor=this;
            while(divContenedor && !divContenedor.getAttribute("typed-controls-formulario")){
                divContenedor=divContenedor.parentNode;
            }
            if(!divContenedor){
                throw new Error("No encontre en typed-controls-formulario");
            }
            classToggle(divContenedor, "modo-revisar", this.checked);
        });
    }).then(function(){
        validarRegistro(estructuraFormulario, registro, controles);
        window.addEventListener("beforeunload", function (event) {
            grabarAlmacen();
        });
        return divFormulario;
    });
}

function presentarAlmacen(result, formAMostrar, ordenAMostrar){
    formAMostrar = formAMostrar || result.estructura['con-for'][result.id["tipo-abonado"]]["formulario-principal"];
    ordenAMostrar = ordenAMostrar || 0;
    dropAllChilds(menu_bar);
    var botonera=[];
    result.status.siguiente={formulario:null, orden:null};
    // cambiar ese forEach por un forEach que devuelva primero el idFormulario (en el primer parámetro de function
    // var formulario = result.almacen.formularios[idFormulario]
    _.forEach(result.estructura['con-for'][result.id["tipo-abonado"]].formularios,function(idFormulario){
        var defFor = result.estructura.formularios[idFormulario];
        if((defFor.grupo||{"tipo-abonado":null})["tipo-abonado"]===result.id["tipo-abonado"]){
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
                var boton = html.button({class:'boton-abrir-formulario'}, defFor.abreviatura+" "+(orden||'')).create();
//                var boton = html.button({class:'boton-abrir-formulario'}, idFormulario+" "+(orden||'')).create();
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
    var defFor = result.estructura.formularios[formAMostrar];
    presentarFormulario(result, formAMostrar, ordenAMostrar).then(function(divFormulario){
        divFormulario.idRegistro = result.id;
    });
};

function alCargarOCambiarHash(event){
    // document.getElementById('status').textContent = "Cargando...";
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
        agregaLogoAlElemento(imagen);
    }).catch(function(err){
        console.log(err.message);
        console.log(err);
        document.getElementById('status').textContent = "Error "+err.message;
        document.getElementById('status').textContent += "\n"+err.stack;
    }).then(function(){
        placa_grabando.style.visibility='hidden';
    });
};
window.addEventListener("load",alCargarOCambiarHash);
window.addEventListener("hashchange",alCargarOCambiarHash);
window.addEventListener("popstate",alCargarOCambiarHash);

