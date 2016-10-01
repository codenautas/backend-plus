"use strict";

var changing = bestGlobals.changing;

myOwn.messages=changing(myOwn.messages, {
    loading: "loading",
    Filter : "Filter",
    Delete : "Delete",
});

myOwn.es=changing(myOwn.es, {
    loading: "cargando",
    Filter : "Filtrar",
    Delete : "Eliminar",
});

var escapeRegExp = bestGlobals.escapeRegExp;

myOwn.firstDisplayCount = 20;
myOwn.displayCountBreaks = [100,250,1000];
myOwn.displayCountBreaks = [50,100,500];
myOwn.comparator={
    '=':function(valueToCheck,condition){return valueToCheck == condition;},
    '~':function(valueToCheck,condition){return RegExp(escapeRegExp(condition),'i').test(valueToCheck);},
    '/R/i':function(valueToCheck,condition){return RegExp(condition,'i').test(valueToCheck);},
    '\u2205':function(valueToCheck,condition){return valueToCheck == null;},//\u2205 = conjunto vacío
    '>':function(valueToCheck,condition){return (valueToCheck>condition)},
    '>=':function(valueToCheck,condition){return (valueToCheck>=condition)},
    '<':function(valueToCheck,condition){return (valueToCheck<condition)},
    '<=':function(valueToCheck,condition){return (valueToCheck<=condition)},
    'not-an-operator':function(valueToCheck,condition){ return 'Operator does not exist'},
    'traductor':{
        '=':'igual',
        '~':'parecido',
        '/R/i':'expresion-regular',
        '\u2205':'vacio',
        '>':'mayor',
        '>=':'mayor-igual',
        '<':'menor',
        '<=':'menor-igual'
    }
}
myOwn.tableGrid = function tableGrid(layout, tableName){
    var my = this;
    var inputColspan = 1;
    var modes = {
        saveByField: true
    };
    layout.textContent = my.messages.loading+'...';
    var grid={};
    var createRowElements;
    var createRowFilter;
    var footInfoElement;
    var sizesForFilters={};
    var columnsHeadElements;
    var getSize = function getSize(th){
        var ancho=th.offsetWidth;
        return ancho;
    };
    var structureRequest = my.ajax.table.structure({
        table:tableName,
    }).then(function(tableDef){
        grid.def=tableDef;
        grid.view={
            sortColumns:tableDef.sortColumns||[]
        }
        var buttonInsert;
        var buttonCreateFilter;
        var buttonDestroyFilter;
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
            buttonCreateFilter=html.button({class:'table-button', 'when-filter':'no'}, [html.img({src:'img/filter.png'})]).create();
            buttonCreateFilter.addEventListener('click', function(){
                grid.createRowFilter(0);
            });
            buttonDestroyFilter=html.button({class:'table-button', 'when-filter':'yes'}, [html.img({src:'img/destroy-filter.png'})]).create();
            buttonDestroyFilter.addEventListener('click', function(){
                grid.destroyRowFilter(0);
                grid.displayBody();
            });
        }
        //var columnsHeadElements = tableDef.fields.map(function(fieldDef){
            columnsHeadElements = tableDef.fields.map(function(fieldDef){
            var tr=html.th({colspan:inputColspan},fieldDef.title).create();
            tr.addEventListener('click',function(){
                var currentOrder=grid.view.sortColumns.length && grid.view.sortColumns[0].column==fieldDef.name?grid.view.sortColumns[0].order:null;
                grid.view.sortColumns=grid.view.sortColumns.filter(function(sortColumn){
                    return sortColumn.column != fieldDef.name;
                })
                grid.view.sortColumns.unshift({column:fieldDef.name, order:currentOrder?-currentOrder:1})
                grid.displayBody(tr.info)
            });
            return tr;
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
                html.tr([html.th([buttonInsert,/*buttonSaveMode,*/buttonCreateFilter,buttonDestroyFilter])].concat(columnsHeadElements))
            ]),
            html.tbody(),
            html.tfoot([
                html.tr([html.th(),footInfoElement])
            ])
        ]).create();
        layout.innerHTML='';
        layout.appendChild(grid.element);
    })/*.then(function(){
        return new Promise(function(resolve, reject){
            setInterval(resolve,3000);
        });
    })*/;
    
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
        grid.destroyRowFilter = function destroyRowFilter(){
            var tr=grid.hasFilterRow;
            grid.element.setAttribute('has-filter',0);
            grid.element.tHead.removeChild(tr);
            delete grid.hasFilterRow;
        }
        grid.element.setAttribute('has-filter',0);
        grid.createRowFilter = function createRowFilter(){
            // var tr=html.tr().create();
            if(grid.hasFilterRow){
                return true;
            }
            var buttonFilter=html.button(myOwn.messages.Filter+"!").create();
            var tr=html.tr({'class':'filter-line'}, [html.th([buttonFilter])]).create();
            grid.hasFilterRow=tr;
            grid.element.setAttribute('has-filter',1);
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
                var filterImage='img/select-menu.png'
                var imgFilter=html.img({src:filterImage}); 
                imgFilter=html.img({src:filterImage}); 
//                tr.info.rowSymbols[fieldName]=fieldDef.typeName==='text'?'~':'='; //00BA00
//                var symbolFilter=html.button({"class":'auto-filter', tabindex:-1},tr.info.rowSymbols[fieldName]).create();
                var symbolFilter=html.button({"class":'table-button', tabindex:-1},imgFilter).create();
                var elementFilter=html.span({"class":"filter-span"}).create();
                elementFilter.contentEditable=true;
                tr.info.rowControls[fieldName]=elementFilter;
                elementFilter.addEventListener('update',function(){
                    tr.info.row[fieldDef.name]=this.getTypedValue();
                });
                TypedControls.adaptElement(elementFilter,fieldDef);
                tr.appendChild(html.td({"class":"autoFilter"},[symbolFilter,elementFilter]).create());
                //tr.appendChild(html.td({"class":"autoFilter"},[tr.info.rowSymbols[fieldDef],elementFilter]).create());
                elementFilter.width=sizesForFilters[fieldDef.name]-symbolFilter.offsetWidth-5;
                elementFilter.style.width=elementFilter.width.toString()+'px';
                symbolFilter.addEventListener('click',function(){
                    miniMenuPromise([
                        {value:'=', img:'img/igual.png'},
                        {value:'~', img:'img/parecido.png'},
                        {value:'\u2205', img:'img/vacio.png'},
                        {value:'>', img:'img/mayor.png'},
                        {value:'>=', img:'img/mayor-igual.png'},
                        {value:'<', img:'img/menor.png'},
                        {value:'<=', img:'img/menor-igual.png'},
                    ],{underElement:symbolFilter}).then(function(result){
                        filterImage='img/'+my.comparator.traductor[result]+'.png';
                       // imgFilter.src=filterImage;
                        symbolFilter.childNodes[0].src=filterImage;
                        tr.info.rowSymbols[fieldDef.name]=result;
                    });
                });
            });
        }
        grid.displayBody=function displayBody(filterData){
            if(filterData){
                var rowsToDisplay= rows.filter(function(row,i){
                    var partialOk=true;
                    for(var column in row){
                        if(filterData.row[column]!=null){
                            var isSatisfied=my.comparator[filterData.rowSymbols[column]](row[column],filterData.row[column])
                            if(!isSatisfied){
                                partialOk=false;
                            }
                        }
                    }
                    return partialOk;
                })
            }else{
                var rowsToDisplay=rows;
            }
            if(grid.view.sortColumns.length>0){
                rowsToDisplay.sort(bestGlobals.compareForOrder(grid.view.sortColumns));
            }
            var displayRows = function displayRows(fromRowNumber, toRowNumber, adding){
                if(!adding){
                    tbody.innerHTML='';
                }
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
                    var addButtonRest = function addButtonRest(toNextRowNumber){
                        var buttonRest=html.button("+..."+toNextRowNumber).create();
                        footInfoElement.rowCount.appendChild(html.span('  ').create());
                        footInfoElement.rowCount.appendChild(buttonRest);
                        buttonRest.addEventListener('click',function(){
                            displayRows(iRow, toNextRowNumber, true);
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
            grid.def.fields.forEach(function(fieldDef,i){
            sizesForFilters[fieldDef.name]=getSize(columnsHeadElements[i])
        });
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
            return my.showQuestion(my.messages.Delete+' '+JSON.stringify(tr.info.primaryKeyValues)+' ?').then(function(result){
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