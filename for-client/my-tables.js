"use strict";

/*global myOwn, my, XLSX, Pikaday  */
/*global miniMenuPromise, dialogPromise, alertPromise, confirmPromise, promptPromise, simpleFormPromise */
/*global Blob, document, CustomEvent, URL  */

var whenMergeOverride=true;

var Big = require('big.js');
var bestGlobals = require('best-globals');
var html = require('js-to-html').html;
var JSON4all = require('json4all');
var TypedControls = require('typed-controls');
var typeStore=require('type-store');
var likeAr=require('like-ar');

var changing = bestGlobals.changing;
var coalesce = bestGlobals.coalesce;

var MAX_SAFE_INTEGER = 9007199254740991;

/** @param { {[key:string]:any} } a */
/** @param { {[key:string]:any} } b */
function sameMembers(a,b){
    for(var attr in a){
        if(a[attr]!==b[attr]) return false;
    }
    for(var attr in b){
        if(a[attr]!==b[attr]) return false;
    }
    return true;
}

/** @param {any} a */
/** @param {any} b */
function sameValue(a,b){
    return a==b ||
      a instanceof Date && b instanceof Date && a.getTime() == b.getTime() ||
      typeof a === 'number' && (a>MAX_SAFE_INTEGER || a< -MAX_SAFE_INTEGER) && Math.abs(a/b)<1.00000000000001 && Math.abs(a/b)>0.99999999999999 ||
      a && !!a.sameValue && a.sameValue(b);
}

myOwn.i18n.messages.en=changing(myOwn.i18n.messages.en, {
    Delete : "Delete",
    Filter : "Filter",
    actualValueInDB: "actual value in database",
    allGWillDelete: "({$t} records will be deleted)",
    allRecordsDeleted: "all records where deleted",
    allTWillDelete: "(ALL {$t} records will be deleted)",
    anotherUserChangedTheRow: "The data was changed in the database",
    empty:'empty',
    equalTo:'equal to',
    exhibitedColumns:'Exhibited Columns',
    filterAdd:'add line to filter (line OR line)',
    filteredCompleteTable:'filtered complete table',
    hiddenColumns:'Hidden columns',
    confirmDeleteAll: "Do you want to delete these records?",
    deleteAllRecords: "delete all records",
    deleteRecord: "delete record",
    details: "details",
    download: "download",
    distinctFrom:'distinct from',
    export: "export",
    filter : "filter",
    filterOff: "filter off",
    format: "format",
    greaterThan:'greater than',
    greaterEqualThan:'greater igual than',
    hideOrShow: "hide or show colums",
    import: "import",
    importDataFromFile: "import data from external file",
    insertAbove: "insert record above this",
    insertRecordAtBottom: "insert a new record in the bottom of the table",
    lessThan:'less than',
    lessDetails: "hide details",
    lessEqualThan:'less equal than',
    loading: "loading",
    notEmpty:'not empty',
    notSimilarTo:'not similar to',
    numberExportedRows:"Rows exported",
    oldValue: "old value",
    oneRowInserted: "one row inserted.",
    xRowsInserted: "{$x} rows inserted.",
    oneRowUpdated: "one row updated.",
    xRowsUpdated: "{$x} rows updated.",
    optionsForThisTable: "options for this table",
    orientationToggle: "toggle orientation (vertical vs horizontal)",
    preparingForExport: "preparing for export",
    recordsReimaining: "{$r} records remains in the table",
    refresh: "refresh - retrive data from database",
    showInheritedKeys: "show inherited keys",
    similarTo:'similar to',
    table: "table",
    uploadFile: "upload file $1",
    verticalEdit: "vertical edit",
    xOverTWillDelete: "({$x} over a total of {$t} records will be deleted)",
    zoom: "zoom",
});

myOwn.i18n.messages.es=changing(myOwn.i18n.messages.es, {
    Delete : "Eliminar",
    Filter : "Filtrar",
    actualValueInDB: "valor actual en la base de datos",
    allGWillDelete: "(se borrarán {$t} registros)",
    allRecordsDeleted: "todos los registros fueron borrados",
    allTWillDelete: "(se borrarán todos los registros: {$t} registros)",
    anotherUserChangedTheRow: "Hubo un cambio en la base de datos para este registro",
    equalTo:'igual a',
    exhibitedColumns:'Columnas que se muestran',
    filterAdd:'otro renglón en el filtro (se mostrarán renglones que cumplan alguna de las líneas del filtro)',
    filteredCompleteTable:'tabla completa y filtrada',
    hiddenColumns:'Columnas ocultas',
    confirmDeleteAll: "¿Desea borrar estos registros?",
    deleteAllRecords: "borrar todos los registros",
    deleteRecord: "borrar este registro",
    details: "detalles",
    distinctFrom: "distinto de",
    download: "descargar",
    empty:'vacío',
    export: "exportar",
    filter : "filtrar",
    filterOff: "desactiva el filtro (ver todos los registros)",
    format: "formato",
    greaterThan:'mayor que',
    greaterEqualThan:'mayor igual que',
    hideOrShow: "ocultar o mostrar columnas",
    import: "importar",
    importDataFromFile: "importar datos de un archivo externo",
    insertAbove: "agregar un registro encima de éste",
    insertRecordAtBottom: "insertar un registro nuevo en la tabla",
    lessThan:'menor que',
    lessDetails: "dejar de mostrar los detalles asocialdos al registro",
    lessEqualThan:'menor igual que',
    loading: "cargando",
    notEmpty:'no vacío',
    notSimilarTo:'no contiene',
    numberExportedRows:"Filas exportadas",
    oldValue: "valor anterior",
    oneRowInserted: "un registro insertado.",
    xRowsInserted: "{$x} registros insertados.",
    oneRowUpdated: "un registro modificados.",
    xRowsUpdated: "{$x} registros modificados.",
    optionsForThisTable: "opciones para esta tabla",
    orientationToggle: "cambiar la orientación de la tabla (por fila o por columna)",
    preparingForExport: "preparando para exportar",
    recordsReimaining: "quedan {$r} registros en la tabla",
    refresh: "refrescar la grilla desde la base de datos",
    showInheritedKeys: "mostrar las columnas relacionadas",
    similarTo:'parecido a',
    table: "tabla",
    uploadFile: "subir el archivo $1",
    verticalEdit: "edición en forma de ficha",
    xOverTWillDelete: "(se borrarán {$x} registros sobre un total de {$t})",
    zoom: "zoom",
});

var escapeRegExp = bestGlobals.escapeRegExp;

myOwn.firstDisplayCount = 20;
myOwn.firstDisplayOverLimit = 30;
myOwn.displayCountBreaks = [100,250,1000];
myOwn.displayCountBreaks = [50,100,500];
myOwn.comparatorWidth = 16;
myOwn.comparator={
    '=':function(valueToCheck,condition){return valueToCheck == condition;},
    '~':function(valueToCheck,condition){return condition==null || RegExp(escapeRegExp(condition.toString()),'i').test(valueToCheck);},
    '!~':function(valueToCheck,condition){return condition==null || !RegExp(escapeRegExp(condition.toString()),'i').test(valueToCheck);},
    '/R/i':function(valueToCheck,condition){return condition==null || RegExp(condition,'i').test(valueToCheck);},
    '\u2205':function(valueToCheck,condition){return valueToCheck == null;},//\u2205 = conjunto vacío
    '!=\u2205':function(valueToCheck,condition){return valueToCheck != null;},//\u2205 = conjunto vacío
    '>':function(valueToCheck,condition){return (valueToCheck>condition); },
    '>=':function(valueToCheck,condition){return (valueToCheck>=condition); },
    '<':function(valueToCheck,condition){return (valueToCheck<condition); },
    '<=':function(valueToCheck,condition){return (valueToCheck<=condition); },
    '!=':function(valueToCheck,condition){return valueToCheck != condition;},
    'not-an-operator':function(valueToCheck,condition){ return 'Operator does not exist'; },
    'traductor':{
        '=':'igual',
        '~':'parecido',
        '!~':'not-like',
        '/R/i':'expresion-regular',
        '\u2205':'vacio',
        '!=\u2205':'not-empty',
        '>':'mayor',
        '>=':'mayor-igual',
        '<':'menor',
        '<=':'menor-igual',
        '!=':'not-equal'
    }
};

myOwn.getStructureFromLocalDb = function getStructureFromLocalDb(tableName){
    return my.ldb.getStructure(tableName);
}

myOwn.TableConnector = function(context, opts){
    var connector = this;
    for(var attr in context){
        connector[attr] = context[attr];
    }
    connector.opts = opts||{};
    connector.fixedFields = connector.opts.fixedFields || [];
    connector.fixedField = {};
    connector.fixedFields.forEach(function(pair){
        if(!pair.range){
            connector.fixedField[pair.fieldName] = pair.value;
        }
    });
    connector.parameterFunctions=connector.opts.parameterFunctions||{};
};

myOwn.TableConnector.prototype.getStructure = function getStructure(){
    var connector = this;
    var my = connector.my;
    var structureFromLocal;
    var structureFromBackend = my.ajax.table.structure({
        table:connector.tableName,
    }).then(function(tableDef){
        connector.def = changing(tableDef, connector.opts.tableDef||{});
        return connector.def;
    });
    if(my.ldb){
        structureFromBackend.then(function(tableDef){
            var promiseChain=my.ldb.registerStructure(changing(tableDef, connector.opts.tableDef||{}));
            if(!connector.localDef || JSON.stringify(tableDef)!=JSON.stringify(connector.localDef)){
                //alertPromise('la tabla '+connector.tableName+' cambió de estructura. Debe Refrescar la página')
            }
            if(connector.def.offline.mode==='master'){
                connector.def.offline.details.forEach(function(tableName){
                    promiseChain = promiseChain.then(function(){
                        return my.ldb.getStructure(tableName).then(function(tableDef){
                            if(!tableDef){
                                var conn = new my.TableConnector({tableName: tableName, my:my});
                                return conn.getStructure();
                            }
                        });
                    });
                });
            }
            connector.def.foreignKeys.forEach(function(foreignKey){
                promiseChain = promiseChain.then(function(){
                    return my.ldb.getStructure(foreignKey.references).then(function(tableDef){
                        if(!tableDef){
                            var conn = new my.TableConnector({tableName: foreignKey.references, my:my});
                            return conn.getStructure();
                        }
                    });
                });
            });
            promiseChain = promiseChain.then(function(){
                return connector.def;
            });
            return promiseChain;
        });
        var structureFromLocal = my.getStructureFromLocalDb(connector.tableName);
        connector.whenStructureReady = structureFromLocal.then(function(tableDef){
            if(!tableDef){ 
                return structureFromBackend;
            }
            connector.localDef = connector.def = changing(tableDef, connector.opts.tableDef||{});
            return connector.def;
        });
    }else{
        connector.whenStructureReady = structureFromBackend;
    }
    return connector.whenStructureReady;
};

myOwn.TableConnector.prototype.getData = function getData(){
    var connector = this;
    if(((connector.opts||{}).tableDef||{}).forInsertOnlyMode){
        return Promise.resolve([]);
    }
    return connector.my.ajax.table.data({
        table:connector.tableName,
        fixedFields:connector.fixedFields,
        paramfun:connector.parameterFunctions||{}
    }).then(function(rows){
        return connector.whenStructureReady.then(function(){
            if(connector.getElementToDisplayCount){
                connector.getElementToDisplayCount().textContent=rows.length+' '+my.messages.displaying+'...';
            }
            return bestGlobals.sleep(10);
        }).then(function(){
            connector.my.adaptData(connector.def, rows);
            return rows;
        });
    }).catch(function(err){
        if(connector.getElementToDisplayCount){
            var elementToDisplayError=connector.getElementToDisplayCount()
            if(elementToDisplayError){
                elementToDisplayError.appendChild(html.span({style:'color:red', title: err.message},' error').create());
            }
        }
        throw err;
    });
};

