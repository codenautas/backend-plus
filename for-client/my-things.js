"use strict";

var coalesce=bestGlobals.coalesce;

function id(x){return x;}

var myOwn = {
    autoSetup(){
        var my = this;
        return this.ajaxPromise({
            action:'def-procedures',
            method:'get',
            parameters:[],
        }).then(function(defSource){
            my.proceduresDef=eval(defSource);
            my.proceduresDef.forEach(function(procedureDef){
                var target;
                var lastName = null;
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
            });
        });
    },
    "log-severities":{
        error:{permanent:true },
        log  :{permanent:false},
    },
    log:function(severity, message){
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
        var status = document.getElementById('status');
        console.log(severity, consoleMessage);
        status = status||body;
        var divMessage = html.div({"class": ["status-"+severity]}, clientMessage).create();
        status.appendChild(divMessage);
        if(!this["log-severities"][severity].permanent){
            setTimeout(function(){
                my.fade(divMessage);
            },3000);
        }
    },
    fade:function(element){
        element.parentNode.removeChild(element);
    },
    adaptData:function(tableDef, rows){
        rows.forEach(function(row){
            tableDef.fields.forEach(function(fieldDef){
                if(fieldDef.typeName=='number' && fieldDef.exact && fieldDef.decimals){
                    if(row[fieldDef.name]){
                        row[fieldDef.name] = row[fieldDef.name]-0;
                    }
                }
                if(fieldDef.typeName=='date'){
                    if(row[fieldDef.name]){
                        row[fieldDef.name] = bestGlobals.date.iso(row[fieldDef.name]);
                    }
                }
            });
        });
    },
    get ajax(){
        if(!this.proceduresDef){
            throw new Error("before use myOwn.ajax, myOwn.autoSetup() must be called");
        }else{
            return this.ajaxPromise;
        }
    },
    reconnect() { return document.getElementById('reconection_div'); },
    reconnectCreate() {
        document.body.scrollTop = document.documentElement.scrollTop = 0; // cross browser scrolling to top
        var reconnectDiv = this.reconnect();
        if(! reconnectDiv.childNodes.length) {
            reconnectDiv.appendChild(html.span("Disconnected!").create());
            reconnectDiv.appendChild(html.a({href:'login'}, "reconnect").create());
        }
        
    },
    reconnectRemove() {
        var reconnectDiv = this.reconnect();
        if(reconnectDiv.childNodes.length) {
            while(reconnectDiv.firstChild) { reconnectDiv.removeChild(reconnectDiv.firstChild); }
        }
    },
    ajaxPromise:function(procedureDef,data){
        var my = this;
        return Promise.resolve().then(function(){
            var params={};
            procedureDef.parameters.forEach(function(paramDef){
                var value=coalesce(data[paramDef.name],paramDef.def,coalesce.throwErrorIfUndefined("lack of parameter "+paramDef.name));
                if(paramDef.encoding=='plain'){
                    if(typeof value === "object"){
                        throw new Error("Invalid plain type "+(value==null?value:typeof value)+" detected");
                    }
                }else{
                    value=JSON.stringify(value);
                }
                params[paramDef.name]=value;
            });
            return AjaxBestPromise[procedureDef.method]({
                url:procedureDef.action,
                data:params
            }).then(function(result){
                if(result && result[0]=="<" && result.match(/login/m)){
                    return my.reconnectCreate();
                    // location='login';
                    // throw new Error('NOT LOGGED');
                }
                my.reconnectRemove();
                if(procedureDef.encoding=='plain'){
                    return result;
                }else{
                    return JSON.parse(result);
                }
            }).catch(function(err){
                my.log(err);
                throw err;
            });
        });
    },
};

