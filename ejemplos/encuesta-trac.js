"use strict";

var backendPlus = require("..");
var backend = new backendPlus.AppBackend();

backend.init([
    'ejemplos/def-config.yaml',
    'ejemplos/local-config.yaml'
]);

backend.app.get('/index', function(req,res){
    res.end('here we are');
});
