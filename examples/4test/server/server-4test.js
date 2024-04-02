"use strict";

console.log(require.resolve.paths('./app-4test.js'));
console.log(require.resolve('./app-4test.js'));

var AppExample = require('./app-4test.js');

var server = new AppExample();

var fs = require('fs-extra');

server.start().then(function(){
    var thisInterval=setInterval(function(){
        fs.rename('local-shutdown.yes','local-shutdown.done').then(function(){
            console.log('shooting down...');
            if(!server.shutdownBackend){
                server.shutdownBackend=function(){ return Promise.resolve()};
            }
            return server.shutdownBackend().then(function(){
                clearInterval(thisInterval);
                console.log('shooted down!');
            });
        },function(){ "not shutdown yet"; }).catch(function(err){
            console.log(err);
        });
    },1000);
});
