"use string";

// var html=require('js-to-html').html;
var html=jsToHtml.html;

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
            }).then(JSON.parse).then(function(tableDef){
                console.log(tableDef);
                var table = html.table([html.thead([html.tr(
                    tableDef.fields.map(function(fieldDef){
                        return html.th(fieldDef.title);
                    })
                )])]).create();
                layout.innerHTML='';
                layout.appendChild(table);
            });
            AjaxBestPromise.post({
                url:'table/data',
                data:{
                    table:tableName
                }
            }).then(function(result){
                structureRequest.then(function(){
                    layout.appendChild(html.pre('data '+result+' ----\n ').create());
                });
            });
        });
    });
}

window.addEventListener('load', function(){
    prepareTableButtons();
});