myOwn.TableConnector.prototype.deleteRecord = function deleteRecord(depot, opts){
    return (depot.primaryKeyValues===false?
        Promise.resolve():
        depot.my.ajax.table['delete-record']({
            table:depot.def.name, 
            primaryKeyValues:depot.primaryKeyValues,
            launcher:opts.launcher
        }).then(function(){
            depot.tr.dispatchEvent(new CustomEvent('deletedRowOk'));
            var grid=depot.manager;
            grid.dom.main.dispatchEvent(new CustomEvent('deletedRowOk'));
        })
    );
};

myOwn.cloneRow = function cloneRow(row){
    return JSON4all.parse(JSON4all.stringify(row));
};

myOwn.TableConnector.prototype.saveRecord = function saveRecord(depot, opts){
    var sendedForUpdate = depot.my.cloneRow(depot.rowPendingForUpdate);
    return depot.my.ajax.table['save-record']({
        table: depot.def.name,
        primaryKeyValues: depot.primaryKeyValues,
        newRow: depot.rowPendingForUpdate,
        oldRow: depot.retrievedRow,
        status: depot.status
    },opts).then(function(result){
        var updatedRow=result.row;
        depot.my.adaptData(depot.def,[updatedRow]);
        return {sendedForUpdate:sendedForUpdate, updatedRow:updatedRow};
    });
};

myOwn.TableConnector.prototype.enterRecord = function enterRecord(depot){
    return (!this.my.config.cursor || depot.primaryKeyValues===false?
        Promise.resolve():
        depot.my.ajax.table['enter-record']({
            table:depot.def.name, 
            primaryKeyValues:depot.primaryKeyValues
        })
    );
};
myOwn.TableConnector.prototype.deleteEnter = function enterRecord(depot){
    return (!this.my.config.cursor || depot.primaryKeyValues===false?
        Promise.resolve():
        depot.my.ajax.table['delete-enter']({
            table:depot.def.name, 
            primaryKeyValues:depot.primaryKeyValues
        })
    );
};


myOwn.TableConnectorDirect = myOwn.TableConnector;

myOwn.TableConnectorLocal = function(context, opts){
    var connector = this;
    for(var attr in context){
        connector[attr] = context[attr];
    }
    connector.opts = opts||{};
    connector.fixedFields = connector.opts.fixedFields || [];
    connector.fixedField = {};
    connector.fixedFields.forEach(function(pair){
        if(!pair.range){
            connector.fixedField[pair.fieldName] = pair.value;
        }
    });
    connector.parameterFunctions=connector.opts.parameterFunctions||{};
};

myOwn.TableConnectorLocal.prototype.getStructure = function getStructure(){
    var connector = this;
    connector.whenStructureReady = my.getStructureFromLocalDb(connector.tableName).then(function(tableDef){
        if(!tableDef){ 
            var err = new Error();
            err.code='NO-STRUCTURE';
            throw err;
        }
        connector.def = changing(tableDef, connector.opts.tableDef||{});
        return connector.def;
    })
    return connector.whenStructureReady;
};

myOwn.TableConnectorLocal.prototype.getData = function getData(){
    var connector = this;
    if(((connector.opts||{}).tableDef||{}).forInsertOnlyMode){
        return Promise.resolve([]);
    }
    if(connector.parameterFunctions){
        for(var x in connector.parameterFunctions||{}){
            throw new Error('no soportado parameterFunctions');
        }
    }
    return connector.whenStructureReady.then(function(){
        var parentKey = [];
        var filterValues = connector.fixedFields.slice();
        var primaryKey = connector.def.primaryKey.slice();
        var indexOfKey;
        while(primaryKey.length && connector.fixedField[primaryKey[0]]){
            var key=primaryKey.shift();
            parentKey.push(connector.fixedField[key]);
        }
        return my.ldb.getChild(connector.def.name,parentKey).then(function(rows){
            return rows.filter(function(row){
                return !filterValues.find(function(pair){
                    return row[pair.fieldName]!=pair.value
                });
            });
        })
    }).then(function(rows){
        connector.getElementToDisplayCount().textContent=rows.length+' '+my.messages.displaying+'...';
        return bestGlobals.sleep(10).then(function(){
            connector.my.adaptData(connector.def, rows);
            return rows;
        });
    }).catch(function(err){
        connector.getElementToDisplayCount().appendChild(html.span({style:'color:red', title: err.message},' error').create());
        throw err;
    })
};

myOwn.TableConnectorLocal.prototype.deleteRecord = function deleteRecord(depot, opts){
    return (depot.primaryKeyValues===false?
        Promise.resolve():
        db[depot.def.name].delete(depot.primaryKeyValues).then(function(){
            depot.tr.dispatchEvent(new CustomEvent('deletedRowOk'));
            var grid=depot.manager;
            grid.dom.main.dispatchEvent(new CustomEvent('deletedRowOk'));
        })
    );
};

myOwn.TableConnectorLocal.prototype.saveRecord = function saveRecord(depot, opts){
    var connector = this;
    var sendedForUpdate = depot.my.cloneRow(depot.rowPendingForUpdate);
    depot.row.$dirty=true;
    return my.ldb.putOne(connector.tableName,depot.row).then(function(row){
        return {sendedForUpdate:sendedForUpdate, updatedRow:row};
    });
};

myOwn.TableConnectorLocal.prototype.enterRecord = function enterRecord(depot){
    return Promise.resolve();
};
myOwn.TableConnectorLocal.prototype.deleteEnter = function enterRecord(depot){
    return Promise.resolve();
};

myOwn.TableGrid = function(context, mainElement){
    var grid = this;
    for(var attr in context){
        grid[attr] = context[attr];
    }
    grid.dom={
        main: mainElement,
        aggregate: {}
    };
    grid.modes = {
        saveByField: true,
        withColumnDetails: null, // null = autodetect
    };
    grid.view = {};
};

function upadteNumberOfRows(depot,grid){
    console.log("grid.depotsToDisplay.length",grid.depotsToDisplay.length)
    depot.manager.dom.footInfo.displayTo.textContent=grid.depotsToDisplay.length;
}

myOwn.tableGrid = function tableGrid(tableName, mainElement, opts){
    var my = this;
    var grid = new my.TableGrid({my: this}, mainElement);
    opts = opts || {};
    var Connector = my.offline.mode?my.TableConnectorLocal:my.TableConnector;
    grid.connector = new Connector({
        my:this, 
        tableName: tableName, 
        getElementToDisplayCount:function(){ return grid.dom.footInfo.displayTo; }
    }, opts);
    var preparing = grid.prepareAndDisplayGrid();
    grid.waitForReady = function waitForReady(fun){
        return preparing.then(function(){
            return grid;
        }).then(fun||function(){});
    };
    return grid;
};

myOwn.TableGrid.prototype.hideColumnsViaCss = function hideColumnsViaCss(){
    var grid = this;
    var autoStyle = my.inlineCss('bp-hidden-columns-'+grid.def.name);
    autoStyle.innerHTML = grid.view.hiddenColumns.map(function(columnName){
        return "[my-table|='"+grid.def.name+"'] [my-colname='"+columnName+"'] {display:none}";
    }).join('\n');
}

myOwn.TableGrid.prototype.displayPreLoadMessage = function displayPreLoadMessage(){
    var div=html.div({class:'div-loading-over'}).create();
    var rect=my.getRect(this.dom.main);
    div.style.left  =rect.left  +'px';
    div.style.top   =rect.top   +'px';
    div.style.width =rect.width +'px';
    div.style.heigth=rect.heigth+'px';
    this.dom.main.appendChild(div);
    div.textContent = my.messages.loading+'...';
};

myOwn.TableGrid.prototype.displayLoadingMessage = function displayLoadingMessage(){
    this.dom.main.style.background='#EEE';
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
        retrievedRow: row,
        rowPendingForUpdate:{},
        primaryKeyValues:false,
        status: status||'preparing',
        detailControls:{},
        detailRows:[]
    };
    return depot;
};

myOwn.TableGrid.prototype.prepareDepots = function prepareDepots(rows){
    var grid = this;
    grid.depots = rows.map(grid.createDepotFromRow.bind(grid));
    grid.view.sortColumns=grid.view.sortColumns||grid.def.sortColumns||[];
};

myOwn.TableGrid.prototype.updateSortArrow = function updateSortArrow(){
    var grid = this;
    var oldSortImgs = grid.dom.table.getElementsByClassName('sort-img');
    var oldSortSpans = grid.dom.table.getElementsByClassName('sort-span');
    for (var i = oldSortImgs.length; i > 0; i--) {
        oldSortImgs[i-1].remove();
    }
    for (var i = oldSortSpans.length; i > 0; i--) {
        oldSortSpans[i-1].remove();
    }
    grid.view.sortColumns.forEach(function(sortColumn, index){
        Array.prototype.forEach.call(grid.dom.table.getElementsByClassName('th-name'), function(th){
            if(th.getAttribute('my-colname') == sortColumn.column){
                var order = sortColumn.order?sortColumn.order:1;
                th.setAttribute('ordered-direction',order);
                th.setAttribute('ordered-order',index+1);
            }
        });
    });
};

myOwn.TableGrid.prototype.refresh = function refresh(){
    return this.prepareAndDisplayGrid();
};

myOwn.TableGrid.prototype.prepareAndDisplayGrid = function prepareAndDisplayGrid(){
    var grid = this;
    grid.displayPreLoadMessage();
    var structureRequest = grid.connector.getStructure().then(function(tableDef){
        grid.def = tableDef;
        grid.vertical = tableDef.layout.vertical;
        grid.displayLoadingMessage();
        return grid.prepareGrid();
    });
    return grid.connector.getData().then(function(rows){
        return structureRequest.then(function(){
            if(grid.def.layout.errorList){
                if(!rows.length){
                    grid.dom.caption.textContent='no tiene: '+grid.dom.caption.textContent;
                    grid.dom.caption.style.backgroundColor='green';
                    grid.dom.table.tHead.style.display='none';
                    if(grid.dom.table.tBodies[0]){
                        grid.dom.table.tBodies[0].style.display='none';
                    }
                    if(grid.dom.table.tFoot){
                        grid.dom.table.tFoot.style.display='none';
                    }
                    return grid;
                }else{
                    grid.dom.caption.style.backgroundColor='#F44';
                }
            }
            grid.prepareDepots(rows);
            grid.displayGrid();
            grid.updateSortArrow();
            if(grid.def.forInsertOnlyMode){
                grid.createRowInsertElements();
            }
            grid.refreshAggregates();
            grid.dom.main.style.background=null;
            return grid;
        });
    }).catch(function(err){
        grid.my.log(err);
    });
};

myOwn.ColumnGrid = function ColumnGrid(opts){
    for(var optName in opts){
        this[optName] = opts[optName];
    }
};

myOwn.ColumnGrid.prototype.th = function th(){
    return html.th();
};

myOwn.ColumnGrid.prototype.thDetail = function thDetail(){
    return html.th({class:'th-detail'}, (this.fieldDef||{}).label);
};

myOwn.ColumnGrid.prototype.thAgg = function thAgg(){
    return html.th({class:'th-agg'});
};

myOwn.ColumnGrid.prototype.thFilter = function thFilter(){
    return html.th();
};

myOwn.ColumnGrid.prototype.td = function td(){
    return html.td().create();
};

myOwn.ActionColumnGrid = function ActionColumnGrid(opts){
    myOwn.ColumnGrid.call(this,opts);
};

myOwn.ActionColumnGrid.prototype = Object.create(myOwn.ColumnGrid.prototype);

myOwn.ActionColumnGrid.prototype.th = function th(){
    return html.th({class:'grid-th-actions'}, this.actions);
};

myOwn.ActionColumnGrid.prototype.thFilter = function thFilter(depot){
    var buttonFilter=html.button({id:'button-filter'},myOwn.messages.Filter+"!").create();
    var grid = this.grid;
    buttonFilter.addEventListener('click',function(){
        grid.updateFilterInfo(' (F) ');
        grid.displayBody();
    });
    return html.th([buttonFilter]);
};

