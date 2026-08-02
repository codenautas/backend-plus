"use string";

// var html=require('js-to-html').html;
var html=jsToHtml.html;

var my = myOwn;

function linkButtons(selector, f){
    var buttons = document.querySelectorAll(selector);
    Array.prototype.forEach.call(buttons, function(button){
        button.addEventListener('click', f);
    });
}

window.addEventListener('load', function(){
    my.autoSetup().then(function(){
        linkButtons('button.tables', function(){
            var layout = document.getElementById('table_layout');
            my.tableGrid(this.getAttribute('id-table'),layout);
        });
        linkButtons('button.link', function(){
            location.href=this.id;
        });
    });
});
