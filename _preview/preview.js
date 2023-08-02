 const browser = await puppeteer.launch();
 const page = await browser.newPage();
 await page.setViewport({
     width: 960,
     height: 760,
     deviceScaleFactor: 1,
 });
 await page.setContent(imgHTML);
 await page.screenshot({path: example.png});
 await browser.close();
