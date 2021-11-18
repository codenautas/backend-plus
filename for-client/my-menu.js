"use strict";

// require('lazy-some').bindToPrototypeIn(Array);
var changing = require('best-globals').changing;
myOwn.wScreens={}

myOwn.i18n.messages.en=changing(myOwn.i18n.messages.en, {
    chpass:'change password',
    completed:'completed',
    exit:'exit',
    networkSignal1:'network $1',
    offLine:'off line',
    onLine:'on line',
    proceed:'proceed',
    processing:'processing',
    readyToDownload:'ready to download',
    signIn:'sign in',
    speed1:'speed $1',
    user:'user',
    viewProgress:'view progress',
});

myOwn.i18n.messages.es=changing(myOwn.i18n.messages.es, {
    chpass:'cambiar clave',
    completed:'finalizado',
    exit:'salir',
    networkSignal1:'estado de la red: $1',
    offLine:'fuera de línea',
    onLine:'en línea',
    proceed:'proceder',
    processing:'procesando',
    readyToDownload:'listo para descargar',
    signIn:'login',
    speed1:'velocidad $1',
    user:'usuario',
    viewProgress:'procesando',
});

myOwn.wScreens.table = function(addrParams){
    setTimeout(function(){
        var layout = document.getElementById('main_layout');
		var opts={tableDef:{}};
		if(addrParams.ff){
            if(addrParams.ff instanceof Array){
                opts.fixedFields=addrParams.ff;
            }else{
                opts.fixedFields=likeAr(addrParams.ff).map(function(value, key){ return {fieldName:key, value:value}; }).array();
            }
		}
		if(addrParams.fc){
            opts.tableDef.filterColumns=addrParams.fc;
		}
		if(addrParams.pf){
            opts.parameterFunctions=addrParams.pf;
		}
        if(addrParams.detailing){
            opts.detailing=addrParams.detailing;
        }
        opts.detailingForUrl=opts.detailing||{};
        opts.detailingPath = [];
        var pageTitle = addrParams.label || addrParams.name || addrParams.table || my.config.config.title;
        document.title = pageTitle;
        var grid = my.tableGrid(addrParams.table||addrParams.name,layout, opts);
    },10);
}

myOwn.wScreens.procAux = {
    showParams:function(formDef, main_layout, addrParams, mainAction){
        addrParams.autoproced = addrParams.autoproced || false
        addrParams.up=addrParams.up||{};
        var params=addrParams.up;
        var button = html.button(formDef.proceedLabel||my.messages.proceed).create();
        var divResult = html.div({class:formDef.resultClass||'result-pre'}).create();
        var id='progress'+Math.random();
        var toggleProgress = html.input({type:'checkbox', id:id, checked:true, disabled:true}).create();
        var labelProgress = html.label({for:id, id:id+'msg'},my.messages.viewProgress).create();
        // var divToggleProgress = html.div([toggleProgress, labelProgress]).create();
        var divProgress = html.div().create();
        var divProgressOutside = html.div({class:'result-progress', style:'opacity:0'},[toggleProgress,labelProgress,divProgress]).create();
        var controls = [];
        main_layout.appendChild(html.table({class:"table-param-screen"},formDef.parameters.map(function(parameterDef){
            var control = html.td({"typed-controls-direct-input":true}).create();
            control.style.minWidth='200px';
            control.style.backgroundColor='white';
            TypedControls.adaptElement(control,changing({typeName:'text'}, parameterDef));
            const value = parameterDef.name in params ? params[parameterDef.name] : (
                'defaultValue' in parameterDef ? parameterDef.defaultValue : (
                    'specialDefaultValue' in parameterDef ? my.specialDefaultValue[parameterDef.specialDefaultValue](parameterDef.name, {row:{}}, {row:{}}) : (
                        undefined
                    )
                )
            )
            if(value!==undefined){
                params[parameterDef.name] = value;
                control.setTypedValue(value);
            }
            control.addEventListener('update', function(){
                params[parameterDef.name] = control.getTypedValue();
                myOwn.replaceAddrParams(addrParams);
            });
            controls.push(control);
            return html.tr({"parameter-name":parameterDef.name},[ 
                html.td(parameterDef.label||parameterDef.name.replace(/_/g,' ')),
                control,
                html.td(parameterDef.description||''),
            ]);
        }).concat(
            html.tr([html.td(), html.td([button])])
        )).create());
        main_layout.appendChild(divResult);
        main_layout.appendChild(divProgressOutside);
        var proceed = function proceed(){
            button.disabled=true;
            divResult.innerHTML="";
            divProgress.innerHTML="";
            divProgressOutside.style.opacity=0.77;
            labelProgress.textContent=my.messages.processing;
            mainAction(params,divResult,divProgress).then(function(resultOk){
                if(formDef.uniqueUse){
                    controls.forEach(function(c){ c.disable(true) });
                    button.style.visibility='hidden'
                }else{
                    button.disabled=false;
                }
                button.disabled=false;
                divProgressOutside.style.opacity=0.33;
                toggleProgress.disabled=false;
                labelProgress.textContent=resultOk?my.messages.completed:'error';
            }).catch(function(err){
                my.log(err);
                divProgress.textContent=err.message;
            });
        }
        button.onclick=function(){
            proceed();
        }
        if(addrParams.autoproced){
            proceed();
        }
    },
    mainAction:function(){
    },
}

