"use strict";

var html=require('js-to-html').html;
var fs=require('fs-promise');
var path=require('path');

var browsers = [
    'Chrome',
    'Firefox',
    'Safari',
    'IE'
];

var oses = [
    'Win32',
    'Win64',
    'Linux',
    'MacOSX'
];

var machines = [
    'Real',
    'Virtual'
];

var checks = [
    {action:'Server: Remove session file', message:'Not logged in, Reconnect'},
    {action:'Server: Shutdown', message:'The server inaccessible'},
    {action:'Network: Shutdown', message:'Not connected to the network'},
    {action:'Server: on, Network: on', message:'none'},
];

var firstRowCells = [];
firstRowCells.push(html.th(" "));
firstRowCells.push(html.th({colspan:browsers.length}, 'Browsers'));

var secondRowCells = [];
secondRowCells.push(html.th("Check"));

var clCells = [];

browsers.forEach(function(browser) {
   secondRowCells.push(html.th(browser));
   clCells.push(html.td(" "));
});

var rows = [];
rows.push(html.tr(firstRowCells));
rows.push(html.tr(secondRowCells));

checks.forEach(function(check) {
   oses.forEach(function(os) {
      machines.forEach(function(mac) {
        var desc = [];
        desc.push('Action: '+check.action);
        desc.push(' Machine: '+mac+' ('+os+')');
        desc.push(' Expecting: '+check.message);
        var row = [];
        row.push(html.td(desc.join(",")));
        rows.push(html.tr(row.concat(clCells)));
      });
   });
});

var pageName = "Checklist for backend-plus";
var data = html.html([
    html.head([
        html.title(pageName),
        html.link({type:'text/css', rel:'stylesheet', href:'checklist.css'})
    ]),
    html.body([
        html.h2(pageName),
        html.table({id:'t1'}, rows)
    ])
]);
fs.writeFile(path.resolve(__dirname+"/checklist.html"), data.toHtmlText({pretty:true})).then();
