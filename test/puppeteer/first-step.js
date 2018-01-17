const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({headless: false, slowMo: 250});
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', ...msg.args));
    await page.setViewport({width:1360, height:768});
    await page.goto('http://localhost:3333');
    var rect = await page.evaluate(() => {
        document.getElementById('username').value='bob'; 
        document.getElementById('password').value='bobpass'; 
    });
    await page.click('[type=submit]');
    await page.waitForSelector('#light-network-signal')
    await page.click('[menu-name=tables]');
    await page.click('[menu-name=simple]');
    await page.waitForSelector('[my-table=simple] tbody tr [alt=INS]');
    await page.click('[my-table=simple] tbody tr [alt=INS]');
    await page.waitFor(500);
    await page.type('[my-table=simple] tbody tr td', '333');
    await page.screenshot({path: 'local-capture2.png'});
    await page.keyboard.press('Enter');
    await page.keyboard.type('tres tres tres');
    await page.keyboard.press('Enter');
    await page.waitFor(1000);
    await browser.close();
})();