myOwn.wScreens.proc = function(addrParams){
    var procDef=my.config.procedures.find(function(proc){
        return proc.action == (addrParams.proc||addrParams.name);
    });
    myOwn.wScreens.procAux.showParams(procDef, main_layout, addrParams, function(params,divResult,divProgress){
        var my_ajax_actionFun = procDef.action.split('/').reduce(function(o, part){ return o[part]; },my.ajax);
        var opts={};
        if(procDef.progress!==false && divProgress){
            opts.divProgress = divProgress;
        }
        return my_ajax_actionFun(params,opts).then(function(result){
            my.wScreens.proc.result[procDef.resultOk](result,divResult);
            return true;
        },function(err){
            my.wScreens.proc.result[procDef.resultErr](err,divResult);
            return false;
        });
    });
}

myOwn.wScreens.proc.result={
    showText:function(result, divResult){
        if(typeof result=="object"){
            var div = document.createElement('div');
            divResult.appendChild(div);
            myOwn.agregar_json(div, result);
        }else{
            divResult.textContent = result;
            divResult.style.backgroundColor = '#9FA';
        }
    },
    showGrid:function(result, divResult){
        myOwn.tableGrid(result.tableName, divResult, result);
    },
    showError:function(err, divResult){
        divResult.textContent = err.message;
        divResult.style.backgroundColor = 'orange';
    },
    showDownloadUrl:function(result, divResult){
        divResult.innerHTML='';
        divResult.appendChild(html.div([
            html.div([my.messages.readyToDownload]),
            html.div([html.a({href:result.url}, result.url)])
        ]).create())
    }
}

myOwn.wScreens.path = function(addrParams){
    window.location.href='.'+addrParams.path;
}

myOwn.UriSearchToObject = function UriSearchToObject(locationSearch){
    var parts=locationSearch.split('&');
    var addrParams={}
    parts.forEach(function(pair,i){
        if(pair[0]==='#'){
            pair=pair.substr(1);
        }
        if(pair[0]==='?'){
            pair=pair.substr(1);
        }
        var eq = pair.indexOf('=');
        if(eq !== -1){
            var varName=pair.substr(0, eq);
            var value = decodeURIComponent(pair.substr(eq+1));
			var paramDef=myOwn.UriSearchToObjectParams[varName];
			if(paramDef && paramDef.decode){
				value = paramDef.decode(value);
			}
            addrParams[varName] = value;
            if(!i){
                Object.defineProperty(addrParams,'_firstParameterName',{value:varName, writable:false, enumerable:false});
            }
        }
    });
    return addrParams;
}

function noChange(x){ return x; }

myOwn.UriSearchToObjectParams={
	i                :{ showInMenu:true , encode:function(value,menu){ return menu.name?(menu.parents||[]).concat(menu.name).join(','):value }},
	fc               :{                   encode:function(x){ return JSON.stringify(x); }, decode:function(x){ return JSON.parse(x)}  },
	ff               :{                   encode:function(x){ return JSON.stringify(x); }, decode:function(x){ return JSON.parse(x)}  },
	up               :{                   encode:function(x){ return json4all.stringify(x); }, decode:function(x){ return json4all.parse(x)}  },
	pf               :{                   encode:function(x){ return JSON.stringify(x); }, decode:function(x){ return JSON.parse(x)}  },
	today            :{                   encode:function(x){ return JSON.stringify(x); }, decode:function(x){ return bestGlobals.date.iso((x+'').substr(0,10))}  },
	section          :{ showInMenu:true , encode:noChange                                , decode:noChange          },
	directUrl        :{ hide:true       },
	selectedByDefault:{ hide:true       },
	showParams       :{ hide:true       },
    parents          :{ hide:true       },
    button           :{ hide:true       },
    fixedFields      :{ varName:'ff'    , encode:function(pairs){ return JSON.stringify(likeAr.toPlainObject(pairs, 'fieldName')); }},
	detailing        :{                   encode:function(x){ return JSON.stringify(x); }, decode:function(x){ return JSON.parse(x)}  },
}

