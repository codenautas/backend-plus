"use strict";

const util = require('util');

var backendPlus = require("..");

function AppTrac(){
    AppTrac.super_.call(this);
}

util.inherits(AppTrac, backendPlus.AppBackend);

AppTrac.prototype.configList=function configList(){
    return AppTrac.super_.prototype.configList.call(this).concat([
        'ejemplos/def-config.yaml',
        'ejemplos/local-config.yaml'
    ]);
};

AppTrac.prototype.rootPath = __dirname +'/';

new AppTrac().start();