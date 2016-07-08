"use strict";

myOwn.tableGrid = function tableGrid(layout, tableName){
    var my = this;
    var modes = {
        saveByField: true
    };
    layout.textContent = 'loading...';
    var structureRequest = my.ajax.table.structure({
        table:tableName
    }).then(function(tableDef){
        console.log(tableDef);
        var buttonInsert=html.button({class:'table-button'}, [html.img({src:'img/insert.png'})]).create();
        var getSaveModeImgSrc=function(){ return modes.saveByField?'img/tables-update-by-field.png':'img/tables-update-by-row.png';};
        var buttonSaveModeImg=html.img({src:getSaveModeImgSrc()}).create();
        var buttonSaveMode=html.button({class:'table-button'}, [buttonSaveModeImg]).create();
        buttonSaveMode.addEventListener('click',function(){
            modes.saveByField = !modes.saveByField;
            buttonSaveModeImg.src=getSaveModeImgSrc();
        });
        var tableElement = html.table({"class":"tedede-grid"},[
            html.caption(tableDef.title),
            html.thead([
                html.tr([html.th([buttonInsert,buttonSaveMode])].concat(
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
                var rowPendingForUpdate = {};
                var primaryKeyValues;
                var saveRow = function(tr){
                    var changeIoStatus = function changeIoStatus(newStatus, title){
                        fieldNames.forEach(function(name){ 
                            var td=tr.info.rowControls[name];
                            td.setAttribute('io-status', newStatus); 
                            if(title){
                                //td.title=err.message;
                            }
                        });
                    }
                    var fieldNames=Object.keys(tr.info.rowPendingForUpdate);
                    changeIoStatus('updating');
                    my.ajax.table['save-record']({
                        table:tableName,
                        primaryKeyValues:tr.info.primaryKeyValues,
                        newRow:tr.info.rowPendingForUpdate
                    }).then(function(updatedRow){
                        my.adaptData(table.def,[updatedRow]);
                        updateRowData(tr, updatedRow);
                        tr.info.rowPendingForUpdate = {};
                        changeIoStatus('temporal-ok');
                        setTimeout(function(){
                            changeIoStatus('ok');
                        },3000);
                    }).catch(function(err){
                        changeIoStatus('error',err.message);
                    });
                }
                var createRowElements = function createRowElements(iRow, row){
                    var tr = tbody.insertRow(iRow);
                    tr.info = {
                        rowControls:{},
                        row: {},
                        rowPendingForUpdate:{}
                    };
                    var buttonInsert=html.button({class:'table-button'}, [html.img({src:'img/insert.png'})]).create();
                    var buttonDelete=html.button({class:'table-button'}, [html.img({src:'img/delete.png'})]).create();
                    tr.appendChild(html.th([buttonInsert,buttonDelete]).create());
                    table.def.fields.forEach(function(fieldDef){
                        var td = html.td().create();
                        Tedede.adaptElement(td, fieldDef);
                        tr.info.rowControls[fieldDef.name] = td;
                        td.contentEditable=true;
                        td.addEventListener('update',function(){
                            var value = this.getTypedValue();
                            if(value!==tr.info.row[fieldDef.name]){
                                this.setAttribute('io-status', 'pending');
                                tr.info.rowPendingForUpdate[fieldDef.name] = value;
                                if(modes.saveByField){
                                    saveRow(tr);
                                }
                            }
                        });
                        tr.appendChild(td);
                    });
                    buttonDelete.addEventListener('click', function(){
                        my.showQuestion('Delete '+JSON.stringify(tr.info.primaryKeyValues)+' ?').then(function(result){
                            if(result){
                                my.ajax.table['delete-record']({
                                    table:tableName, 
                                    primaryKeyValues:tr.info.primaryKeyValues
                                }).then(function(){
                                    my.fade(tr);
                                });
                            }
                        });
                    })
                    tr.addEventListener('focusout', function(event){
                        if(event.target.parentNode != (event.relatedTarget||{}).parentNode ){
                            if(Object.keys(tr.info.rowPendingForUpdate).length){
                                saveRow(tr);
                            }
                        }
                    });
                    return tr;
                }
                var updateRowData = function updateRowData(tr, updatedRow){
                    tr.info.row = updatedRow;
                    tr.info.primaryKeyValues = table.def.primaryKey.map(function(fieldName){ 
                        return tr.info.row[fieldName]; 
                    });
                    table.def.fields.forEach(function(fieldDef){
                        var td = tr.info.rowControls[fieldDef.name];
                        td.setTypedValue(tr.info.row[fieldDef.name]);
                    });
                }
                updateRowData(createRowElements(-1), row);
            });
        });
    }).catch(function(err){
        my.log(err);
    })
}
