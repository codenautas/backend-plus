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
        // console.log("starting server");
        config = await MiniTools.readConfig(
            ['examples/4test/test-config','examples/4test/local-config'],
            {readConfig:{whenNotExist:'ignore'}, testing:true}
        );
        client = await pg.connect(config.db);
        await client.executeSqlScript('test/fixtures/dump-4test.sql');
        // console.log('base abierta y limpia');
        await server.start();
        var headless = process.env.TRAVIS || !config.test["view-chrome"];
        var slowMo = headless ? 12 : 50;
        browser = await puppeteer.launch(process.env.TRAVIS?{}:{headless, slowMo});
        page = await browser.newPage();
        page.on('console', msg => { 
            console.log('console.'+msg.type(), msg.text()) 
        });
        await page.setViewport({width:1024, height:768});
        await page.goto('http://localhost:3333');
        await page.click('#goto-login')
        console.log('a la pantalla de login')
    });
    describe("login page rejecting", async function(){
        async function testBadLogin(username, password){
            await page.type('#username', username);
            await page.type('#password', password);
            await page.click('[type=submit]');
            await page.waitForTimeout(50);
            await browser.waitForTarget(target => {
                return target.url().includes('login');
            });
            var result = await page.$eval('.error-message', td => td.textContent);
            discrepances.showAndThrow(result,'usuario o clave incorrecta');
        }
        it("reject bad username", async function(){
            await testBadLogin('baduser', 'wrongpass')
        })
        it("reject bad password", async function(){
            await testBadLogin('bob', 'wrongpass')
        })
    })
    describe("logged", async function(){
        before(async function(){
            this.timeout(50000);
            console.log('voy a loguearme')
            await page.type('#username', 'bob');
            await page.type('#password', 'bobpass');
            await page.click('[type=submit]');
            await page.waitForSelector('#light-network-signal', {visible:true});
        });
        describe("chpass", async function(){
            async function testBadLogin(username, password){
                await page.type('#username', username);
                await page.type('#password', password);
                await page.click('[type=submit]');
                await page.waitForTimeout(50);
                await browser.waitForTarget(target => {
                    return target.url().includes('chpass');
                });
                var result = await page.$eval('.error-message', td => td.textContent);
                discrepances.showAndThrow(result,'usuario o clave incorrecta');
            }
            it("goto chpass with menu", async function(){
                this.timeout(10000);
                await page.waitForTimeout(1000)
                await page.waitForSelector('#right-menu-icon', {visible:true});
                await page.click("#right-menu-icon")
                await page.waitForSelector('#right-menu-chpass')
                await page.click('#right-menu-chpass')
                await page.waitForTimeout(50);
                await browser.waitForTarget(target => {
                    console.log('target.url', target.url())
                    return target.url().includes('chpass');
                });
                var username = await page.$eval('#username', input => input.value)
                console.log('username', username)
                discrepances.showAndThrow(username, 'bob')
            })
            async function gotoChPass(){
                if(!page.url().includes('chpass')){
                    await page.goto('http://localhost:3333/chpass');
                }
            }
            it("reject short pass", async function(){
                await gotoChPass()
                await page.type('#oldPassword', 'bobpass');
                await page.type('#newPassword', 'x');
                await page.type('#repPassword', 'x');
                await page.click('[type=submit]');
                await page.waitForTimeout(50);
                await browser.waitForTarget(target => {
                    return target.url().includes('chpass');
                });
                var result = await page.$eval('.error-message', td => td.textContent);
                discrepances.showAndThrow(result?.substr(0,27),'la clave es demasiado corta');
            })
        })
        describe("grids", async function(){
            before(async function(){
                await page.goto('http://localhost:3333/menu');
                await browser.waitForTarget(target => {
                    return target.url().includes('menu');
                });

            })
            it("inserts one record", async function(){
                this.timeout(38000);
                await page.click('[menu-name=tables]');
                await page.click('[menu-name=simple]');
                await page.waitForSelector('[my-table=simple] tbody tr [alt=INS]');
                await page.click('[my-table=simple] tbody tr [alt=INS]');
                await page.waitForTimeout(500);
                await page.waitForSelector('[my-table=simple] tbody tr td')
                var pkNewRecord = await page.$('[my-table=simple] tbody tr td');
                var pkValue='333';
                await pkNewRecord.type(pkValue,{delay:10});
                await page.keyboard.press('Enter');
                var data = ('x'+Math.random()).substr(0,8);
                await page.waitForSelector('[my-colname=simple_code][io-status="temporal-ok"]');
                await page.keyboard.type(data);
                await page.keyboard.press('Enter');
                await page.waitForSelector('[my-colname=simple_name][io-status="temporal-ok"]');
                var result = await client.query("select simple_name from simple where simple_code = $1",[pkValue]).fetchUniqueValue();
                discrepances.showAndThrow(result.value,data);
                return 1;
            });
            it("open details", async function(){
                this.timeout(38000);
                await page.click('[menu-name=tables]');
                await page.click('[menu-name=simple]');
                await page.waitForSelector('[pk-values=\'["2"]\'] .grid-th-details');
                await page.click('[pk-values=\'["2"]\'] .grid-th-details');
                await page.waitForSelector('[pk-values=\'["2","A"]\'] td');
                var result = await page.$eval('[pk-values=\'["2","A"]\'] [my-colname="wf_code"]', td => td.textContent);
                discrepances.showAndThrow(result,'A');
            });
            it("open details in other tab", async function(){
                this.timeout(38000);
                await page.click('[menu-name=tables]');
                await page.click('[menu-name=simple]');
                await page.waitForSelector('[pk-values=\'["2"]\'] .grid-th-details');
                await page.keyboard.down('ControlLeft');
                await page.click('[pk-values=\'["2"]\'] .grid-th-details');
                var pages = await browser.pages();
                await page.waitForTimeout(100);
                await page.keyboard.up('ControlLeft');
                await browser.waitForTarget(target => {
                    return target.url().includes('with_fk');
                });
                var mustNotExists = await page.$('[pk-values=\'["2","A"]\'] td');
                discrepances.showAndThrow(mustNotExists,null);
                var pages = await browser.pages();
                var page2 = pages[pages.length-1];
                await page2.bringToFront();
                await page2.$('[pk-values=\'["2","A"]\'] td');
                await page2.waitForSelector('td[my-colname="wf_code"]');
                var result = await page2.$eval('td[my-colname="wf_code"]', td => td.textContent);
                discrepances.showAndThrow(result,'A');
            });
            it.skip("FUTURO LEJANO. inserts one record with fk data", async function(){
                // la idea de esta funcionalidad es poder ingresar un texto en el nombre en vez del código
                this.timeout(38000);
                console.log('tengo el menu')
                await page.click('[menu-name=tables]');
                await page.click('[menu-name=with_fk]');
                await page.waitForSelector('[my-table=with_fk] [alt=INS]');
                await page.click('[my-table=with_fk] [alt=INS]');
                await page.waitForTimeout(100);
                await page.waitForSelector('[my-table=with_fk] tbody tr td');
                var pkNewRecord = await page.$('[my-table=with_fk] tbody tr td');
                var pkValue='A1';
                await pkNewRecord.press('Enter');  // keep empty simple_code
                await page.keyboard.type('Three');          // simple_name (lookup field)
                await page.keyboard.press('Enter');
                await page.waitForSelector('[my-colname=simple_name][io-status="temporal-ok"]');
                var result = await client.query("select simple_code, simple_name from simple where simple_name = $1",['Three']).fetchUniqueRow();
                discrepances.showAndThrow(result.row,{simple_code:'3', simple_name:'Three'});
                var result = await page.$eval('[my-colname=simple_code]', td => td.textContent);
                discrepances.showAndThrow(result,'3');
                return ;
                await page.keyboard.type(pkValue);
                await page.keyboard.press('Enter'); 
                // await page.screenshot({path: 'local-capture2.png'});
                await page.keyboard.press('Enter');
                var result = await client.query("select * from with_fk where wf_code = $1",['A1']).fetchUniqueRow();
                discrepances.showAndThrow(result.row,{simple_code:'3', wf_code:'A1'});
                return 1;
            });
        })
    })
    after(async function(){
        this.timeout(30000);
        await client.done();
        await page.waitForTimeout(process.env.TRAVIS?10:1000);
        await browser.close()
        await server.shootDownBackend();
    });
});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});