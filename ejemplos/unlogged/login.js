window.addEventListener('load',function(){
    var params={};
    (window.location.hash||"").split(/[#&]/g).forEach(function(pair){
        var pos=pair.indexOf('=');
        if(pos>=0){
            params[pair.substr(0,pos)]=pair.substr(pos+1);
        }
    });
    ['username','password'].forEach(function(fieldName){
        var elem=document.getElementById(fieldName);
        var parameterName=fieldName.substr(0,1)
        if(params[parameterName]){
            elem.value=params[parameterName];
        }else{
            elem.disabled=false;
        }
    });
    if(params['a']==1){
        loginForm.submit();
    }
});
