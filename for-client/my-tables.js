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
myOwn.comparatorWidth = 16;
myOwn.comparator={
    '=':function(valueToCheck,condition){return valueToCheck == condition;},
    '~':function(valueToCheck,condition){return condition==null || RegExp(escapeRegExp(condition.toString()),'i').test(valueToCheck);},
    '/R/i':function(valueToCheck,condition){return condition==null || RegExp(condition,'i').test(valueToCheck);},
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
        table:connector.tableName,
        fixedFields:connector.fixedFields
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
        saveByField: true,
        withColumnDetails: null, // null = autodetect
    };
    this.view = {
    }
};

myOwn.tableGrid = function tableGrid(tableName, mainElement, opts){
    var grid = new my.TableGrid({my: this}, mainElement);
    opts = opts || {};
    grid.connector = new my.TableConnector({my:this, tableName: tableName});
    grid.connector.fixedFields = opts.fixedFields || [];
    grid.connector.fixedField = {};
    grid.connector.fixedFields.forEach(function(pair){
        grid.connector.fixedField[pair.fieldName] = pair.value;
    });
    var preparing = grid.prepareAndDisplayGrid();
    grid.waitForReady = function waitForReady(fun){
        return preparing.then(function(){
            return grid;
        }).then(fun||function(){});
    }
    return grid;
};

myOwn.TableGrid.prototype.displayPreLoadMessage = function displayPreLoadMessage(){
    this.dom.main.textContent = my.messages.loading+'...';
};

myOwn.TableGrid.prototype.createDepotFromRow = function createDepotFromRow(row, status){
    var grid = this;
    var depot = {
        my: grid.my,
        def: grid.def,
        connector: grid.connector, 
        manager: grid,
        rowControls:{},
        row: row,
        rowPendingForUpdate:{},
        primaryKeyValues:false,
        status: status||'preparing',
        detailControls:{},
        detailRows:[]
    }
    return depot;
}

myOwn.TableGrid.prototype.prepareDepots = function prepareDepots(rows){
    var grid = this;
    grid.depots = rows.map(grid.createDepotFromRow.bind(grid));
    grid.view.sortColumns=grid.view.sortColumns||grid.def.sortColumns||[];
}

myOwn.TableGrid.prototype.prepareAndDisplayGrid = function prepareAndDisplayGrid(){
    var grid = this;
    grid.displayPreLoadMessage();
    var structureRequest = grid.connector.getStructure().then(function(tableDef){
        grid.def = tableDef;
        return grid.prepareGrid();
    });
    return grid.connector.getData().then(function(rows){
        return structureRequest.then(function(){
            grid.prepareDepots(rows);
            grid.displayGrid();
            return grid;
        });
    }).catch(function(err){
        grid.my.log(err);
    })
};

myOwn.ColumnGrid = function ColumnGrid(opts){
    for(var optName in opts){
        this[optName] = opts[optName];
    }
}

myOwn.ColumnGrid.prototype.th = function th(){
    return html.th();
}

myOwn.ColumnGrid.prototype.thDetail = function thLabel(){
    return html.th({class:'th-detail'}, (this.fieldDef||{}).label);
}

myOwn.ColumnGrid.prototype.thFilter = function thFilter(){
    return html.th();
}

myOwn.ActionColumnGrid = function ActionColumnGrid(opts){
    myOwn.ColumnGrid.call(this,opts);
}
myOwn.ActionColumnGrid.prototype = Object.create(myOwn.ColumnGrid.prototype);

myOwn.ActionColumnGrid.prototype.th = function th(){
    return html.th(this.actions);
}

myOwn.ActionColumnGrid.prototype.thFilter = function thFilter(depot){
    var buttonFilter=html.button(myOwn.messages.Filter+"!").create();
    var grid = this.grid;
    buttonFilter.addEventListener('click',function(){
        grid.view.filter=depot;
        grid.displayBody();
    });
    return html.th([buttonFilter]);
}

myOwn.DataColumnGrid = function DataColumnGrid(opts){
    myOwn.ColumnGrid.call(this,opts);
}
myOwn.DataColumnGrid.prototype = Object.create(myOwn.ColumnGrid.prototype);

myOwn.DataColumnGrid.prototype.th = function th(){
    var fieldDef = this.fieldDef;
    var grid = this.grid;
    var th=html.th({class: "th-name", "my-colname":fieldDef.name},fieldDef.title).create();
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
}

