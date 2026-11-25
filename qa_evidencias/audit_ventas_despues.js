// Medición "Después" de la remediación WCAG 4.1.2 en Ventas.
// Sirve el frontend LOCAL modificado (puerto 5500) pero consume la MISMA API
// desplegada, con una sesión JWT real. No modifica código de aplicación.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { startFlow } = require('lighthouse');
const axe = require('axe-core');

const OUT = 'D:/proyecto_final_diarso/Miniso_web/qa_evidencias';
const LOCAL_URL = 'http://127.0.0.1:5500/';
const API = 'https://miniso-web-omega.vercel.app/api';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1400, height: 900 },
  });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument((api) => { window.MINISO_API_URL = api; }, API);
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.evaluate((u) => {
      sessionStorage.setItem('miniso_sesion', JSON.stringify({ user: u, page: 'registrar-venta' }));
    }, JSON.parse(process.env.SESION_CAJERO));
    await page.reload({ waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForSelector('#venta-productos-tbody button[onclick^="addToCart"]', { timeout: 60000 });

    const labels = await page.evaluate(() => Array.from(
      document.querySelectorAll('#venta-productos-tbody button[onclick^="addToCart"]')
    ).map(b => b.getAttribute('aria-label')));
    console.log('aria-labels reales en DOM:', JSON.stringify(labels));

    await page.screenshot({ path: path.join(OUT, 'screen_ventas_despues.png') });

    await page.addScriptTag({ content: axe.source });
    const rAxe = await page.evaluate(async () => await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    }));
    fs.writeFileSync(path.join(OUT, 'axe_ventas_despues.json'), JSON.stringify(rAxe, null, 2));

    const flow = await startFlow(page, { name: 'ventas-despues' });
    await flow.navigate(LOCAL_URL, { stepName: 'ventas-despues', timeout: 90000 });
    const rLh = await flow.createFlowResult();
    fs.writeFileSync(path.join(OUT, 'lh_ventas_flow_despues.json'), JSON.stringify(rLh, null, 2));

    const lhr = rLh.steps[0].lhr;
    console.log(`DESPUES: axe violations=${rAxe.violations.length}; ` +
      `LH accessibility=${lhr.categories.accessibility.score}; ` +
      `LH performance=${lhr.categories.performance.score}`);
    console.log('Reglas axe restantes:', rAxe.violations.map(v => `${v.id}(${v.nodes.length})`).join(', ') || 'NINGUNA');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
