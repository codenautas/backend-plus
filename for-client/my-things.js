"use strict";

var coalesce=bestGlobals.coalesce;

var my = {
    "log-severities":{
        error:{permanent:true },
        log  :{permanent:false},
    },
    log:function(severity, message){
        var self=this;
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
                self.fade(divMessage);
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
    ajax:function(procedureDef,data){
        var self = this;
        return Promise.resolve().then(function(){
            var params={};
            procedureDef.parameters.forEach(function(paramDef){
                var value=coalesce(data[paramDef.name],paramDef.def,coalesce.throwErrorIfUndefined("lack of parameter "+paramDef.name));
                if(paramDef.enconding=='JSON'){
                    value=JSON.stringify(value);
                }
                params[paramDef.name]=value;
            });
            return AjaxBestPromise[procedureDef.method]({
                url:procedureDef.action,
                data:params
            }).then(function(result){
                if(result && result[0]=="<" && result.match(/login/m)){
                    body.innerHTML=result;
                    throw new Error('NOT LOGGED');
                }
                if(proceureDef.encoding=='JSON'){
                    return JSON.parse(result);
                }
                return result;
            }).catch(function(err){
                self.log(err);
            });
        });
    },
};

