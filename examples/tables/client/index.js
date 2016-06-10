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
                var tableElement = html.table({"class":"tedede-grid"},[
                    html.caption(tableDef.title),
                    html.thead([html.tr(
                        tableDef.fields.map(function(fieldDef){
                            return html.th(fieldDef.title);
                        })
                    )]),
                    html.tbody()
                ]).create();
                layout.innerHTML='';
                layout.appendChild(tableElement);
                return {element: tableElement, def: tableDef};
            });
            AjaxBestPromise.post({
                url:'table/data',
                data:{
                    table:tableName
                }
            }).then(JSON.parse).then(function(rows){
                return structureRequest.then(function(table){
                    var tbody = table.element.tBodies[0];
                    rows.forEach(function(row){
                        var tr = tbody.insertRow(-1);
                        table.def.fields.forEach(function(fieldDef){
                            var td = html.td([row[fieldDef.name]]).create();
                            Tedede.adaptElement(td, fieldDef);
                            td.contentEditable=true;
                            td.addEventListener('update',function(){
                                var value = this.getTypedValue();
                                this.setAttribute('io-status', 'pending');
                                AjaxBestPromise.post({
                                    url:'table/save-record',
                                    data:{
                                        table:tableName,
                                        primaryKeyValues:JSON.stringify([row.atomic_number]),
                                        field:fieldDef.name,
                                        value:value
                                    }
                                }).then(function(){
                                    td.setAttribute('io-status', 'temporal-ok');
                                    setTimeout(function(){
                                        td.setAttribute('io-status', 'ok');
                                    },3000);
                                }).catch(function(err){
                                    td.setAttribute('io-status', 'error');
                                    td.title=err.message;
                                });
                            });
                            tr.appendChild(td);
                        });
                    });
                });
            }).catch(function(err){
                console.log(err);
                status.textContent=err.message;
            })
        });
    });
}

window.addEventListener('load', function(){
    prepareTableButtons();
});