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
    proced:'proced',
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
    proced:'proceder',
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
        var pageTitle = addrParams.label || addrParams.name || addrParams.table || my.config.config.title;
        document.title = pageTitle;
        my.tableGrid(addrParams.table||addrParams.name,layout, opts);
    },10);
}

myOwn.wScreens.procAux = {
    showParams:function(formDef, main_layout, addrParams, mainAction){
        addrParams.up=addrParams.up||{};
        var params=addrParams.up;
        var button = html.button(my.messages.proced).create();
        var divResult = html.div({class:formDef.resultClass||'result-pre'}).create();
        var id='progress'+Math.random();
        var toggleProgress = html.input({type:'checkbox', id:id, checked:true, disabled:true}).create();
        var labelProgress = html.label({for:id, id:id+'msg'},my.messages.viewProgress).create();
        // var divToggleProgress = html.div([toggleProgress, labelProgress]).create();
        var divProgress = html.div().create();
        var divProgressOutside = html.div({class:'result-progress', style:'opacity:0'},[toggleProgress,labelProgress,divProgress]).create();
        main_layout.appendChild(html.table({class:"table-param-screen"},formDef.parameters.map(function(parameterDef){
            var control = html.td({"typed-controls-direct-input":true}).create();
            control.style.minWidth='200px';
            control.style.backgroundColor='white';
            TypedControls.adaptElement(control,changing({typeName:'text'}, parameterDef));
            if(parameterDef.name in params){
                control.setTypedValue(params[parameterDef.name]);
            }else if('defaultValue' in parameterDef){
                params[parameterDef.name] = parameterDef.defaultValue;
                control.setTypedValue(parameterDef.defaultValue);
            }
            control.addEventListener('update', function(){
                params[parameterDef.name] = control.getTypedValue();
                myOwn.replaceAddrParams(addrParams);
            });
            return html.tr([ html.td(parameterDef.label||parameterDef.name),control]);
        }).concat(
            html.tr([html.td(), html.td([button])])
        )).create());
        main_layout.appendChild(divResult);
        main_layout.appendChild(divProgressOutside);
        button.onclick=function(){
            button.disabled=true;
            divResult.innerHTML="";
            divProgress.innerHTML="";
            divProgressOutside.style.opacity=0.77;
            labelProgress.textContent='procesando';
            mainAction(params,divResult,divProgress).then(function(resultOk){
                button.disabled=false;
                divProgressOutside.style.opacity=0.33;
                toggleProgress.disabled=false;
                labelProgress.textContent=resultOk?my.messages.completed:'error';
            })
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
        divResult.textContent = result;
        divResult.style.backgroundColor = '#5F5';
    },
    showError:function(err, divResult){
        divResult.textContent = err.message;
        divResult.style.backgroundColor = 'orange';
    }
}

myOwn.wScreens.path = function(addrParams){
    window.location.href='.'+addrParams.path;
}

myOwn.UriSearchToObject = function UriSearchToObject(locationSearch){
    var parts=locationSearch.split('&');
    var addrParams={}
    parts.forEach(function(pair){
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
        }
    });
    return addrParams;
}

function noChange(x){ return x; }

myOwn.UriSearchToObjectParams={
	i                :{ showInMenu:true , encode:function(value,menu){ return (menu.parents||[]).concat(menu.name).join(',') }},
	fc               :{                   encode:function(x){ return JSON.stringify(x); }, decode:function(x){ return JSON.parse(x)}  },
	ff               :{                   encode:function(x){ return JSON.stringify(x); }, decode:function(x){ return JSON.parse(x)}  },
	up               :{                   encode:function(x){ return JSON.stringify(x); }, decode:function(x){ return JSON.parse(x)}  },
	pf               :{                   encode:function(x){ return JSON.stringify(x); }, decode:function(x){ return JSON.parse(x)}  },
	section          :{ showInMenu:true , encode:noChange                                , decode:noChange          },
	directUrl        :{ hide:true       },
	selectedByDefault:{ hide:true       },
	showParams       :{ hide:true       },
    parents          :{ hide:true       },
    button           :{ hide:true       },
    fixedFields      :{ varName:'ff'    , encode:function(pairs){ return JSON.stringify(likeAr.toPlainObject(pairs, 'fieldName')); }}
}

