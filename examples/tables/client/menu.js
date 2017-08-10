"use string";

// var html=require('js-to-html').html;
var html=jsToHtml.html;

var my = myOwn;

myOwn.wScreens["demo-screen"] = function(addrParams){
    setTimeout(function(){
        var layout = document.getElementById('main_layout');
        window.TestE = d.documentElement;
        window.TestG = d.getElementsByTagName('body')[0];
        var bases='window,document,screen,TestE,TestG'.split(',');
        var props='innerWidth,innerHeight,outerWidth,outerHeight,orientation,width,height,clientWidth,clientHeight,offsetWidth,offsetHeight,availWidth,availHeight'.split(',')
        var table=html.table([
            html.thead([
                html.tr(bases.map(function(base){
                    return th(base);
                }))
            ]),
            html.tbody(
                props.map(function(prop){
                    return html.tr(bases.map(function(base){
                        return prop in window[base]?prop in window[base][prop]:'-'
                    }));
                })
            )
        ]);
    },10);
}

my.tableAction.showImg={
    img: my.path.img+'picture.png',
    alt: 'img',
    titleMsg: 'showImage',
    actionRow: function(depot){
        var div=depot.manager.dom.main;
        return Promise.resolve().then(function(){
            if('url' in depot.row){
                return depot.row.url;
            }
            return depot.my.ajax.getpictureurl({atomic_number:depot.row.atomic_number}).then(function(urlList){
                return urlList.length?urlList[0].url:false;
            });
        }).then(function(url){
            if(url){
                var img=html.img({src:url}).create();
                div.insertBefore(img,depot.manager.dom.table);
            }
        });
    }
};

my.clientSides.colorSample={
    update: true,
    prepare: function(depot, fieldName){
        depot.row[fieldName]=depot.row.color;
        depot.rowControls[fieldName].style.backgroundColor='#'+depot.row[fieldName];
    }
};

function prepareTableButtons(){
    var buttons = document.querySelectorAll("button#tables");
    Array.prototype.forEach.call(buttons, function(button){
        button.addEventListener('click', function(){
            var layout = document.getElementById('table_layout');
            my.tableGrid(this.getAttribute('id-table'),layout);
        });
    });
}

window.addEventListener('load', function(){
    document.body.style.backgroundColor='rgb('+[
        Math.ceil(Math.random()*64+196),
        Math.ceil(Math.random()*64+196),
        Math.ceil(Math.random()*64+196),
    ].join(',')+')';
});

my.messages.showImage='show image';
// my.messages.es.showImage='mostrar imagen';