myOwn.ActionColumnGrid.prototype.td = function td(depot){
    var grid = this.grid;
    var thActions=html.th({class:['grid-th','grid-th-actions']}).create();
    thActions.rowSpan = 1 + this.grid.def.layout.extraRows;
    var actionNamesList = ['insert','delete','vertical-edit'].concat(grid.def.actionNamesList);
    if(!grid.def.forInsertOnlyMode){
        actionNamesList.forEach(function(actionName){
            var actionDef = my.tableAction[actionName];
            if(grid.def.allow[actionName]){
                var buttonAction=html.button({class:'table-button', "skip-enter":true}, [
                    html.img({src:actionDef.img, alt:actionDef.alt, title:my.messages[actionDef.titleMsg]})
                ]).create();
                thActions.appendChild(buttonAction);
                buttonAction.addEventListener('click', function(){
                    actionDef.actionRow(depot, {launcher:buttonAction});
                });
            }
        });
    }
    return thActions;
};

myOwn.ActionColumnGrid.prototype.thAgg = function thAgg(){
    return html.th({class:'th-action'}, this.actionsBottom);
};

myOwn.DataColumnGrid = function DataColumnGrid(opts){
    myOwn.ColumnGrid.call(this,opts);
};

myOwn.DataColumnGrid.prototype = Object.create(myOwn.ColumnGrid.prototype);

myOwn.DataColumnGrid.prototype.cellAttributes = function cellAttributes(specificAttributes,opts){
    var fieldDef = this.fieldDef;
    var grid=this.grid;
    var opts=opts||{};
    var attr=changing({"my-colname":fieldDef.name},specificAttributes);
    if(!opts.skipMandatory){
        if(fieldDef.nullable!==true && fieldDef.isPk){
            attr["my-mandatory"]="pk";
        }else if(fieldDef.nullable===false){
            attr["my-mandatory"]="normal";
        }
    }
    if(grid.connector.fixedField[fieldDef.name]){
        attr["inherited-pk-column"]="yes";
    }
    if(fieldDef.referencesField){
        if(grid.connector.fixedField[fieldDef.referencesField]){
            attr["inherited-pk-column"]="yes";
        }
        if(grid.def.field[fieldDef.referencesField].isPk){
            attr["my-fixed2left-column"]=true;
        }
    }
    if(fieldDef.isPk){
        attr["my-pk-column"]=fieldDef.isPk;
        attr["my-fixed2left-column"]=true;
    }
    return attr;
}
    
myOwn.DataColumnGrid.prototype.th = function th(){
    var fieldDef = this.fieldDef;
    var grid = this.grid;
    var th=html.th(this.cellAttributes({class: "th-name"}),fieldDef.title).create();
    if(fieldDef.width){
        th.style.width=fieldDef.width+'px';
        th.style.minWidth=fieldDef.width+'px';
    }
    th.addEventListener('click',function(mouseEvent){
        if(mouseEvent.altKey){
            grid.view.hiddenColumns.push(fieldDef.name);
            grid.hideColumnsViaCss();
        }else{
            var sortColumnResult = grid.view.sortColumns.find(function(sortColumn){
                return sortColumn.column == fieldDef.name;
            });
            var currentOrder = sortColumnResult?sortColumnResult.order:null;
            grid.view.sortColumns=grid.view.sortColumns.filter(function(sortColumn){
                return sortColumn.column != fieldDef.name;
            });
            var newOrder = currentOrder?-currentOrder:1;
            grid.view.sortColumns.unshift({column:fieldDef.name, order:newOrder});
            grid.updateSortArrow();
            grid.displayBody();
        }
    });
    return th;
};

myOwn.DataColumnGrid.prototype.thFilter = function thFilter(depot, iColumn){
    var grid = this.grid;
    var fieldDef = this.fieldDef;
    var fieldName=fieldDef.name;
    depot.rowSymbols[fieldDef.name]=depot.rowSymbols[fieldDef.name]||'~';
    var filterImage=my.path.img+my.comparator.traductor[depot.rowSymbols[fieldDef.name]]+'.png';
    var th=html.td(this.cellAttributes({class:"autoFilter", "typed-controls-direct-input":true},{skipMandatory:true})).create();
    var symbolFilter=th;
    symbolFilter.style.backgroundImage='url('+filterImage+')';
    var elementFilter=th;
    depot.rowControls[fieldName]=elementFilter;
    TypedControls.adaptElement(elementFilter,fieldDef);
    if(fieldName in depot.row){
        elementFilter.setTypedValue(depot.row[fieldName]);
    }
    elementFilter.addEventListener('update',function(){
        depot.row[fieldDef.name]=this.getTypedValue();
    });
    symbolFilter.addEventListener('click',function(event){
        var rect=my.getRect(this);
        if(event.pageX>=rect.left && event.pageX<=rect.left + myOwn.comparatorWidth){
            miniMenuPromise([
                {value:'=',     img:my.path.img+'igual.png'      ,label:myOwn.messages.equalTo},
                {value:'~',     img:my.path.img+'parecido.png'   ,label:myOwn.messages.similarTo},
                {value:'!~',    img:my.path.img+'not-like.png'   ,label:myOwn.messages.notSimilarTo},
                {value:'\u2205',img:my.path.img+'vacio.png'      ,label:myOwn.messages.empty},
                {value:'!=\u2205',img:my.path.img+'not-empty.png',label:myOwn.messages.notEmpty},
                {value:'>',     img:my.path.img+'mayor.png'      ,label:myOwn.messages.greaterThan},
                {value:'>=',    img:my.path.img+'mayor-igual.png',label:myOwn.messages.greaterEqualThan},
                {value:'<',     img:my.path.img+'menor.png'      ,label:myOwn.messages.lessThan},
                {value:'<=',    img:my.path.img+'menor-igual.png',label:myOwn.messages.lessEqualThan},
                {value:'!=',    img:my.path.img+'not-equal.png'  ,label:myOwn.messages.distinctFrom},
            ],{underElement:symbolFilter}).then(function(result){
                filterImage=my.path.img+my.comparator.traductor[result]+'.png';
                symbolFilter.style.backgroundImage='url('+filterImage+')';
                depot.rowSymbols[fieldDef.name]=result;
            });
            event.preventDefault();
        }
    });
    return th;
};

myOwn.DataColumnGrid.prototype.thDetail = function thDetail(){
    var grid=this.grid;
    return html.th(this.cellAttributes({class:"th-detail"}), (this.fieldDef||{}).label);
};

myOwn.DataColumnGrid.prototype.thAgg = function thAgg(){
    var grid=this.grid;
    var th=html.th(this.cellAttributes({class:"th-agg"})).create();
    if(this.fieldDef.aggregate){
        TypedControls.adaptElement(th,{typeName:'decimal'});
        grid.dom.aggregate[this.fieldDef.name]=th;
    }
    return th;
};

myOwn.DataColumnGrid.prototype.td = function td(depot, iColumn, tr, saveRow){
    var grid = this.grid;
    var fieldDef = this.fieldDef;
    var forInsert = false; // TODO: Verificar que esto está en desuso
    var directInput=grid.def.allow.update && !grid.connector.fixedField[fieldDef.name] && (forInsert?fieldDef.allow.insert:fieldDef.allow.update);
    var control;
    var td;
    if(fieldDef.mobileInputType && my.mobileMode){
        var inputAttrs = {type:'text'};
        if(fieldDef.mobileInputType=='number'){
            inputAttrs.pattern = "[0-9]*";
        }
        control = html.input(changing({class:'bp-input'},inputAttrs)).create();
        td = html.td(this.cellAttributes({}),[control]).create();
    }else{
        control = td = html.td(this.cellAttributes({"typed-controls-direct-input":directInput})).create();
    }
    // td.clientControl = clientControl;
    td.rowSpan = td.rowSpan + fieldDef.extraRow;
    if(fieldDef.typeName=='number'){
        throw new Error("There's a field in the table defined as Number (Number type is deprecated)");
    }
    TypedControls.adaptElement(control, fieldDef);
    depot.rowControls[fieldDef.name] = control;
    if(depot.row[fieldDef.name]!=null){
        control.setTypedValue(depot.row[fieldDef.name]);
    }
    if(!fieldDef.clientSide || fieldDef.serverSide){
        control.addEventListener('update',function(){
            var value = this.getTypedValue();
            if(!sameValue(value,depot.row[fieldDef.name])){
                this.setAttribute('io-status', 'pending');
                depot.rowPendingForUpdate[fieldDef.name] = value;
                depot.row[fieldDef.name] = value;
                if(grid.modes.saveByField){
                    saveRow(depot,{visiblyLogErrors:false});
                }
                if(fieldDef.references){
                    var reference = my.getReference(fieldDef.references);
                    reference.dataReady.then(function(rows){
                        var referencedValue;
                        grid.def.fields.forEach(function(field){
                            if(field.referencedAlias && field.referencedAlias==fieldDef.references){
                                referencedValue=rows.find(function(row){
                                    return depot.row[fieldDef.name]==row[fieldDef.name];
                                })||{};
                                var lookupValue=coalesce(referencedValue[field.referencedName],null);
                                depot.row[field.name]=lookupValue;
                                depot.rowControls[field.name].setTypedValue(lookupValue);
                            }
                        })
                    })
                }
                //grid.updateRowData(depot,true); // revisualiza aunque no haya grabado
            }
        });
    }
    control.addEventListener('update', function(){
        grid.refreshAggregates();
        if(grid.def.specialValidator){
            var specialMandatories=myOwn.validators[grid.def.specialValidator].getMandatoryMap(depot.row);
            Array.prototype.forEach.call(tr.cells, function(cell){
                var fieldName = cell.getAttribute("my-colname");
                var specialMandatory=specialMandatories[fieldName];
                if(cell.hasAttribute("my-special")){
                    if(!specialMandatory){
                        cell.removeAttribute("my-special");
                    }else if(cell.getAttribute("my-special")!=specialMandatory){
                        cell.setAttribute("my-special", specialMandatory);
                    }
                }else{
                    if(specialMandatory){
                        cell.setAttribute("my-special", specialMandatory);
                    }
                }
            });
        }
    })
    return td;
};

myOwn.DetailColumnGrid = function DetailColumnGrid(opts){
    myOwn.ColumnGrid.call(this,opts)
};

myOwn.DetailColumnGrid.prototype = Object.create(myOwn.ColumnGrid.prototype);

myOwn.DetailColumnGrid.prototype.th = function th(){
    var th=html.th({class:'grid-th-details', "my-defname":this.detailTableDef.table||this.detailTableDef.wScreen, title:this.detailTableDef.label},this.detailTableDef.abr);
    return th;
};

