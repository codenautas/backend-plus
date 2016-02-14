"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-disable no-console */

var timeStartBackendPlus = new Date();

var backendPlus = {};

var express = require('express');
var Path = require('path');
var MiniTools = require('mini-tools');
var Promises = require('best-promise');

var pg = require('pg-promise-strict');

require('best-globals').setGlobals(global);

function AppBackend(){
}
AppBackend.exposes={};

AppBackend.prototype.init = function init(listOfSources){
    var be = this;
    return MiniTools.readConfig(listOfSources).then(function(config){
        be.config = config;
    }).then(function(){
        var startTS = new Date();
        return be.config.db && pg.connect(be.config.db).then(function(client){
            be.db = pg;
            console.log('db-connected',changing(be.config.db,{password:undefined},changing.options({deletingValue:undefined})));
            return client;
        }).then(function(client){
            return client.query("SELECT current_timestamp as cts").fetchUniqueRow();
        }).then(function(data){
            var endTS = new Date();
            console.log('NOW in Database',data.row.cts);
        });
    }).then(function(){
        be.app = express();
        return Promises.make(function(resolve, reject){
            try{
                be.app.listen(be.config.server.port, resolve);
            }catch(err){
                reject(err);
            }
        });
    }).then(function(){
        console.log('listening on',be.config.server.port);
        be.timeReadyBackendPlus = new Date();
        console.log('READY',be.timeReadyBackendPlus-timeStartBackendPlus,'elapsed');
    }).catch(function(err){
        console.log('ERROR',err.stack || err);
    });
};

backendPlus.AppBackend = AppBackend;

module.exports = backendPlus;