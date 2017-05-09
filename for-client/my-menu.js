"use strict";

require('lazy-some').bindToPrototypeIn(Array);

myOwn.wScreens={}

myOwn.messages=changing(myOwn.messages, {
    chpass:'change password',
    exit:'exit',
    proced:'proced',
    user:'user',
});

myOwn.es=changing(myOwn.es, {
    chpass:'cambiar clave',
    exit:'salir',
    proced:'proceder',
    user:'usuario',
});

myOwn.wScreens.table = function(addrParams){
    setTimeout(function(){
        var layout = document.getElementById('main_layout');
        my.tableGrid(addrParams.table||addrParams.name,layout);
    },10);
}

myOwn.wScreens.proc = function(addrParams){
    var procDef=my.config.procedures.find(function(proc){
        return proc.action == (addrParams.proc||addrParams.name);
    });
    console.log('procDef');
    console.log(addrParams);
    console.log(procDef);
    var params={};
    var button = html.button(my.messages.proced).create();
    var divResult = html.div().create();
    divResult.style.minHeight='40px';
    main_layout.appendChild(html.table({class:"table-param-screen"},procDef.parameters.map(function(parameterDef){
        var control = html.td().create();
        control.style.minWidth='200px';
        control.style.backgroundColor='white';
        TypedControls.adaptElement(control,parameterDef);
        if('defaultValue' in parameterDef){
            params[parameterDef.name] = parameterDef.defaultValue;
            control.setTypedValue(parameterDef.defaultValue);
        }
        control.addEventListener('update', function(){
            params[parameterDef.name] = control.getTypedValue();
        });
        return html.tr([html.td(parameterDef.label||parameterDef.name), control]);
    }).concat(
        html.tr([html.td(), html.td([button])])
    )).create());
    main_layout.appendChild(divResult);
    button.onclick=function(){
        var my_ajax_actionFun = procDef.action.split('/').reduce(function(o, part){ return o[part]; },my.ajax);
        console.log('x',params);
        button.disabled=true;
        my_ajax_actionFun(params).then(function(result){
            divResult.textContent = result;
            divResult.style.backgroundColor = '#5F5';
        },function(err){
            divResult.textContent = err.message;
            divResult.style.backgroundColor = 'orange';
        }).then(function(){
            button.disabled=false;
        });
    }
}

myOwn.showPage = function showPage(pageDef){
    my.prepareFloating3dots();
    my.prepareRulerToggle();
    var parts=location.search.split('&');
    var addrParams={}
    parts.forEach(function(pair){
        if(pair[0]==='?'){
            pair=pair.substr(1);
        }
        var eq = pair.indexOf('=');
        if(eq !== -1){
            var varName=pair.substr(0, eq);
            addrParams[varName] = decodeURIComponent(pair.substr(eq+1));
        }
    });
    if(addrParams.i){
        addrParams.i=addrParams.i.split(',');
    }else{
        addrParams.i=[];
    }
    var menu = my.displayMainMenu(addrParams);
    var w=addrParams.w;
    if(!w && menu && menu.selectedItem){
        addrParams = changing(addrParams, menu.selectedItem);
        w=menu.selectedItem.menuType;
    }
    if(typeof my.wScreens[w] === 'function'){
        my.wScreens[w].call(my, addrParams);
    }
    var rightMenu = document.getElementById('right-menu');
    rightMenu.onclick=function(){
        my.rightMenu();
    }
};

myOwn.createForkeableButton = function createForkeableButton(menu){
    var be = this;
    var href = 'menu?i=' + menu.parents.concat(menu.name).join(',');
    var button=html.a({"class": "menu-item", "menu-type":menu.menuType, "menu-name":menu.name, href: href}, menu.label || menu.name).create();
    menu.button = button;
    button.onclick=function(event){
        if(!event.ctrlKey){
            history.pushState(null, null, href);
            my.showPage();
            event.preventDefault();
        }
    };
    return button;
};

function encodeMinimalURIComponent(text){
    return text
        .replace(/=/g, '%3D')
        .replace(/\?/g, '%3F')
        .replace(/&/g, '%26')
        .replace(/%/g, '%25');
}

myOwn.replaceAddrParams = function replaceAddrParams(params){
    var paramPart = likeAr(params).map(function(value, name){
        return name+'='+encodeMinimalURIComponent(value);
    }).join('&');
    history.replaceState(null, null, 'menu?'+paramPart);
}

myOwn.displayMenu = function displayMenu(layout, menu, addrParams, parents){
    var be = this;
    var next = false;
    var selectedItem = null;
    var newMenuLine;
    var elements=[];
    var depth = parents.length;
    var skin=be.config.config.skin;
    var skinUrl=(skin?skin+'/':'');
    if(depth===0){
        elements.push(html.img({id: "main-logo", src: skinUrl+"img/logo.png"}));
    }
    elements = elements.concat(menu.map(function(menuItem){
        menuItem.parents = parents;
        var button = my.createForkeableButton(menuItem);
        if(menuItem.name == addrParams.i[depth]){
            button.setAttribute('menu-selected', 'yes');
            selectedItem = menuItem;
        }
        return button;
    }))
    if(depth===0){
        elements.push(html.span({id: "right-menu"}, [
            html.span({id: "active-user"}, my.config.username||"user"),
            html.img({class: "right-menu", src: skinUrl+"img/three-dot-menu.png",id: "right-menu-icon"}),
        ]));
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
    var be = this;
    var totalLayout=document.getElementById('total-layout');
    totalLayout.innerHTML='';
    var menu = be.displayMenu(totalLayout,my.config.menu,addrParams,[]);
    totalLayout.appendChild(html.div({id:'main_layout'}).create());
    setTimeout(function(){
        menu.realigns.reverse().forEach(function(realign){ if(realign){ realign(); }});
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
        {label:my.messages.user, startGroud:'true'},
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

window.addEventListener('load', function(){
    window.my = myOwn;
    my.autoSetup().then(function(){
        my.showPage();
    });
});