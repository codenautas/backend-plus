"use strict";

function gotoEmptyFieldOrSubmit(event){
    if(location.hash){
        sessionStorage.setItem('backend-plus-hash-redirect',location.hash);
    }
    if(document.getElementById('username').value==''){
        document.getElementById('username').focus();
        event.preventDefault();
    }else if(document.getElementById('password').value==''){
        document.getElementById('password').focus();
        event.preventDefault();
    }else{
        setTimeout(function(){
            loginForm.submit();
        },1000);
    }
}

window.addEventListener('load',function(){
    var loginElement=document.getElementById('login');
    if(loginElement){
        loginElement.addEventListener('click',gotoEmptyFieldOrSubmit)
        document.addEventListener('keypress',function(event){
            if(event.key == 'Enter' || event.keyCode == 13){
                gotoEmptyFieldOrSubmit(event);
            }
        })
    }
    var gotoLoginElement=document.getElementById('goto-login');
    if(gotoLoginElement){
        if(location.hash){
            var url = new URL(gotoLoginElement.href)
            url.hash=location.hash;
            gotoLoginElement.href = url;
        }
        setTimeout(function(){
            location = gotoLoginElement.href;
        },5000)
    }
    controlar_compatibilidad();
})    