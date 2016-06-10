"use string";

function prepareTableButtons(){
    var buttons = document.querySelectorAll("button#tables");
    Array.prototype.forEach.call(buttons, function(button){
        button.addEventListener('click', function(){
            var layout = document.getElementById('table_layout');
            var tableName = this.textContent;
            layout.textContent = 'loading...';
            var structureRequest = AjaxBestPromise.post({
                url:'table/structure',
                data:{
                    table:tableName
                }
            }).then(function(result){
                layout.textContent = 'strcture '+result+' ----\n ';
            });
            AjaxBestPromise.post({
                url:'table/data',
                data:{
                    table:tableName
                }
            }).then(function(result){
                structureRequest.then(function(){
                    layout.textContent += 'data '+result+' ----\n ';
                });
            });
        });
    });
}

window.addEventListener('load', function(){
    prepareTableButtons();
});