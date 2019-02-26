"use strict";

var changing = require('best-globals').changing;
var definnerPTable = require('../server/table-ptable.js');

module.exports = function(context){
    var defNewElement = definnerPTable(context);
    defNewElement=changing(defNewElement,{
        name:'new_element',
        tableName:'ptable',
        elementName:'new element',
        forInsertOnlyMode:true,
        layout:{vertical:true},
        sql:{isTable:false}
    });
    return defNewElement;
}
