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
                html.tr([
                    html.button({class:'table-button'}, [html.img({src:'img/insert.png'})]),
                    buttonSaveMode
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
                var rowPendingForUpdate = {};
                var primaryKeyValues;
                var saveRow = function(newRow){
                    var changeIoStatus = function changeIoStatus(newStatus, title){
                        fieldNames.forEach(function(name){ 
                            var td=rowControls[name];
                            td.setAttribute('io-status', newStatus); 
                            if(title){
                                td.title=err.message;
                            }

                        });
                    }
                    var fieldNames=Object.keys(newRow);
                    changeIoStatus('updating');
                    my.ajax.table['save-record']({
                        table:tableName,
                        primaryKeyValues:primaryKeyValues,
                        newRow:newRow
                    }).then(function(updatedRow){
                        my.adaptData(table.def,[updatedRow]);
                        row = updatedRow;
                        updateRowData();
                        rowPendingForUpdate = {};
                        changeIoStatus('temporal-ok');
                        setTimeout(function(){
                            changeIoStatus('ok');
                        },3000);
                    }).catch(function(err){
                        changeIoStatus('error',err.message);
                    });
                }
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
                            if(value!==row[fieldDef.name]){
                                this.setAttribute('io-status', 'pending');
                                rowPendingForUpdate[fieldDef.name] = value;
                                if(modes.saveByField){
                                    saveRow(rowPendingForUpdate);
                                }
                            }
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
                    tr.addEventListener('focusout', function(event){
                        if(event.target.parentNode != (event.relatedTarget||{}).parentNode ){
                            saveRow(rowPendingForUpdate);
                        }
                    });
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
