"use strict";

myOwn.wScreens={}

myOwn.wScreens.proc = function(addrParams){
    var procDef=my.config.procedures.find(function(proc){
        return proc.action == addrParams.p;
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
    var parts=location.search.split('&');
    var addrParams={}
    parts.forEach(function(pair){
        if(pair[0]==='?'){
            pair=pair.substr(1);
        }
        var eq = pair.indexOf('=');
        if(eq !== -1){
            var varName=pair.substr(0, eq);
            addrParams[varName] = pair.substr(eq+1);
        }
    });
    if(addrParams.i){
        addrParams.i=addrParams.i.split(',');
    }else{
        addrParams.i=[];
    }
    my.displayMainMenu(addrParams);
    var w=addrParams.w;
    if(typeof my.wScreens[w] === 'function'){
        my.wScreens[w].call(my, addrParams);
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
            if(menuItem.menuType==='menu'){
                next = displayMenu; 
                menu = menuItem.menuContent;
            }
            if(menuItem.menuType==='table'){
                next = function(layout, menu, addrParams, parents){
                    setTimeout(function(){
                        var layout = document.getElementById('main_layout');
                        my.tableGrid(menuItem.table||menuItem.name,layout);
                    },10);
                }
            }
        }
        return button;
    }))
    if(depth===0){
        elements.push(html.span({id: "right-menu"}, [
            html.span({id: "active-user"}, "user"),
            html.img({class: "right-menu", src: "img/three-dot-menu.png"}),
        ]));
    }
    var menuLine=html.div({id: "main-top-bar"+(depth||'')}, elements).create();
    layout.appendChild(menuLine);
    if(next){
        newMenuLine = next(layout, menu, addrParams, parents.concat(selectedItem.name));
    }
    if(selectedItem && newMenuLine){
        setTimeout(function(){
            newMenuLine.style.paddingLeft = selectedItem.button.offsetLeft + 'px';
        },1);
    }
    return menuLine;
};

myOwn.displayMainMenu = function(addrParams){
    var be = this;
    var totalLayout=document.getElementById('total-layout');
    totalLayout.innerHTML='';
    be.displayMenu(totalLayout,my.config.menu,addrParams,[]);
    totalLayout.appendChild(html.div({id:'main_layout'}).create());
};

window.addEventListener('load', function(){
    window.my = myOwn;
    my.autoSetup().then(function(){
        my.showPage();
    });
});