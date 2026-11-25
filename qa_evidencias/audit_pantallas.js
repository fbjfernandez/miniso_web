// Auditoría de accesibilidad de pantallas autenticadas del POS.
// Usa los MISMOS motores que las CLIs (Lighthouse 13.6.0 y axe-core 4.x) con una
// sesión JWT real obtenida por POST /api/login. La CLI no puede inyectar
// sessionStorage, por eso se usa la API de Lighthouse User Flows + axe-core.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { startFlow } = require('lighthouse');
const axe = require('axe-core');

const OUT = 'D:/proyecto_final_diarso/Miniso_web/qa_evidencias';
const URL = 'https://miniso-web-omega.vercel.app/';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const PANTALLAS = [
  { name: 'ventas', usuario: JSON.parse(process.env.SESION_CAJERO), page: 'registrar-venta', espera: '#venta-productos-tbody' },
  { name: 'inventario', usuario: JSON.parse(process.env.SESION_ADMIN), page: 'reporte-inventario', espera: '.table-wrapper' },
];

(async () => {
  for (const p of PANTALLAS) {
    const browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1400, height: 900 },
    });
    try {
      const page = await browser.newPage();
      await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 });
      await page.evaluate((u, pagina) => {
        sessionStorage.setItem('miniso_sesion', JSON.stringify({ user: u, page: pagina }));
      }, p.usuario, p.page);
      await page.reload({ waitUntil: 'networkidle2', timeout: 90000 });
      await page.waitForSelector(p.espera, { timeout: 60000 });
      await page.screenshot({ path: path.join(OUT, `screen_${p.name}.png`) });

      await page.addScriptTag({ content: axe.source });
      const resultadoAxe = await page.evaluate(async () => await axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      }));
      fs.writeFileSync(path.join(OUT, `axe_${p.name}.json`), JSON.stringify(resultadoAxe, null, 2));

      const flow = await startFlow(page, { name: p.name });
      await flow.navigate(URL, { stepName: p.name, timeout: 90000 });
      const resultadoLh = await flow.createFlowResult();
      fs.writeFileSync(path.join(OUT, `lh_${p.name}_flow.json`), JSON.stringify(resultadoLh, null, 2));

      const paso = resultadoLh.steps && resultadoLh.steps[0] && resultadoLh.steps[0].lhr;
      console.log(`${p.name}: axe violations=${resultadoAxe.violations.length}; ` +
        `LH accessibility=${paso && paso.categories && paso.categories.accessibility ? paso.categories.accessibility.score : 'N/A'}; ` +
        `LH performance=${paso && paso.categories && paso.categories.performance ? paso.categories.performance.score : 'N/A'}`);
    } finally {
      await browser.close();
    }
  }
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