myOwn.DetailColumnGrid.prototype.td = function td(depot, iColumn, tr){
    var grid = this.grid;
    var detailTableDef = this.detailTableDef;
    var detailTableNameAndAbr = detailTableDef.table+' '+detailTableDef.abr;
    var detailControl = depot.detailControls[detailTableNameAndAbr] || { show:false };
    if(detailTableDef.condition){
        if(!my.conditions[detailTableDef.condition](depot)){
            return html.td({class:['grid-th','grid-th-details'], "my-relname":detailTableDef.table}).create();
        }
    }
    detailControl.img = html.img({
        src:my.path.img+'detail-unknown.png',
        alt:'DETAIL',
        title:my.messages.details
    }).create();
    var menuRef={w:'table', table:detailTableDef.table};
    var calculateFixedFields = function(){
        return detailTableDef.fields.map(function(pair){
            var fieldCondition={fieldName: pair.target, value:depot.row[pair.source]}
            if(pair.range){
                fieldCondition.range=pair.range;
            }
            return fieldCondition;
        });
    }
    var updateHrefBeforeClick = function(){
        var fixedFields = calculateFixedFields();
        menuRef.fixedFields=fixedFields;
        this.setForkeableHref(menuRef);
    }
    var buttononclick = function(event){
        var fixedFields = calculateFixedFields();
        menuRef.fixedFields=fixedFields;
        this.setForkeableHref(menuRef);
        var spansForSmooth = [iColumn+1, 999];
        if(!detailControl.show && !event.ctrlKey && event.button!=1){
            detailControl.img.src=my.path.img+'detail-contract.png';
            detailControl.img.alt="[-]";
            detailControl.img.title=my.messages.lessDetails;
            var newTr = grid.my.insertRow({under:tr,smooth:{height:70, spans:spansForSmooth}});
            detailControl.tr = newTr;
            var tdMargin = newTr.insertCell(-1);
            tdMargin.colSpan = td.cellIndex+1;
            var tdGrid = newTr.insertCell(-1);
            tdGrid.colSpan = tr.cells.length-td.cellIndex;
            var divGrid = tdGrid;
            divGrid.style.maxWidth=td.parentNode.offsetWidth - td.offsetLeft + 'px';
            divGrid.style.overflowX='visible';
            tdGrid.className='my-detail-grid';
            tdGrid.style.overflowX='visible';
            if(!detailControl.divDetail){
                if(detailTableDef.wScreen){
                    var params=likeAr.toPlainObject(fixedFields,'fieldName','value');
                    var wScreen=my.wScreens[detailTableDef.wScreen];
                    if(!wScreen.parameters){
                        alertPromise('error lack of parameters in wScreen '+detailTableDef.wScreen);
                    }
                    wScreen.mainAction(params,divGrid);
                }else{
                    grid.my.tableGrid(detailTableDef.table, divGrid, {fixedFields: fixedFields}).waitForReady(function(g){
                        detailControl.divDetail=g.dom.table;
                        if(detailTableDef.refreshParent || grid.def.complexDef && detailTableDef.refreshParent!==false){
                            var refresh = function refresh(){
                                grid.retrieveRowAndRefresh(depot);
                            }
                            g.dom.main.addEventListener('deletedRowOk', refresh);
                            g.dom.main.addEventListener('savedRowOk', refresh);
                        }
                    });
                }
            }else{
                divGrid.appendChild(detailControl.divDetail);
            }
            detailControl.show = true;
            newTr.detailTableNameAndAbr=detailTableNameAndAbr;
            newTr.isDetail=true;
            depot.detailRows.push(newTr);
        }else{
            detailControl.img.src=my.path.img+'detail-expand.png';
            detailControl.img.alt="[+]";
            detailControl.img.title=my.messages.details;
            if(detailControl.tr){
                grid.my.fade(detailControl.tr, {smooth:{spans:spansForSmooth, content:detailControl.divDetail}});
                depot.detailRows = depot.detailRows.filter(function(tr){ return tr!==detailControl.tr;});
            }
            detailControl.show = false;
            detailControl.tr = null;
        }
        if(!event.ctrlKey && event.button!=1){
            event.preventDefault();
        }
    };
    var button = my.createForkeableButton(menuRef,{label:detailControl.img, onclick:buttononclick, updateHrefBeforeClick:updateHrefBeforeClick, class:'table-button'});
    button.setAttribute("skip-enter",true);
    // var button = html.button({class:'table-button', "skip-enter":true}, [detailControl.img]).create();
    var td = html.td({class:['grid-th','grid-th-details'], "my-relname":detailTableDef.table||detailTableDef.wScreen}, button).create();
    depot.detailControls[detailTableNameAndAbr] = detailControl;
    return td;
};

myOwn.SpecialColumnGrid = function SpecialColumnGrid(opts){
    myOwn.ColumnGrid.call(this,opts);
};

myOwn.SpecialColumnGrid.prototype = Object.create(myOwn.ColumnGrid.prototype);

myOwn.SpecialColumnGrid.prototype.th = function th(){
    return html.th({class:this.class});
};

myOwn.SpecialColumnGrid.prototype.thDetail = myOwn.SpecialColumnGrid.prototype.th;
myOwn.SpecialColumnGrid.prototype.thAgg = myOwn.SpecialColumnGrid.prototype.th;

function s2ab(s) {
    var buf;
    var i;
    if(typeof ArrayBuffer !== 'undefined') {
        buf = new ArrayBuffer(s.length);
        var view = new Uint8Array(buf);
        for (i=0; i!=s.length; ++i){
            view[i] = s.charCodeAt(i) & 0xFF;
        }
    } else {
        buf = new Array(s.length);
        for (i=0; i!=s.length; ++i){
            buf[i] = s.charCodeAt(i) & 0xFF;
        }
    }
    return buf;
}

function Workbook() {
    if(!(this instanceof Workbook)){
        return new Workbook();
    }
    this.SheetNames = [];
    this.Sheets = {};
}

myOwn.TableGrid.prototype.prepareMenu = function prepareMenu(button){
    button.src=my.path.img+'menu-dots.png';
    button.title=my.messages.optionsForThisTable;
    var grid=this;
    var menuOptions=[];
    menuOptions.push({img:my.path.img+'refresh.png', value:true, label:my.messages.refresh, doneFun:function(){
        return grid.refresh();
    }});
    menuOptions.push({img:my.path.img+'show-inherited-keys.png', value:true, label:my.messages.showInheritedKeys, doneFun:function(){
        grid.view.showInheritedKeys = !grid.view.showInheritedKeys;
        grid.dom.table.parentNode.setAttribute('show-inherited-keys', grid.view.showInheritedKeys?'yes':'no');
        return Promise.resolve(true);
    }});
    menuOptions.push({img:my.path.img+'show-hide-columns.png', value:true, label: my.messages.hideOrShow, doneFun:function(){
        dialogPromise(function(dialogWindow, closeWindow){
            var button=html.button({class:'hide-or-show'},'ok').create();
            var createSelectElement=function createSelectElement(columns,hideOrShowId,disabledItems){
                var selectElement=html.select(
                    {id:hideOrShowId, class:'hide-or-menu', multiple:true, size:Math.max(Math.min(grid.def.fields.lenght,10),4)},
                    columns.map(function(column){
                        return html.option({value: column, disabled:disabledItems.indexOf(column)!==-1},column)
                    })
                ).create()
                return selectElement;
            };
            var selectColumnsToHideElement=createSelectElement(
                grid.def.fields.map(function(def){return def.name;}),
                'hide-columns',
                grid.view.hiddenColumns
            );
            var selectColumnsToShowElement=createSelectElement(
                grid.view.hiddenColumns,
                'show-columns',
                []
            );
            var hideOrShowTable=html.table({class:"show-or-hide"},[
                html.tr([
                    html.td({class:'show-or-hide-title'},my.messages.exhibitedColumns),
                    html.td(),
                    html.td({class:'show-or-hide-title'},my.messages.hiddenColumns)
                ]),
                html.tr([
                    html.td([selectColumnsToHideElement]),
                    html.td([
                        html.div([html.img({class:'show-or-hide-img',src:my.path.img+'show.png'})]),
                        html.div([html.img({class:'show-or-hide-img',src:my.path.img+'hide.png'})])
                    ]),
                    html.td([selectColumnsToShowElement]),
                ]),
                html.tr([html.td({colspan:3},[button])])
            ]);
            dialogWindow.appendChild(hideOrShowTable.create());
            selectColumnsToHideElement.addEventListener('change',function(){
                Array.prototype.forEach.call(selectColumnsToHideElement.selectedOptions, function(option) {
                    option.disabled=true;
                    selectColumnsToShowElement.add(html.option({value:option.value}, option.value).create());
                    grid.view.hiddenColumns.push(option.value);
                });
                grid.hideColumnsViaCss();
            });
            selectColumnsToShowElement.addEventListener('change',function(){
                var listOptionsToShow=Array.prototype.slice.call(selectColumnsToShowElement.selectedOptions); 
                listOptionsToShow.forEach(function(option) {
                    grid.view.hiddenColumns.splice(grid.view.hiddenColumns.indexOf(option.value),1);
                    selectColumnsToShowElement.removeChild(option);
                    var elementToEnable=selectColumnsToHideElement.querySelector("[value="+option.value+"]");
                    elementToEnable.disabled=false;
                });
                grid.hideColumnsViaCss();
            });
            var showAndHide=function showAndHide(selectColumnElement,showOrHide){
                Array.prototype.forEach.call(selectColumnElement.children,function(child){
                    if(showOrHide=='hide'){
                        hideColumn(child.value)
                        grid.view.hiddenColumns.push(child.value);
                    }else{
                        showColmn(child.value);
                    }
                })
            };
            button.addEventListener('click',function(){
                closeWindow();
            })
        })
        return true;
    }});
    if(grid.def.allow.export){
        menuOptions.push({img:my.path.img+'export.png', value:true, label:my.messages.export, doneFun: function(){
            myOwn.dialogDownload(grid);
        }});
    }
    if(grid.def.allow.import){
        var showWithMiniMenu = true;
        var messages = {};
        menuOptions.push(
            myOwn.dialogUpload(
                ['table','upload'], 
                {
                    table:grid.def.name, 
                    prefilledFields:grid.connector.fixedFields,
                },
                function(result){
                    var message='';
                    if(result.uploaded){
                        if(result.uploaded.inserted==1){
                            message+=my.messages.oneRowInserted;
                        }else if(result.uploaded.inserted>1){
                            message+=my.messages.xRowsInserted.replace('{$x}',result.uploaded.inserted);;
                        }
                        if(result.uploaded.updated==1){
                            message+=my.messages.oneRowUpdated;
                        }else if(result.uploaded.updated>1){
                            message+=my.messages.xRowsUpdated.replace('{$x}',result.uploaded.updated);;
                        }
                        return message;
                    }
                    return result.message || '';
                },
                showWithMiniMenu,
                messages,
                grid
            )
        );
    }
    if(grid.def.allow.delete || grid.def.allow.deleteAll){
        menuOptions.push({img:my.path.img+'delete-all-rows.png', value:true, label:my.messages.deleteAllRecords, doneFun:function(){
            return confirmPromise(my.messages.confirmDeleteAll+(
                grid.depotsToDisplay.length<grid.depots.length?my.messages.xOverTWillDelete:(
                    grid.connector.fixedFields.length?my.messages.allGWillDelete:my.messages.allTWillDelete
                )
            ).replace('{$x}',grid.depotsToDisplay.length).replace('{$t}',grid.depots.length)
            ).then(function(){
                return my.ajax.table['delete-many-records']({
                    table:grid.def.name,
                    rowsToDelete:grid.depotsToDisplay.map(function(depot){
                        return depot.row;
                    }),
                    expectedRemainCount:grid.depots.length-grid.depotsToDisplay.length
                }).then(function(message){
                    return Promise.all([
                        grid.refresh(),
                        alertPromise((
                            message.record_count?my.messages.recordsReimaining:my.messages.allRecordsDeleted
                        ).replace('{$r}',message.remaining_record_count))
                    ]);
                });
            });
        }});
    }
    var urlFilteredCompleteTable='menu?w=table&table='+grid.def.name+'&fc='+JSON.stringify(
        grid.connector.fixedFields.map(function(ff){
            return {column:ff.fieldName, operator:'=', value:ff.value};
        })
    );
    menuOptions.push({
        img:my.path.img+'filtered-complete-table.png', 
        label:my.messages.filteredCompleteTable, 
        href:urlFilteredCompleteTable,
        showPage:my.showPage,
    });
    button.onclick=function(){
        miniMenuPromise(menuOptions,{
            underElement:button,
            withCloseButton:false,
        });
    };
};

myOwn.INCLUDE_LOOKUP_COLUMNS_IN_TXT_EXPORT=true;

