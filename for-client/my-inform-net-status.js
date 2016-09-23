myOwn.informDetectedStatus = function informDetectedStatus(statusCode, logged) {
    var my=this;
    if(my.debuggingStatus){ my.debuggingStatus(statusCode); }
    if(my.previousStatusCode!=statusCode){
        // var previousStatus = my["connection-status"][my.previousStatusCode];
        var status = my["connection-status"][statusCode];
        if(!status.show){
            if(my.statusDiv){
                my.fade(my.statusDiv);
                my.statusDiv=null;
            }
        }else{
            var statusMsg = my.messages[statusCode];
            my.scrollToTop(document.body, 0, 500);
            if(!my.statusDiv){
                my.statusDiv = html.div({class:'status-info'}).create();
                my.statusDiv.messageSpan=html.span(statusMsg).create();
                my.statusDiv.askLink=null;
                my.statusDiv.appendChild(my.statusDiv.messageSpan);
                var body = document.body;
                body.insertBefore(my.statusDiv, body.firstChild);
            }else{
                my.statusDiv.messageSpan.textContent=statusMsg;
            }
            if(status.mustAsk){
                if(!my.statusDiv.askLink){
                    my.statusDiv.askLink=html.a().create();
                    my.statusDiv.appendChild(my.statusDiv.askLink);
                }
                my.statusDiv.askLink.href=status.mustAsk.url;
                my.statusDiv.askLink.textContent=my.messages[status.mustAsk.idMessage];
            }else{
                if(my.statusDiv.askLink){
                    my.statusDiv.askLink.parentNode.removeChild(my.statusDiv.askLink);
                    my.statusDiv.askLink=null;
                }
            }
            var attrToSet = 'blink';
            //attrToSet = 'pulse';
            my.statusDiv.setAttribute('rec-status', attrToSet);
        }
        my.previousStatusCode=statusCode;
    }
};
