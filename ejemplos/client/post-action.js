function status(msg) {
    var s = document.getElementById('status');
    if(s) { s.textContent += '\n'+msg; }    
}

function postAction(url, data) {
    return AjaxBestPromise.post({
        url:url,
        data:{ info:JSON.stringify(data)}
    }).then(function(resultJson){
        var result=resultJson;
        status(result);
        return result;
    }).catch(function(err) {
        status("Error: " + err);
        throw err;
    });
}