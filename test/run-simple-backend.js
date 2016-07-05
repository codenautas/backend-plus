"use strict";

require('./simple-backend.js')().then(function(){
    console.log('started');
},function(err){
    console.log('not started',err);
    console.log(err.stack);
});
