"use strict";

var karma = require('karma');
var karmaConfig = require('./karma.conf.js');
var options;
karmaConfig({set:function(opts){ 
    options=opts; 
    var posBrowsers = process.argv.indexOf('--browsers')
    if(posBrowsers>0){
        options.browsers=(process.argv[posBrowsers+1]||'').split(',');
    }
}},{singleRun:false || process.argv.indexOf('--single-run')>0 || process.env.SINGLE_RUN});
console.log('karma starting');
var karmaServer = new karma.Server(options, function(exitCode) {
    console.log('Karma has exited with ' + exitCode);
    process.exit(exitCode);
})
karmaServer.start();
console.log('karma starting',options.port);