myOwn.dialogDownload = function dialogDownload(grid){
    return dialogPromise(function(dialogWindow, closeWindow){
        var id1=my.getUniqueDomId();
        var id2=my.getUniqueDomId();
        var downloadElement=html.a({class:'export-a'},my.messages.download).create();
        var downloadElementText=html.a({class:'export-a'},my.messages.download+" txt").create();
        var mainDiv=html.div({class:'dialog-export',"current-state":"preparing"}, [
            html.div({class:'dialog-preparing'}, my.messages.preparingForExport),
            html.div([
                html.span(my.messages.format),
               // html.input({type:'radio', id:id1, name:'format', checked:true }), html.label({"for": id1}, '.txt'),
                html.input({class:'export-radio',type:'radio', id:id2, name:'format', checked:true}), html.label({"for": id2}, '.xlsx'),
            ]),
            html.img({
                class:['img-preparing', 'state-preparing'], 
                src:'img/preparing.png', 
                alt:my.messages.preparingForExport, 
                title:my.messages.preparingForExport, }),
            html.div({class:'state-ready'}, [downloadElement]),
            html.div({class:'state-ready-txt'}, [downloadElementText]),
            html.div('.')
        ]).create();
        dialogWindow.appendChild(mainDiv);
        var txtToDownload;
        var otherFieldsTabColumn = [];
        setTimeout(function(){
            var txtToDownload=grid.def.fields.map(function(fieldDef){
                if(!fieldDef.inTable && !my.INCLUDE_LOOKUP_COLUMNS_IN_TXT_EXPORT) return '';
                if(fieldDef.defaultForOtherFields){
                    var textArray=[];
                    grid.def.otherFields.forEach(function(otherField, index){
                        textArray.push(otherField[grid.def.registerImports.fieldNames.fieldName]);
                        otherFieldsTabColumn[otherField[grid.def.registerImports.fieldNames.fieldName]] = index;
                    });
                    return textArray.join('|');
                }else{
                    return fieldDef.name;
                }
            }).join('|')+'\r\n'+
            grid.depotsToDisplay.map(function(depot){
                return grid.def.fields.map(function(fieldDef){
                    if(!fieldDef.inTable && !my.INCLUDE_LOOKUP_COLUMNS_IN_TXT_EXPORT) return '';
                    var value=depot.row[fieldDef.name];
                    var type=fieldDef.typeName;
                    if(fieldDef.defaultForOtherFields){
                        var textArrayInitialization = Array.apply(null, Array(grid.def.otherFields.length)).map(function () {return "";});
                        var otherFields = JSON.parse(value) || [];
                        var textArray = textArrayInitialization;
                        otherFields.forEach(function(otherField){
                            textArray[otherFieldsTabColumn[otherField.name]] = otherField.value;
                        });
                        return textArray.join('|');
                    }else{
                        return value!=null?typeStore.typerFrom(fieldDef).toPlainString(value):'';
                    }
                }).join('|');
            }).join('\r\n')+'\r\n';
            mainDiv.setAttribute("current-state-txt", "ready");
            var blob = new Blob([txtToDownload], {type: 'text/plain'});
            var url = URL.createObjectURL(blob); 
            downloadElementText.href=url;
            downloadElementText.setAttribute("download", grid.def.name+".tab");
        },10);
        var otherFieldsExcelColumns = [];
        var populateTableXLS = function populateTableXLS(ws, depots, fieldDefs, topRow, leftColumn){
            topRow=topRow||0;
            leftColumn=leftColumn||0;
            fieldDefs.forEach(function(field,iColumn){
                if(field.defaultForOtherFields){
                    grid.def.otherFields.forEach(function(otherField){
                        otherFieldsExcelColumns[otherField[grid.def.registerImports.fieldNames.fieldName]] = iColumn+leftColumn;
                        ws[XLSX.utils.encode_cell({c:iColumn+leftColumn,r:topRow})]={t:'s',v:otherField[grid.def.registerImports.fieldNames.fieldName], s:{ font: {bold:true, underline:true}, alignment:{horizontal:'center'}}};
                        iColumn++;
                    });
                }else{
                    ws[XLSX.utils.encode_cell({c:iColumn+leftColumn,r:topRow})]={t:'s',v:field.name, s:{ font: {bold:true, underline:true}, alignment:{horizontal:'center'}}};
                }
            });
            depots.forEach(function(depot, iRow){
                var addCell = function addCell(value, fieldDef, iColumn){
                    if(value!=null){
                        var excelValue=typeStore.typerFrom(fieldDef).toExcelValue(value);
                        var valueType=typeStore.typerFrom(fieldDef).toExcelType(value);
                        var cell={t:valueType,v:excelValue};
                        if(fieldDef.typeName == 'interval'){
                            cell.z='[h]:mm:ss'
                        }
                        if(fieldDef.isPk){
                            cell.s={font:{bold:true}};
                        }else if(!fieldDef.allow || !fieldDef.allow.update){
                            cell.s={font:{color:{ rgb: "88AA00" }}};
                        }
                        ws[XLSX.utils.encode_cell({c:iColumn+leftColumn,r:iRow+1+topRow})]=cell;
                    }
                }
                fieldDefs.forEach(function(fieldDef, iColumn){
                    var value=depot.row[fieldDef.name];
                    if(fieldDef.defaultForOtherFields){
                        var otherFields = JSON.parse(value) || [];
                        otherFields.forEach(function(otherField){
                            addCell(otherField.value, fieldDef, otherFieldsExcelColumns[otherField.name]);
                        });
                    }else{
                        addCell(value, fieldDef, iColumn);
                    }
                });
            });
            ws["!ref"]="A1:"+XLSX.utils.encode_cell({c:fieldDefs.length||iColumn+leftColumn + grid.def.otherFields.length,r:grid.depotsToDisplay.length+topRow});
        }
        setTimeout(function(){
            var wb = new Workbook();
            var ws = {};
            var exportFileInformationWs={};
            var i=0;
            exportFileInformationWs[XLSX.utils.encode_cell({c:0,r:++i})]={t:'s',v:'table',s:{ font: {bold:true, underline:true}, alignment:{horizontal:'center'}}};
            exportFileInformationWs[XLSX.utils.encode_cell({c:1,r:  i})]={t:'s',v:grid.def.name};
            exportFileInformationWs[XLSX.utils.encode_cell({c:0,r:++i})]={t:'s',v:'date',s:{ font: {bold:true, underline:true}, alignment:{horizontal:'center'}}};
            exportFileInformationWs[XLSX.utils.encode_cell({c:1,r:  i})]={t:'s',v:new Date().toISOString()};
            exportFileInformationWs[XLSX.utils.encode_cell({c:0,r:++i})]={t:'s',v:'user',s:{ font: {bold:true, underline:true}, alignment:{horizontal:'center'}}};
            exportFileInformationWs[XLSX.utils.encode_cell({c:1,r:  i})]={t:'s',v:my.config.username};
            // grid.def.allow.forEach(function(action,iAction){
            //     exportFileInformationWs[XLSX.utils.encode_cell({c:iAction,r:2})]={t:'s',v:action};
            // })
            if(grid.def.exportMetadata){
                if(grid.def.exportMetadata.fieldProperties){
                    var fieldPropertiesDefs=grid.def.exportMetadata.fieldProperties.map(function(propName, i){
                        return {name:propName, typeName:'text', isPk:!i};
                    });
                    var fieldPropertiesDepot=grid.def.fields.filter(function(fieldDef){
                        return coalesce(fieldDef.exportMetadata,grid.def.exportMetadata.exportAnyField,true);
                    }).map(function(fieldDef){
                        return {row:fieldDef};
                    });
                    populateTableXLS(exportFileInformationWs, fieldPropertiesDepot,fieldPropertiesDefs,i+1,1);
                }
            }
            populateTableXLS(ws, grid.depotsToDisplay, grid.def.fields);
            var sheet1name=grid.def.name;
            var sheet2name=grid.def.name!=="metadata"?"metadata":"meta-data";
            wb.SheetNames=[sheet1name,sheet2name];
            wb.Sheets[sheet1name]=ws;
            exportFileInformationWs["!ref"]="A1:F100";
            wb.Sheets[sheet2name]=exportFileInformationWs;
            var wbFile = XLSX.write(wb, {bookType:'xlsx', bookSST:false, type: 'binary'});
            var blob = new Blob([s2ab(wbFile)],{type:"application/octet-stream"});
            mainDiv.setAttribute("current-state", "ready");
            var url = URL.createObjectURL(blob); 
            downloadElement.href=url;
            downloadElement.setAttribute("download", grid.def.name+".xlsx");
        },10);
    });
};

myOwn.dialogUpload = function dialogUpload(ajaxPath, ajaxParams, ajaxPrepareResultFun, showWithMiniMenu, messages, refresheable, acceptPhotos){
    var doneFun = function doneFun(){
        var fileAttr={class:'import-button',type:'file',style:'min-width:400px'};
        if(acceptPhotos){
            fileAttr.accept='image/*';
        }
        var buttonFile=html.input(fileAttr).create();
        var buttonConfirmImport=html.input({class:'import-button',type:'button', value:changing(my.messages, messages).import}).create();
        var laodingIndicator=html.div({class:'indicator'},' ').create();
        var loadingBar=html.div({class:'progress-bar', style:'width:400px; height:8px;'},[laodingIndicator]).create();
        var divProgress=html.div({class:'result-progress', style:'width:400px; height:20px; margin:0px;'}).create();
        var progressIndicator=html.div({class:'indicator'},' ').create();
        var progressBar=html.div({class:'progress-bar', style:'width:400px; height:8px;'},[progressIndicator]).create();
        var displayProgressBar = function displayProgressBar(progress, progressIndicator){
            if(progress.loaded){
                if(progress.lengthComputable){
                    progressIndicator.style.width=progress.loaded*100/progress.total+'%';
                    progressIndicator.title=Math.round(progress.loaded*100/progress.total)+'%';
                }else{
                    progressIndicator.style.backgroundColor='#D4D';
                    progressIndicator.title='N/D %';
                }
            }
            if(progress.message){
                divProgress.textContent=progress.message;
            }
        }
        var uploadingProgress=function(progress){
            displayProgressBar(progress, laodingIndicator);
        };
        var informProgress=function(progress){
            displayProgressBar(progress, progressIndicator);
        };
        buttonConfirmImport.addEventListener('click', function(){
            var files = buttonFile.files;
            buttonConfirmImport.value=my.messages.loading+'...';
            buttonConfirmImport.disabled=true;
            var eButton=function(result){
                buttonConfirmImport.disabled=false;
                if(result instanceof Error){
                    throw result;
                }
                return result;
            }
            bestGlobals.sleep(100).then(function(){
                return my.ajax[ajaxPath[0]][ajaxPath[1]](changing(ajaxParams, {
                    files:files
                }),{uploading:uploadingProgress, informProgress:informProgress}).then(eButton,eButton);
            }).then(ajaxPrepareResultFun).then(this.dialogPromiseDone,this.dialogPromiseDone);
        });
        simpleFormPromise({elementsList:[
            changing(my.messages, messages).importDataFromFile,
            buttonFile, 
            html.br().create(),
            buttonConfirmImport,
            html.br().create(),
            loadingBar,
            divProgress,
            progressBar,
        ]}).then(function(message){
            return Promise.all([
                refresheable && refresheable.refresh(),
                alertPromise(message)
            ]);
        },function(err){
            return Promise.all([
                refresheable && refresheable.refresh(),
                my.alertError(err)
            ]);
        });
    }
    if(showWithMiniMenu){
        return {img:my.path.img+'import.png', value:true, label:my.messages.import, doneFun: doneFun};
    }else{
        doneFun();
    }
};

myOwn.TableAggregates={}
myOwn.TableAggregates.avg=function(){
    this.n=0;
    this.sum=new Big(0);
};
myOwn.TableAggregates.avg.prototype.acum=function acum(value){
    if(value!=null){
        this.n++;
        this.sum = this.sum.plus(value);
    }
}
myOwn.TableAggregates.avg.prototype.result=function result(){
    if(!this.n) return null;
    return this.sum.div(this.n);
}
myOwn.TableAggregates.sum = function(){
    myOwn.TableAggregates.avg.call(this);
}
myOwn.TableAggregates.sum.prototype = Object.create(myOwn.TableAggregates.avg.prototype);
myOwn.TableAggregates.avg.prototype.result=function result(){
    return this.sum;
}

myOwn.TableGrid.prototype.refreshAggregates = function refreshAggregates(){
    var grid = this;
    var my = grid.my;
    var aggData={};
    grid.def.fields.forEach(function(fieldDef){
        if(fieldDef.aggregate){
            aggData[fieldDef.name]=new myOwn.TableAggregates[fieldDef.aggregate]();
        }
    });
    grid.depots.forEach(function(depot){
        grid.def.fields.forEach(function(fieldDef){
            if(fieldDef.aggregate){
                aggData[fieldDef.name].acum(depot.row[fieldDef.name]);
            }
        })
    });
    grid.def.fields.forEach(function(fieldDef){
        if(fieldDef.aggregate && grid.dom.aggregate[fieldDef.name]){
            grid.dom.aggregate[fieldDef.name].setTypedValue(aggData[fieldDef.name].result());
        }
    })
};

