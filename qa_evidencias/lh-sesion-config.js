// Config temporal de Lighthouse para auditar pantallas autenticadas del POS.
// Inyecta una sesión REAL (obtenida vía POST /api/login) en sessionStorage
// antes de que cargue la SPA. No modifica el código de la aplicación.
class SesionGatherer {
  async beforePass(passContext) {
    const datos = JSON.parse(process.env.MINISO_SESION);
    const sesion = JSON.stringify({ user: datos, page: process.env.MINISO_PAGINA || 'dashboard' });
    const source = `try{sessionStorage.setItem('miniso_sesion', ${JSON.stringify(sesion)});}catch(e){}`;
    await passContext.driver.sendCommand('Page.addScriptToEvaluateOnNewDocument', { source });
  }
  async afterPass() {}
}

module.exports = {
  extends: 'lighthouse:default',
  passes: [{
    passName: 'defaultPass',
    gatherers: [{ instance: SesionGatherer }],
  }],
};