myOwn.preDisplayPage = function preDisplayPage(addrParams, wScreen, w){
    var my = this;
    var pageTitle = wScreen.pageTitle || addrParams.pageTitle || addrParams.title || addrParams.name || my.config.config.title;
    document.title = pageTitle;
    main_layout.setAttribute('my_w',w);
}

myOwn.showPage = function showPage(pageDef){
    my.prepareFloating3dots();
    var newHash;
    if(!location.hash){
        newHash=sessionStorage.getItem('backend-plus-hash-redirect');
        sessionStorage.removeItem('backend-plus-hash-redirect');
        if(newHash){
            history.replaceState(null, null, location.origin+location.pathname+location.search+newHash);
        }
    }
    var addrParams=my.UriSearchToObject(location.hash||location.search||newHash||'');
    if(addrParams.i){
        addrParams.i=addrParams.i.split(',');
    }else{
        addrParams.i=[];
    }
    var totalLayout=document.getElementById('total-layout');
    var rightMenu;
    if(totalLayout.getAttribute('menu-type')!='hidden'){
        var menu = my.displayMainMenu(addrParams);
        var w=addrParams.w;
        if(!w){
            if(!addrParams.i.length && addrParams._firstParameterName && my.wScreens[addrParams._firstParameterName]){
                w=addrParams._firstParameterName;
            }else if(menu && menu.selectedItem){
                addrParams = changing(menu.selectedItem, addrParams);
                w=menu.selectedItem.menuType;
            }
        }
        var wScreen;
        if(typeof my.wScreens[w] === 'function'){
            wScreen={
                mainFunction:my.wScreens[w]
            };
        }else if(typeof my.wScreens[w] === 'object'){
            wScreen = my.wScreens[w];
            if(wScreen.parameters){
                wScreen.mainFunction=wScreen.mainFunction||function(addrParams){
                    my.wScreens.procAux.showParams({
                        parameters:wScreen.parameters,
                        resultClass:wScreen.resultClass,
                        proceedLabel:wScreen.proceedLabel,
                    }, main_layout, addrParams, wScreen.mainAction);
                }
            }
        }else{
            wScreen={
                mainFunction:function(){}
            }
        }
        my.preDisplayPage(addrParams, wScreen, w);
        wScreen.mainFunction.call(my, addrParams);
        rightMenu = document.getElementById('right-menu-icon');
    }else{
        rightMenu = html.span({id: "right-menu"}, [
            html.img({class: "right-menu", src: my.path.img+"three-dot-menu.png",id: "right-menu-icon"}),
        ]).create();
        rightMenu.style.position='fixed';
        rightMenu.style.top='0px';
        rightMenu.style.left=window.innerWidth-40+'px';//screen.width-32
        rightMenu.style.zIndex=300;
        totalLayout.appendChild(rightMenu);
    }
    rightMenu.onclick=function(){
        if(!my.offline.mode){
            my.rightMenu();
        }
    }
};

myOwn.menuName = 'menu';
myOwn.menuSeparator = '#';
Object.defineProperty(myOwn, 'menup', {
    get:function(){
        var menuName = my.offline.mode?'ext':this.menuName;
        return menuName+this.menuSeparator; 
    }
});

myOwn.getHRef = function getHRef(menu){
    var href;
    if(!menu.w && menu.menuType){
        if(menu.directUrl){
            href = my.menup + my.paramsToUriPart(changing({w:menu.menuType}, changing(menu,{menuType:null, label:null, button:null},changing.options({deletingValue:undefined}))));
        }else{
            href = my.menup + my.paramsToUriPart(changing({i:menu.name},menu),true);
        }
    }else{
        href = my.menup + my.paramsToUriPart(menu);
    }
    return href;
}

myOwn.gotoAddrParams = function gotoAddrParams(addrParams, pushing){
    var href = my.getHRef(addrParams);
    if(pushing){
        history.pushState(null, null, href);
    }else{
        history.replaceState(null, null, href);
    }
    my.showPage();
}