myOwn.TableGrid.prototype.prepareGrid = function prepareGrid(){
    var grid = this;
    var my = grid.my;
    grid.view.hiddenColumns=grid.view.hiddenColumns||grid.def.hiddenColumns||[];
    grid.def.fields.forEach(function(fieldDef){
        if(!fieldDef.visible){
            grid.view.hiddenColumns.push(fieldDef.name);
        }
        if(fieldDef.aggregate){
            grid.modes.withAggregateRow=true;
        }
    });
    grid.hideColumnsViaCss();
    var buttonInsert;
    var buttonCreateFilter;
    var buttonCreateFilterAdd;
    var buttonDestroyFilter;
    var buttonOrientation;
    var buttonMenu;
    var getSaveModeImgSrc=function(){ return my.path.img+(grid.modes.saveByField?'tables-update-by-field.png':'tables-update-by-row.png');};
    var buttonSaveModeImg=html.img({src:getSaveModeImgSrc()}).create();
    var buttonSaveMode;
    if(grid.def.allow.update){
        buttonSaveMode=html.button({class:'table-button'}, [buttonSaveModeImg]).create();
        buttonSaveMode.addEventListener('click',function(){
            grid.modes.saveByField = !grid.modes.saveByField;
            buttonSaveModeImg.src=getSaveModeImgSrc();
        });
    }
    if(grid.def.allow.insert && !grid.def.forInsertOnlyMode){
        buttonInsert=html.button({class:'table-button', "enter-clicks":true}, [
            html.img({
                src:my.path.img+'insert.png',
                alt:'INS',
                title:my.messages.insertRecordAtBottom
            })
        ]).create();
        grid.dom.buttonInsert=buttonInsert;
        buttonInsert.addEventListener('click', function(){
            var tr=grid.createRowInsertElements();
        });
    }
    if(grid.def.allow.filter && !grid.def.forInsertOnlyMode){
        buttonCreateFilter=html.button({class:'table-button', 'when-filter':'no'}, [
            html.img({
                src:my.path.img+'filter.png',
                alt:'FILTER',
                title:my.messages.filter
            })
        ]).create();
        buttonCreateFilter.addEventListener('click', function(){
            grid.view.filter=[grid.createRowFilter(0,[])];
        });
        buttonCreateFilterAdd=html.button({class:'table-button', 'when-filter':'yes'}, [
            html.img({
                src:my.path.img+'filter-line-add.png',
                alt:'FIL',
                title:my.messages.filterAdd
            })
        ]).create();
        buttonCreateFilterAdd.addEventListener('click', function(){
            grid.view.filter.push(grid.createRowFilter(1,[]));
        });
        buttonDestroyFilter=html.button({class:'table-button', 'when-filter':'yes'}, [
            html.img({
                src:my.path.img+'destroy-filter.png',
                alt:'FILTER OFF',
                title:my.messages.filterOff
            })
        ]).create();
        buttonDestroyFilter.addEventListener('click', function(){
            grid.destroyRowFilter(0);
            grid.updateFilterInfo('');
            grid.view.filter=[];
            grid.displayBody();
        });
    }
    if(grid.def.allow.orientation){
        buttonOrientation=html.button({class:'table-button'}, [
            html.img({
                src:my.path.img+'orientation-toggle.png',
                alt:'CARD',
                title:my.messages.orientationToggle,
            })
        ]).create();
        buttonOrientation.addEventListener('click',function(){
            grid.vertical = !grid.vertical;
            grid.prepareGrid();
            grid.displayGrid();
            grid.dom.table.setAttribute("my-orientation",grid.vertical?'vertical':'horizontal');
        });
    }
    buttonMenu=html.button({class:'table-button'}, [
        html.img({
            src:my.path.img+'menu-dots.png',
        })
    ]).create();
    grid.prepareMenu(buttonMenu);
    grid.columns=[new my.ActionColumnGrid({
        grid:grid, 
        actions:[
            /*buttonInsert,*//*buttonSaveMode,*/buttonCreateFilter,buttonCreateFilterAdd,buttonDestroyFilter,
            buttonOrientation,
            buttonMenu,
        ],
        actionsBottom:[
            buttonInsert
        ]
    })].concat(
        grid.def.detailTables.map(function(detailTableDef){ return new my.DetailColumnGrid({grid:grid, detailTableDef:detailTableDef}); })
    ).concat(
        grid.def.fields.filter(function(fieldDef){return fieldDef.visible}).map(function(fieldDef){ return new my.DataColumnGrid({grid:grid, fieldDef:fieldDef}); })
    // ).concat(
    //     [new my.SpecialColumnGrid({class:"empty-right-column"})]
    );
    if(grid.modes.withColumnDetails==null){
        grid.modes.withColumnDetails=grid.def.fields.some(function(fieldDef){ 
            return fieldDef.label!=fieldDef.title; 
        });
    }
    if(grid.vertical){
        grid.modes.withColumnDetails=false;
    }
    var createInfoColumnStructure = function(elementInfo){
        [
            {name:'displayFrom', value:'0'},
            {name:'elipsis', value:' ... '},
            {name:'displayTo', value:'?'},
            {name:'filterApplied', value:''},
            {name:'rowCount', value:''}
        ].forEach(function(info, i_info){
            elementInfo[info.name] = html.span(info.value).create();
            elementInfo.appendChild(elementInfo[info.name]);
        });
        elementInfo.displayTo.textContent = my.messages.loading;    
    }
    grid.dom.headInfo = html.th({class: 'head-info', colspan:grid.columns.length-1, "is-processing":"1"}).create();
    createInfoColumnStructure(grid.dom.headInfo);
    grid.dom.footInfo = html.th({colspan:grid.columns.length, "is-processing":"1"}).create();
    createInfoColumnStructure(grid.dom.footInfo);
    grid.actualName = grid.def.name + (grid.connector.fixedFields.length ? '-' + JSON4all.stringify(grid.connector.fixedFields.map(function(pair){ return pair.value; })) : '')
    grid.dom.caption=html.caption({class: 'grid-caption'}, grid.def.title).create();
    if(grid.vertical){
        grid.dom.table = html.table({"class":"my-grid", "my-table": grid.actualName},[
            grid.dom.caption,
            html.tbody(
                grid.columns.map(function(column){ 
                    return html.tr([
                        column.th(),
                        grid.modes.withColumnDetails?html.tr(grid.columns.map(function(column){ return column.thDetail(); })):null
                    ]); 
                })
            ),
            html.tfoot([
                html.tr([html.th([buttonInsert]),grid.dom.footInfo])
            ])
        ]).create();
    }else{
        var footRows;
        if(grid.modes.withAggregateRow){
            footRows=[
                html.tr(grid.columns.map(function(column){ return column.thAgg(); })),
                html.tr([html.th({class: 'foot-info-empty-col'}),grid.dom.footInfo])
            ];
        }else{
            footRows=[html.tr([html.th({class: 'foot-info-insert-col'}, [buttonInsert]),grid.dom.footInfo])];
        }
        grid.dom.table = html.table({"class":"my-grid", "my-table": grid.actualName},[
            grid.dom.caption,
            html.thead([
                html.tr({class: 'head-info-row'}, [html.th({class: 'head-info-empty-col'}),grid.dom.headInfo]),
                html.tr(grid.columns.map(function(column){ return column.th(); })),
                grid.modes.withColumnDetails?html.tr(grid.columns.map(function(column){ return column.thDetail(); })):null,
            ]),
            html.tbody(),
            html.tfoot(footRows)
                // [html.tr([html.th([buttonInsert]),grid.dom.footInfo])]
        ]).create();
    }
    grid.dom.main.innerHTML='';
    grid.dom.main.appendChild(grid.dom.table);
};

myOwn.specialDefaultValue={
    current_date:function(){ return myOwn.config.currentDate||bestGlobals.date.today(); }
}

