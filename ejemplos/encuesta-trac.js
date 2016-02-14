"use strict";

var backendPlus = require("..");
var backend = new backendPlus.AppBackend();
backend.init([
    'ejemplos/def-config.yaml',
    'ejemplos/local-config.yaml'
]);

