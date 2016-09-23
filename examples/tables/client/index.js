"use string";

// var html=require('js-to-html').html;
var html=jsToHtml.html;

var my = myOwn;

my.tableAction.showImg={
    img: 'img/picture.png',
    actionRow: function(my, table, tr){
        var div=table.element.parentNode;
        return Promise.resolve().then(function(){
            if('url' in tr.info.row){
                return tr.info.row.url;
            }
            return my.ajax.getpictureurl({atomic_number:tr.info.row.atomic_number}).then(function(urlList){
                return urlList.length?urlList[0].url:false;
            });
        }).then(function(url){
            if(url){
                var img=html.img({src:url}).create();
                div.insertBefore(img,table.element);
            }
        });
    }
};

function prepareTableButtons(){
    var buttons = document.querySelectorAll("button#tables");
    Array.prototype.forEach.call(buttons, function(button){
        button.addEventListener('click', function(){
            var layout = document.getElementById('table_layout');
            my.tableGrid(layout,this.getAttribute('id-table'));
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