myOwn.showPage = function showPage(pageDef){
    my.prepareFloating3dots();
    my.prepareRulerToggle();
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
    if(totalLayout.getAttribute('menu-type')!='hidden'){
        var menu = my.displayMainMenu(addrParams);
        var w=addrParams.w;
        if(!w && menu && menu.selectedItem){
            addrParams = changing(menu.selectedItem, addrParams);
            w=menu.selectedItem.menuType;
        }
        var pageTitle = addrParams.pageTitle || addrParams.title || addrParams.name || my.config.config.title;
        document.title = pageTitle;
        if(typeof my.wScreens[w] === 'function'){
            my.wScreens[w].call(my, addrParams);
        }else if(typeof my.wScreens[w] === 'object'){
            var wScreen = my.wScreens[w];
            if(wScreen.parameters){
                my.wScreens.procAux.showParams({
                    parameters:wScreen.parameters,
                    resultClass:wScreen.resultClass
                }, main_layout, addrParams, wScreen.mainAction);
            }
        }
        var rightMenu = document.getElementById('right-menu-icon');
    }else{
        var rightMenu = html.span({id: "right-menu"}, [
            html.img({class: "right-menu", src: my.path.img+"three-dot-menu.png",id: "right-menu-icon"}),
        ]).create();
        rightMenu.style.position='fixed';
        rightMenu.style.top='0px';
        rightMenu.style.left=window.innerWidth-40+'px';//screen.width-32
        rightMenu.style.zIndex=300;
        totalLayout.appendChild(rightMenu);
    }
    rightMenu.onclick=function(){
        my.rightMenu();
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

myOwn.createForkeableButton = function createForkeableButton(menu, opts){
    var my = this;
    if(typeof opts==="string" || opts==null){
        opts = {label:opts};
    }
    var label=opts.label;
    var button=html.a({"class": opts["class"]||menu["class"]||"menu-item", "menu-type":menu.menuType||menu.w, "menu-name":menu.name||'noname'}, label || menu.label || menu.name).create();
    button.setForkeableHref = function setForkeableHref(menu){
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
        button.href = href;
    }
    button.setForkeableHref(menu);
    menu.button = button;
    button.onmousedown=opts.updateHrefBeforeClick||function(){};
    button.onclick=opts.onclick||function(event){
        if(!event.ctrlKey && event.button!=1){
            history.pushState(null, null, this.href);
            my.showPage();
            event.preventDefault();
        }
    };
    return button;
};

function encodeMinimalURIComponent(text){
    return (text+'')
        .replace(/=/g, '%3D')
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

myOwn.light = function light(name, onclick){
    var skin=((this.config||{}).config||{}).skin;
    var skinUrl=(skin?skin+'/':'');
    var img = html.img({class:"light", id:'light-'+name, src:skinUrl+'img/'+name+'.png'}).create();
    img.result={};
    img.onclick=onclick;
    return img;
}

myOwn.displayMenu = function displayMenu(layout, menu, addrParams, parents){
    var my = this;
    var next = false;
    var selectedItem = null;
    var newMenuLine;
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
        var button = my.createForkeableButton(menuItem);
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
        elements.push(html.a({id: "not-logged", href:'login'}, my.messages.signIn));
        var status=html.span({id: "mini-console"}).create();
        status.addEventListener('click',function(){
            alertPromise(status.textContent,{underElement:status, withCloseButton:true, mainAttrs:{style:'white-space:pre'}});
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
                        alertPromise("No es posible salir del modo avión sin conexión al servidor");
                    }else{
                        my.offline.mode=!my.offline.mode;
                        my.offlineModeRefresh();
                        my.setOnlineOfflineUrl();
                        if(my.offline.mode){
                            var fkToStoreData = [];
                            var promiseChain = my.ldb.getAll('$structures').then(function(tablesDef){
                                tablesDef.forEach(function(tableDef){
                                    var fkToStoreSearch = tableDef.foreignKeys.filter(function(fk){
                                        return fk.fields.find(function(field){
                                            return !tableDef.primaryKey.includes(field.source)
                                        })
                                    });
                                    fkToStoreData = fkToStoreData.concat(fkToStoreSearch)
                                });
                            });
                            promiseChain = promiseChain.then(function(){
                                fkToStoreData.forEach(function(fk){
                                    var conn = new my.TableConnector({tableName: fk.references, my:my});
                                    promiseChain = promiseChain.then(function(){
                                        return conn.getStructure();
                                    });
                                    promiseChain = promiseChain.then(function(){
                                        return conn.getData().then(function(rows){
                                            my.ldb.putMany(fk.references, rows);
                                        });
                                    })
                                });
                                promiseChain = promiseChain.then(function(){
                                    location.reload();
                                });
                            });
                        }else{
                            my.showPage();
                        }
                    }
                }
            })
        ]));
        elements.push(status);
    }
    var menuLine=html.div({id: "main-top-bar"+(depth||''), class: depth?"sub-menu-bar":"top-menu-bar"}, elements).create();
    layout.appendChild(menuLine);
    var innerSelectedItem = selectedItem;
    if(selectedItem && selectedItem.menuType === 'menu'){
        var subMenu = my.displayMenu(layout, selectedItem.menuContent, addrParams, parents.concat(selectedItem.name));
        var realign = function(){
            subMenu.menuLine.style.paddingLeft = selectedItem.button.offsetLeft + 'px';
        };
        innerSelectedItem = subMenu.selectedItem;
    }
    return {menuLine: menuLine, selectedItem: innerSelectedItem, realigns:(subMenu?subMenu.realigns:[]).concat(realign)};
};

myOwn.displayMainMenu = function(addrParams){
    var my = this;
    var totalLayout=document.getElementById('total-layout');
    totalLayout.innerHTML='';
    var menu = my.displayMenu(totalLayout,my.config.menu,addrParams,[]);
    totalLayout.appendChild(html.div({id:'main_layout'}).create());
    setTimeout(function(){
        menu.realigns.reverse().forEach(function(realign){ if(realign){ realign(); }});
    },10);
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
        {img:my.path.img+'chpass.png', label:my.messages.chpass, doneFun:my.rigthMenuDoneFunLocation('chpass')},
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
    var skinUrl=(skin?skin+'/':'');
    if(my.offline.mode){
        imgLight.src=skinUrl+'img/airplane-on.png';
    }else{
        imgLight.src=skinUrl+'img/airplane-off.png';
    }
}

window.addEventListener('popstate', function(){
    my.showPage();
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
});

function updateOnlineStatus(){
    if(window.my){
        var networkLight=document.getElementById('light-network-signal');
        var skin=((my.config||{}).config||{}).skin;
        var skinUrl=(skin?skin+'/':'');
        if(networkLight){
            if(window.navigator.onLine){
                networkLight.src=skinUrl+'img/network-signal-ok.png';
                networkLight.result.status=my.messages.onLine;
            }else{
                networkLight.src=skinUrl+'img/network-no-signal.png';
                networkLight.result.status=my.messages.offLine;
            }
        }
    }
}

window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

myOwn.messages=myOwn.i18n.messages.en;
