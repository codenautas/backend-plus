"use string";

// var html=require('js-to-html').html;
var html=jsToHtml.html;

var my = myOwn;

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
    my.autoSetup().then(prepareTableButtons);
});

my.messages.showImage='show image';
// my.messages.es.showImage='mostrar imagen';