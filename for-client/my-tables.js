"use strict";

myOwn.tableGrid = function tableGrid(layout, tableName){
    var my = this;
    layout.textContent = 'loading...';
    var structureRequest = my.ajax.table.structure({
        table:tableName
    }).then(function(tableDef){
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
    my.ajax.table.data({
        table:tableName
    }).then(function(rows){
        return structureRequest.then(function(table){
            my.adaptData(table.def,rows);
            var tbody = table.element.tBodies[0];
            rows.forEach(function(row){
                var tr = tbody.insertRow(-1);
                table.def.fields.forEach(function(fieldDef){
                    var td = html.td().create();
                    Tedede.adaptElement(td, fieldDef);
                    td.setTypedValue(row[fieldDef.name]);
                    td.contentEditable=true;
                    td.addEventListener('update',function(){
                        var value = this.getTypedValue();
                        this.setAttribute('io-status', 'pending');
                        my.ajax.table['save-record']({
                            table:tableName,
                            primaryKeyValues:[row.atomic_number],
                            field:fieldDef.name,
                            value:value
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
        my.log(err);
    })
}
