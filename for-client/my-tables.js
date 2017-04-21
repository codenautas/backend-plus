"use strict";

/*global myOwn, my, XLSX, Pikaday  */
/*global miniMenuPromise, dialogPromise, alertPromise, confirmPromise, promptPromise, simpleFormPromise */
/*global Blob, document, CustomEvent, URL  */

var bestGlobals = require('best-globals');
var html = require('js-to-html').html;
var JSON4all = require('json4all');
var TypedControls = require('typed-controls');
var typeStore=require('type-store');

var changing = bestGlobals.changing;

var PostgresInterval = require('postgres-interval');

var pikaday = require('pikaday');

var MAX_SAFE_INTEGER = 9007199254740991;

function sameMembers(a,b){
    for(var attr in a){
        if(a[attr]!==b[attr]) return false;
    }
    for(var attr in b){
        if(a[attr]!==b[attr]) return false;
    }
    return true;
}

function sameValue(a,b){
    return a==b ||
      a instanceof Date && b instanceof Date && a.getTime() == b.getTime() ||
      typeof a === 'number' && (a>MAX_SAFE_INTEGER || a< -MAX_SAFE_INTEGER) && Math.abs(a/b)<1.00000000000001 && Math.abs(a/b)>0.99999999999999 ||
      a instanceof PostgresInterval && b instanceof PostgresInterval && sameMembers(a,b) ||
      a && !!a.sameValue && a.sameValue(b);
}

myOwn.messages=changing(myOwn.messages, {
    Delete : "Delete",
    Filter : "Filter",
    actualValueInDB: "actual value in database",
    allGWillDelete: "({$t} records will be deleted)",
    allRecordsDeleted: "all records where deleted",
    allTWillDelete: "(ALL {$t} records will be deleted)",
    anotherUserChangedTheRow: "Another user changed the row",
    exhibitedColumns:'Exhibited Columns',
    hiddenColumns:'Hidden columns',
    confirmDeleteAll: "Do you want to delete these records?",
    deleteAllRecords: "delete all records",
    deleteRecord: "delete record",
    details: "details",
    download: "download",
    export: "export",
    filter : "filter",
    filterOff: "filter off",
    format: "format",
    hideOrShow: "hide or show colums",
    import: "import",
    importDataFromFile: "import data from external file",
    insertBelow: "insert record below this",
    insertRecordAtTop: "insert record at top",
    lessDetails: "hide details",
    loading: "loading",
    oldValue: "old value",
    optionsForThisTable: "options for this table",
    orientationToggle: "toggle orientation (vertical vs horizontal)",
    preparingForExport: "preparing for export",
    recordsReimaining: "{$r} records remains in the table",
    refresh: "refresh - retrive data from database",
    showInheritedKeys: "show inherited keys",
    table: "table",
    uploadFile: "upload file $1",
    verticalEdit: "vertical edit",
    xOverTWillDelete: "({$x} over a total of {$t} records will be deleted)",
    zoom: "zoom",
});

