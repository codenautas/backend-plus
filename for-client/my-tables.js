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
            html.thead([
                html.tr([
                    html.button({class:'table-button'}, [html.img({src:'img/insert.png'})])
                ].concat(
                    tableDef.fields.map(function(fieldDef){
                        return html.th(fieldDef.title);
                    })
                ))
            ]),
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
                var rowControls = {};
                var primaryKeyValues;
                var createRowElements = function createRowElements(){
                    var tr = tbody.insertRow(-1);
                    var buttonDelete=html.button({class:'table-button'}, [html.img({src:'img/delete.png'})]).create();
                    tr.appendChild(html.th([
                        html.button({class:'table-button'}, [html.img({src:'img/insert.png'})]),
                        buttonDelete
                    ]).create())
                    table.def.fields.forEach(function(fieldDef){
                        var td = html.td().create();
                        Tedede.adaptElement(td, fieldDef);
                        rowControls[fieldDef.name] = td;
                        td.contentEditable=true;
                        td.addEventListener('update',function(){
                            var value = this.getTypedValue();
                            this.setAttribute('io-status', 'pending');
                            my.ajax.table['save-record']({
                                table:tableName,
                                primaryKeyValues:primaryKeyValues,
                                field:fieldDef.name,
                                value:value
                            }).then(function(updatedRow){
                                my.adaptData(table.def,[updatedRow]);
                                row = updatedRow;
                                updateRowData();
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
                    buttonDelete.addEventListener('click', function(){
                        my.showQuestion('Delete '+JSON.stringify(primaryKeyValues)+' ?').then(function(result){
                            if(result){
                                my.ajax.table['delete-record']({table:tableName, primaryKeyValues:primaryKeyValues}).then(function(){
                                    my.fade(tr);
                                });
                            }
                        });
                    })
                }
                var updateRowData = function updateRowData(){
                    primaryKeyValues = table.def.primaryKey.map(function(fieldName){ return row[fieldName]; });
                    table.def.fields.forEach(function(fieldDef){
                        var td = rowControls[fieldDef.name];
                        td.setTypedValue(row[fieldDef.name]);
                    });
                }
                createRowElements();
                updateRowData();
            });
        });
    }).catch(function(err){
        my.log(err);
    })
}
