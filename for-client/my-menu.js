"use strict";

myOwn.createForkeableButton = function createForkeableButton(label, attr){
    var button=html.a(attr, label).create();
    button.onclick=function(event){
        if(!event.ctrlKey){
            history.pushState(null, null, attr.href);
            event.preventDefault();
        }
    };
    return button;
}

myOwn.displayMenu = function(){
    var mainLayout=document.getElementById('main-layout');
    mainLayout.innerHTML='';
    mainLayout.appendChild(html.div({id: "barra_superior"}, 
        my.config.menu.map(function(menu){
            return my.createForkeableButton(menu.label || menu.name, {"class": "menu-item", "menu-type":menu.menuType, href:"menu?i="+menu.name});
        }).concat(html.span({id: "right-menu"}, [
            html.span({id: "active-user"}, "user"),
            html.img({class: "right-menu", src: "img/three-dot-menu.png"}),
        ])) 
    ).create());
}

window.addEventListener('load', function(){
    my.autoSetup().then(function(){
        my.displayMenu();
    });
});