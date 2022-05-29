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
        },500);
    }
    if(location.search){
        var loginForm = document.getElementById('loginForm');
        loginForm.action = loginForm.action + location.search;
    }
}

window.addEventListener('load',function(){
    var loginButtons = ['login','loginFormRightImg'];
    loginButtons.forEach(function(id, i){
        var loginElement=document.getElementById(id);
        if(loginElement){
            loginElement.addEventListener('click',gotoEmptyFieldOrSubmit)
            if(!i){
                document.addEventListener('keypress',function(event){
                    if(event.key == 'Enter' || event.keyCode == 13){
                        gotoEmptyFieldOrSubmit(event);
                    }
                })
            }
        }
    })
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
    }else{
        controlar_compatibilidad();
    }
})    