window.myOwn = require('./my-ajax.js')

myOwn.offline={
    mode:false
};
myOwn.messages={};
myOwn.ajax={};

var my = myOwn;

var jsYaml = require('js-yaml');
var JSON4all = require('json4all');

myOwn.log = function(){
    console.log('my.log',arguments)
}

function id(x){ return x}

// @ts-ignore // falta poder heredar de myOwn
myOwn.informDetectedStatus = function(){
    // console.log('my.informDetectedStatus',arguments)
}

// @ts-ignore // falta poder heredar de myOwn
myOwn.ready = new Promise(function(result, reject){
    window.addEventListener('load', function(){
        myOwn.readProcedureDefinitions().then(result).catch(function(err){
            console.log('ERROR IN readProcedureDefinitions');
            console.log(err)
            reject(err)
        });
    })
})

var myStart = true;