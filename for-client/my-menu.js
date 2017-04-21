"use strict";

myOwn.wScreens={}

myOwn.messages=changing(myOwn.messages, {
    chpass:'change password',
    exit:'exit',
    user:'user',
});

myOwn.es=changing(myOwn.es, {
    chpass:'cambiar clave',
    exit:'salir',
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
        return proc.action == addrParams.proc||addrParams.name;
    });
    main_layout.appendChild(html.table({class:"table-param-screen"},procDef.parameters.map(function(parameterDef){
        var control = html.td().create();
        control.style.minWidth='200px';
        control.style.backgroundColor='white';
        TypedControls.adaptElement(control,{typeName:'text'});
        return html.tr([html.td(parameterDef.label||parameterDef.name), control]);
    })).create());
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

myOwn.displayMenu = function displayMenu(layout, menu, addrParams, parents){
    var be = this;
    var next = false;
    var selectedItem = null;
    var newMenuLine;
    var elements=[];
    var depth = parents.length;
    if(depth===0){
        elements.push(html.img({id: "main-logo", src: "img/logo.png"}));
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
            html.img({class: "right-menu", src: "img/three-dot-menu.png",id: "right-menu-icon"}),
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

myOwn.rightMenu = function rightMenu(){
    miniMenuPromise([
        {label:my.messages.user, startGroud:'true'},
        {img:my.path.img+'chpass.png', label:my.messages.chpass, value:{que:'href', valor:'chpass'}},
        {img:my.path.img+'exit.png'  , label:my.messages.exit  , value:{que:'href', valor:'logout'}}
    ],{
        underElement:document.getElementById('right-menu-icon'),
        withCloseButton:false,
    }).then(function(rta){
        if(rta.que==='href'){
            window.location.href = rta.valor;
        }
    });
}

window.addEventListener('load', function(){
    window.my = myOwn;
    my.autoSetup().then(function(){
        my.showPage();
    });
});