myOwn.TableGrid.prototype.createRowInsertElements = function createRowInsertElements(aboveDepot){
    var grid = this;
    var position;
    if(grid.vertical){
        position=1;
    }else{
        if(aboveDepot){
            var aboveTr = aboveDepot.tr;
            position = ('sectionRowIndex' in aboveTr?
                aboveTr.sectionRowIndex:
                aboveTr.rowIndex-grid.dom.table.tHead.rows.length
            );
        }else{
            position = grid.dom.table.tBodies[0].rows.length;
        }
        /*
        while(
            position<grid.dom.table.tBodies[0].rows.length && 
            grid.dom.table.tBodies[0].rows[position].isDetail
        ){
            position++;
        }
        */
    }
    var depotForInsert = grid.createDepotFromRow({}, 'new');
    grid.connector.fixedFields.forEach(function(pair){
        if(!pair.range){
            depotForInsert.row[pair.fieldName] = pair.value;
            depotForInsert.rowPendingForUpdate[pair.fieldName] = pair.value;
        }
    });
    grid.def.fields.forEach(function(fieldDef){
        var value=null;
        if('defaultValue' in fieldDef){
            value=fieldDef.defaultValue;
        }
        if('specialDefaultValue' in fieldDef){
            //********************* REVISAR PORQUE ESTABA LA LÍNEA COMENTADA*************
            //value=my.specialDefaultValue[fieldDef.specialDefaultValue](fieldDef.name, depot);
            value=my.specialDefaultValue[fieldDef.specialDefaultValue](fieldDef.name, aboveDepot);
        }
        if(value!==null){
            depotForInsert.row[fieldDef.name] = value;
            depotForInsert.rowPendingForUpdate[fieldDef.name] = value;
        }
    });
    //TODO: mejorar la posición dentro del splice o concluir que no sirve el splice
    grid.depots.splice(Math.min(grid.depots.length,Math.max(0,position)),0,depotForInsert);
    var newRow = grid.createRowElements(position, depotForInsert);
    grid.updateRowData(depotForInsert,true);
    return newRow;
};
myOwn.TableGrid.prototype.updateTotals = function updateTotals(displayFromContent, displayToContent){
    this.dom.headInfo.displayFrom.textContent = displayFromContent;
    this.dom.headInfo.displayTo.textContent = displayToContent;
    this.dom.footInfo.displayFrom.textContent = displayFromContent;
    this.dom.footInfo.displayTo.textContent = displayToContent;
};
myOwn.TableGrid.prototype.updateFilterInfo = function updateFilterInfo(filterAppliedContent){
    this.dom.headInfo.filterApplied.textContent = filterAppliedContent;
    this.dom.footInfo.filterApplied.textContent = filterAppliedContent;
};
myOwn.TableGrid.prototype.updateRowCountHTML = function updateRowCountHTML(HTML){
    this.dom.headInfo.rowCount.innerHTML=HTML;
    this.dom.footInfo.rowCount.innerHTML=HTML;
};
myOwn.TableGrid.prototype.displayGrid = function displayGrid(){
    var grid = this;
    var tbody = grid.dom.table.tBodies[0];
    grid.updateRowData = function updateRowData(depot, skipUpdateStatus){
        var grid = this;
        var forInsert = false; // not define how to detect
        var tr = depot;
        grid.setRowStyle(depot,depot.row, skipUpdateStatus);
        grid.def.fields.filter(function(fieldDef){
            return fieldDef.visible;
        }).forEach(function(fieldDef){
            var td = depot.rowControls[fieldDef.name];
            var editable=grid.connector.def.allow.update && !grid.connector.fixedField[fieldDef.name] && (forInsert?fieldDef.allow.insert:fieldDef.allow.update && grid.connector.def.field[fieldDef.name].allow.update);
            td.disable(!editable);
            if(fieldDef.clientSide){
                if(!td.clientSidePrepared){
                    grid.my.clientSides[fieldDef.clientSide].prepare(depot, fieldDef.name);
                    td.clientSidePrepared=true;
                }
                if(grid.my.clientSides[fieldDef.clientSide].update===true){
                    td.setTypedValue(depot.row[fieldDef.name]);
                }else if(grid.my.clientSides[fieldDef.clientSide].update){
                    grid.my.clientSides[fieldDef.clientSide].update(depot, fieldDef.name);
                }
            }else if(!skipUpdateStatus){
                var newValue=coalesce(depot.row[fieldDef.name],null);
                if(!sameValue(newValue,td.getTypedValue())){
                    td.setTypedValue(newValue);
                }
            }
        });
    };
    var changeIoStatus = function changeIoStatus(depot,newStatus, objectWithFieldsOrListOfFieldNames, title){
        var fieldNames=typeof objectWithFieldsOrListOfFieldNames === "string"?[objectWithFieldsOrListOfFieldNames]:(
            objectWithFieldsOrListOfFieldNames instanceof Array?objectWithFieldsOrListOfFieldNames:Object.keys(objectWithFieldsOrListOfFieldNames)
        );
        fieldNames.forEach(function(name){ 
            if(depot.rowControls[name]){
                var td=depot.rowControls[name];
                td.setAttribute('io-status', newStatus); 
                if(title){
                    td.title=title;
                }else{
                    td.title='';
                }
            }
        });
    };
    var saveRow = function(depot, opts){
        if(!('saving' in depot)){
            depot.saving = Promise.resolve();
        }
        changeIoStatus(depot,'updating',depot.rowPendingForUpdate);
        depot.saving = depot.saving.then(function(){
            if(!Object.keys(depot.rowPendingForUpdate).length){
                return Promise.resolve();
            }
            if(depot.status==='new'){
                var specialMandatories=grid.def.specialValidator?myOwn.validators[grid.def.specialValidator].getMandatoryMap(depot.row):{};
                var mandatoryOmitted=function(fieldDef){
                    return (specialMandatories[fieldDef.name] || fieldDef.nullable!==true && fieldDef.isPk || fieldDef.nullable===false) 
                        && depot.row[fieldDef.name]==null 
                        && (grid.connector.fixedFields.find(function(pair){
                                return !pair.range && pair.fieldName===fieldDef.name
                            })||{}).value == null
                }
                //var cual=grid.def.fields.filter(mandatoryOmitted)
                if(grid.def.fields.some(mandatoryOmitted)){
                    return Promise.resolve(); // no grabo todavía
                };
            }
            return grid.connector.saveRecord(depot, opts).then(function(result){
                grid.depotRefresh(depot,result);
            }).catch(function(err){
                changeIoStatus(depot,'error',depot.rowPendingForUpdate,err.message);
            });
        });
    };
    grid.retrieveRowAndRefresh = function retrieveRowAndRefresh(depot){
        // var sendedForUpdate = depot.my.cloneRow(depot.rowPendingForUpdate);
        return my.ajax.table.data({
            table:depot.def.name,
            fixedFields:grid.def.primaryKey.map(function(fieldName, i){ 
                return {fieldName:fieldName, value:depot.primaryKeyValues[i]};
            })
        }).then(function(result){
            grid.depotRefresh(depot,{updatedRow:result[0], sendedForUpdate:{}});
        })
    }
    grid.setRowStyle = function setRowStyle(depot, row, skipUpdateStatus){
        if(!skipUpdateStatus){
            depot.status = 'loaded';
            depot.primaryKeyValues = grid.def.primaryKey.map(function(fieldName){ 
                return depot.row[fieldName]; 
            });
            depot.tr.setAttribute('pk-values',JSON.stringify(depot.primaryKeyValues));
            grid.def.layout.styleColumns.forEach(function(fieldName){ 
                depot.tr.setAttribute('column-'+fieldName,JSON.stringify(depot.row[fieldName]));
            });
        }
        if(row.$dirty){
            var tdActions = depot.tr.querySelector('.grid-th-actions');
            tdActions.style.backgroundImage='url('+my.path.img+'/not-sync.png)'
            tdActions.style.backgroundSize='contain'
            tdActions.style.backgroundRepeat='no-repeat'
        }
    }
    grid.depotRefresh = function depotRefresh(depot,result){
        // ¡ATENCIÓN!: esta función no debe despleegar, llama a updateRowData, ahí se despliega
        upadteNumberOfRows(depot,grid);
        var retrievedRow = result.updatedRow;
        for(var fieldName in retrievedRow){
            if(!/^\$/.test(fieldName)){
                if(!grid.def.field[fieldName].clientSide){
                    if(depot.rowControls[fieldName]){
                        var value = depot.rowControls[fieldName].getTypedValue();
                        if(!sameValue(depot.row[fieldName], value)){
                            if(grid.def.field[fieldName].allow.update){
                                depot.rowPendingForUpdate[fieldName] = value;
                            }
                            depot.row[fieldName] = value;
                        }
                    }
                }
                if(fieldName in depot.rowPendingForUpdate){
                    var source = fieldName in result.sendedForUpdate?result.sendedForUpdate:depot.retrievedRow;
                    if(sameValue(depot.rowPendingForUpdate[fieldName], retrievedRow[fieldName])){
                        // ok, lo que viene coincide con lo pendiente
                        delete depot.rowPendingForUpdate[fieldName];
                        changeIoStatus(depot,'temporal-ok', fieldName);
                        /*jshint loopfunc: true */
                        setTimeout(function(fieldName){
                            changeIoStatus(depot,'ok', fieldName);
                        },3000,fieldName);
                        /*jshint loopfunc: false */
                    }else if(sameValue(retrievedRow[fieldName], source[fieldName])){
                        // ok, si bien lo que viene no coincide con lo pendiente que sigue pendiente, 
                        // sí coincide con lo que estaba antes de mandar a grabar, 
                        // entonces no hay conflicto el usuario sabe sobre qué está modificando
                    }else{
                        // no coincide con lo pendiente ni con lo anterior, 
                        // hay un conflicto con el conocimiento del usuario que modificó algo que estaba en otro estado
                        changeIoStatus(depot,'write-read-conflict', 
                            fieldName, 
                            myOwn.messages.anotherUserChangedTheRow+'. \n'+
                            myOwn.messages.oldValue+': '+source[fieldName]+(
                                whenMergeOverride?'':'\n'+myOwn.messages.actualValueInDB+': '+retrievedRow[fieldName]
                            )
                            // TODO: sería bueno agregar algúna opción de UNDO!
                        );
                        if(whenMergeOverride){
                            depot.row[fieldName] = retrievedRow[fieldName];
                            if(depot.rowControls[fieldName]){
                                depot.rowControls[fieldName].setTypedValue(retrievedRow[fieldName]);
                            }
                            delete depot.rowPendingForUpdate[fieldName];
                        }
                    }
                }else{
                    if(!sameValue(retrievedRow[fieldName], depot.row[fieldName])){
                        depot.row[fieldName] = retrievedRow[fieldName];
                        if(depot.rowControls[fieldName]){
                            changeIoStatus(depot,'background-change', fieldName);
                            depot.rowControls[fieldName].setTypedValue(retrievedRow[fieldName]);
                            /*jshint loopfunc: true */
                            setTimeout(function(fieldName){
                                changeIoStatus(depot,'ok', fieldName);
                            },3000,fieldName);
                            /*jshint loopfunc: false */
                        }
                    }
                }
            }
        }
        depot.retrievedRow = retrievedRow;
        grid.updateRowData(depot);
        depot.tr.dispatchEvent(new CustomEvent('savedRowOk'));
        grid.dom.main.dispatchEvent(new CustomEvent('savedRowOk'));
        grid.refreshAggregates();
    }
    grid.createExtraRow = function createExtraRow(depot, tbody){
        var tr = html.tr({class:'extra-row'}, [html.td().create()]).create();
        depot.extraRows.push(tr);
        tbody.appendChild(tr);
    }
    grid.createRowElements = function createRowElements(iRow, depot){
        var grid = this;
        var forInsert = iRow>=0;
        var tr={};
        depot.colNumber = null;
        if(grid.vertical){
            tr=grid.dom.table.rows[0];
            depot.colNumber = grid.dom.table.rows[0].childNodes.length;
        }else{
            tr = grid.my.insertRow({section:tbody, iRow:iRow, smooth:depot.status==='new'?{ 
                colCount:grid.def.detailTables.length + grid.def.fields.length
            }:false});
        }
        depot.tr = tr;
        depot.extraRows=[];
        grid.columns.filter(function(column){
            return column.fieldDef?column.fieldDef.visible:true
        }).forEach(function(column, iColumn){
            tr.appendChild(column.td(depot, iColumn, tr, saveRow));
            if(grid.vertical){ 
                tr = tr.nextSibling;
            }
        });
        if(!grid.vertical){ 
            tr.addEventListener('focusout', function(event){
                if(event.target.parentNode != (event.relatedTarget||{}).parentNode ){
                    depot.connector.deleteEnter(depot).then(function(result){
                    });
                    if(Object.keys(depot.rowPendingForUpdate).length){
                        saveRow(depot);
                    }
                }
            });
            tr.addEventListener('focusin',function(event){
                if(event.target.parentNode != (event.relatedTarget||{}).parentNode ){
                    return depot.connector.enterRecord(depot).then(function(result){
                    });
                }
            });
        }
        if(grid.def.layout.extraRows > 0){
            for(var i = 0; i < grid.def.layout.extraRows; i++){
                grid.createExtraRow(depot, tbody);
            }
        }
        if(iRow===-1){
            depot.detailRows.forEach(function(detailTr){
                var detailControl = depot.detailControls[detailTr.detailTableNameAndAbr];
                detailControl.tr = detailTr;
                if(detailControl.show){
                    tbody.appendChild(detailTr);
                    detailControl.img.src=my.path.img+'detail-contract.png';
                    detailControl.img.title=my.messages.lessDetails;
                }else{
                    detailControl.img.src=my.path.img+'detail-expand.png';
                    detailControl.img.title=my.messages.details;
                }
            });
        }
        grid.updateTotals(grid.depots.length?1:0, grid.depots.length);
        return depot;
    };
    grid.destroyRowFilter = function destroyRowFilter(){
        (grid.hasFilterRow||[]).forEach(function(tr){
            grid.dom.table.setAttribute('has-filter',0);
            grid.dom.table.tHead.removeChild(tr);
        });
        delete grid.hasFilterRow;
    };
    grid.dom.table.setAttribute('has-filter',0);
    grid.createRowFilter = function createRowFilter(otherRow, filterColumns){
        var grid = this;
        if(!otherRow && grid.hasFilterRow){
            // return true;
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
        if(!grid.hasFilterRow){
            grid.hasFilterRow=[];
        }
        if(filterColumns){
            filterColumns.forEach(function(filterColumn){
                depot.row[filterColumn.column]=filterColumn.value;
                depot.rowSymbols[filterColumn.column]=filterColumn.operator;
            });
        }
        var tr=html.tr({'class':'filter-line'}, grid.columns.map(function(column, iColumn){
            return column.thFilter(depot, iColumn);
        }).filter(function(th,iColumn){
           return iColumn || !grid.hasFilterRow.length;
        })).create();
        grid.hasFilterRow.push(tr);
        grid.hasFilterRow[0].cells[0].rowSpan=grid.hasFilterRow.length;
        grid.dom.table.setAttribute('has-filter',1);
        if(grid.dom.table.tHead){ //TODO: el filtro para verticales debe organizarse sin tr
            grid.dom.table.tHead.appendChild(tr);
        }
        return depot;
    };
    grid.displayBody=function displayBody(){
        var grid = this;
        var depotsToDisplay;
        var filterRows = grid.view.filter;
        if(filterRows && filterRows.length){
            depotsToDisplay = grid.depots.filter(function(depot,i){
                var iFilter=0;
                while(iFilter<filterRows.length){
                    var filterData=filterRows[iFilter];
                    var partialOk=true;
                    for(var column in depot.row){
                        if(filterData.rowSymbols[column] && my.comparator[filterData.rowSymbols[column]]){
                            var isSatisfied=my.comparator[filterData.rowSymbols[column]](depot.row[column],filterData.row[column]);
                            if(!isSatisfied){
                                partialOk=false;
                            }
                        }
                    }
                    if(partialOk){
                        return true;
                    }
                    iFilter++;
                }
                return false;
            });
        }else{
            depotsToDisplay = grid.depots;
        }
        if(grid.view.sortColumns.length>0){
            depotsToDisplay.sort(function(depot1, depot2){ 
                return bestGlobals.compareForOrder(grid.view.sortColumns)(depot1.row, depot2.row);
            });
        }
        grid.displayRows = function displayRows(fromRowNumber, toRowNumber, adding){
            var grid = this;
            if(!adding){
                if(grid.vertical){
                    // recorrer todos los tr del tbody y dejar solo las primeras columnas?
                    Array.prototype.forEach.call(tbody.rows,function(tr){
                        var howManyCellsMayNotBeDeleted=1;
                        while(tr.cells.length>howManyCellsMayNotBeDeleted){
                            tr.removeChild(tr.cells[howManyCellsMayNotBeDeleted]);
                        }
                    });
                }else{
                    tbody.innerHTML='';
                }
            }
            /*jshint loopfunc: true */
            for(var iRow=fromRowNumber; iRow<toRowNumber; iRow++){
                (function(depot){
                    var tr=grid.createRowElements(-1, depot);
                    grid.updateRowData(depot);
                })(depotsToDisplay[iRow]);
            }
            /*jshint loopfunc: false */
            grid.updateTotals(depotsToDisplay.length?1:0, iRow);
            grid.updateRowCountHTML('');
            if(iRow<depotsToDisplay.length){
                var addButtonRest = function addButtonRest(toNextRowNumber){
                    var createRestButtonInto = function(domElement){
                        var buttonRest=html.button({class:'foot-info', "enter-clicks":true},"+..."+toNextRowNumber).create();
                        domElement.appendChild(html.span('  ').create());
                        domElement.appendChild(buttonRest);
                        return buttonRest;
                    }
                    var buttonRestClickFun = function(withFocus){
                        grid.displayRows(iRow, toNextRowNumber, true);
                        if(withFocus){
                            my.focusFirstColumnOf(grid.dom.table.tBodies[0].rows[iRow]);
                        }
                    };
                    var buttonRestHead = createRestButtonInto(grid.dom.headInfo.rowCount);
                    var buttonRestFoot = createRestButtonInto(grid.dom.footInfo.rowCount);
                    buttonRestHead.addEventListener('click', buttonRestClickFun.bind(this, false));
                    buttonRestFoot.addEventListener('click', buttonRestClickFun.bind(this, true));
                };
                my.displayCountBreaks.forEach(function(size, iSize){
                    var cut=(iRow+size) - (iRow+size) % size;
                    if(cut*5<=depotsToDisplay.length*3 && (iSize==my.displayCountBreaks.length-1 || cut*5<=my.displayCountBreaks[iSize+1]*3)){
                        addButtonRest(cut);
                    }
                });
                addButtonRest(depotsToDisplay.length);
                if(grid.dom.buttonInsert){
                    grid.dom.buttonInsert.style.visibility='hidden';
                }
            }else{
                if(grid.dom.buttonInsert){
                    grid.dom.buttonInsert.style.visibility='visible';
                }
            }
        };
        var linesToDisplay=(
            depotsToDisplay.length<=(grid.def.firstDisplayOverLimit||myOwn.firstDisplayOverLimit)?
            depotsToDisplay.length:
            (grid.def.firstDisplayCount||my.firstDisplayCount)
        );
        grid.depotsToDisplay=depotsToDisplay;
        grid.displayRows(0, linesToDisplay);
    };
    if(grid.def.filterColumns.length){
        var filterRows=grid.def.filterColumns[0] instanceof Array?grid.def.filterColumns:[grid.def.filterColumns];
        grid.view.filter=[];
        filterRows.forEach(function(filterColumns,iRow){
            grid.view.filter.push(grid.createRowFilter(iRow,filterColumns));
        });
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
    if(grid.vertical){
        var compareColNumberFun = function compareColNumberFun(a, b) {
            var colNumberA = a.colNumber;
            var colNumberB = b.colNumber;
            return(colNumberA > colNumberB)?1:((colNumberA < colNumberB)?-1:0)
        }
        var i = 0;
        Array.prototype.forEach.call(grid.dom.table.rows,function(tr){
            if(i < grid.dom.table.rows.length-1 && tr.childNodes[depot.colNumber]){
                depot.my.fade(tr.childNodes[depot.colNumber]);
            }
            i++;
        });
        var depots = grid.depots.sort(compareColNumberFun);
        for(var j = depot.colNumber; j <= depots.length; j++){
            depots[j-1].colNumber = j;
        }
    }else{
        depot.my.fade(depot.tr);
        for(var detailControl in depot.detailControls){
            if(depot.detailControls[detailControl].tr){
                depot.my.fade(depot.detailControls[detailControl].tr);
            }
        };
    }
    grid.updateTotals(grid.depots.length?1:0, grid.depots.length);
};

myOwn.confirmDelete=function confirmDelete(depot, opts){
    return depot.my.showQuestion(
        depot.my.messages.Delete+' '+JSON.stringify(depot.primaryKeyValues)+' ?', 
        {askForNoRepeat:depot.my.messages.Delete+', '+depot.def.name}
    );
}

myOwn.tableAction={
    "insert":{
        img: myOwn.path.img+'insert.png',
        alt: "INS",
        titleMsg: 'insertAbove',
        actionRow: function(depot){
            return depot.manager.createRowInsertElements(depot);
        }
    },
    "delete":{
        img: myOwn.path.img+'delete.png',
        alt: "DEL",
        titleMsg: 'deleteRecord',
        actionRow: function(depot, opts){
            return depot.my.confirmDelete(depot, opts).then(function(result){
                if(result){
                    return depot.connector.deleteRecord(depot, changing({reject:false},opts)).then(function(){
                        depot.manager.displayAsDeleted(depot);
                        depot.manager.refreshAggregates();
                    }).catch(depot.my.alertError);
                }
            });
        }
    },
    "vertical-edit":{
        img: myOwn.path.img+'vertical-edit.png',
        alt: "CARD",
        titleMsg: 'verticalEdit',
        actionRow: function(depot){
            var grid = depot.manager;
            if(grid.vertical){
                grid.vertical = false;
                if(grid.allDepots){
                    grid.depots = grid.allDepots;
                }
                grid.prepareGrid();
                grid.displayGrid();
            }else{
                grid.allDepots = grid.depots;
                grid.depots = [depot];
                grid.vertical = true;
                grid.prepareGrid();
                grid.displayGrid();
            }
            grid.dom.table.setAttribute("my-orientation",grid.vertical?'vertical':'horizontal');
        }
    }
};

myOwn.conditions={};

myOwn.clientSides={
    newPass:{
        prepare: function(depot, fieldName){
            var td=depot.rowControls[fieldName];
            td.disable(false);
            TypedControls.adaptElement(td, {typeName:'text'});
            td.addEventListener('update', function(event){
                var newPass = td.getTypedValue();
                if(newPass.trim()){
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
                    },function(err){
                        td.setAttribute('io-status','error');
                        td.title=err.message;
                    });
                }
            }, true);
        }
    },
    $lock:{
        update:true,
        prepare:function(depot, fieldName){
            depot.rowControls[fieldName].addEventListener('update',function(){
                var control = this;
                var valor = control.getTypedValue();
                if((valor=='B' || valor=='⚿') && "no estaba lockeado"){
                    control.setTypedValue('⌚');
                    var tokenPromise = Promise.resolve();
                    var token = localStorage.getItem('token');
                    if(!token){
                        tokenPromise = tokenPromise.then(function(){
                            return my.ajax.token.get({
                                useragent:my.config.useragent,
                                username: my.config.username
                            }).then(function(result){
                                token = result.token;
                                localStorage.setItem('token', result.token);
                            });
                        })
                    }
                    tokenPromise = tokenPromise.then(function(){
                        var promiseArray = [];
                        my.ajax.table["lock-record"]({
                            table:depot.def.name,
                            primaryKeyValues:depot.primaryKeyValues,
                            token:token
                        }).then(function(result){
                            var tables=[depot.def.name].concat(depot.def.offline.details)
                            return tables.forEach(function(name,i){
                                promiseArray.push(
                                    my.ldb.putMany(name,result.data[i])
                                );
                            });
                        }).then(function(){
                            Promise.all(promiseArray).then(function(){
                                control.setTypedValue('⚿');
                            })
                        })
                    })
                }
            })
        }
    }
};