myOwn.DataColumnGrid.prototype.thFilter = function thFilter(depot, iColumn){
    var grid = this.grid;
    var fieldDef = this.fieldDef;
    var fieldName=fieldDef.name;
    depot.rowSymbols[fieldDef.name]='~';
    var filterImage='img/'+my.comparator.traductor['~']+'.png';
    var imgFilter=html.img({src:filterImage}); 
    var symbolFilter=html.button({"class":'table-button', tabindex:-1},imgFilter).create();
    var elementFilter=html.span({"class":"filter-span"}).create();
    elementFilter.contentEditable=true;
    depot.rowControls[fieldName]=elementFilter;
    elementFilter.addEventListener('update',function(){
        depot.row[fieldDef.name]=this.getTypedValue();
    });
    TypedControls.adaptElement(elementFilter,fieldDef);
    var th=html.td({"class":"autoFilter"},[symbolFilter,elementFilter]).create();
    elementFilter.width=grid.sizesForFilters[iColumn]-myOwn.comparatorWidth-5;
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
            depot.rowSymbols[fieldDef.name]=result;
        });
    });
    return th;
}

myOwn.DetailColumnGrid = function DetailColumnGrid(opts){
    myOwn.ColumnGrid.call(this,opts);
}

myOwn.DetailColumnGrid.prototype = Object.create(myOwn.ColumnGrid.prototype);

myOwn.DetailColumnGrid.prototype.th = function th(){
    var th=html.th({"my-defname":this.detailTableDef.table, title:this.detailTableDef.label},this.detailTableDef.abr);
    return th;
};

myOwn.SpecialColumnGrid = function SpecialColumnGrid(opts){
    myOwn.ColumnGrid.call(this,opts);
}
myOwn.SpecialColumnGrid.prototype = Object.create(myOwn.ColumnGrid.prototype);

myOwn.SpecialColumnGrid.prototype.th = function th(){
    return html.th({class:this.class});
}

myOwn.SpecialColumnGrid.prototype.thDetail = myOwn.SpecialColumnGrid.prototype.th;

myOwn.TableGrid.prototype.prepareGrid = function prepareGrid(){
    var grid = this;
    var my = grid.my;
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
            grid.createRowInsertElements();
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
    grid.columns=[new my.ActionColumnGrid({grid:grid, actions:[buttonInsert,/*buttonSaveMode,*/buttonCreateFilter,buttonDestroyFilter]})].concat(
        grid.def.detailTables.map(function(detailTableDef){ return new my.DetailColumnGrid({grid:grid, detailTableDef:detailTableDef}); })
    ).concat(
        grid.def.fields.map(function(fieldDef){ return new my.DataColumnGrid({grid:grid, fieldDef:fieldDef}); })
    ).concat(
        [new my.SpecialColumnGrid({class:"empty-rigth-column"})]
    );
    if(grid.modes.withColumnDetails==null){
        grid.modes.withColumnDetails=grid.def.fields.some(function(fieldDef){ return fieldDef.label!=fieldDef.title; });
    }
    grid.dom.footInfo = html.td({colspan:grid.columns.length, "is-processing":"1"}).create();
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
            html.tr(grid.columns.map(function(column){ return column.th(); })),
            grid.modes.withColumnDetails?html.tr(grid.columns.map(function(column){ return column.thDetail(); })):null,
        ]),
        html.tbody(),
        html.tfoot([
            html.tr([html.th(),grid.dom.footInfo])
        ])
    ]).create();
    grid.dom.main.innerHTML='';
    grid.dom.main.appendChild(grid.dom.table);
};

myOwn.TableGrid.prototype.createRowInsertElements = function createRowInsertElements(belowDepot){
    var grid = this;
    var position;
    if(belowDepot){
        var belowTr = belowDepot.tr;
        position = ('sectionRowIndex' in belowTr?
            belowTr.sectionRowIndex:
            belowTr.rowIndex-grid.dom.table.tHead.rows.length
        )+1;
    }else{
        position = 0;
    }
    while(
        position<grid.dom.table.tBodies[0].rows.length && 
        grid.dom.table.tBodies[0].rows[position].isDetail
    ){
        position++;
    }
    var depotForInsert = grid.createDepotFromRow({}, 'new');
    grid.connector.fixedFields.forEach(function(pair){
        depotForInsert.row[pair.fieldName] = pair.value;
        depotForInsert.rowPendingForUpdate[pair.fieldName] = pair.value;
    });
    //TODO: mejorar la posición dentro del splice o concluir que no sirve el splice
    grid.depots.splice(Math.min(grid.depots.length,Math.max(0,position)),0,depotForInsert);
    return grid.createRowElements(position, depotForInsert);
};

