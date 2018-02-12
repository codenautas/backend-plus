"use strict";

var AppExample = require('../examples/4test/server/app-4test.js');

const puppeteer = require('puppeteer');

const pg = require('pg-promise-strict');
pg.easy = true;
const MiniTools = require('mini-tools');
const discrepances = require('discrepances');

describe("interactive ",function(){
    var browser;
    var page;
    var client;
    var config;
    var server;
    before(async function(){
        this.timeout(50000);
        server = new AppExample();
        console.log("starting server");
        config = await MiniTools.readConfig(
            ['examples/4test/def-config','examples/4test/local-config'],
            {readConfig:{whenNotExist:'ignore'}, testing:true}
        );
        client = await pg.connect(config.db);
        await client.executeSqlScript('test/fixtures/dump-4test.sql');
        console.log('base abierta y limpia');
        await server.start();
        browser = await puppeteer.launch(process.env.TRAVIS?null:{headless: process.env.TRAVIS || !config.test["view-chrome"], slowMo: 50});
        page = await browser.newPage();
        page.on('console', msg => { 
            console.log('console.'+msg.type(), msg.text()) 
        });
        await page.setViewport({width:1360, height:768});
        await page.goto('http://localhost:3333');
        await page.type('#username', 'bob');
        await page.type('#password', 'bobpass');
        await page.click('[type=submit]');
        await page.waitForSelector('#light-network-signal');
        console.log('sistema logueado');
    });
    it("inserts one record", async function(){
        this.timeout(38000);
        console.log('tengo el menu')
        await page.click('[menu-name=tables]');
        await page.click('[menu-name=simple]');
        await page.waitForSelector('[my-table=simple] tbody tr [alt=INS]');
        await page.click('[my-table=simple] tbody tr [alt=INS]');
        return; 
        await page.waitFor(500);
        await page.screenshot({path: 'local-capture1.png'});
        var pkNewRecord = await page.$('[my-table=simple] tbody tr td');
        var pkValue='333';
        await pkNewRecord.type(pkValue,{delay:10});
        await page.keyboard.press('Enter');
        var data = ('x'+Math.random()).substr(0,8);
        await page.waitForSelector('[my-colname=simple_code][io-status="temporal-ok"]');
        await page.keyboard.type(data);
        await page.screenshot({path: 'local-capture2.png'});
        await page.keyboard.press('Enter');
        await page.waitForSelector('[my-colname=simple_name][io-status="temporal-ok"]');
        var result = await client.query("select simple_name from simple where simple_code = $1",[pkValue]).fetchUniqueValue();
        discrepances.showAndThrow(result.value,data);
        return 1;
    });
    after(async function(){
        await client.done();
        await page.waitFor(process.env.TRAVIS?10:1000);
        await browser.close()
        await server.shootDownBackend();
    });
});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});