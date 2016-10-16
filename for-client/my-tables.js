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
};

myOwn.TableConnector = function(context){
    for(var attr in context){
        this[attr] = context[attr];
    }
};

myOwn.TableConnector.prototype.getStructure = function getStructure(){
    var connector = this;
    connector.whenStructureReady = this.my.ajax.table.structure({
        table:connector.tableName,
    }).then(function(tableDef){
        connector.def = tableDef;
        return connector.def;
    });
    return connector.whenStructureReady;
};

myOwn.TableConnector.prototype.getData = function getData(){
    var connector = this;
    return connector.my.ajax.table.data({
        table:connector.tableName
    }).then(function(rows){
        return connector.whenStructureReady.then(function(){
            connector.my.adaptData(connector.def, rows);
            return rows;
        });
    });
};

myOwn.TableConnector.prototype.deleteRecord = function deleteRecord(depot){
    return (depot.primaryKeyValues===false?
        Promise.resolve():
        depot.my.ajax.table['delete-record']({
            table:depot.def.name, 
            primaryKeyValues:depot.primaryKeyValues
        })
    );
};

myOwn.TableConnector.prototype.saveRecord = function saveRecord(depot, opts){
    return depot.my.ajax.table['save-record']({
        table: depot.def.name,
        primaryKeyValues: depot.primaryKeyValues,
        newRow: depot.rowPendingForUpdate,
        status: depot.status
    },opts).then(function(updatedRow){
        depot.my.adaptData(depot.def,[updatedRow]);
        return updatedRow;
    });
};

myOwn.TableGrid = function(context, mainElement){
    for(var attr in context){
        this[attr] = context[attr];
    }
    this.dom={
        main: mainElement
    }
    this.modes = {
        inputColspan: 1,
        saveByField: true
    };
};

myOwn.tableGrid = function tableGrid(tableName, mainElement){
    var grid = new my.TableGrid({my: this}, mainElement);
    grid.connector = new my.TableConnector({my:this, tableName: tableName});
    return grid.prepareAndDisplayGrid();
};

myOwn.TableGrid.prototype.displayPreLoadMessage = function displayPreLoadMessage(){
    this.dom.main.textContent = my.messages.loading+'...';
};

myOwn.TableGrid.prototype.prepareAndDisplayGrid = function prepareAndDisplayGrid(){
    var grid = this;
    grid.displayPreLoadMessage();
    var structureRequest = grid.connector.getStructure().then(function(tableDef){
        grid.def = tableDef;
        return grid.prepareGrid();
    });
    return grid.connector.getData().then(function(rows){
        return structureRequest.then(function(){
            grid.displayGrid(rows);
            return grid;
        });
    }).catch(function(err){
        grid.my.log(err);
    })
};

