"use string";

// var html=require('js-to-html').html;
var html=jsToHtml.html;

var my = myOwn;

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
    my.autoSetup().then(prepareTableButtons);
});