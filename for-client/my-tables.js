"use strict";

myOwn.firstDisplayCount = 20;
myOwn.displayCountBreaks = [100,250,1000];
myOwn.displayCountBreaks = [50,100,500];
myOwn.comparator={
    '=':function(valueToCheck,condition){return valueToCheck == condition;},
    '~':function(valueToCheck,condition){return valueToCheck.indexOf(condition)>=0;},
    '\u2205':function(valueToCheck,condition){return true;},//\u2205 = conjunto vacío
    '>':function(valueToCheck,condition){return (valueToCheck>condition)},
    '>=':function(valueToCheck,condition){return (valueToCheck>=condition)},
    '<':function(valueToCheck,condition){return (valueToCheck<condition)},
    '<=':function(valueToCheck,condition){return (valueToCheck<=condition)},
    'not-an-operator':function(valueToCheck,condition){ return 'Operator does not exist'}
}
myOwn.tableGrid = function tableGrid(layout, tableName){
    var my = this;
    var inputColspan = 2;
    var modes = {
        saveByField: true
    };
    layout.textContent = 'loading...';
    var grid={};
    var createRowElements;
    var createRowFilter;
    var footInfoElement;
    var structureRequest = my.ajax.table.structure({
        table:tableName,
    }).then(function(tableDef){
        grid.def=tableDef;
        var buttonInsert;
        var buttonFilter;
        var getSaveModeImgSrc=function(){ return modes.saveByField?'img/tables-update-by-field.png':'img/tables-update-by-row.png';};
        var buttonSaveModeImg=html.img({src:getSaveModeImgSrc()}).create();
        var buttonSaveMode;
        if(tableDef.allow.update){
            buttonSaveMode=html.button({class:'table-button'}, [buttonSaveModeImg]).create();
            buttonSaveMode.addEventListener('click',function(){
                modes.saveByField = !modes.saveByField;
                buttonSaveModeImg.src=getSaveModeImgSrc();
            });
        }
        if(tableDef.allow.insert){
            buttonInsert=html.button({class:'table-button'}, [html.img({src:'img/insert.png'})]).create();
            buttonInsert.addEventListener('click', function(){
                grid.createRowElements(0);
            });
        }
        if(tableDef.allow.filter){
            buttonFilter=html.button({class:'table-button'}, [html.img({src:'img/filter.png'})]).create();
            buttonFilter.addEventListener('click', function(){
                grid.createRowFilter(0);
            });
        }
        var columnsHeadElements = tableDef.fields.map(function(fieldDef){
            return html.th({colspan:inputColspan},fieldDef.title);
        });
        footInfoElement = html.td({colspan:columnsHeadElements.length*inputColspan, "is-processing":"1"}).create();
        [
            {name:'displayFrom', value:'0'},
            {name:'elipsis', value:' ... '},
            {name:'displayTo', value:'?'},
            {name:'rowCount', value:''}
        ].forEach(function(info){
            footInfoElement[info.name] = html.span(info.value).create();
            footInfoElement.appendChild(footInfoElement[info.name]);
        });
        grid.element = html.table({"class":"my-grid", "my-table": tableName},[
            html.caption(tableDef.title),
            html.thead([
                html.tr([html.th([buttonInsert,/*buttonSaveMode,*/buttonFilter])].concat(columnsHeadElements))
            ]),
            html.tbody(),
            html.tfoot([
                html.tr([html.th(),footInfoElement])
            ])
        ]).create();
        layout.innerHTML='';
        layout.appendChild(grid.element);
    });
    var displayGrid = function displayGrid(rows){
        var tbody = grid.element.tBodies[0];
        var updateRowData = function updateRowData(tr, updatedRow){
            var forInsert = false; // not define how to detect
            tr.info.row = updatedRow;
            tr.info.status = 'retrieved';
            tr.info.primaryKeyValues = grid.def.primaryKey.map(function(fieldName){ 
                return tr.info.row[fieldName]; 
            });
            grid.def.fields.forEach(function(fieldDef){
                var td = tr.info.rowControls[fieldDef.name];
                td.contentEditable=grid.def.allow.update && (forInsert?fieldDef.allow.insert:fieldDef.allow.update);
                td.setTypedValue(tr.info.row[fieldDef.name]);
            });
        }
        var saveRow = function(tr, opts){
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
                newRow:tr.info.rowPendingForUpdate,
                status:tr.info.status
            },opts).then(function(updatedRow){
                my.adaptData(grid.def,[updatedRow]);
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
        grid.createRowElements = function createRowElements(iRow, row){
            var forInsert = iRow>=0;
            var tr = tbody.insertRow(iRow);
            tr.info = {
                rowControls:{},
                row: {},
                rowPendingForUpdate:{},
                primaryKeyValues:false,
                status: 'new'
            };
            var thActions=html.th().create();
            tr.appendChild(thActions);
            var actionNamesList = ['insert','delete'].concat(grid.def.actionNamesList);
            actionNamesList.forEach(function(actionName){
                var actionDef = my.tableAction[actionName];
                if(grid.def.allow[actionName]){
                    var buttonAction=html.button({class:'table-button'}, [
                        html.img({src:actionDef.img})
                    ]).create();
                    thActions.appendChild(buttonAction);
                    buttonAction.addEventListener('click', function(){
                        actionDef.actionRow(my,grid,tr);
                    });
                }
            });
            grid.def.fields.forEach(function(fieldDef){
                var td = html.td({colspan:inputColspan}).create();
                TypedControls.adaptElement(td, fieldDef);
                tr.info.rowControls[fieldDef.name] = td;
                td.contentEditable=grid.def.allow.update && (forInsert?fieldDef.allow.insert:fieldDef.allow.update);
                td.addEventListener('update',function(){
                    var value = this.getTypedValue();
                    if(value!==tr.info.row[fieldDef.name]){
                        this.setAttribute('io-status', 'pending');
                        tr.info.rowPendingForUpdate[fieldDef.name] = value;
                        if(modes.saveByField){
                            saveRow(tr,{visiblyLogErrors:false});
                        }
                    }
                });
                tr.appendChild(td);
            });
            tr.addEventListener('focusout', function(event){
                if(event.target.parentNode != (event.relatedTarget||{}).parentNode ){
                    if(Object.keys(tr.info.rowPendingForUpdate).length){
                        saveRow(tr);
                    }
                }
            });
            return tr;
        }
        grid.createRowFilter = function createRowFilter(){
            // var tr=html.tr().create();
            var buttonFilter=html.button("Filter!").create();
            var tr=html.tr([html.td([buttonFilter])]).create();
            grid.element.tHead.appendChild(tr);
            // tr.appendChild(html.td().create());
            tr.info = {
                rowControls:{},
                row: {},
                rowSymbols: {},
                isFilterPending:false,
            };
            buttonFilter.addEventListener('click',function(){
                grid.displayBody(tr.info);
            });
            grid.def.fields.forEach(function(fieldDef){
                var fieldName=fieldDef.name;
                tr.info.rowSymbols[fieldName]=fieldDef.typeName==='text'?'~':'=';
                var symbolFilter=html.td({"class":"autoFilter"},[html.button({"class":'auto-filter', tabindex:-1},tr.info.rowSymbols[fieldName])]).create();
                var elementFilter=html.td({"class":"filterDescription"}).create();
                elementFilter.contentEditable=true;
                tr.info.rowControls[fieldName]=elementFilter;
                elementFilter.addEventListener('update',function(){
                    tr.info.row[fieldDef.name]=this.getTypedValue();
                });
                TypedControls.adaptElement(elementFilter,fieldDef);
                tr.appendChild(symbolFilter);
                tr.appendChild(elementFilter);
            });
        }
        grid.displayBody=function displayBody(filterData){
            if(filterData){
                var rowsToDisplay= rows.filter(function(row,i){
                    var partialOk=true;
                    for(var columna in row){
                        
                        if(filterData.row[columna]!=null){
                            var isSatisfied=my.comparator[filterData.rowSymbols[columna]](row[columna],filterData.row[columna])
                            if(!isSatisfied){
//                            if(row[columna]!= filterData.row[columna]){
                                partialOk=false;
                            }
                        }
                    }
                    return partialOk;
                })
            }else{
                var rowsToDisplay=rows;
            }
            var displayRows = function displayRows(fromRowNumber, toRowNumber){
                tbody.innerHTML='';
                for(var iRow=fromRowNumber; iRow<toRowNumber; iRow++){
                    (function(row){
                        var tr=grid.createRowElements(-1);
                        updateRowData(tr, row);
                    })(rowsToDisplay[iRow]);
                }
                footInfoElement.displayFrom.textContent=rowsToDisplay.length?1:0;
                footInfoElement.displayTo.textContent=iRow;
                footInfoElement.rowCount.innerHTML='';
                if(iRow<rowsToDisplay.length){
                    // footInfoElement.rowCount.textContent=' / ';
                    var addButtonRest = function addButtonRest(toNextRowNumber){
                        var buttonRest=html.button("+..."+toNextRowNumber).create();
                        footInfoElement.rowCount.appendChild(html.span('  ').create());
                        footInfoElement.rowCount.appendChild(buttonRest);
                        buttonRest.addEventListener('click',function(){
                            displayRows(iRow+1, toNextRowNumber);
                        });
                    }
                    my.displayCountBreaks.forEach(function(size, iSize){
                        var cut=(iRow+size) - (iRow+size) % size;
                        if(cut*5<=rowsToDisplay.length*3 && (iSize==my.displayCountBreaks.length-1 || cut*5<=my.displayCountBreaks[iSize+1]*3)){
                            addButtonRest(cut);
                        }
                    });
                    addButtonRest(rowsToDisplay.length);
                }
            }
            displayRows(0, Math.min(my.firstDisplayCount,rowsToDisplay.length));
        }
        grid.displayBody();
    }
    my.ajax.table.data({
        table:tableName
    }).then(function(rows){
        return structureRequest.then(function(){
            my.adaptData(grid.def,rows);
            displayGrid(rows);
            return grid;
        });
    }).catch(function(err){
        my.log(err);
    })
}

myOwn.tableAction={
    "insert":{
        img: 'img/insert.png',
        actionRow: function(my, grid, tr){
            return grid.createRowElements(
                ('sectionRowIndex' in tr?
                    tr.sectionRowIndex:
                    tr.rowIndex-grid.element.tHead.rows.length
                )+1
            )
        }
    },
    "delete":{
        img: 'img/delete.png',
        actionRow: function(my, grid, tr){
            return my.showQuestion('Delete '+JSON.stringify(tr.info.primaryKeyValues)+' ?').then(function(result){
                if(result){
                    return (tr.info.primaryKeyValues===false?
                        Promise.resolve():
                        my.ajax.table['delete-record']({
                            table:grid.def.name, 
                            primaryKeyValues:tr.info.primaryKeyValues
                        })
                    ).then(function(){
                        my.fade(tr);
                    });
                }
            });
        }
    }
}