myOwn.TableGrid.prototype.prepareGrid = function prepareGrid(){
    var grid = this;
    grid.view={
        sortColumns:grid.def.sortColumns||[]
    }
    var buttonInsert;
    var buttonCreateFilter;
    var buttonDestroyFilter;
    var getSaveModeImgSrc=function(){ return grid.modes.saveByField?'img/tables-update-by-field.png':'img/tables-update-by-row.png';};
    var buttonSaveModeImg=html.img({src:getSaveModeImgSrc()}).create();
    var buttonSaveMode;
    if(grid.def.allow.update){
        buttonSaveMode=html.button({class:'table-button'}, [buttonSaveModeImg]).create();
        buttonSaveMode.addEventListener('click',function(){
            grid.modes.saveByField = !grid.modes.saveByField;
            buttonSaveModeImg.src=getSaveModeImgSrc();
        });
    }
    if(grid.def.allow.insert){
        buttonInsert=html.button({class:'table-button'}, [html.img({src:'img/insert.png'})]).create();
        buttonInsert.addEventListener('click', function(){
            grid.createRowElements(0);
        });
    }
    if(grid.def.allow.filter){
        buttonCreateFilter=html.button({class:'table-button', 'when-filter':'no'}, [html.img({src:'img/filter.png'})]).create();
        buttonCreateFilter.addEventListener('click', function(){
            grid.createRowFilter(0);
        });
        buttonDestroyFilter=html.button({class:'table-button', 'when-filter':'yes'}, [html.img({src:'img/destroy-filter.png'})]).create();
        buttonDestroyFilter.addEventListener('click', function(){
            grid.destroyRowFilter(0);
            grid.view.filter=false;
            grid.displayBody();
        });
    }
    this.dom.columnsHead = grid.def.fields.map(function(fieldDef){
        var th=html.th({colspan:grid.modes.inputColspan, "my-colname":fieldDef.name},fieldDef.title).create();
        if(fieldDef.width){
            th.style.width=fieldDef.width+'px';
        }
        th.addEventListener('click',function(){
            var currentOrder=grid.view.sortColumns.length && grid.view.sortColumns[0].column==fieldDef.name?grid.view.sortColumns[0].order:null;
            grid.view.sortColumns=grid.view.sortColumns.filter(function(sortColumn){
                return sortColumn.column != fieldDef.name;
            })
            grid.view.sortColumns.unshift({column:fieldDef.name, order:currentOrder?-currentOrder:1})
            grid.displayBody()
        });
        return th;
    });
    grid.dom.footInfo = html.td({colspan:grid.dom.columnsHead.length*grid.modes.inputColspan, "is-processing":"1"}).create();
    [
        {name:'displayFrom', value:'0'},
        {name:'elipsis', value:' ... '},
        {name:'displayTo', value:'?'},
        {name:'rowCount', value:''}
    ].forEach(function(info, i_info){
        grid.dom.footInfo[info.name] = html.span(info.value).create();
        grid.dom.footInfo.appendChild(grid.dom.footInfo[info.name]);
    });
    grid.dom.table = html.table({"class":"my-grid", "my-table": grid.def.name},[
        html.caption(grid.def.title),
        html.thead([
            html.tr([html.th([buttonInsert,/*buttonSaveMode,*/buttonCreateFilter,buttonDestroyFilter])].concat(grid.dom.columnsHead))
        ]),
        html.tbody(),
        html.tfoot([
            html.tr([html.th(),grid.dom.footInfo])
        ])
    ]).create();
    grid.dom.main.innerHTML='';
    grid.dom.main.appendChild(grid.dom.table);
};

myOwn.TableGrid.prototype.createRowInsertElements = function createRowInsertElements(depot){
    var grid = this;
    var tr = depot.tr;
    return grid.createRowElements(
        ('sectionRowIndex' in tr?
            tr.sectionRowIndex:
            tr.rowIndex-grid.dom.table.tHead.rows.length
        )+1
    );
};