myOwn.createForkeableButton = function createForkeableButton(menu, opts){
    var my = this;
    if(typeof opts==="string" || opts==null){
        opts = {label:opts};
    }
    var label=opts.label;
    var button=html.a({"class": opts["class"]||menu["class"]||"menu-item", "menu-type":menu.menuType||menu.w, "menu-name":menu.name||'noname'}, label || menu.label || menu.name.replace(/_/g,' ')).create();
    button.setForkeableHref = function setForkeableHref(menu){
        button.href = my.getHRef(menu);
    }
    button.setForkeableHref(menu);
    menu.button = button;
    button.disable=function(disable){
        button.setAttribute('bp-is-disabled',disable);
    }
    button.onmousedown=opts.updateHrefBeforeClick||function(){};
    button.onclick=opts.onclick||function(event){
        if(button.getAttribute('bp-is-disabled')=='true'){
            event.preventDefault();
            return;
        }
        /** @type {null|string} */
        var errorText;
        if(opts.preOnClick){
            errorText=opts.preOnClick();
        }
        if(errorText){
            alertPromise(errorText);
        }else{
            if(!event.ctrlKey && event.button!=1){
                /*
                if(button.parentNode.clientSidePrepared){
                    history.replaceState(null, null, )
                }
                */
                history.pushState(null, null, this.href);
                my.showPage();
                event.preventDefault();
            }
        }
    };
    return button;
};