myOwn.TableGrid.prototype.displayGrid = function displayGrid(){
    var grid = this;
    var tbody = grid.dom.table.tBodies[0];
    grid.updateRowData = function updateRowData(depot){
        var grid = this;
        var forInsert = false; // not define how to detect
        var tr = depot;
        depot.status = 'loaded';
        depot.primaryKeyValues = grid.def.primaryKey.map(function(fieldName){ 
            return depot.row[fieldName]; 
        });
        grid.def.fields.forEach(function(fieldDef){
            var td = depot.rowControls[fieldDef.name];
            var editable=grid.def.allow.update && !grid.connector.fixedField[fieldDef.name] && (forInsert?fieldDef.allow.insert:fieldDef.allow.update);
            td.contentEditable=editable;
            if(fieldDef.clientSide){
                grid.my.clientSides[fieldDef.clientSide].action(depot, fieldDef.name);
            }
            if(editable){
                td.setTypedValue(depot.row[fieldDef.name]);
            }
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
            depot.row = updatedRow;
            depot.rowPendingForUpdate = {};
            grid.updateRowData(depot);
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
        var tr = grid.my.insertRow({section:tbody, iRow:iRow, smooth:depot.status==='new'?{ 
            colCount:grid.def.detailTables.length + grid.def.fields.length
        }:false});
        depot.tr = tr;
        var thActions=html.th({class:['grid-th','grid-th-actions']}).create();
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
        grid.def.detailTables.forEach(function(detailTableDef){
            var detailControl = depot.detailControls[detailTableDef.table] || { show:false };
            detailControl.img = html.img({src:'img/detail-unknown.png'}).create();
            var button = html.button({class:'table-button'}, [detailControl.img]).create();
            var td = html.td({class:['grid-th','grid-th-details'], "my-relname":detailTableDef.table}, button).create();
            tr.appendChild(td);
            depot.detailControls[detailTableDef.table] = detailControl;
            button.addEventListener('click',function(){
                if(!detailControl.show){
                    detailControl.img.src='img/detail-contract.png';
                    var newTr = grid.my.insertRow({under:tr,smooth:{height:70}});
                    detailControl.tr = newTr;
                    var tdMargin = newTr.insertCell(-1);
                    tdMargin.colSpan = td.cellIndex+1;
                    var tdGrid = newTr.insertCell(-1);
                    tdGrid.colSpan = tr.cells.length-td.cellIndex;
                    tdGrid.style.maxWidth='inherit';
                    var fixedFields = detailTableDef.fields.map(function(pair){
                        return {fieldName: pair.target, value:depot.row[pair.source]};
                    });
                    if(!detailControl.table){
                        grid.my.tableGrid(detailTableDef.table, tdGrid, {fixedFields: fixedFields}).waitForReady(function(g){
                            detailControl.table=g.dom.table;
                        });
                    }else{
                        tdGrid.appendChild(detailControl.table);
                    }
                    detailControl.show = true;
                    newTr.detailTableName=detailTableDef.table;
                    newTr.isDetail=true;
                    depot.detailRows.push(newTr);
                }else{
                    detailControl.img.src='img/detail-expand.png';
                    grid.my.fade(detailControl.tr);
                    detailControl.show = false;
                    depot.detailRows = depot.detailRows.filter(function(tr){ return tr!==detailControl.tr;});
                    detailControl.tr = null;
                }
            });
        });
        grid.def.fields.forEach(function(fieldDef){
            var td = html.td({"my-colname":fieldDef.name}).create();
            TypedControls.adaptElement(td, fieldDef);
            depot.rowControls[fieldDef.name] = td;
            td.contentEditable=grid.def.allow.update && !grid.connector.fixedField[fieldDef.name] && (forInsert?fieldDef.allow.insert:fieldDef.allow.update);
            if(depot.row[fieldDef.name]!=null){
                td.setTypedValue(depot.row[fieldDef.name]);
            }
            if(!fieldDef.clientSide){
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
            }
            tr.appendChild(td);
        });
        tr.addEventListener('focusout', function(event){
            if(event.target.parentNode != (event.relatedTarget||{}).parentNode ){
                if(Object.keys(depot.rowPendingForUpdate).length){
                    saveRow(depot);
                }
            }
        });
        if(iRow===-1){
            depot.detailRows.forEach(function(detailTr){
                var detailControl = depot.detailControls[detailTr.detailTableName];
                detailControl.tr = detailTr;
                if(detailControl.show){
                    tbody.appendChild(detailTr);
                    detailControl.img.src='img/detail-contract.png';
                }else{
                    detailControl.img.src='img/detail-expand.png';
                }
            });
        }
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
        if(grid.hasFilterRow){
            return true;
        }
        grid.sizesForFilters=Array.prototype.map.call(grid.dom.table.rows[0].cells,function(cell){
            return cell.offsetWidth;
        });
        var depot = {
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
        var tr=html.tr({'class':'filter-line'}, grid.columns.map(function(column, iColumn){
            return column.thFilter(depot, iColumn);
        })).create();
        grid.hasFilterRow=tr;
        grid.dom.table.setAttribute('has-filter',1);
        grid.dom.table.tHead.appendChild(tr);
        return true;
        // tr.appendChild(html.td().create());
        grid.def.fields.forEach(function(fieldDef){
        });
    }
    grid.displayBody=function displayBody(){
        var grid = this;
        var filterData = grid.view.filter;
        if(filterData){
            var depotsToDisplay = grid.depots.filter(function(depot,i){
                var partialOk=true;
                for(var column in depot.row){
                    if(filterData.rowSymbols[column] && my.comparator[filterData.rowSymbols[column]]){
                        var isSatisfied=my.comparator[filterData.rowSymbols[column]](depot.row[column],filterData.row[column])
                        if(!isSatisfied){
                            partialOk=false;
                        }
                    }
                }
                return partialOk;
            })
        }else{
            var depotsToDisplay = grid.depots;
        }
        if(grid.view.sortColumns.length>0){
            depotsToDisplay.sort(function(depot1, depot2){ 
                return bestGlobals.compareForOrder(grid.view.sortColumns)(depot1.row, depot2.row);
            });
        }
        grid.displayRows = function displayRows(fromRowNumber, toRowNumber, adding){
            var grid = this;
            if(!adding){
                tbody.innerHTML='';
            }
            for(var iRow=fromRowNumber; iRow<toRowNumber; iRow++){
                (function(depot){
                    var tr=grid.createRowElements(-1, depot);
                    grid.updateRowData(depot);
                })(depotsToDisplay[iRow]);
            }
            grid.dom.footInfo.displayFrom.textContent=depotsToDisplay.length?1:0;
            grid.dom.footInfo.displayTo.textContent=iRow;
            grid.dom.footInfo.rowCount.innerHTML='';
            if(iRow<depotsToDisplay.length){
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
                    if(cut*5<=depotsToDisplay.length*3 && (iSize==my.displayCountBreaks.length-1 || cut*5<=my.displayCountBreaks[iSize+1]*3)){
                        addButtonRest(cut);
                    }
                });
                addButtonRest(depotsToDisplay.length);
            }
        }
        grid.displayRows(0, Math.min(my.firstDisplayCount,depotsToDisplay.length));
    }
    grid.displayBody();
};

myOwn.TableGrid.prototype.displayAsDeleted = function displayAsDeleted(depot){
    var grid = this;
    var position = Math.min(grid.depots.length,Math.max(0,depot.tr.sectionRowIndex));
    if(grid.depots[position] !== depot){
        position = grid.depots.indexOf(depot);
    }
    if(position>=0){
        grid.depots.splice(position,1);
    }
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

myOwn.clientSides={
    newPass:{
        action: function(depot, fieldName){
            var td=depot.rowControls[fieldName];
            td.contentEditable=true;
            TypedControls.adaptElement(td, 'text');
            td.addEventListener('update', function(event){
                var newPass = td.getTypedValue();
                td.setAttribute('io-status','updating');
                depot.row[fieldName] = newPass;
                var my=depot.manager.my;
                my.ajax.admin.chpass({
                    user:depot.row[depot.manager.def.primaryKey[depot.manager.def.primaryKey.length-1]],
                    newpass:newPass
                }).then(function(){
                    td.setAttribute('io-status','temporal-ok');
                    setTimeout(function(){
                        td.setAttribute('io-status','ok');
                    },3000);
                },function(){
                    td.setAttribute('io-status','error');
                });
            }, true);
        }
    }
}