myOwn.TableGrid.prototype.displayGrid = function displayGrid(rows){
    var grid = this;
    var tbody = grid.dom.table.tBodies[0];
    grid.updateRowData = function updateRowData(tr, updatedRow){
        var grid = this;
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
    var saveRow = function(depot, opts){
        var fieldNames=Object.keys(depot.rowPendingForUpdate);
        var changeIoStatus = function changeIoStatus(newStatus, title){
            fieldNames.forEach(function(name){ 
                var td=depot.rowControls[name];
                td.setAttribute('io-status', newStatus); 
                if(title){
                    //td.title=err.message;
                }
            });
        }
        changeIoStatus('updating');
        grid.connector.saveRecord(depot, opts).then(function(updatedRow){
            grid.updateRowData(depot, updatedRow);
            depot.rowPendingForUpdate = {};
            changeIoStatus('temporal-ok');
            setTimeout(function(){
                changeIoStatus('ok');
            },3000);
        }).catch(function(err){
            changeIoStatus('error',err.message);
        });
    }
    grid.createRowElements = function createRowElements(iRow, depot){
        var grid = this;
        var forInsert = iRow>=0;
        var tr = tbody.insertRow(iRow);
        var depot = depot || {
            my: grid.my,
            def: grid.def,
            connector: grid.connector, 
            manager: grid,
            rowControls:{},
            row: {},
            rowPendingForUpdate:{},
            primaryKeyValues:false,
            status: 'new',
            tr: tr
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
                    actionDef.actionRow(depot);
                });
            }
        });
        grid.def.fields.forEach(function(fieldDef){
            var td = html.td({colspan:grid.modes.inputColspan, "my-colname":fieldDef.name}).create();
            TypedControls.adaptElement(td, fieldDef);
            depot.rowControls[fieldDef.name] = td;
            td.contentEditable=grid.def.allow.update && (forInsert?fieldDef.allow.insert:fieldDef.allow.update);
            td.addEventListener('update',function(){
                var value = this.getTypedValue();
                if(value!==depot.row[fieldDef.name]){
                    this.setAttribute('io-status', 'pending');
                    depot.rowPendingForUpdate[fieldDef.name] = value;
                    if(grid.modes.saveByField){
                        saveRow(depot,{visiblyLogErrors:false});
                    }
                }
            });
            tr.appendChild(td);
        });
        tr.addEventListener('focusout', function(event){
            if(event.target.parentNode != (event.relatedTarget||{}).parentNode ){
                if(Object.keys(tr.depot.rowPendingForUpdate).length){
                    saveRow(depot);
                }
            }
        });
        return depot;
    }
    grid.destroyRowFilter = function destroyRowFilter(){
        var tr=grid.hasFilterRow;
        grid.dom.table.setAttribute('has-filter',0);
        grid.dom.table.tHead.removeChild(tr);
        delete grid.hasFilterRow;
    }
    grid.dom.table.setAttribute('has-filter',0);
    grid.createRowFilter = function createRowFilter(){
        var grid = this;
        // relocalizado:
        var sizesForFilters={};
        grid.def.fields.forEach(function(fieldDef, i_fieldDef){
            // TODO: garantizar la relación entre name y posición i_fieldDef
            sizesForFilters[fieldDef.name]=grid.dom.columnsHead[i_fieldDef].offsetWidth
        });
        // fin-reloc
        if(grid.hasFilterRow){
            return true;
        }
        var buttonFilter=html.button(myOwn.messages.Filter+"!").create();
        var tr=html.tr({'class':'filter-line'}, [html.th([buttonFilter])]).create();
        grid.hasFilterRow=tr;
        grid.dom.table.setAttribute('has-filter',1);
        grid.dom.table.tHead.appendChild(tr);
        // tr.appendChild(html.td().create());
        tr.depot = {
            special: 'filter',
            my: grid.my,
            def: grid.def,
            connector: grid.connector, 
            manager: grid,
            rowControls:{},
            row: {},
            rowSymbols: {},
            isFilterPending:false,
            tr: tr
        };
        buttonFilter.addEventListener('click',function(){
            grid.view.filter=tr.info;
            grid.displayBody();
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
            tr.depot.rowControls[fieldName]=elementFilter;
            elementFilter.addEventListener('update',function(){
                tr.depot.row[fieldDef.name]=this.getTypedValue();
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
                    tr.depot.rowSymbols[fieldDef.name]=result;
                });
            });
        });
    }
    grid.displayBody=function displayBody(){
        var grid = this;
        var filterData = grid.view.filter;
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
        grid.displayRows = function displayRows(fromRowNumber, toRowNumber, adding){
            var grid = this;
            if(!adding){
                tbody.innerHTML='';
            }
            for(var iRow=fromRowNumber; iRow<toRowNumber; iRow++){
                (function(row){
                    var tr=grid.createRowElements(-1);
                    grid.updateRowData(tr, row);
                })(rowsToDisplay[iRow]);
            }
            grid.dom.footInfo.displayFrom.textContent=rowsToDisplay.length?1:0;
            grid.dom.footInfo.displayTo.textContent=iRow;
            grid.dom.footInfo.rowCount.innerHTML='';
            if(iRow<rowsToDisplay.length){
                var addButtonRest = function addButtonRest(toNextRowNumber){
                    var buttonRest=html.button("+..."+toNextRowNumber).create();
                    grid.dom.footInfo.rowCount.appendChild(html.span('  ').create());
                    grid.dom.footInfo.rowCount.appendChild(buttonRest);
                    buttonRest.addEventListener('click',function(){
                        grid.displayRows(iRow, toNextRowNumber, true);
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
        grid.displayRows(0, Math.min(my.firstDisplayCount,rowsToDisplay.length));
    }
    grid.displayBody();
};

myOwn.TableGrid.prototype.displayAsDeleted = function displayAsDeleted(depot){
    depot.my.fade(depot.tr);
    var newCount=depot.manager.dom.footInfo.displayTo.textContent-1;
    if(newCount>=0){
        depot.manager.dom.footInfo.displayTo.textContent=newCount;
    }
};

myOwn.tableAction={
    "insert":{
        img: 'img/insert.png',
        actionRow: function(depot){
            return depot.manager.createRowInsertElements(depot);
        }
    },
    "delete":{
        img: 'img/delete.png',
        actionRow: function(depot){
            return depot.my.showQuestion(depot.my.messages.Delete+' '+JSON.stringify(depot.primaryKeyValues)+' ?').then(function(result){
                if(result){
                    return depot.connector.deleteRecord(depot).then(function(){
                        depot.manager.displayAsDeleted(depot);
                    });
                }
            });
        }
    }
}