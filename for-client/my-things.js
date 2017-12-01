"use strict";
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
        exports[root.globalModuleName] = factory();
    }else{
        root[root.globalModuleName] = factory();
    }
    root.globalModuleName = null;
})(/*jshint -W040 */this, 'myOwn', function() {
/*jshint +W040 */

/*jshint -W004 */
var myOwn = {};
/*jshint +W004 */

myOwn.messages={};
myOwn.i18n={messages:{}};

myOwn.i18n.messages.en = {
    Cancel   : "Cancel",
    notLogged: "Not logged in",
    noServer : "The server is inaccessible",
    noNetwork: "Not connected to the network",
    reLogin  : "Sign in"
};

myOwn.i18n.messages.es = {
    Cancel   : "Cancelar",
    notLogged: "Sin sesión activa",
    noServer : "No se puede acceder al servidor",
    noNetwork: "No se detecta conexión de red",
    reLogin  : "Iniciar sesión",
};

var bestGlobals = require('best-globals');

var coalesce = bestGlobals.coalesce;
var changing = bestGlobals.changing;

var jsYaml = require('js-yaml');
var TypeStore=require('type-store');

var JSON4all = require('json4all');

function id(x){return x;}

myOwn.statusDivName = 'reconnection_div';

myOwn.autoSetupFunctions = [
    function autoSetupMyThings(){
        var my = this;
        var readProcedureDefinitions = function readProcedureDefinitions(){
            return my.ajaxPromise({
                action:'client-setup',
                method:'get',
                encoding:'JSON',
                parameters:[]
            }).then(function(setup){
                my.config = setup;
                my.config.procedure=my.config.procedure||{};
                my.config.procedures.forEach(function(procedureDef){
                    my.config.procedure[procedureDef.action]=procedureDef;
                    var target;
                    var lastName = null;
                    procedureDef.parameter=procedureDef.parameter||{};
                    procedureDef.parameters.forEach(function(parameterDef){
                        procedureDef.parameter[parameterDef.name]=parameterDef;
                    });
                    var partsNames=procedureDef.action.split('/').filter(id).forEach(function(name){
                        if(lastName){
                            if(!target[lastName]){
                                target[lastName]={"dont-use":lastName};
                            }else if(target[lastName]["dont-use"]!==lastName){
                                throw new Error("Bad nesting of procedures");
                            }
                            target=target[lastName];
                        }else{
                            target=my.ajax;
                        }
                        lastName=name;
                    });
                    target[lastName]=my.ajaxPromise.bind(my,procedureDef);
                    var activeUserElement = document.getElementById('active-user');
                    if(activeUserElement){
                        activeUserElement.textContent=my.config.username||'-';
                    }
                });
                DialogPromise.path.img=my.path.img;
                TypedControls.path.img=my.path.img;
            });
        };
        my.captureKeys();
        document.addEventListener('click', function(event){
            if(document.buttonLupa && !document.buttonLupa.forElement.contains(event.target)){
                my.quitarLupa();
            }
        });
        setInterval(function(){
            my.testKeepAlive();
        },2000);
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
        return readProcedureDefinitions();
    }
];
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
    var status = document.getElementById('mini-console');
    console.log(severity, consoleMessage);
    status = status||document.body;
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
};

myOwn.fade = function fade(element, options){
    if(element.tagName.toUpperCase()==='TR' && element.parentNode.replaceChild){
        var parent=element.parentNode;
        var dummyTr=document.createElement(element.tagName);
        dummyTr.className=element.className;
        options=options||{};
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
        div.style.height=(element.cells[0].offsetHeight-2)+'px';
        div.style.transition='height 0.6s ease';
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
    element.focus();
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
            setTimeout(function(){
                my.focusFirstColumnOf(tr);
                window.keyStarForceFocusNow=true;
            },100);
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

myOwn.encoders = {
    JSON: { parse: JSON.parse, stringify: JSON.stringify },
    plain: { 
        parse: function(x){return x;}, 
        stringify: function(x){
            if(typeof x === "object" /* && !(x instanceof FileList)*/){
                throw new Error("Invalid plain type "+(x==null?value:typeof x)+" detected");
            }
            return x;
        }
    },
    yaml: {
        parse: jsYaml.load.bind(jsYaml),
        stringify: jsYaml.dump.bind(jsYaml),
    },
    JSON4all: {
        parse: JSON4all.parse,
        stringify: JSON4all.stringify,
    },
};

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

myOwn.alertError = function(err){
    return dialogPromise(function(dialogWindow, closeWindow){
        var button=html.button(DialogPromise.messages.Ok).create();
        button.addEventListener('click',function(){
            closeWindow();
        });
        dialogWindow.appendChild(html.div([
            html.div({class:'dialog-error-img'}, [html.img({src:my.path.img+'warning128.png'})]),
            html.pre(err.message),
            html.div([button])
        ]).create());
    });
}

myOwn.ajaxPromise = function(procedureDef,data,opts){
    opts = opts || {};
    if(!('visiblyLogErrors' in opts)){
        opts.visiblyLogErrors=true;
    }
    var my = this;
    if(opts.launcher){
        if(!opts.launcher.originalTitle){
            opts.launcher.originalTitle=opts.launcher.title;
        }else{
            opts.launcher.title=opts.launcher.originalTitle;
        }
        opts.launcher.setAttribute('my-working','working');
    }
    return Promise.resolve().then(function(){
        var params={};
        procedureDef.parameters.forEach(function(paramDef){
            var value=coalesce(data[paramDef.name],'defaultValue' in paramDef?paramDef.defaultValue:coalesce.throwErrorIfUndefined("lack of parameter "+paramDef.name));
            value = my.encoders[paramDef.encoding].stringify(value);
            params[paramDef.name]=value;
        });
        if(data && data.files){
            params.files=data.files;
        }
        return AjaxBestPromise[procedureDef.method]({
            multipart:procedureDef.files,
            url:procedureDef.action,
            data:params,
            uploading:opts.uploading
        }).then(function(result){
            if(result && result[0]=="<" && result.match(/login/m)){
                my.informDetectedStatus('notLogged');
                throw changing(new Error(my.messages.notLogged),{displayed:true, isNotLoggedError:true});
            }
            my.informDetectedStatus('logged', true);
            return my.encoders[procedureDef.encoding].parse(result);
        }).catch(function(err){
            if(opts.launcher){
                opts.launcher.setAttribute('my-working','error');
                opts.launcher.title='err';
            }
            if(!err.isNotLoggedError) {
                if(!window.navigator.onLine) {
                    my.informDetectedStatus('noNetwork');
                }else if(!!err.originalError) {
                    my.informDetectedStatus('noServer');
                } else {
                    my.informDetectedStatus('logged', true);
                }
            }
            if(!err.displayed && opts.visiblyLogErrors || err.status==403){
                my.log(err);
            }
            throw err;
        });
    });
};

myOwn.testKeepAlive = function testKeepAlive(){
    var my = this;
    var skin=(this.config||{}).skin;
    var skinUrl=(skin?skin+'/':'');
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
        action:'keep-alive',
        encoding:'plain'
    }).then(function(){
        if(window.updateOnlineStatus){
            updateOnlineStatus();
        }
        var lightServer = document.getElementById('light-server');
        lightServer.src=skinUrl+'img/server-ok.png';
        var speed=1000/(1+new Date().getTime()-startTime);
        if(isNaN(lightServer.result.speed)){
            lightServer.result.speed = speed; 
        }
        lightServer.result.speed = Math.ceil((lightServer.result.speed*7 + speed)/8); 
        lightServer.title = lightServer.result.speed;
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
   noServer : { show: true , mustAsk: false, id:'light-server' , img:'server-error'     },
   noNetwork: { show: true , mustAsk: false, id:'light-network', img:'network-no-signal'},
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
    && (element.tabIndex==null || element.tabIndex>=0);
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

function getCaretPosition(editableDiv) {
  // https://stackoverflow.com/questions/3972014/get-caret-position-in-contenteditable-div
  var caretPos = 0,
    sel, range;
  if (window.getSelection) {
    sel = window.getSelection();
    if (sel.rangeCount) {
      range = sel.getRangeAt(0);
      if (editableDiv.contains(range.commonAncestorContainer)) {
        caretPos = range.endOffset;
      }
    }
  } else if (document.selection && document.selection.createRange) {
    range = document.selection.createRange();
    if (range.parentElement() == editableDiv) {
      var tempEl = document.createElement("span");
      editableDiv.insertBefore(tempEl, editableDiv.firstChild);
      var tempRange = range.duplicate();
      tempRange.moveToElementText(tempEl);
      tempRange.setEndPoint("EndToEnd", range);
      caretPos = tempRange.text.length;
    }
  }
  return caretPos;
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
        if(evento.which==37){ // KeyLeft
            var info=tableInfo(this.activeElement);
            if(info.table){
                if(evento.ctrlKey || info.td.textContent=='' || !getCaretPosition(info.td)){
                    var newPos=info.td.cellIndex-1;
                    while(newPos && !my.beInteractive(info.tr.cells[newPos])){
                        newPos--;
                    }
                    if(my.beInteractive(info.tr.cells[newPos])){
                        info.tr.cells[newPos].focus();
                        evento.preventDefault();
                    }
                }
            }
        }
        if(evento.which==39){ // KeyRight
            var info=tableInfo(this.activeElement);
            if(info.table){
                if(evento.ctrlKey || info.td.textContent=='' || (previousKey == 39 && previousPosition===getCaretPosition(info.td))){
                    var newPos=info.td.cellIndex+1;
                    while(newPos<=info.tr.cells.length && !my.beInteractive(info.tr.cells[newPos])){
                        newPos++;
                    }
                    if(my.beInteractive(info.tr.cells[newPos])){
                        info.tr.cells[newPos].focus();
                        evento.preventDefault();
                    }
                    previousPosition=false;
                }else{
                    previousPosition=getCaretPosition(info.td)
                }
            }
        }
        if(evento.which==40 || evento.which==38){ // KeyDown, KeyUp
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
        if(evento.which==115){ // F4
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
        previousKey=evento.which;
    });
    document.addEventListener('keypress', function(evento){
        if(window.keyStarForceFocusNow){
            window.keyStarForceFocusNow=false;
            if(evento.which==106){
                this.activeElement.focus();
            }
        }
        if(evento.which==13 && !this.activeElement.getAttribute("enter-clicks")){ // Enter
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

myOwn.getRect = function getRect(element){
    var rect = {top:0, left:0, width:element.offsetWidth, height:element.offsetHeight};
    while( element != null ) {
        rect.top += element.offsetTop;
        rect.left += element.offsetLeft;
        element = element.offsetParent;
    }
    return rect;
}

myOwn.quitarLupa = function quitarLupa(){
    if(document.buttonLupa){
        document.body.removeChild(document.buttonLupa);
        clearTimeout(document.buttonLupaTimmer);
        document.buttonLupaTimmer=null;
        document.buttonLupa=null;
    }
}

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

myOwn.prepareRulerToggle = function prepareRulerToggle(){
    if(!my.imgRulerToggle){
        var img = html.img({src:my.path.img+'floating-ruler-toggle.png', class:'floating-img'}).create();
        my.imgRulerToggle=img;
        var rePosition = function(){
            img.style.visibility=window.scrollY || window.scrollX?'visible':'hidden';
            img.style.top = '-10px';
            img.style.left = '-10px';
        }
        img.style.position='fixed';
        document.body.appendChild(img);
        setTimeout(rePosition,100);
        window.addEventListener('scroll', rePosition);
        window.addEventListener('resize', rePosition);
        var autoPosition=function(){
            var tables = document.querySelectorAll(".my-grid");
            if(tables){
                Array.prototype.forEach.call(tables,function(table){
                    var myTableName = table.getAttribute("my-table");
                    var autoStyleTop = my.inlineCss("css-my-table-"+myTableName+"-top");
                    var rect = my.getRect(table.tHead?table.tHead.rows[0]:table);
                    var cssClausules=[];
                    autoStyleTop.actualDif=my.autoRuler && window.scrollY-rect.top;
                    if(!('previousDif' in autoStyleTop) || autoStyleTop.actualDif!=autoStyleTop.previousDif){
                        if(autoStyleTop.actualDif>0){
                            cssClausules.push(
                                "[my-table=\""+myTableName.replace(/"/g,'\\"')+"\"] > thead > tr > th { position:relative; background-color:rgba(155,155,255,0.8); background-clip: padding-box; "+
                                " top:"+(autoStyleTop.actualDif)+'px; '+
                                "}"
                            );
                        }
                        autoStyleTop.previousDif = autoStyleTop.actualDif;
                        autoStyleTop.innerHTML=cssClausules.join('\n');
                    }
                    var autoStyleLeft = my.inlineCss("css-my-table-"+myTableName+"-left");
                    var cssSelectorH = "[my-table=\""+myTableName.replace(/"/g,'\\"')+"\"] > thead > tr > [my-fixed2left-column]";
                    var cssSelectorB = "[my-table=\""+myTableName.replace(/"/g,'\\"')+"\"] > tbody > tr > [my-fixed2left-column]";
                    var firstCell=Array.prototype.slice.call(table.querySelectorAll(cssSelectorH),0,100).find(function(cell){
                        return cell.scrollWidth>4;
                    });
                    if(firstCell){
                        var rect = my.getRect(firstCell);
                        var cssClausules=[];
                        autoStyleLeft.actualDif=my.autoRuler && window.scrollX-rect.left;
                        if(!('previousDif' in autoStyleLeft) || autoStyleLeft.actualDif!=autoStyleLeft.previousDif){
                            if(autoStyleLeft.actualDif>0){
                                cssClausules.push(
                                    cssSelectorB+
                                    " { position:relative; background-color:rgba(155,155,255,0.8); background-clip: padding-box; "+
                                    " left:"+(autoStyleLeft.actualDif)+'px; '+
                                    "}"
                                );
                            }
                            autoStyleLeft.previousDif = autoStyleLeft.actualDif;
                            autoStyleLeft.innerHTML=cssClausules.join('\n');
                        }
                    }
                });
            }
        }
        img.onclick=function(){
            my.autoRuler=!my.autoRuler;
            my.imgRulerToggle.src=my.path.img+'floating-ruler-toggle-'+(my.autoRuler?'on':'off')+'.png'
            setTimeout(function(){
                autoPosition();
            },100);
        }
        window.addEventListener('scroll', autoPosition);
        window.addEventListener('resize', autoPosition);
    }
}

return myOwn;

});
