"use strict";

window.addEventListener('load',function(){
    var loginElement=document.getElementById('login');
    if(loginElement){
        loginElement.addEventListener('click',function(event){
            if(document.getElementById('username').value==''){
                document.getElementById('username').focus();
                event.preventDefault();
            }else if(document.getElementById('password').value==''){
                document.getElementById('password').focus();
                event.preventDefault();
            }
            if(location.hash){
                sessionStorage.setItem('backend-plus-hash-redirect',location.hash);
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
})    