myOwn.es=changing(myOwn.es, {
    Delete : "Eliminar",
    Filter : "Filtrar",
    actualValueInDB: "valor actual en la base de datos",
    allGWillDelete: "(se borrarán {$t} registros)",
    allRecordsDeleted: "todos los registros fueron borrados",
    allTWillDelete: "(se borrarán todos los registros: {$t} registros)",
    anotherUserChangedTheRow: "Otro usuario modificó el registro",
    exhibitedColumns:'Columnas que se muestran',
    hiddenColumns:'Columnas ocultas',
    confirmDeleteAll: "¿Desea borrar estos registros?",
    deleteAllRecords: "borrar todos los registros",
    deleteRecord: "borrar este registro",
    details: "detalles",
    download: "descargar",
    export: "exportar",
    filter : "filtrar",
    filterOff: "desactiva el filtro (ver todos los registros)",
    format: "formato",
    hideOrShow: "ocultar o mostrar columnas",
    import: "importar",
    importDataFromFile: "importar datos de un archivo externo",
    insertBelow: "agregar un registro debajo de éste",
    insertRecordAtTop: "insertar un registro nuevo en la tabla",
    lessDetails: "dejar de mostrar los detalles asocialdos al registro",
    loading: "cargando",
    oldValue: "valor anterior",
    optionsForThisTable: "opciones para esta tabla",
    orientationToggle: "cambiar la orientación de la tabla (por fila o por columna)",
    preparingForExport: "preparando para exportar",
    recordsReimaining: "quedan {$r} registros en la tabla",
    refresh: "refrescar la grilla desde la base de datos",
    showInheritedKeys: "mostrar las columnas relacionadas",
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
    '>':function(valueToCheck,condition){return (valueToCheck>condition); },
    '>=':function(valueToCheck,condition){return (valueToCheck>=condition); },
    '<':function(valueToCheck,condition){return (valueToCheck<condition); },
    '<=':function(valueToCheck,condition){return (valueToCheck<=condition); },
    'not-an-operator':function(valueToCheck,condition){ return 'Operator does not exist'; },
    'traductor':{
        '=':'igual',
        '~':'parecido',
        '!~':'not-like',
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
            connector.getElementToDisplayCount().textContent=rows.length+' '+my.messages.displaying+'...';
            return bestGlobals.sleep(10);
        }).then(function(){
            connector.my.adaptData(connector.def, rows);
            return rows;
        });
    }).catch(function(err){
        connector.getElementToDisplayCount().appendChild(html.span({style:'color:red', title: err.message},' error').create());
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
    },opts).then(function(updatedRow){
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

myOwn.TableGrid = function(context, mainElement){
    var grid = this;
    for(var attr in context){
        grid[attr] = context[attr];
    }
    grid.dom={
        main: mainElement
    };
    grid.modes = {
        saveByField: true,
        withColumnDetails: null, // null = autodetect
    };
    grid.view = {};
};

myOwn.tableGrid = function tableGrid(tableName, mainElement, opts){
    var grid = new my.TableGrid({my: this}, mainElement);
    opts = opts || {};
    grid.connector = new my.TableConnector({
        my:this, 
        tableName: tableName, 
        getElementToDisplayCount:function(){ return grid.dom.footInfo.displayTo; }
    });
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
    };
    return grid;
};

myOwn.TableGrid.prototype.hideColumnsViaCss = function hideColumnsViaCss(){
    var grid = this;
    var autoStyle = my.inlineCss('bp-hidden-columns-'+grid.def.name);
    autoStyle.innerHTML = grid.view.hiddenColumns.map(function(columnName){
        return "[my-table='"+grid.def.name+"'] [my-colname='"+columnName+"'] {display:none}";
    }).join('\n');
}

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

myOwn.TableGrid.prototype.refresh = function refresh(){
    return this.prepareAndDisplayGrid();
};

myOwn.TableGrid.prototype.prepareAndDisplayGrid = function prepareAndDisplayGrid(){
    var grid = this;
    grid.displayPreLoadMessage();
    var structureRequest = grid.connector.getStructure().then(function(tableDef){
        grid.def = tableDef;
        grid.vertical = tableDef.layout.vertical;
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

myOwn.ColumnGrid.prototype.thDetail = function thLabel(){
    return html.th({class:'th-detail'}, (this.fieldDef||{}).label);
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
    return html.th(this.actions);
};

myOwn.ActionColumnGrid.prototype.thFilter = function thFilter(depot){
    var buttonFilter=html.button({id:'button-filter'},myOwn.messages.Filter+"!").create();
    var grid = this.grid;
    buttonFilter.addEventListener('click',function(){
        grid.view.filter=depot;
        grid.displayBody();
    });
    return html.th([buttonFilter]);
};

myOwn.ActionColumnGrid.prototype.td = function td(depot){
    var grid = this.grid;
    var thActions=html.th({class:['grid-th','grid-th-actions']}).create();
    var actionNamesList = ['insert','delete','vertical-edit'].concat(grid.def.actionNamesList);
    actionNamesList.forEach(function(actionName){
        var actionDef = my.tableAction[actionName];
        if(grid.def.allow[actionName]){
            var buttonAction=html.button({class:'table-button'}, [
                html.img({src:actionDef.img, alt:actionDef.alt, title:my.messages[actionDef.titleMsg]})
            ]).create();
            thActions.appendChild(buttonAction);
            buttonAction.addEventListener('click', function(){
                actionDef.actionRow(depot, {launcher:buttonAction});
            });
        }
    });
    return thActions;
};

myOwn.DataColumnGrid = function DataColumnGrid(opts){
    myOwn.ColumnGrid.call(this,opts);
};

myOwn.DataColumnGrid.prototype = Object.create(myOwn.ColumnGrid.prototype);

myOwn.DataColumnGrid.prototype.cellAttributes = function cellAttributes(specificAttributes){
    var fieldDef = this.fieldDef;
    var grid=this.grid;
    var attr=changing({"my-colname":fieldDef.name},specificAttributes);
    if(grid.connector.fixedField[fieldDef.name]){
        attr["inherited-pk-column"]="yes";
    }
    if(fieldDef.referencesField && grid.connector.fixedField[fieldDef.referencesField]){
        attr["inherited-pk-column"]="yes";
    }
    return attr;
}
    
myOwn.DataColumnGrid.prototype.th = function th(){
    var fieldDef = this.fieldDef;
    var grid = this.grid;
    var th=html.th(this.cellAttributes({class: "th-name"}),fieldDef.title).create();
    if(fieldDef.width){
        th.style.width=fieldDef.width+'px';
    }
    th.addEventListener('click',function(mouseEvent){
        if(mouseEvent.altKey){
            grid.view.hiddenColumns.push(fieldDef.name);
            grid.hideColumnsViaCss();
        }else{
            var currentOrder=grid.view.sortColumns.length && grid.view.sortColumns[0].column==fieldDef.name?grid.view.sortColumns[0].order:null;
            grid.view.sortColumns=grid.view.sortColumns.filter(function(sortColumn){
                return sortColumn.column != fieldDef.name;
            });
            grid.view.sortColumns.unshift({column:fieldDef.name, order:currentOrder?-currentOrder:1});
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
    var imgFilter=html.img({src:filterImage}); 
    var symbolFilter=html.button({"class":'table-button', tabindex:-1},imgFilter).create();
    var elementFilter=html.span({"class":"filter-span", "typed-controls-direct-input":true}).create();
    depot.rowControls[fieldName]=elementFilter;
    TypedControls.adaptElement(elementFilter,fieldDef);
    if(fieldName in depot.row){
        elementFilter.setTypedValue(depot.row[fieldName]);
    }
    elementFilter.addEventListener('update',function(){
        depot.row[fieldDef.name]=this.getTypedValue();
    });
    var th=html.td(this.cellAttributes({class:"autoFilter"}),[symbolFilter,elementFilter]).create();
    elementFilter.width=grid.sizesForFilters[iColumn]-myOwn.comparatorWidth-5;
    elementFilter.style.width=elementFilter.width.toString()+'px';
    symbolFilter.addEventListener('click',function(){
        miniMenuPromise([
            {value:'=',     img:my.path.img+'igual.png'},
            {value:'~',     img:my.path.img+'parecido.png'},
            {value:'!~',    img:my.path.img+'not-like.png'},
            {value:'\u2205',img:my.path.img+'vacio.png'},
            {value:'>',     img:my.path.img+'mayor.png'},
            {value:'>=',    img:my.path.img+'mayor-igual.png'},
            {value:'<',     img:my.path.img+'menor.png'},
            {value:'<=',    img:my.path.img+'menor-igual.png'},
        ],{underElement:symbolFilter}).then(function(result){
            filterImage=my.path.img+my.comparator.traductor[result]+'.png';
           // imgFilter.src=filterImage;
            symbolFilter.childNodes[0].src=filterImage;
            depot.rowSymbols[fieldDef.name]=result;
        });
    });
    return th;
};

myOwn.DataColumnGrid.prototype.thDetail = function thLabel(){
    var grid=this.grid;
    return html.th(this.cellAttributes({class:"th-detail"}), (this.fieldDef||{}).label);
};

myOwn.DataColumnGrid.prototype.td = function td(depot, iColumn, tr, saveRow){
    var grid = this.grid;
    var fieldDef = this.fieldDef;
    var forInsert = false; // TODO: Verificar que esto está en desuso
    var directInput=grid.def.allow.update && !grid.connector.fixedField[fieldDef.name] && (forInsert?fieldDef.allow.insert:fieldDef.allow.update);
    var td = html.td(this.cellAttributes({"typed-controls-direct-input":directInput})).create();
    TypedControls.adaptElement(td, fieldDef);
    if(fieldDef.allow.update){
        td.addEventListener('click', function(){
            var actualControl = this;
            var rect = my.getRect(actualControl);
            var buttonContainer = document;
            var buttonLupa = buttonContainer.buttonLupa;
            if(buttonLupa){
                document.body.removeChild(buttonLupa);
                if(buttonContainer.buttonLupaTimmer){
                    clearTimeout(buttonContainer.buttonLupaTimmer);
                }
            }
            buttonLupa=html.img({
                class:'img-lupa', 
                src:my.path.img+'lupa.png',
                alt:"zoom",
                title:my.messages.zoom
            }).create();
            buttonLupa.forElement=actualControl;
            buttonContainer.buttonLupa=buttonLupa;
            document.body.appendChild(buttonLupa);
            buttonLupa.style.position='absolute';
            buttonLupa.style.left=rect.left+rect.width-6+'px';
            buttonLupa.style.top=rect.top+rect.height-8+'px';
            buttonLupa.addEventListener('click', function(){
                var actualValue=actualControl.getTypedValue();
                actualValue=(typeStore.type[fieldDef.typeName]&& typeStore.type[fieldDef.typeName].toPlainString)?
                    typeStore.type[fieldDef.typeName].toPlainString(actualValue):actualValue
                var optDialog={underElement:actualControl};
                if(fieldDef.typeName=='date'){
                    dialogPromise(function(dialogWindow, closeWindow){
                        var button=html.button(DialogPromise.messages.Ok).create();
                        var divPicker=html.div({id:'datepicker'}).create();
                        var picker = new Pikaday({
                            defaultDate: actualValue,
                            onSelect: function(date) {
                                closeWindow(new Date(picker.toString()));
                            }
                        });
                        divPicker.appendChild(picker.el);
                        button.addEventListener('click',function(){
                            closeWindow(new Date(picker.toString()));
                        });
                        dialogWindow.appendChild(html.div([
                             html.div(fieldDef.label),
                             html.div([divPicker]),
                             html.div([button])
                        ]).create());
                    }, optDialog).then(function(value){
                        actualControl.setTypedValue(value);
                        actualControl.dispatchEvent(new CustomEvent('update'));
                     });
                }else{
                    promptPromise(fieldDef.label, actualValue,optDialog ).then(function(value){
                        value=(typeStore.type[fieldDef.typeName]&& typeStore.type[fieldDef.typeName].fromString)?
                            typeStore.type[fieldDef.typeName].fromString(value):value;
                        actualControl.setTypedValue(value);
                        actualControl.dispatchEvent(new CustomEvent('update'));
                    });
                }
            });
            buttonContainer.buttonLupaTimmer=setTimeout(my.quitarLupa,3000);
        });
    }
    depot.rowControls[fieldDef.name] = td;
    if(depot.row[fieldDef.name]!=null){
        td.setTypedValue(depot.row[fieldDef.name]);
    }
    if(!fieldDef.clientSide){
        td.addEventListener('update',function(){
            var value = this.getTypedValue();
            if(!sameValue(value,depot.row[fieldDef.name])){
                this.setAttribute('io-status', 'pending');
                depot.rowPendingForUpdate[fieldDef.name] = value;
                depot.row[fieldDef.name] = value;
                if(grid.modes.saveByField){
                    saveRow(depot,{visiblyLogErrors:false});
                }
            }
        });
    }
    return td;
};

myOwn.DetailColumnGrid = function DetailColumnGrid(opts){
    myOwn.ColumnGrid.call(this,opts);
};

myOwn.DetailColumnGrid.prototype = Object.create(myOwn.ColumnGrid.prototype);

myOwn.DetailColumnGrid.prototype.th = function th(){
    var th=html.th({"my-defname":this.detailTableDef.table, title:this.detailTableDef.label},this.detailTableDef.abr);
    return th;
};

myOwn.DetailColumnGrid.prototype.td = function td(depot, iColumn, tr){
    var grid = this.grid;
    var detailTableDef = this.detailTableDef;
    var detailControl = depot.detailControls[detailTableDef.table] || { show:false };
    detailControl.img = html.img({
        src:my.path.img+'detail-unknown.png',
        alt:'DETAIL',
        title:my.messages.details
    }).create();
    var button = html.button({class:'table-button'}, [detailControl.img]).create();
    var td = html.td({class:['grid-th','grid-th-details'], "my-relname":detailTableDef.table}, button).create();
    depot.detailControls[detailTableDef.table] = detailControl;
    button.addEventListener('click',function(){
        var spansForSmooth = [iColumn+1, 999];
        if(!detailControl.show){
            detailControl.img.src=my.path.img+'detail-contract.png';
            detailControl.img.alt="[-]";
            detailControl.img.title=my.messages.lessDetails;
            var newTr = grid.my.insertRow({under:tr,smooth:{height:70, spans:spansForSmooth}});
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
            detailControl.img.src=my.path.img+'detail-expand.png';
            detailControl.img.alt="[+]";
            detailControl.img.title=my.messages.details;
            grid.my.fade(detailControl.tr, {smooth:{spans:spansForSmooth, content:detailControl.table}});
            detailControl.show = false;
            depot.detailRows = depot.detailRows.filter(function(tr){ return tr!==detailControl.tr;});
            detailControl.tr = null;
        }
    });
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
        menuOptions.push({img:my.path.img+'export.png', value:true, label:my.messages.export, doneFun:function(){
            return dialogPromise(function(dialogWindow, closeWindow){
                var id1=my.getUniqueDomId();
                var id2=my.getUniqueDomId();
                var downloadElement=html.a(my.messages.download).create();
                var downloadElementText=html.a(my.messages.download+" txt").create();
                var mainDiv=html.div({class:'dialog-export',"current-state":"preparing"}, [
                    html.div({class:'dialog-preparing'}, my.messages.preparingForExport),
                    html.div([
                        html.span(my.messages.format),
                       // html.input({type:'radio', id:id1, name:'format', checked:true }), html.label({"for": id1}, '.txt'),
                        html.input({type:'radio', id:id2, name:'format', checked:true}), html.label({"for": id2}, '.xlsx'),
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
                setTimeout(function(){
                    var txtToDownload=grid.def.fields.map(function(fieldDef){
                            return fieldDef.name;
                        }).join('|')+'\r\n'+
                        grid.depotsToDisplay.map(function(depot){
                            return grid.def.fields.map(function(fieldDef){
                                var value=depot.row[fieldDef.name];
                                return value==null?'':depot.row[fieldDef.name].toString().trim();
                            }).join('|');
                        }).join('\r\n')+'\r\n';
                    mainDiv.setAttribute("current-state-txt", "ready");
                    var blob = new Blob([txtToDownload], {type: 'text/plain'});
                    var url = URL.createObjectURL(blob); 
                    downloadElementText.href=url;
                    downloadElementText.setAttribute("download", grid.def.name+".tab");
                },10);
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
                    grid.def.fields.forEach(function(field,iColumn){
                        ws[XLSX.utils.encode_cell({c:iColumn,r:0})]={t:'s',v:field.name, s:{ font: {bold:true, underline:true}, alignment:{horizontal:'center'}}};
                    });
                    grid.depotsToDisplay.forEach(function(depot, iFila){
                        depot.def.fields.forEach(function(fieldDef, iColumn){
                            var value=depot.row[fieldDef.name];
                            var valueType='s';
                            var type=fieldDef.typeName;
                            if(value!=null){
                                if(typeStore.type[type] && typeStore.type[type].toExcelValue){
                                    value=typeStore.type[type].toExcelValue(value)
                                    valueType =typeStore.type[type].toExcelType(value)
                                }
                                var cell={t:valueType,v:value};
                                if(fieldDef.isPk){
                                    cell.s={font:{bold:true}};
                                }else if(!fieldDef.allow.update){
                                    cell.s={font:{color:{ rgb: "88AA00" }}};
                                }
                                ws[XLSX.utils.encode_cell({c:iColumn,r:iFila+1})]=cell;
                            }
                        });
                    });
                    ws["!ref"]="A1:"+XLSX.utils.encode_cell({c:grid.def.fields.length,r:grid.depotsToDisplay.length});
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
        }});
    }
    if(grid.def.allow.import){
        menuOptions.push({img:my.path.img+'import.png', value:true, label:my.messages.import, doneFun:function(){
            var buttonFile=html.input({type:'file',style:'min-width:400px'}).create();
            var buttonConfirmImport=html.input({type:'button', value:my.messages.import}).create();
            var progressIndicator=html.div({class:'indicator'},' ').create();
            var progressBar=html.div({class:'progress-bar', style:'width:400px; height:8px;'},[progressIndicator]).create();
            var uploadingProgress=function(progress){
                if(progress.lengthComputable){
                    progressIndicator.style.width=progress.loaded*100/progress.total+'%';
                    progressIndicator.title=Math.round(progress.loaded*100/progress.total)+'%';
                }else{
                    progressIndicator.style.backgroundColor='#D4D';
                    progressIndicator.title='N/D %';
                }
            };
            buttonConfirmImport.addEventListener('click', function(){
                var files = buttonFile.files;
                buttonConfirmImport.value='cargando...';
                buttonConfirmImport.disabled=true;
                bestGlobals.sleep(100).then(function(){
                    return my.ajax.table.upload({
                        table:grid.def.name, 
                        prefilledFields:grid.connector.fixedFields,
                        files:files
                    },{uploading:uploadingProgress});
                }).then(this.dialogPromiseDone,this.dialogPromiseDone);
            });
            simpleFormPromise({elementsList:[
                my.messages.importDataFromFile,
                buttonFile, 
                html.br().create(),
                buttonConfirmImport,
                html.br().create(),
                progressBar,
            ]}).then(function(message){
                return Promise.all([
                    grid.refresh(),
                    alertPromise(message)
                ]);
            });
        }});
    }
    if(grid.def.allow.delete){
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
    button.onclick=function(){
        miniMenuPromise(menuOptions,{
            underElement:button,
            withCloseButton:false,
        });
    };
};

myOwn.TableGrid.prototype.prepareGrid = function prepareGrid(){
    var grid = this;
    var my = grid.my;
    grid.view.hiddenColumns=grid.view.hiddenColumns||grid.def.hiddenColumns||[];
    grid.hideColumnsViaCss();
    var buttonInsert;
    var buttonCreateFilter;
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
    if(grid.def.allow.insert){
        buttonInsert=html.button({class:'table-button'}, [
            html.img({
                src:my.path.img+'insert.png',
                alt:'INS',
                title:my.messages.insertRecordAtTop
            })
        ]).create();
        buttonInsert.addEventListener('click', function(){
            grid.createRowInsertElements();
        });
    }
    if(grid.def.allow.filter){
        buttonCreateFilter=html.button({class:'table-button', 'when-filter':'no'}, [
            html.img({
                src:my.path.img+'filter.png',
                alt:'FILTER',
                title:my.messages.filter
            })
        ]).create();
        buttonCreateFilter.addEventListener('click', function(){
            grid.createRowFilter(0);
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
            grid.view.filter=false;
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
    grid.columns=[new my.ActionColumnGrid({grid:grid, actions:[
        buttonInsert,/*buttonSaveMode,*/buttonCreateFilter,buttonDestroyFilter,
        buttonOrientation,
        buttonMenu,
    ]})].concat(
        grid.def.detailTables.map(function(detailTableDef){ return new my.DetailColumnGrid({grid:grid, detailTableDef:detailTableDef}); })
    ).concat(
        grid.def.fields.map(function(fieldDef){ return new my.DataColumnGrid({grid:grid, fieldDef:fieldDef}); })
    // ).concat(
    //     [new my.SpecialColumnGrid({class:"empty-right-column"})]
    );
    if(grid.modes.withColumnDetails==null){
        grid.modes.withColumnDetails=grid.def.fields.some(function(fieldDef){ return fieldDef.label!=fieldDef.title; });
    }
    if(grid.vertical){
        grid.modes.withColumnDetails=false;
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
    grid.dom.footInfo.displayTo.textContent = my.messages.loading;
    if(grid.vertical){
        grid.dom.table = html.table({"class":"my-grid", "my-table": grid.def.name},[
            html.caption(grid.def.title),
            html.tbody(
                grid.columns.map(function(column){ 
                    return html.tr([
                        column.th(),
                        grid.modes.withColumnDetails?html.tr(grid.columns.map(function(column){ return column.thDetail(); })):null
                    ]); 
                })
            ),
            html.tfoot([
                html.tr([html.th(),grid.dom.footInfo])
            ])
        ]).create();
    }else{
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
    }
    grid.dom.main.innerHTML='';
    grid.dom.main.appendChild(grid.dom.table);
};


myOwn.TableGrid.prototype.createRowInsertElements = function createRowInsertElements(belowDepot){
    var grid = this;
    var position;
    if(grid.vertical){
        position=1;
    }else{
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
            }else{
                td.setTypedValue(depot.row[fieldDef.name]);
            }
        });
    };
    var saveRow = function(depot, opts){
        if(!('saving' in depot)){
            depot.saving = Promise.resolve();
        }
        var changeIoStatus = function changeIoStatus(newStatus, objectWithFieldsOrListOfFieldNames, title){
            var fieldNames=typeof objectWithFieldsOrListOfFieldNames === "string"?[objectWithFieldsOrListOfFieldNames]:(
                objectWithFieldsOrListOfFieldNames instanceof Array?objectWithFieldsOrListOfFieldNames:Object.keys(objectWithFieldsOrListOfFieldNames)
            );
            fieldNames.forEach(function(name){ 
                var td=depot.rowControls[name];
                td.setAttribute('io-status', newStatus); 
                if(title){
                    td.title=title;
                }else{
                    td.title='';
                }
            });
        };
        changeIoStatus('updating',depot.rowPendingForUpdate);
        depot.saving = depot.saving.then(function(){
            if(!Object.keys(depot.rowPendingForUpdate).length){
                return Promise.resolve();
            }
            return grid.connector.saveRecord(depot, opts).then(function(result){
                var retrievedRow = result.updatedRow;
                for(var fieldName in retrievedRow){
                    if(!grid.def.field[fieldName].clientSide){
                        var value = depot.rowControls[fieldName].getTypedValue();
                        if(!sameValue(depot.row[fieldName], value)){
                            if(grid.def.field[fieldName].allow.update){
                                depot.rowPendingForUpdate[fieldName] = value;
                            }
                            depot.row[fieldName] = value;
                        }
                    }
                    if(fieldName in depot.rowPendingForUpdate){
                        var source = fieldName in result.sendedForUpdate?result.sendedForUpdate:depot.retrievedRow;
                        if(sameValue(depot.rowPendingForUpdate[fieldName], retrievedRow[fieldName])){
                            // ok, lo que viene coincide con lo pendiente
                            delete depot.rowPendingForUpdate[fieldName];
                            changeIoStatus('temporal-ok', fieldName);
                            /*jshint loopfunc: true */
                            setTimeout(function(fieldName){
                                changeIoStatus('ok', fieldName);
                            },3000,fieldName);
                            /*jshint loopfunc: false */
                        }else if(sameValue(retrievedRow[fieldName], source[fieldName])){
                            // ok, si bien lo que viene no coincide con lo pendiente que sigue pendiente, 
                            // sí coincide con lo que estaba antes de mandar a grabar, 
                            // entonces no hay conflicto el usuario sabe sobre qué está modificando
                        }else{
                            // no coincide con lo pendiente ni con lo anterior, 
                            // hay un conflicto con el conocimiento del usuario que modificó algo que estaba en otro estado
                            changeIoStatus('write-read-conflict', 
                                fieldName, 
                                myOwn.messages.anotherUserChangedTheRow+'. \n'+
                                myOwn.messages.oldValue+': '+source[fieldName]+' \n'+
                                myOwn.messages.actualValueInDB+': '+retrievedRow[fieldName]
                            );
                        }
                    }else{
                        if(!sameValue(retrievedRow[fieldName], depot.row[fieldName])){
                            changeIoStatus('background-change', fieldName);
                            depot.row[fieldName] = retrievedRow[fieldName];
                            depot.rowControls[fieldName].setTypedValue(retrievedRow[fieldName]);
                            /*jshint loopfunc: true */
                            setTimeout(function(fieldName){
                                changeIoStatus('ok', fieldName);
                            },3000,fieldName);
                            /*jshint loopfunc: false */
                        }
                    }
                }
                depot.retrievedRow = retrievedRow;
                grid.updateRowData(depot);
            }).catch(function(err){
                changeIoStatus('error',depot.rowPendingForUpdate,err.message);
            });
        });
    };
    grid.createRowElements = function createRowElements(iRow, depot){
        var grid = this;
        var forInsert = iRow>=0;
        var tr={};
        if(grid.vertical){
            tr=grid.dom.table.rows[0];
        }else{
            tr = grid.my.insertRow({section:tbody, iRow:iRow, smooth:depot.status==='new'?{ 
                colCount:grid.def.detailTables.length + grid.def.fields.length
            }:false});
        }
        depot.tr = tr;
        grid.columns.forEach(function(column, iColumn){
            tr.appendChild(column.td(depot, iColumn, tr, saveRow));
            if(grid.vertical){ 
                tr = tr.nextSibling;
            }
        });
        if(!grid.vertical){ 
            tr.addEventListener('focusout', function(event){
                if(event.target.parentNode != (event.relatedTarget||{}).parentNode ){
                    depot.connector.deleteEnter(depot).then(function(result){
                        console.log("result",result);
                    });
                    if(Object.keys(depot.rowPendingForUpdate).length){
                        saveRow(depot);
                    }
                }
            });
            tr.addEventListener('focusin',function(event){
                if(event.target.parentNode != (event.relatedTarget||{}).parentNode ){
                    return depot.connector.enterRecord(depot).then(function(result){
                        console.log("result",result);
                    });
                }
            });
        }
        if(iRow===-1){
            depot.detailRows.forEach(function(detailTr){
                var detailControl = depot.detailControls[detailTr.detailTableName];
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
        return depot;
    };
    grid.destroyRowFilter = function destroyRowFilter(){
        var tr=grid.hasFilterRow;
        grid.dom.table.setAttribute('has-filter',0);
        grid.dom.table.tHead.removeChild(tr);
        delete grid.hasFilterRow;
    };
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
        grid.def.filterColumns.forEach(function(filterColumn){
            depot.row[filterColumn.column]=filterColumn.value;
            depot.rowSymbols[filterColumn.column]=filterColumn.operator;
        });
        var tr=html.tr({'class':'filter-line'}, grid.columns.map(function(column, iColumn){
            return column.thFilter(depot, iColumn);
        })).create();
        grid.hasFilterRow=tr;
        grid.dom.table.setAttribute('has-filter',1);
        grid.dom.table.tHead.appendChild(tr);
        return depot;
    };
    grid.displayBody=function displayBody(){
        var grid = this;
        var depotsToDisplay;
        var filterData = grid.view.filter;
        if(filterData){
            depotsToDisplay = grid.depots.filter(function(depot,i){
                var partialOk=true;
                for(var column in depot.row){
                    if(filterData.rowSymbols[column] && my.comparator[filterData.rowSymbols[column]]){
                        var isSatisfied=my.comparator[filterData.rowSymbols[column]](depot.row[column],filterData.row[column]);
                        if(!isSatisfied){
                            partialOk=false;
                        }
                    }
                }
                return partialOk;
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
            grid.dom.footInfo.displayFrom.textContent=depotsToDisplay.length?1:0;
            grid.dom.footInfo.displayTo.textContent=iRow;
            grid.dom.footInfo.rowCount.innerHTML='';
            if(iRow<depotsToDisplay.length){
                var addButtonRest = function addButtonRest(toNextRowNumber){
                    var buttonRest=html.button({class:'foot-info'},"+..."+toNextRowNumber).create();
                    grid.dom.footInfo.rowCount.appendChild(html.span('  ').create());
                    grid.dom.footInfo.rowCount.appendChild(buttonRest);
                    buttonRest.addEventListener('click',function(){
                        grid.displayRows(iRow, toNextRowNumber, true);
                    });
                };
                my.displayCountBreaks.forEach(function(size, iSize){
                    var cut=(iRow+size) - (iRow+size) % size;
                    if(cut*5<=depotsToDisplay.length*3 && (iSize==my.displayCountBreaks.length-1 || cut*5<=my.displayCountBreaks[iSize+1]*3)){
                        addButtonRest(cut);
                    }
                });
                addButtonRest(depotsToDisplay.length);
            }
        };
        var linesToDisplay=depotsToDisplay.length<=myOwn.firstDisplayOverLimit?depotsToDisplay.length:my.firstDisplayCount;
        grid.depotsToDisplay=depotsToDisplay;
        grid.displayRows(0, linesToDisplay);
    };
    grid.displayBody();
    if(grid.def.filterColumns.length){
        grid.view.filter=grid.createRowFilter(0);
        grid.displayBody();
    }
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
        img: myOwn.path.img+'insert.png',
        alt: "INS",
        titleMsg: 'insertBelow',
        actionRow: function(depot){
            return depot.manager.createRowInsertElements(depot);
        }
    },
    "delete":{
        img: myOwn.path.img+'delete.png',
        alt: "DEL",
        titleMsg: 'deleteRecord',
        actionRow: function(depot, opts){
            return depot.my.showQuestion(
                depot.my.messages.Delete+' '+JSON.stringify(depot.primaryKeyValues)+' ?', 
                {askForNoRepeat:depot.my.messages.Delete+', '+depot.def.name}
            ).then(function(result){
                return depot.connector.deleteRecord(depot, opts).then(function(){
                    depot.manager.displayAsDeleted(depot);
                }).catch(depot.my.alertError);
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

myOwn.clientSides={
    newPass:{
        prepare: function(depot, fieldName){
            var td=depot.rowControls[fieldName];
            td.disable(false);
            TypedControls.adaptElement(td, 'text');
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
    }
};