myOwn.references={};

myOwn.getReference = function getReference(referenceName, forceRefresh){
    var reference={};
    if(!my.references[referenceName]){
        var dummyElement = html.div().create();
        var Connector = my.offline.mode?my.TableConnectorLocal:my.TableConnector; 
        var connector=new Connector({
            my:my, 
            tableName: referenceName, 
            getElementToDisplayCount:function(){ return dummyElement; },
            activeOnly: true
        });
        connector.getStructure();
        var dataReady=connector.getData().then(function(rows){
            reference.Allrows=rows;
            reference.tableDef=connector.def;
            if(reference.tableDef.activeRecords){
                rows = rows.filter(function(row){
                    return row[reference.tableDef.activeRecords.fieldName];
                });
            }
            reference.rows=rows;
            reference.getValue = function getValue(row){
                return row[reference.tableDef.primaryKey[0]];
            };
            reference.getLabels = function getLabels(row, includePk){
                var lookupFields = reference.tableDef.lookupFields || reference.tableDef.nameFields;
                return (includePk || !lookupFields.length?
                    this.tableDef.primaryKey:[]
                ).concat(lookupFields).map(function(fieldName){
                    return row[fieldName];
                });
            };
            reference.getLabel = function getLabel(row){
                return this.getLabels(row).join(', ');
            };
            return rows;
        });
        reference=my.references[referenceName]={
            connector:connector,
            dataReady:dataReady
        };
    }else{
        reference=my.references[referenceName]
    }
    return reference;
}

myOwn.autoSetupFunctions.push(function autoSetupMyTables(){
    var my=this;
    TypedControls.showLupa=false;
    TypedControls.Expanders.unshift({
        whenType: function(typedControl){ 
            var typeInfo = typedControl.controledType.typeInfo;
            return typeInfo.references && !typeInfo.skipReferenceLookup;
        },
        dialogInput:function(typedControl){
            var typeInfo = typedControl.controledType.typeInfo;
            var canceled;
            var reference = my.getReference(typeInfo.references);
            var dataReady = reference.dataReady;
            var timeoutWaiting=setTimeout(function(){
                timeoutWaiting=null;
                dialogPromise(function(dialogWindow, closeWindow){
                    var cancelButton=html.button({class:'my-cancel'}, my.messages.Cancel).create();
                    cancelButton.onclick=function(){
                        closeWindow('cancel');
                        closeWindow=null;
                    };
                    dialogWindow.appendChild(html.div([
                        html.div(my.messages.loading+'...'),
                        html.img({class:'hamster-gif', src:my.path.img+'hamster.gif'}),
                        html.div([cancelButton])
                    ]).create());
                    dataReady.then(function(){
                        if(closeWindow){
                            closeWindow('ready');
                        }
                    });
                },{
                    underElement:typedControl,
                    reject:false,
                    withCloseButton:false
                }).then(function(value){
                    canceled = value=='cancel';
                });
            },250);
            dataReady.then(function(){
                if(timeoutWaiting){
                    clearTimeout(timeoutWaiting);
                }
            });
            return dataReady.then(function(rows){
                if(canceled){
                    return Promise.reject();
                }
                var opts=rows.map(function(row){
                    return {
                        value:reference.getValue(row),
                        labels:reference.getLabels(row,true)
                    };
                });
                if(typeInfo.nullable){
                    opts.push({value:null, labels:['',TypedControls.messages.Null]});
                }
                return miniMenuPromise(opts,{
                    underElement:typedControl,
                    withCloseButton:true,
                }).then(function(value){
                    typedControl.setTypedValue(value, true);
                });
            });
        }
    });
});

myOwn.TableGrid.prototype.captureKeys = function captureKeys() {
    document.addEventListener('keypress', function(evento){
        return;
        if(evento.which==13){ // Enter
            var enfoco=this.activeElement;
            var este=this.activeElement;
            if(enter_hace_tab_en_este_elemento(este)){
                var no_me_voy_a_colgar=2000;
                while(este && this.activeElement===enfoco && no_me_voy_a_colgar--){
                    este=proximo_elemento_que_sea(este,isInteracive);
                    este.focus();
                }
                if(este){
                    evento.preventDefault();
                }
            }
        }
    });
};

myOwn.validators={}