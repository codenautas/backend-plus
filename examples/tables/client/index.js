"use string";

function prepareTableButtons(){
    var buttons = document.querySelectorAll("button#tables");
    Array.prototype.forEach.call(buttons, function(button){
        button.addEventListener('click', function(){
            var layout = document.getElementById('table_layout');
            layout.textContent = this.textContent;
        });
    });
}

window.addEventListener('load', function(){
    prepareTableButtons();
});