function encodeMinimalURIComponent(text){
    return (text+'')
        .replace(/\=/g, '%3D')
        .replace(/\?/g, '%3F')
        .replace(/\#/g, '%23')
        .replace(/&/g, '%26')
        .replace(/%/g, '%25');
}

myOwn.paramsToUriPart = function paramsToUriPart(params, inMenu){
    var paramStr=likeAr(params).map(function(value, name){
		var paramDef=myOwn.UriSearchToObjectParams[name] || { encode:function(x){return x}, varName:name };
		if((paramDef.showInMenu || !inMenu) && !paramDef.hide || (params.showParams && params.showParams.includes(name))){
			if(value!=null){
                value=paramDef.encode(value, params);
				return (paramDef.varName||name)+'='+encodeMinimalURIComponent(value);
			}
		}
    }).filter(function(expr){return expr;}).join('&');
	return paramStr;
}

myOwn.replaceAddrParams = function replaceAddrParams(params){
    var my=this;
    history.replaceState(null, null, my.menup+my.paramsToUriPart(params));
}

myOwn.light = function light(name, onclick, opts){
    var skin=((this.config||{}).config||{}).skin;
    var skinUrl=(skin?skin+'/':'');
    var attr={class:"light", id:'light-'+name, src:skinUrl+'img/'+name+'.png'};
    if(opts && opts.attr){
        likeAr(opts.attr).forEach(function(value, key){ attr[key]=value; })
    }
    var img = html.img(attr).create();
    img.result={};
    img.onclick=onclick;
    return img;
}

myOwn.displayMenu = function displayMenu(layout, menu, addrParams, parents){
    var my = this;
    var selectedItem = null;
    var elements=[];
    var depth = parents.length;
    var skin=((this.config||{}).config||{}).skin;
    var skinUrl=(skin?skin+'/':'');
    if(depth===0){
        elements.push(html.img({id: "main-logo", src: skinUrl+"img/logo.png"}));
    }
    var myMenu = my.offline.mode?menu.filter(function(menuItem){return menuItem.showInOfflineMode === true;}):menu;
    elements = elements.concat(myMenu.map(function(menuItem){
        menuItem.parents = parents;
        var wScreen=my.wScreens[menuItem.menuType]||{}
        var opts={}
        if(wScreen.getMenuLabel){
            opts.label=wScreen.getMenuLabel();
        }
        var button = my.createForkeableButton(menuItem, opts);
        if(menuItem.visible === false){
            button.style = 'display:none'
        }
        if(menuItem.name == addrParams.i[depth] || !addrParams.i[depth] && menuItem.selectedByDefault){
            button.setAttribute('menu-selected', 'yes');
            selectedItem = menuItem;
        }
        return button;
    }))
    if(depth===0){
        elements.push(html.img({src: skinUrl+"img/three-dot-menu.png",id: "right-menu-icon"}));
        elements.push(html.span({id: "active-user"}, my.config.username||"user"));
        var loginElement=html.a({id: "not-logged", href:'login'}, my.messages.signIn).create();
        loginElement.onclick=function(){
            this.href='login'+window.location.hash;
        };
        elements.push(loginElement);
        var status=html.span({id: "mini-console"}).create();
        status.addEventListener('click',function(){
            var mensajeDiv=document.createElement('div');
            mensajeDiv.innerHTML=status.innerHTML;
            alertPromise(mensajeDiv,{underElement:status, withCloseButton:true, mainAttrs:{style:'white-space:pre'}});
        });
        elements.push(html.span({class:'right-lights'},[
            my.light('server', function(){
                alertPromise(
                    my.messages.speed1.replace('$1',this.result.speed),
                    {underElement:this}
                );
            }),
            my.light('network-signal', function(){
                alertPromise(
                    my.messages.networkSignal1.replace('$1',this.result.status),
                    {underElement:this}
                );
            }),
            my.light('airplane', function(){
                if(my.ldb && my.offline){
                    if(my.offline.mode && !my.server.connected){
                        promptPromise("Si desea salir del modo avión puede forzarlo").then(function(texto){
                            if (texto == 'forzar') {
                                my.changeOfflineMode();
                            }
                        });
                    }else{
                        my.changeOfflineMode();
                    }
                }
            }, {hidden:true})
        ]));
        elements.push(status);
    }
    var spanElements=html.span(elements).create();
    var menuLine=html.div({id: "main-top-bar"+(depth||''), class: depth?"sub-menu-bar":"top-menu-bar"}, spanElements).create();
    layout.appendChild(menuLine);
    var innerSelectedItem = selectedItem;
    if(selectedItem && selectedItem.menuType === 'menu'){
        var subMenu = my.displayMenu(layout, selectedItem.menuContent, addrParams, parents.concat(selectedItem.name));
        var realign = function(){
            var div=html.div({style:'position:absolute; left:0; top:0; visibility:x-hidden'}).create();
            div.innerHTML=subMenu.spanElements.outerHTML;
            subMenu.spanElements.parentNode.appendChild(div);
            var theWidth=subMenu.spanElements.offsetWidth;
            theWidth=div.childNodes[0].offsetWidth||theWidth;
            subMenu.spanElements.parentNode.removeChild(div);
            var oneLimit=Math.max(1,layout.offsetWidth-theWidth-32);
            if(oneLimit<theWidth){
                subMenu.menuLine.style.textAlign = 'right';
                subMenu.menuLine.style.paddingLeft = null;
            }else{
                subMenu.menuLine.style.textAlign = 'left';
                subMenu.menuLine.style.paddingLeft = Math.min(selectedItem.button.offsetLeft, oneLimit) + 'px';
            }
        };
        innerSelectedItem = subMenu.selectedItem;
    }
    return {menuLine: menuLine, selectedItem: innerSelectedItem, realigns:(subMenu?subMenu.realigns:[]).concat(realign), spanElements:spanElements};
};

myOwn.displayMainMenu = function(addrParams){
    if(window.currentAutofrefresh){
        console.log("borro currentAutoRefresh")
        clearInterval(window.currentAutofrefresh);
        window.currentAutofrefresh=null;
    }
    var my = this;
    var totalLayout=document.getElementById('total-layout');
    totalLayout.innerHTML='';
    var menu = my.displayMenu(totalLayout,my.config.menu,addrParams,[]);
    totalLayout.appendChild(html.div({id:'main_layout'}).create());
    my.doMenuRealigns=function(){
        menu.realigns.reverse().forEach(function(realign){ if(realign){ realign(); }});
    }
    setTimeout(my.doMenuRealigns,10);
    setTimeout(function(){
        my.offlineModeRefresh();
    },10);
    return menu;
};

myOwn.rigthMenuDoneFunLocation = function rigthMenuDoneFunLocation(newLocation){
    return function(){
        window.location.href = newLocation;
        return null;
    };
};

myOwn.rightMenuOpts = function rightMenuOpts(){
    return [
        // {label:my.messages.user, startGroud:'true'},
        {id:'right-menu-chpass', img:my.path.img+'chpass.png', label:my.messages.chpass, doneFun:my.rigthMenuDoneFunLocation('chpass')},
    ]
};

myOwn.rightMenu = function rightMenu(){
    return miniMenuPromise(my.rightMenuOpts().concat(
        {img:my.path.img+'exit.png'  , label:my.messages.exit  , doneFun:my.rigthMenuDoneFunLocation('logout')}
    ),{
        underElement:document.getElementById('right-menu-icon'),
        withCloseButton:false,
    });
};

myOwn.informDetectedStatus = function informDetectedStatus(statusCode, logged) {
    var my=this;
    if(my.debuggingStatus){ my.debuggingStatus(statusCode); }
    var status = my["connection-status"][statusCode];
    if(status.id){
        var light = document.getElementById(status.id);
        light.src = my.path.img+status.img+'.png';
        light.title = statusCode;
    }
    if(statusCode==='notLogged'){
        var notLogged = document.getElementById('not-logged');
        notLogged.style.display='inherit';
        var activeUser = document.getElementById('active-user');
        activeUser.style.display='none';
    }
}

myOwn.setOnlineOfflineUrl = function setOnlineOfflineUrl(){
    var actualHref=location.href;
    var hrefSplit = actualHref.split(my.menuSeparator)
    var newHref = my.offline.mode?'ext':my.menuName;
    newHref = (hrefSplit.length > 1)?newHref+my.menuSeparator+hrefSplit[1]:newHref;
    history.pushState(null, null, newHref);
}

myOwn.offlineModeRefresh = function offlineModeRefresh(){
    var my=this;
    /** @type {HTMLImageElement} */
    // @ts-ignore
    var imgLight = document.getElementById('light-airplane');
    var skin=((my.config||{}).config||{}).skin;
    if(my.offline.mode){
        imgLight.src=my.path.img+'airplane-on.png';
    }else{
        imgLight.src=my.path.img+'airplane-off.png';
    }
}

myOwn.changeOfflineMode = function changeOfflineMode(){
    my.offline.mode=!my.offline.mode;
    my.offlineModeRefresh();
    my.setOnlineOfflineUrl();
    if(my.offline.mode){
        var fkToStoreData = [];
        var promiseArray1 = [];
        var promiseChain = my.ldb.getAllStructures().then(function(tablesDef){
            tablesDef.forEach(function(tableDef){
                promiseArray1.push(
                    my.ldb.isEmpty(tableDef.name).then(function(isEmpty){
                        if(!isEmpty){
                            var fkToStoreSearch = tableDef.foreignKeys.filter(function(fk){
                                return fk.fields.find(function(field){
                                    return !tableDef.primaryKey.includes(field.source)
                                })
                            });
                            fkToStoreData = fkToStoreData.concat(fkToStoreSearch);
                        }
                    })
                );
            });
        });
        var promiseArray2 = [];
        promiseChain = promiseChain.then(function(){
            return Promise.all(promiseArray1).then(function(){
                return fkToStoreData.forEach(function(fk){
                    var conn = new my.TableConnector({tableName: fk.references, my:my});
                    var opts = { registerInLocalDB: false };
                    conn.getStructure(opts)
                    promiseArray2.push(
                        Promise.resolve().then(function(){
                            return conn.getData().then(function(rows){
                                return my.ldb.putMany(fk.references, rows)
                            })
                        })
                    );
                });
            });
        });
        promiseChain = promiseChain.then(function(){
            Promise.all(promiseArray2).then(function(){
                location.reload();
            })
        });
    }else{
        my.showPage();
        location.reload();
    }
}

window.addEventListener('popstate', function(){
    if(!my.config){
        my.autoSetup().then(function(){
            my.setOnlineOfflineUrl();
            my.showPage();
        })
    }else{
        my.showPage();
    }
});

window.addEventListener('load', function(){
    window.my = myOwn;
    my.autoSetup().then(function(){
        my.setOnlineOfflineUrl();
        my.showPage();
    })
    document.body.appendChild(html.div({id:'cached-images'},[
        html.img({src:my.path.img+'airplane-on.png'}),
        html.img({src:my.path.img+'airplane-off.png'}),
        html.img({src:my.path.img+'airplane.png'}),
        html.img({src:my.path.img+'server.png'}),
        html.img({src:my.path.img+'network-signal.png'}),
        html.img({src:my.path.img+'server-error.png'}),
        html.img({src:my.path.img+'network-no-signal.png'}),
    ]).create());
    window.addEventListener('resize', function(){
        if(my.doMenuRealigns){
            my.doMenuRealigns();
        }
    })
});

function updateOnlineStatus(){
    if(window.my){
        var networkLight=document.getElementById('light-network-signal');
        var skin=((my.config||{}).config||{}).skin;
        if(networkLight){
            if(window.navigator.onLine){
                networkLight.src=my.path.img+'network-signal-ok.png';
                networkLight.result.status=my.messages.onLine;
            }else{
                networkLight.src=my.path.img+'network-no-signal.png';
                networkLight.result.status=my.messages.offLine;
            }
        }
    }
}

window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

myOwn.messages=myOwn.i18n.messages.en;
