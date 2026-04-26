const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));

  await page.waitForSelector('#markdownInput');

  const data = await page.evaluate(() => {
    // switch to markdown only mode
    document.getElementById('visualPanel').classList.add('panel-hidden');
    document.getElementById('previewPanel').classList.add('panel-hidden');
    
    return {
      windowHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight,
      inputScrollHeight: document.getElementById('markdownInput').scrollHeight,
      inputClientHeight: document.getElementById('markdownInput').clientHeight,
    };
  });

  console.log('Markdown Mode Layout Data:', data);
  await browser.close();
})();
