"use strict";

/// <reference path="../node_modules/types.d.ts/modules/typed-controls/index.d.ts" />
//no/ <reference path="../node_modules/types.d.ts/modules/dialog-promise/index.d.ts" />
/// <reference path="../node_modules/types.d.ts/modules/codenautas-umd/index.d.ts" />
/* No sabemos cómo referenciar a los tipos escritos en mwOwn/index.d.ts */ 
//NO/ <reference path="../node_modules/types.d.ts/modules/myOwn/index.d.ts" />
/// <reference path="../node_modules/types.d.ts/modules/myOwn/in-myOwn.d.ts" />
/// <reference path="./in-backend-plus.d.ts" />
/// <amd-dependency path="../node_modules/types.d.ts/modules/typed-controls/index.d.ts" name="TypedControls" />
/// <amd-dependency path="../node_modules/types.d.ts/modules/dialog-promise/index.d.ts" name="DialogPromise" />
/// <amd-dependency path="../node_modules/types.d.ts/modules/type-store/index.d.ts" name="TypeStore" />

/*jshint eqnull:true */
/*jshint node:true */

(function codenautasModuleDefinition(root, name, factory) {
    /* global define */
    /* istanbul ignore next */
    if(typeof root.globalModuleName !== 'string'){
        root.globalModuleName = name;
    }
    /* istanbul ignore next */
    if(typeof exports === 'object' && typeof module === 'object'){
        module.exports = factory();
    }else if(typeof define === 'function' && define.amd){
        define(factory);
    }else if(typeof exports === 'object'){
        // @ts-ignore
        exports[root.globalModuleName] = factory();
    }else{
        root[root.globalModuleName] = factory();
    }
    root.globalModuleName = null;
})(/*jshint -W040 */this, 'myOwn', function() {
/*jshint +W040 */

/*jshint -W004 */
var myOwn = require('../unlogged/my-ajax');
/*jshint +W004 */

// var DialogPromise = require('dialog-promise');
// var TypeStore = require('type-store');
// var TypedControls = require('typed-controls');

myOwn.messages={};
myOwn.i18n={messages:{}};

myOwn.i18n.messages.en = {
    autoCloseWhenEnds: "auto close when ends",
    Cancel   : "Cancel",
    exportFields: "export fields",
    fromOtherTables: "from other tables",
    hiddens: "hiddens",
    notLogged: "Not logged in",
    noServer : "The server is inaccessible",
    noNetwork: "Not connected to the network",
    readOnly: "read only",
    reLogin  : "Sign in",
    stopCountDown: "stop count down"
};

myOwn.i18n.messages.es = {
    autoCloseWhenEnds: "cerrar la ventana al terminar",
    Cancel   : "Cancelar",
    exportFields: "exportar campos",
    fromOtherTables: "desde otras tablas",
    hiddens: "ocultos",
    notLogged: "Sin sesión activa",
    noServer : "No se puede acceder al servidor",
    noNetwork: "No se detecta conexión de red",
    readOnly: "solo lectura",
    reLogin  : "Iniciar sesión",
    stopCountDown: "detener la cuenta regresiva"
};

var bestGlobals = require('best-globals');

var coalesce = bestGlobals.coalesce;
var changing = bestGlobals.changing;

var jsYaml = require('js-yaml');
var TypeStore=require('type-store');

var JSON4all = require('json4all');
var LocalDbTransaction = require('./my-localdb').LocalDbTransaction;
var LocalDb = require('./my-localdb').LocalDb;
var WebSqlDb = require('./my-websqldb').WebsqlDb;


/** @param {string} name 
  * @param {number|undefined} version
  * @returns {Promise<IDBDatabase>}
  */
function idbOpen(name, version){
    /** @type {IDBRequest} */
    return IDBX(indexedDB.open(name, version));
}

/** @param {IDBRequest} request */
function IDBX(request){
    return new Promise(function(resolve, reject){
        if('onsuccess' in request){
            request.onsuccess=function(event){
                resolve(request.result);
            }
        }else{
            request.oncomplete=function(event){
                resolve(request.result);
            }
        }
        request.onerror=function(reject){
            alertPromise(request.error.message)
            reject(request.error);
        }
    })
}

if(typeof window != "undefined"){
    window.IDBX = IDBX;
}

myOwn.statusDivName = 'reconnection_div';

myOwn.autoSetupFunctions = [
    function autoSetupMyThings(){
        var my = this;
        if(!('server' in my)){
            my.server = {connected: null, broadcaster:html.div({id:'server-status-broadcaster'}).create()}
        }
        my.captureKeys();
        // document.addEventListener('click', function(event){
        //     if(document.buttonLupa && !document.buttonLupa.forElement.contains(event.target)){
        //         my.quitarLupa();
        //     }
        // });
        document.addEventListener('click', function(event){
            var button = event.target;
            document.mayBeRepetibleButton = null;
            if(button instanceof HTMLButtonElement || button instanceof HTMLInputElement && button.type=='button'){
                if(button.parentNode && button.parentNode.tagName=='TD' && button.parentNode.getAttribute('my-colname')) document.mayBeRepetibleButton = button;
            }
        })
        setTimeout(function(){
            my.testKeepAlive();
        },2000);
        setInterval(function(){
            my.testKeepAlive();
        },10000);
        window.addEventListener("error", function myErrorHandler(error, url, lineNumber) {
            my.log('error', error.message);
        });
        window.addEventListener("unhandledrejection", function(event) {
            if(!event.reason.DialogPromise){
                my.log('error', event.reason.message);
            }
        });
        TypeStore.options.doNotCopyNonCopyables=true;
        TypeStore.options.doNotOutputNonCopyables=true;
        if(!('offline' in my)){
            my.offline={};
            Object.defineProperty(my.offline, 'mode', {
                get:function(){
                    return localStorage.getItem(my.appName+my.clientVersion+'_offline_mode')=='offline';
                },
                set:function(offline){
                    return localStorage.setItem(my.appName+my.clientVersion+'_offline_mode', offline?'offline':'online');
                }
            })
        }
        return my.readProcedureDefinitions().then(function(){
            DialogPromise.path.img=my.path.img;
            TypedControls.path.img=my.path.img;
        })
    }
];
myOwn.deleteLocalDb = function deleteLocalDb(){
    var gridBuffer = my.config.config['grid-buffer'];
    var offlineMode = gridBuffer && (gridBuffer === 'idbx' || gridBuffer === 'wsql');
    if(offlineMode){
        try{
            switch(gridBuffer) {
                case 'idbx':
                  return LocalDb.deleteDatabase(my.appName+my.clientVersion);              
                case 'wsql':
                  return WebSqlDb.deleteDatabase(my.appName+my.clientVersion);              
                default:
                  throw new Error('grid buffer name is bad defined')
              }
        }catch(err){
            my.log(err);
        }
    }
    
}
myOwn.autoSetup = function autoSetup(){
    var my=this;
    if(my.promiseChainAutoSetup){
        console.log('Multiple calls to autoSetup()');
        return my.promiseChainAutoSetup;
    }
    var promiseChain=Promise.resolve();
    my.autoSetupFunctions.forEach(function(autoSetupFunction){
        promiseChain=promiseChain.then(autoSetupFunction.bind(my));
    });
    my.promiseChainAutoSetup=promiseChain;
    return promiseChain;
}
    
myOwn["log-severities"] = {
    error:{permanent:true },
    log  :{permanent:false},
};
    
myOwn.log = function log(severity, message){
    var my=this;
    var consoleMessage;
    var clientMessage;
    if(!message){
        if(severity instanceof Error){
            clientMessage=severity.message;
            consoleMessage=severity;
            severity='error';
        }else{
            clientMessage=severity;
            severity='log';
        }
    }else{
        clientMessage = message;
    }
    consoleMessage = consoleMessage || clientMessage;
    console.log(severity, consoleMessage);
    var statuses = [...document.querySelectorAll('#mini-console')];
    if(statuses.length==0) statuses = [document.body];
    statuses.forEach(status=>{
        var divMessage = html.div({"class": ["status-"+severity]}, clientMessage).create();
        if(status.firstChild){
            status.insertBefore(divMessage, status.firstChild);
        }else{
            status.appendChild(divMessage);
        }
        if(!this["log-severities"][severity].permanent){
            setTimeout(function(){
                my.fade(divMessage);
            },3000);
        }else{
            setTimeout(function(){
                my.fade(divMessage);
            },30000);
        }
    })
};

myOwn.fade = function fade(element, options){
    options=options||{};
    if (!element.parentNode) return
    if(element.tagName.toUpperCase()==='TR' && element.parentNode.replaceChild && !options.fast){
        var parent=element.parentNode;
        var dummyTr=document.createElement(element.tagName);
        dummyTr.className=element.className;
        options.smooth=options.smooth||{};
        var spans=options.smooth.spans;
        var sourceRow;
        if(spans){
            sourceRow=spans.map(function(span){
                return {tagName:'td', colSpan:span};
            })
        }else{
            sourceRow=Array.prototype.slice.call(element.cells);
        }
        sourceRow.forEach(function(cell){
            var dummyCell=document.createElement(cell.tagName);
            dummyTr.appendChild(dummyCell);
            dummyCell.className=cell.className;
            dummyCell.colSpan=cell.colSpan;
        });
        var div=document.createElement('div');
        dummyTr.cells[1].appendChild(div);
        div.style.height=Math.min(window.innerHeight*0.5, element.cells[0].offsetHeight-2)+'px';
        div.style.transition='height 0.6s ease';
        div.style.overflowY='hidden';
        parent.replaceChild(dummyTr, element);
        if(options.smooth.content){
            div.appendChild(options.smooth.content);
        }
        setTimeout(function(){
            div.style.height='1px';
        },10);
        setTimeout(function(){
            parent.removeChild(dummyTr);
        },500);
    }else{
        element.parentNode.removeChild(element);
    }
};


myOwn.focusFirstColumnOf = function focusFirstColumnOf(row){
    var my = this;
    var element = my.nextElementThatIs(row.cells[0],my.beInteractive);
    if(element){
        element.focus();
    }
}


myOwn.insertRow = function insertRow(where){
    var my = this;
    var section, iRow, newTr;
    if(where.under){
        section = where.under.parentNode;
        iRow = where.under.sectionRowIndex+1;
    }else if('iRow' in where && (where.table||where.section)){
        section = where.table||where.section;
        iRow = where.iRow;
    }else{
        throw new Error('my-tables insert without good where');
    }
    var tr = section.insertRow(iRow);
    if(where.smooth){
        if(where.smooth===true){ 
            where.smooth={};
        }
        var trDummy = section.insertRow(iRow);
        trDummy.setAttribute('dummy','inserting')
        tr.style.display='none';
        for(var i=0; i<(where.smooth.colCount||1); i++){
            var cell=trDummy.insertCell(-1);
            cell.colSpan=(where.smooth.spans||{})[i]||1;
        }
        var divDummy=html.div({class:'grid-dummy-cell-ini'}).create();
        trDummy.appendChild(divDummy);
        setTimeout(function(){
            divDummy.style.height=(where.smooth.height||20)+'px';
        },10);
        setTimeout(function(){
            trDummy.style.display='none';
            tr.style.display='';
            section.removeChild(trDummy);
            if(where.autoFocus!==false){
                setTimeout(function(){
                    my.focusFirstColumnOf(tr);
                    window.keyStarForceFocusNow=true;
                },100);
            }
        },500);
    }
    return tr;
};

myOwn.adaptData = function adaptData(tableDef, rows){
    rows.forEach(function(row){
        tableDef.fields.forEach(function(fieldDef){
            if(fieldDef.typeName=='number' && fieldDef.exact && fieldDef.decimals){
                if(row[fieldDef.name]){
                    row[fieldDef.name] = row[fieldDef.name]-0;
                }
            }
            /*
            if(fieldDef.typeName=='date'){
                if(row[fieldDef.name] && !(row[fieldDef.name] instanceof Date)){
                    row[fieldDef.name] = bestGlobals.date.iso(row[fieldDef.name]);
                }
            }
            */
        });
    });
};

Object.defineProperty(myOwn, 'ajax', {
    get: function ajax(){
        if(!this.config){
            throw new Error("before use myOwn.ajax, myOwn.autoSetup() must be called");
        }else{
            return this.ajaxPromise;
        }
    }
});

myOwn.launcherOk=function(launcher){
    return function(result){
        launcher.title=launcher.originalTitle;
        launcher.removeAttribute('my-working');
        return result;
    }
}

myOwn.launcherCatch=function(launcher){
    return function(err){
        launcher.title=err.message;
        launcher.setAttribute('my-working','error');
        throw err;
    }
}

myOwn.propertiesWhiteList=['message','detail','code','table','constraint','name','severity'];

myOwn.alertError = function(err){
    return dialogPromise(function(dialogWindow, closeWindow){
        var button=html.button(DialogPromise.messages.Ok).create();
        button.addEventListener('click',function(){
            closeWindow();
        });
        dialogWindow.appendChild(html.table([html.tr([
            html.td({class:'dialog-error-img'}, [html.img({src:my.path.img+'warning128.png'})]),
            html.td([
                html.pre(myOwn.propertiesWhiteList.map(function(name){ 
                    return err[name]?err[name]+'\n':'';
                }).join('')),
                html.div([button])
            ])
        ])]).create());
    });
}

myOwn.testKeepAlive = function testKeepAlive(){
    var my = this;
    var element = document.getElementById('keep-alive-signal') || my.debugging && document.body.appendChild(html.div({id:'keep-alive-signal'}).create());
    if(element){
        element.textContent='t';
        element.style.backgroundColor='#4DD';
        element.style.display='';
    }
    var startTime=new Date().getTime();
    return my.ajaxPromise({
        parameters:[],
        method:'post',
        action:'keep-alive.json',
        encoding:'plain',
        progress:false
    },{},{visiblyLogErrors:false}).then(function(){
        if(window.updateOnlineStatus){
            updateOnlineStatus();
        }
        var lightServer = document.getElementById('light-server');
        if(lightServer){
            lightServer.src=my.path.img+'server-ok.png';
            if(!my.server.connected){
                my.server.connected = true;
                my.server.broadcaster.dispatchEvent(new Event('serverConnected'));
            }
            var speed=1000/(1+new Date().getTime()-startTime);
            if(isNaN(lightServer.result.speed)){
                lightServer.result.speed = speed; 
            }
            lightServer.result.speed = Math.ceil((lightServer.result.speed*7 + speed)/8); 
            lightServer.title = lightServer.result.speed;
        }
    }).then(function(){
        if(element){
            element.textContent='ok';
            element.style.backgroundColor='lightgreen';
        }
    },function(){
        if(element){
            element.textContent='E!';
            element.style.backgroundColor='#F88';
        }
    }).then(function(){
        if(element){
            setTimeout(function(){
                element.style.display='none';
            }, 2000);
        }
    })
};

myOwn.showQuestion = function showQuestion(message, opts){
    return confirmPromise(message, opts);
};

myOwn.easeInOut = function easeInOut(currentTime, start, change, duration) {
    currentTime /= duration / 2;
    if (currentTime < 1) {
        return change / 2 * currentTime * currentTime + start;
    }
    currentTime -= 1;
    return -change / 2 * (currentTime * (currentTime - 2) - 1) + start;
};

myOwn.scrollToTop = function(element, to, duration) {
    var start = element.scrollTop,
        change = to - start,
        increment = 20;
    var me = this;
    var animateScroll = function(elapsedTime) {        
        elapsedTime += increment;
        var position = me.easeInOut(elapsedTime, start, change, duration);                        
        element.scrollTop = position; 
        if (elapsedTime < duration) {
            setTimeout(function() {
                animateScroll(elapsedTime);
            }, increment);
        } else {
            element.scrollTop = document.documentElement.scrollTop = 0; // cross browser scrolling to top
        }
    };
    animateScroll(0);
};

myOwn["connection-status"]={
   logged   : { show: false, mustAsk: false },
   notLogged: { show: true , mustAsk: {idMessage:'reLogin', url:'login'}},
   noServer : { show: true , mustAsk: false, id:'light-server'        , img:'server-error'     },
   noNetwork: { show: true , mustAsk: false, id:'light-network-signal', img:'network-no-signal'},
};

myOwn.debuggingStatus=false;  // /* 
if(new Date()<bestGlobals.datetime.ymdHms(2016,10,25,14,50,0)){
    myOwn.debuggingStatus=function(statusCode){
        myOwn.debuggingStatus.count=(myOwn.debuggingStatus.count||0)+1
        if(!window.debuggingStatusDiv){
            var box=document.createElement('div');
            box.style.position='fixed';
            box.style.left='400px';
            box.style.top='30px';
            box.style.border='1px dashed green';
            box.style.backgroundColor='rgba(230,230,180,0.5)';
            box.textContent='actual status:';
            window.debuggingStatusDiv=document.createElement('div');
            document.body.appendChild(box);
            box.appendChild(window.debuggingStatusDiv);
            window.debuggingStatusDiv.id='debuggingStatusDiv';
        }
        window.debuggingStatusDiv.textContent=statusCode+' '+myOwn.debuggingStatus.count;
    };
}

myOwn.informDetectedStatus = function informDetectedStatus(statusCode, logged) {
    if(!logged){
        window.location.href='login';
    }
};

function isInteracive(element){
"use strict";
    return (
        (element instanceof HTMLInputElement || element instanceof HTMLButtonElement || element instanceof HTMLTextAreaElement)
        && !element.disabled
        || element instanceof HTMLElement && element.contentEditable=="true"
    )
    && element.style.display!='none'
    && element.style.visibility!='hidden'
    && !element.getAttribute('skip-enter')
    && (element.tabIndex==null || element.tabIndex>=0 || element.contentEditable=="true");
}

function nextElement(elemento, noGoDownWhen){
"use strict";
    var proximo=elemento;
    var no_me_voy_a_colgar=200;
    if(elemento.children.length && !noGoDownWhen(proximo)){
        while(proximo.children.length>0 && no_me_voy_a_colgar-- && !noGoDownWhen(proximo)){
            proximo=proximo.children[0];
        }
        return proximo;
    }else{
        while(proximo && proximo.nextElementSibling===null && no_me_voy_a_colgar--){
            proximo=proximo.parentNode;
        }
        if(proximo){
            return proximo.nextElementSibling;
        }
    }
    return null;
}

function proximo_elemento_que_sea(elemento, controlador){
"use strict";
    var proximo=nextElement(elemento,controlador);
    var no_me_voy_a_colgar=2000;
    while(proximo && !controlador(proximo) && no_me_voy_a_colgar--){
        proximo=nextElement(proximo,controlador);
    }
    return proximo;
}

myOwn.beInteractive = function beInteractive(element, controller){
    return isInteracive(element)
}

myOwn.nextElementThatIs = function nextElementThatIs(element, controller){
    return proximo_elemento_que_sea(element, controller);
}

function enter_hace_tab_en_este_elemento(elemento){
    return elemento.tagName!="TEXTAREA";
}

function tableInfo(element){
    var info={};
    while(element && element.tagName!='TABLE'){
        if(element.tagName=='TR'){
            info.tr=info.tr||element;
        }
        if(element.tagName=='TD'){
            info.td=info.td||element;
        }
        element=element.parentNode;
    }
    if(element){
        info.table=element;
    }
    return info;
}

myOwn.tableInfo = tableInfo

function getCaretPosition(element) {
    // https://stackoverflow.com/questions/4811822/get-a-ranges-start-and-end-offsets-relative-to-its-parent-container/4812022#4812022
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ( (sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}

myOwn.captureKeys = function captureKeys() {
    var previousKey;
    var previousPosition;
    var my=this;
    if(this.captureKeysInstaled){
        throw new Error('captureKeysInstaled');
    }
    this.captureKeysInstaled=true;
    document.addEventListener('keydown', function(evento){
        // document.title=evento.which+','+evento.shiftKey+','+evento.ctrlKey+','+evento.altKey+','+evento.metaKey;
        if(evento.which==37 && !evento.shiftKey  && !evento.ctrlKey  && !evento.altKey  && !evento.metaKey){ // KeyLeft
            var info=tableInfo(this.activeElement);
            if(info.table){
                if(evento.ctrlKey || info.td.textContent=='' || !getCaretPosition(info.td)){
                    var newPos=info.td.cellIndex-1;
                    while(newPos && !my.beInteractive(info.tr.cells[newPos])){
                        newPos--;
                    }
                    if(my.beInteractive(info.tr.cells[newPos])){
                        info.tr.cells[newPos].focus();
                        if(document.activeElement){
                            var sel = window.getSelection()
                            sel.collapse(document.activeElement,document.activeElement.childNodes.length);
                        }
                        evento.preventDefault();
                    }
                }
            }
        }
        var goRight=function(){
            var newPos=info.td.cellIndex+1;
            while(newPos<=info.tr.cells.length && !my.beInteractive(info.tr.cells[newPos])){
                newPos++;
            }
            if(my.beInteractive(info.tr.cells[newPos])){
                info.tr.cells[newPos].focus();
                evento.preventDefault();
            }
        };
        if(evento.which==39 && !evento.shiftKey  && !evento.ctrlKey  && !evento.altKey  && !evento.metaKey){ // KeyRight
            var info=tableInfo(this.activeElement);
            if(info.table){
                if(evento.ctrlKey || info.td.textContent=='' || (previousKey == 39 && getCaretPosition(info.td)==info.td.textContent.length)){
                    goRight();
                    previousPosition=false;
                }else{
                    previousPosition=getCaretPosition(info.td)
                }
            }
        }
        if((evento.which==40 || evento.which==38)  && !evento.shiftKey  && !evento.ctrlKey  && !evento.altKey  && !evento.metaKey){ // KeyDown, KeyUp
            var info=tableInfo(this.activeElement);
        }
        if((evento.which==40 || evento.which==38)  && !evento.shiftKey  && !evento.ctrlKey  && !evento.altKey  && !evento.metaKey){ // KeyDown, KeyUp
            var info=tableInfo(this.activeElement);
            if(info.table){
                var newPos=info.tr.rowIndex+evento.which-39;
                var newRow=info.table.rows[newPos];
                if(newRow){
                    var newCell = newRow.cells[info.td.cellIndex];
                    if(my.beInteractive(newCell)){
                        newCell.focus();
                        evento.preventDefault();
                    }
                }
            }
        }
        if(evento.which==123 && !evento.shiftKey  && !evento.ctrlKey  && evento.altKey  && !evento.metaKey){ // Shift F12
            var info=tableInfo(this.activeElement);
            if(info.tr.depot){
                my.ajax.history_changes({
                    tableName: info.tr.depot.def.name,
                    fieldName: info.td.getAttribute('my-colname'),
                    primaryKeyValues: info.tr.depot.primaryKeyValues //JSON4all.parse(info.tr.getAttribute('pk-values'))
                }).then(function(value){
                    var div=html.div({class:'json-result'}).create();
                    my.agregar_json(div, value);
                    return alertPromise(div);
                })
            }
        }
        if(evento.which==115 && !evento.shiftKey  && !evento.ctrlKey  && !evento.altKey  && !evento.metaKey){ // F4
            /** @type {HTMLElement} */
            var activeElement = this.activeElement && this.activeElement.tagName!='BODY' && this.activeElement || document.mayBeRepetibleButton; 
            var info=tableInfo(activeElement);
            if(info.table){
                var abovePos=info.tr.rowIndex-1;
                var aboveRow=info.table.rows[abovePos];
                if(aboveRow){
                    var aboveCell = aboveRow.cells[info.td.cellIndex];
                    /** @type {HTMLButtonElement} */
                    var button = activeElement;
                    if(button.tagName == 'BUTTON' || button.tagName=='INPUT' && button.type=='button'){
                        if(info.td.childNodes.length==1){
                            button.click();
                            var bellowRow = info.table.rows[info.tr.rowIndex+1];
                            if(bellowRow){
                                var nextButton = bellowRow.cells[info.td.cellIndex].childNodes[0]
                                if(nextButton && nextButton.tagName == 'BUTTON' || nextButton.tagName=='INPUT' && buttnexButtonon.type=='BUTTON'){
                                    nextButton.focus()
                                }
                            }
                        }
                    }else if(aboveCell.getTypedValue){
                        var value=aboveCell.getTypedValue();
                        if(info.td.setTypedValue){
                            info.td.setTypedValue(value, true);
                            var belowPos=info.tr.rowIndex+1;
                            var belowRow=info.table.rows[belowPos];
                            if(belowRow){
                                var belowCell = belowRow.cells[info.td.cellIndex];
                                if(my.beInteractive(belowCell)){
                                    belowCell.focus();
                                    evento.preventDefault();
                                }
                            }
                        }
                    }
                }
            }
        }
        if(evento.which==115 && evento.shiftKey  && !evento.ctrlKey  && !evento.altKey  && !evento.metaKey){ // F4
            var info=tableInfo(this.activeElement);
            var getRefCell = function(delta){
                var refPos=info.tr.rowIndex + delta;
                var refRow=info.table.rows[refPos];
                if(refRow){
                    var candidateCell = refRow.cells[info.td.cellIndex];
                    if(candidateCell.getTypedValue){
                        return candidateCell;
                    }
                }
                return null;
            }
            if(info.table){
                var refCell = getRefCell(-1) || getRefCell(1);
                if(refCell){
                    var value=refCell.getTypedValue();
                    if(info.td.setTypedValue){
                        info.td.setTypedValue(value, true);
                        goRight();
                    }
                }
            }
        }
        document.mayBeRepetibleButton = null;
        previousKey=evento.which;
    });
    document.addEventListener('keypress', function(evento){
        if(my.config.useragent.isiPad && evento.which==231){ // F4
            var info=tableInfo(this.activeElement);
            if(info.table){
                var abovePos=info.tr.rowIndex-1;
                var aboveRow=info.table.rows[abovePos];
                if(aboveRow){
                    var aboveCell = aboveRow.cells[info.td.cellIndex];
                    if(aboveCell.getTypedValue){
                        var value=aboveCell.getTypedValue();
                        if(info.td.setTypedValue){
                            info.td.setTypedValue(value, true);
                            var belowPos=info.tr.rowIndex+1;
                            var belowRow=info.table.rows[belowPos];
                            if(belowRow){
                                var belowCell = belowRow.cells[info.td.cellIndex];
                                if(my.beInteractive(belowCell)){
                                    belowCell.focus();
                                    evento.preventDefault();
                                }
                            }
                        }
                    }
                }
            }
        }
        if(window.keyStarForceFocusNow){
            window.keyStarForceFocusNow=false;
            if(evento.which==106 && !evento.shiftKey  && !evento.ctrlKey  && !evento.altKey  && !evento.metaKey){
                this.activeElement.focus();
            }
        }
        if(evento.which==13 && !evento.shiftKey  && !evento.ctrlKey  && !evento.altKey  && !evento.metaKey && !this.activeElement.getAttribute("enter-clicks")){ // Enter
            var enfoco=this.activeElement;
            var este=this.activeElement;
            if(enter_hace_tab_en_este_elemento(este)){
                var no_me_voy_a_colgar=2000;
                while(este && this.activeElement===enfoco && no_me_voy_a_colgar--){
                    este=proximo_elemento_que_sea(este,isInteracive);
                    if(este){
                        este.focus();
                    }
                }
                if(este){
                    evento.preventDefault();
                }
            }
        }
    });
};

// myOwn.quitarLupa = function quitarLupa(){
//     if(document.buttonLupa){
//         document.body.removeChild(document.buttonLupa);
//         clearTimeout(document.buttonLupaTimmer);
//         document.buttonLupaTimmer=null;
//         document.buttonLupa=null;
//     }
// }

myOwn.path={
    img:'img/'
}

myOwn.getUniqueDomId = function getUniqueDomId(){
    myOwn.getUniqueDomId.serial=(myOwn.getUniqueDomId.serial||0)+1;
    return 'uniQ$___$id'+myOwn.getUniqueDomId.serial;
}

myOwn.prepareFloating3dots = function prepareFloating3dots(){
    if(!my.imgFloating3dots && false){
        var img = html.img({src:my.path.img+'floating-3dots.png', class:'floating-img'}).create();
        my.imgFloating3dots=img;
        var rePosition = function(){
            img.style.visibility=window.scrollY || window.scrollX?'visible':'hidden';
            img.style.top = window.innerHeight - 40 + 'px';
            img.style.left = window.innerWidth - 40 + 'px';
        }
        img.style.position='fixed';
        document.body.appendChild(img);
        setTimeout(rePosition,100);
        window.addEventListener('scroll', rePosition);
        window.addEventListener('resize', rePosition);
    }
}

myOwn.inlineCss = function inlineCss(id){
    var autoStyle = document.getElementById(id);
    if(!autoStyle){
        var autoStyle=document.createElement('style');
        autoStyle.type = 'text/css';
        autoStyle.id=id;
        document.getElementsByTagName('head')[0].appendChild(autoStyle);
    }
    return autoStyle;
}

myOwn.createSmartButton = function createSmartButton(opts){
    var button=opts.button || html.button(opts.buttonProperties||{}, opts.buttonContent||opts.buttonLabel).create();
    Object.defineProperty(button, 'smartState', {
        get:function(){ return this.getAttribute('smart-button'); },
        set:function(value){ 
            this.disabled=value!='active';
            this.setAttribute('smart-button',value); 
        }
    })
    button.smartState=opts.initialState||'unkown';
    button.onclick=function(){
        var button=this;
        button.smartState='working';
        Promise.resolve().then(function(){
            if(opts.confirmMessage){
                return confirmPromise(opts.confirmMessage);
            }
        }).then(function(){
            return opts.mainFun({ajaxOpts:{launcher:button}});
        }).then(function(result){
            button.smartState='unknown';
            (opts.okFun||function(result){
                button.smartState='active';
                return alertPromise(result,{reject:false});
            })(result);
        },function(err){
            button.smartState='error';
            (opts.errorFun||function(err){
                button.smartState='active';
                return alertPromise(err.message,{reject:false});
            })(err);
        })
    };
    if(opts.insideElement){
        opts.insideElement.appendChild(button);
    }
    return button;
};

myOwn.registerPostInput = function registerPostInput(postInputName, postInputFunction){
    TypeStore.type.text.postInputs[postInputName]=postInputFunction;
}

return myOwn;

});
