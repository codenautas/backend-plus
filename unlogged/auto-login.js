"use strict";

window.addEventListener('load',function(){
    document.getElementById('login').addEventListener('click',function(event){
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
})