"use strict";
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
})(/*jshint -W040 */this, 'myAjax', function() {
/*jshint +W040 */

/*jshint -W004 */
var myAjax = {};
/*jshint +W004 */

/** 
 *  @param {any} x
 *  @returns {any}
 */
myAjax.functionId = function id(x){return x;}

function requireIfExists(moduleName){
    if(typeof process != "undefined"){
        return {}
    }
    try{
        // eslint-disable-next-line 
        return require(moduleName);
    }catch(err){
        return {};
    }
}

var LocalDb  = requireIfExists('./my-localdb' ).LocalDb ;
var WebSqlDb = requireIfExists('./my-websqldb').WebsqlDb;

var jsYaml = require('js-yaml');
var JSON4all = require('json4all');

myAjax.parseCookies = function parseCookies(){
    var prefix = location.pathname.replace(/(^|\/)[^/]*$/,'').substr(1)+':';
    window.cookies = this.parseStrCookies(document.cookie, prefix);
}

myAjax.parseStrCookies = function parseStrCookies(cookieString, prefix){
    var output = {};
    cookieString.split(/\s*;\s*/).forEach(function(pair) {
        pair = pair.split(/\s*=\s*/);
        var varName = pair[0];
        if(varName.substr(0,prefix.length)==prefix){
            varName=varName.slice(prefix.length);
        }
        output[varName] = pair.splice(1).join('=');
    });
    return output;
}

myAjax.readProcedureDefinitions=function readProcedureDefinitions(){
    var my = this;
    var promise;
    var getStored=function(setupOrError){
        if(setupOrError && !(setupOrError instanceof Error) && !setupOrError.isoffline){
            localStorage.setItem('setup', JSON.stringify(setupOrError));
            return setupOrError;
        }
        var setupJson=localStorage.getItem('setup');
        if(setupJson){
            return JSON.parse(setupJson);
        }
        throw new Error("NOT CLIENT-CONFIGURED")
    }
    promise = my.ajaxPromise({
        action:'client-setup',
        method:'get',
        encoding:'JSON',
        parameters:[],
        progress:false
    }).then(getStored, getStored);
    return promise.then(function(setup){
        my.config = setup;
        if(typeof document !== "undefined"){
            var backgroundUrl
            if(my.config.config && my.config.config['background-img']){
                backgroundUrl = 'url("'+my.path.img+my.config.config['background-img']+'")'
            }else{
                if(/(^|[-_0-9/])(test|pru|prueba)($|[-_0-9/])/.test(location.pathname)){
                    backgroundUrl = 'url("img/background-test.png")';
                }else if(/(^|[-_0-9/])(capa|capacitacion)($|[-_0-9/])/.test(location.pathname)){
                    backgroundUrl = 'url("img/background-capa.png")';
                }else if(/(^|[-_0-9/])(desa|devel)($|[-_0-9/])/.test(location.pathname)){
                    backgroundUrl = 'url("img/background-devel.png")';
                }else{
                    backgroundUrl = '';
                }
            }
            document.body.style.backgroundImage=backgroundUrl;
        }
    }).then(function(){
        my.config.procedure=my.config.procedure||{};
        my.config.procedures.forEach(/** @param {bp.ProcedureDef} procedureDef */function(procedureDef){
            my.config.procedure[procedureDef.action]=procedureDef;
            var target;
            /** @type {string} */
            var lastName;
            procedureDef.parameter=procedureDef.parameter||{};
            procedureDef.parameters.forEach(function(parameterDef){
                procedureDef.parameter[parameterDef.name]=parameterDef;
            });
            var partsNames=procedureDef.action.split('/').filter(my.functionId).forEach(function(name){
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
        var gridBuffer = my.config.config['grid-buffer'];
        var offlineMode = gridBuffer && (gridBuffer === 'idbx' || gridBuffer === 'wsql');
        if(offlineMode){
            try{
                switch(gridBuffer) {
                    case 'idbx':
                        my.ldb = new LocalDb(my.appName+my.clientVersion);
                        ///** @type {(callback:(ldb:any)=>Promise<T>)=>Promise<T>} */
                        //my.inLdb = new LocalDbTransaction(my.appName+my.clientVersion).getBindedInTransaction()
                        break;
                    case 'wsql':
                        my.ldb = new WebSqlDb(my.appName+my.clientVersion);
                        break;
                    default:
                        throw new Error('grid buffer name is bad defined')
                    }
            }catch(err){
                my.log(err);
            }
        }
    }).catch(function(err){
        console.log('error setting myAjax.ajax');
        throw err;
    });
};

myAjax.ajaxPromise = function ajaxPromise(procedureDef,data,opts){
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
    myAjax.parseCookies();
    return Promise.resolve().then(function(){
        var startTime=bestGlobals.datetime.now();
        var tickTime=startTime;
        var lineNumber=0;
        var lineProgress=null;
        var params={};
        procedureDef.parameters.forEach(function(paramDef){
            var value=bestGlobals.coalesce(data[paramDef.name],'defaultValue' in paramDef?paramDef.defaultValue:bestGlobals.coalesce.throwErrorIfUndefined("lack of parameter "+paramDef.name));
            value = my.encoders[paramDef.encoding].stringify(value);
            params[paramDef.name]=value;
        });
        if(data && data.files){
            params.files=data.files;
        }
        var result=[];
        var progress=procedureDef.progress!==false;
        /** @type {Record<string,{ divBar, progressBar, progresIndicator, divBarLabel }>} */
        var progressStruct = {}
        var divProgress;
        // var divBarProgress = {};
        // var progressBar;
        // var progressIndicator;
        // var divBarProgressLabel = {};
        var onClose=function(){}
        var defaultInformProgress = function defaultInformProgress(progressInfo){
            if(progressInfo.message || progressInfo.end || progressInfo.start || progressInfo.loaded){
                // progressInfo.idGroup
                if(!divProgress){
                    var idAutoClose='id-auto-close-'+Math.random();
                    var checkAutoClose=html.input({type:'checkbox', id:idAutoClose, checked:myAjax.ajaxPromise.autoClose}).create();
                    var divButton=html.div({style:'height:40px'},[
                        my.messages.viewProgress,
                        html.div([
                            checkAutoClose,
                            html.label({for:idAutoClose}, my.messages.autoCloseWhenEnds),
                        ])
                    ]).create();
                    checkAutoClose.addEventListener('change',function(){
                        myAjax.ajaxPromise.autoClose=checkAutoClose.checked;
                    });
                    divProgress=html.div({class:'result-progress'}).create();
                    simpleFormPromise({elementsList:[divButton,divProgress]});
                    onClose=function(err){
                        var closeButton=html.button(DialogPromise.messages.Ok).create();
                        var stopCountDown=html.button(my.messages.stopCountDown).create();
                        divButton.innerHTML="";
                        divButton.appendChild(closeButton);
                        closeButton.onclick=function(){
                            divButton.dialogPromiseDone();
                        }
                        if(err){
                            divProgress.appendChild(html.div({class:'error-message'},err.message).create())
                        }
                        if(myAjax.ajaxPromise.autoClose && !err){
                            setTimeout(function(){
                                divButton.dialogPromiseDone();
                            },myAjax.ajaxPromise.autoClose);
                        }
                    }
                }
            }
            if (progressStruct[progressInfo.idGroup] == null) {
                progressStruct[progressInfo.idGroup] = {}
            }
            var ps = progressStruct[progressInfo.idGroup];
            if(progressInfo.ephemeral && ps.divBarLabel){
                ps.divBarLabel.textContent = progressInfo.message;
            }else if(progressInfo.message || progressInfo.end){
                var now=bestGlobals.datetime.now();
                var elapsed = now.sub(tickTime);
                tickTime=now;
                if(lineProgress){
                    if(lineProgress.elapsed){
                        lineProgress.elapsed.textContent=elapsed.toHmsOrMs();
                    }
                    if(lineProgress.acum){
                        lineProgress.acum.textContent=now.sub(startTime).toHmsOrMs()
                    }
                }
                if(progressInfo.message){
                    lineProgress={
                        elapsed:html.span({class:'my-progress-step-t'},'..:....').create(),
                        acum   :html.span({class:'my-progress-acum-t'},'..:....').create()
                    };
                    divProgress.insertBefore(
                        html.div({class:'my-progress'}, [
                            html.span({class:'my-progress-num'}, ++lineNumber)," ",
                            lineProgress.elapsed," ",
                            lineProgress.acum," ",
                            progressInfo.message||''
                        ]).create(),
                        divProgress.childNodes[0]
                    );
                }
            }
            if(progressInfo.loaded != null){
                if(!ps.divBar){
                    ps.divBarLabel = html.div().create();
                    ps.progressIndicator=html.div({class:'indicator'},' ').create();
                    ps.progressBar=html.div({class:'progress-bar', style:'width:400px; height:8px;'},[ps.progressIndicator]).create();
                    ps.divBar = html.div([
                        ps.divBarLabel,
                        ps.progressBar
                    ]).create();
                    divProgress.parentNode.insertBefore(ps.divBar, divProgress);
                }
                if(progressInfo.lengthComputable){
                    ps.progressIndicator.style.width=progressInfo.loaded*100/progressInfo.total+'%';
                    ps.progressIndicator.title=Math.round(progressInfo.loaded*100/progressInfo.total)+'%';
                }else{
                    ps.progressIndicator.style.backgroundColor='#D4D';
                    ps.progressIndicator.title='N/D %';
                }
            }
        }
        var informProgress;
        if(opts.divProgress){
            divProgress=opts.divProgress;
            if(opts.informProgress){
                informProgress = function(progress){
                    if(progress.message){
                        defaultInformProgress(progress)
                    }else{
                        opts.informProgress(progress)
                    }
                }
            }else{
                informProgress = defaultInformProgress;
            }
        }else{
            informProgress = opts.informProgress || defaultInformProgress;
        }
        var controlLoggedIn = function controlLoggedIn(result, informNotLoggedIn){
            if(informNotLoggedIn || result && result[0]=="<" && result.match(/login/m)){
                my.informDetectedStatus('notLogged');
                throw bestGlobals.changing(new Error(my.messages.notLogged),{displayed:true, isNotLoggedError:true});
            }
            my.informDetectedStatus('logged', true);
        }
        var slowTimer = setTimeout(function(){
            if(opts.mayBeSlow){
                informProgress({start:true})
            }
        }, 500)
        var ajaxCall = AjaxBestPromise[procedureDef.method]({
            multipart:procedureDef.files,
            url:procedureDef.action,
            data:params,
            uploading:opts.uploading,
            headers:opts.headers
        });
        if (opts.headersConsumer) {
            ajaxCall = ajaxCall.onHeaders(opts.headersConsumer);
        }
        return ajaxCall.onLine(function(line,ender){
            controlLoggedIn(line);
            if(progress){
                if(line.substr(0,2)=='--'){
                    progress=false;
                }else{
                    var info=JSON.parse(line);
                    if(info.error){
                        var err = new Error(info.error.message);
                        likeAr(info.error).forEach(function(value, name){
                            if(name!='message'){
                                err[name]=value;
                            }
                        })
                        throw err;
                    }
                    informProgress(info.progress);
                }
            }else{
                result.push(line||ender);
            }
        }).then(function(){
            if(procedureDef.setCookies){
                myAjax.parseCookies()
            }
            onClose();
            result=result.join('');
            controlLoggedIn(result);
            clearTimeout(slowTimer);
            if(lineNumber){
                informProgress({end:true})
            }
            return my.encoders[procedureDef.encoding].parse(result);
        }).catch(function(err){
            if(err.status==401){
                controlLoggedIn(null, true);
            }else{
                throw err;
            }
        }).catch(function(err){
            onClose(err);
            if(opts.launcher){
                opts.launcher.setAttribute('my-working','error');
                opts.launcher.title='err';
            }
            if(!err.isNotLoggedError) {
                if(!window.navigator.onLine) {
                    my.informDetectedStatus('noNetwork');
                }else if(!!err.originalError) {
                    my.informDetectedStatus('noServer');
                    if(my.server.connected){
                        my.server.connected = false
                        my.server.broadcaster.dispatchEvent(new Event('noServer'));
                    }
                } else {
                    my.informDetectedStatus('logged', true);
                }
            }
            if(!err.displayed && opts.visiblyLogErrors || err.status==403){
                my.log(err);
            }
            clearTimeout(slowTimer);
            throw err;
        });
    });
};

myAjax.encoders = {
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

myAjax.ajaxPromise.autoClose=6000;

myAjax.getAppPrefix = function getAppPrefix(){
    return myAjax.appName+'_'+myAjax.clientVersion+'_';
}

myAjax.getRawLocalVar = function getRawLocalVar(varName){
    return localStorage.getItem(myAjax.getAppPrefix()+varName)
}

myAjax.getLocalVar = function getLocalVar(varName){
    var rawData = myAjax.getRawLocalVar(varName);
    if(rawData){
        return JSON4all.parse(rawData);
    }else{
        return null
    }
}

myAjax.setLocalVar = function setLocalVar(varName, value){
    localStorage.setItem(myAjax.getAppPrefix()+varName, JSON4all.stringify(value))
}

myAjax.existsLocalVar = function existsLocalVar(varName){
    return !!myAjax.getRawLocalVar(varName);
}

myAjax.removeLocalVar = function removeLocalVar(varName){
    localStorage.removeItem(myAjax.getAppPrefix()+varName);
}

myAjax.getSessionVar = function getSessionVar(varName){
    if(myAjax.existsSessionVar(varName)){
        return JSON4all.parse(sessionStorage.getItem(myAjax.getAppPrefix()+varName));
    }else{
        return null
    }
}

myAjax.setSessionVar = function setSessionVar(varName, value){
    sessionStorage.setItem(myAjax.getAppPrefix()+varName, JSON4all.stringify(value))
}

myAjax.existsSessionVar = function existsSessionVar(varName){
    if(sessionStorage.getItem(myAjax.getAppPrefix()+varName)){
        return true
    }else{
        return false
    }
}

myAjax.removeSessionVar = function removeSessionVar(varName){
    sessionStorage.removeItem(myAjax.getAppPrefix()+varName);
}

myAjax.path={
    img:'img/'
}

/**
 * 
 * @param {HTMLElement} div 
 * @param {any} o 
 * @param {string} a 
 */
function agregar_json_default_ubicaciones(div, o, a){
    //@ts-ignore
    /** @type {HTMLTimeElement & {laTabla:HTMLTableElement}} */
    var div2 = div;
    if(!div2.laTabla){
        if(a==='' && div.tagName=='TD' && o[a] != null){
            var cellInTheMiddle = document.createElement('td');
            cellInTheMiddle.style.width='30px';
            div.parentElement.insertBefore(cellInTheMiddle,div);
            return {title:null, data:cellInTheMiddle, skip:false}
        }
        div2.laTabla = document.createElement('table');
        div.appendChild(div2.laTabla);
    }
    var table = div2.laTabla;
    var row = table.insertRow(-1);
    var cellName = row.insertCell(-1);
    agregar_class_textInDiv(cellName, 'attr-name', a)
    var cell = row.insertCell(-1);
    cell.colSpan=99;
    return {title:cellName, data:cell, skip:o[a] == null}
}

/**
 * 
 * @param {HTMLTableDataElement} td
 * @param {string|number} text
 * @param {string} className
 */
function agregar_class_textInDiv(td, className, text){
    var div = document.createElement('div');
    td.className = className;
    div.className = 'json-container';
    div.textContent = text;
    td.innerHTML = '';
    td.appendChild(div);
}

function containsObjectsWithTheSameColumns(o){
    var keys = Object.keys(o);
    if (!keys.length) return false;
    var separator = Math.random();
    var colNamesFirstObject = Object.keys(o[keys[0]]).join(separator);
    return !keys.find(k => 
        o[k] == null || !(o[k] instanceof Object) || Object.keys(o[k]).join(separator) != colNamesFirstObject
    );
}
/* test
var cases = [
    [false, {}],
    [false, {a:"hola"}], 
    [false, {a:{a:1, b:2, c:2}, b:{a:1, x:2, c:2}}], 
    [true , {a:{a:1, b:2, c:2}, b:{a:1, b:2, c:2}}]
];
cases.forEach(([expected, param]) => console.log(param, containsObjectsWithTheSameColumns(param), containsObjectsWithTheSameColumns(param) == expected ? 'ok' : 'fail'))
*/

/**
 * 
 * @param {HTMLElement} div 
 * @param {any} o 
 * @param {(div:HTMLElement, o:any, a:string)=>{title:HTMLElement|null, data:HTMLElement, skip:boolean|null}=(div,o,a)} ubicaciones 
 */
function agregar_json(div, o, ubicaciones=agregar_json_default_ubicaciones){
    if(o == null){
        return ;
    }
    if(typeof o == "object" && !(o instanceof Date) && !o.isRealDateTime){
        if((o instanceof Array && o[0] && o[0] instanceof Object && !(o[0] instanceof Array) && !(o[0].isRealDateTime) || containsObjectsWithTheSameColumns(o)) ){
            var table = document.createElement('table');
            div.appendChild(table);
            var titleRow = table.insertRow(-1);
            titleRow.insertCell(-1);
            /** @type {[k:string]:any} */
            var titleObject = {};
            for(var a in o){
                if(o[a]!=null){
                    var row = table.insertRow(-1);
                    var cellName = row.insertCell(-1);
                    agregar_class_textInDiv(cellName, 'row-num', isNaN(a)?a:Number(a)+1); 
                    agregar_json(row, o[a], function(div, _o, a){
                        // @ts-ignore sé que es Row
                        /** @type {HTMLTableRowElement} */
                        var row = div;
                        var i;
                        /** @type {HTMLTableCellElement|null} */
                        var cellTitle=null;
                        if(titleObject[a] == null){
                            cellTitle = titleRow.insertCell(-1);
                            i = cellTitle.cellIndex;
                            titleObject[a] = i;
                        }else{
                            i = titleObject[a]
                        }
                        while(i>=row.cells.length){
                            row.insertCell(-1);
                        }
                        return {title:cellTitle, data:row.cells[i], skip:false}
                    });
                }
            }
        }else{
            for(var a in o){
                var cells=ubicaciones(div, o, a);
                if(!cells.skip){
                    if(cells.title){
                        if(o instanceof Array && !isNaN(a)){
                            agregar_class_textInDiv(cells.title, 'row-num', Number(a) + 1); 
                        }else{
                            agregar_class_textInDiv(cells.title, 'attr-name', a); 
                        }
                    }
                    agregar_json(cells.data, o[a]);
                }
            }
        }
    }else{
        var textContent;
        if(typeof o == "boolean"){
            textContent = o ? 'Sí' : 'No'
        }else if(o && o instanceof Date && o.isRealDate){
            textContent = o.toDmy();
        }else{
            textContent = o.toLocaleString();
        }
        if (textContent) {
            agregar_class_textInDiv(div, 'plain-content', textContent)
        }
    }
}

myAjax.agregar_json=agregar_json;

// require.paths=require.paths||{}
// require.paths.vs = '../node_modules/monaco-editor/min/vs';

function noChange(x){ return x; }

myAjax.UriSearchToObjectParams={
	i                :{ showInMenu:true , encode:function(value,menu){ return menu.name?(menu.parents||[]).concat(menu.name).join(','):value }},
	fc               :{                   encode:function(x){ return json4all.toUrl(x); }, decode:function(x){ return json4all.parse(x)}  },
	ff               :{                   encode:function(x){ return json4all.toUrl(x); }, decode:function(x){ return json4all.parse(x)}  },
	up               :{                   encode:function(x){ return json4all.toUrl(x); }, decode:function(x){ return json4all.parse(x)}  },
	pf               :{                   encode:function(x){ return JSON.stringify(x); }, decode:function(x){ return JSON.parse(x)}      },
	td               :{                   encode:function(x){ return json4all.toUrl(x); }, decode:function(x){ return json4all.parse(x)}  },
	today            :{                   encode:function(x){ return JSON.stringify(x); }, decode:function(x){ return bestGlobals.date.iso((x+'').substr(0,10))}  },
	section          :{ showInMenu:true , encode:noChange                                , decode:noChange          },
	pick             :{                   encode:noChange                                , decode:noChange          },
	directUrl        :{ hide:true       },
	selectedByDefault:{ hide:true       },
	showParams       :{ hide:true       },
    parents          :{ hide:true       },
    button           :{ hide:true       },
    fixedFields      :{ varName:'ff'    , encode:function(pairs){ return json4all.toUrl(likeAr.toPlainObject(pairs, 'fieldName')); }},
	detailing        :{                   encode:function(x){ return json4all.toUrl(x); }, decode:function(x){ return json4all.parse(x)}  },
}

myAjax.UriSearchToObject = function UriSearchToObject(locationSearch){
    var parts=locationSearch.split('&');
    var addrParams={}
    parts.forEach(function(pair,i){
        if(pair[0]==='#'){
            pair=pair.substr(1);
        }
        if(pair[0]==='?'){
            pair=pair.substr(1);
        }
        var eq = pair.indexOf('=');
        if(eq !== -1){
            var varName=pair.substr(0, eq);
            var value = decodeURIComponent(pair.substr(eq+1));
			var paramDef=myOwn.UriSearchToObjectParams[varName];
			if(paramDef && paramDef.decode){
				value = paramDef.decode(value);
			}
            addrParams[varName] = value;
            if(!i){
                Object.defineProperty(addrParams,'_firstParameterName',{value:varName, writable:false, enumerable:false});
            }
        }
    });
    return addrParams;
}

myAjax.replaceAddrParams = function replaceAddrParams(params){
    var my=this;
    history.replaceState(null, null, my.menup+my.paramsToUriPart(params));
}

function encodeMinimalURIComponent(text){
    return (text+'')
        .replace(/\=/g, '%3D')
        .replace(/\?/g, '%3F')
        .replace(/\#/g, '%23')
        .replace(/&/g, '%26')
        .replace(/%/g, '%25');
}

myAjax.paramsToUriPart = function paramsToUriPart(params, inMenu){
    var paramStr=likeAr(params).map(function(value, name){
		var paramDef=myOwn.UriSearchToObjectParams[name] || { encode:function(x){return x}, varName:name };
		if((paramDef.showInMenu || !inMenu) && !paramDef.hide || (params.showParams && params.showParams.includes(name))){
			if(value!=null){
                value=paramDef.encode(value, params);
				return (paramDef.varName||name)+'='+encodeMinimalURIComponent(value);
			}
		}
    }).filter(function(expr){return expr;}).join('&');
	return paramStr;
}

myAjax.getRect = function getRect(element){
    var rect = {top:0, left:0, width:element.offsetWidth, height:element.offsetHeight};
    while( element != null ) {
        rect.top += element.offsetTop;
        rect.left += element.offsetLeft;
        element = element.offsetParent;
    }
    return rect;
}

myAjax.menuName = 'menu';
myAjax.menuSeparator = '#';
Object.defineProperty(myAjax, 'menup', {
    get:function(){
        var menuName = my.offline.mode?'ext':this.menuName;
        return menuName+this.menuSeparator; 
    }
});

return myAjax;

});
