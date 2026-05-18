(function(){
  // expose-globals.js — Ensure legacy inline handlers find modules on window
  try {
    if (typeof Utils !== 'undefined' && typeof window.Utils === 'undefined') window.Utils = Utils;
    if (typeof Storage !== 'undefined' && typeof window.Storage === 'undefined') window.Storage = Storage;
    if (typeof UI !== 'undefined' && typeof window.UI === 'undefined') window.UI = UI;
    if (typeof Routes !== 'undefined' && typeof window.Routes === 'undefined') window.Routes = Routes;
    if (typeof Auth !== 'undefined' && typeof window.Auth === 'undefined') window.Auth = Auth;
    if (typeof Pisciculturas !== 'undefined' && typeof window.Pisciculturas === 'undefined') window.Pisciculturas = Pisciculturas;
    if (typeof Tanques !== 'undefined' && typeof window.Tanques === 'undefined') window.Tanques = Tanques;
    if (typeof Lotes !== 'undefined' && typeof window.Lotes === 'undefined') window.Lotes = Lotes;
    if (typeof Racao !== 'undefined' && typeof window.Racao === 'undefined') window.Racao = Racao;
    if (typeof MaoDeObra !== 'undefined' && typeof window.MaoDeObra === 'undefined') window.MaoDeObra = MaoDeObra;
    if (typeof Dashboard !== 'undefined' && typeof window.Dashboard === 'undefined') window.Dashboard = Dashboard;

    // Some builds expose renderDashboardFinanceiro as a free function — forward it
    if (typeof renderDashboardFinanceiro === 'function' && typeof window.renderDashboardFinanceiro === 'undefined') {
      window.renderDashboardFinanceiro = renderDashboardFinanceiro;
    }
  } catch (e) {
    // Do not break app boot if exposing fails
    console.debug('expose-globals.js error', e);
  }
})();
