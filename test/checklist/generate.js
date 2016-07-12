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

var pageName = "Checklist for backend-plus";
var data = html.html([
    html.head([
        html.title(pageName)
    ]),
    html.body([
        html.h2(pageName),
        html.table({id:'t1'}, [
            html.tr([
                html.td("td1"),
                html.td("td2"),
            ])
        ])
    ])
]);
fs.writeFile(path.resolve(__dirname+"/checklist.html"), data.toHtmlText({pretty:true})).then();