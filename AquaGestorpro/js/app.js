/**
 * AQUAGESTOR PRO — APP
 * Main entry point, initialization, orchestration
 */

const App = (() => {
  // ── Seed demo data ─────────────────────────────────────────────────
  function seed() {
    if (Storage.loadTanques().length === 0) {
      Storage.saveTanques([
        { id: 1001, num:'T01', vol:50, malha:'Fina 5mm',   material:'Geomembrana' },
        { id: 1002, num:'T02', vol:80, malha:'Média 10mm', material:'PVC' },
      ]);
    }
    if (Storage.loadModelosRacao().length === 0) {
      Storage.saveModelosRacao([
        { id:100, marca:'Supra',      pellet:'4-6mm',    proteina:32, pesoSaco:25 },
        { id:101, marca:'Guabi',      pellet:'6-8mm',    proteina:35, pesoSaco:25 },
        { id:102, marca:'Purina',     pellet:'pó',       proteina:30, pesoSaco:25 },
        { id:103, marca:'Tilápia Top',pellet:'1.3-1.5mm',proteina:34, pesoSaco:25 },
      ]);
    }
    if (Storage.loadLotes().length === 0) {
      Storage.saveLotes([{
        id:2001, qtdTotal:2000, valorAlevinos:1200, custoUnitario:0.6,
        fornecedor:'Bom Peixe Ltda', cidadeOrigem:'Patos de Minas - MG',
        pesoMedioAlevino:5, dataEstocagem:'2025-03-01', biomassaInicial:10,
        tipoRacao:'🟡 2–3mm (36% PB)',
        tanques:[{ num:'T01', qtdPeixes:2000, mortalidade:0, consumoRacao:50,
          consumoDetalhado:[], ultimoPesoMedio:5, ultimaBiomassa:10 }],
        biometrias:[],
      }]);
    }
    if (Storage.loadEstoqueRacao().length === 0) {
      Storage.saveEstoqueRacao([{
        id:3001, marca:'Supra', pb:32, pellet:'4-6mm',
        kgTotal:300, valorKg:3.8, data:'2025-03-10', quantidadeSacos:12, pesoPorSaco:25,
      }]);
    }
    if (Storage.loadColabs().length === 0) {
      Storage.saveColabs([{ id:4001, nome:'João Silva', tipo:'mensal', valorBase:2200 }]);
    }
  }

  // ── Reload all modules ─────────────────────────────────────────────
  function reloadAll() {
    Tanques.render();
    Lotes.render();
    MaoDeObra.render();
    Racao.renderEstoque();
    Racao.renderModelos();
    Dashboard.atualizar();
    renderDashboardFinanceiro();
    Routes.go('menu');
  }

  // ── Boot ───────────────────────────────────────────────────────────
  function init() {
    // 1. Check/restore session
    Auth.init();
    Auth.checkSession();

    // 2. Init multi-farm
    Pisciculturas.init();

    // 3. Seed demo data
    seed();

    // 4. Load horarios tratos (backward compat)
    if (window.loadHorariosTratos) loadHorariosTratos();

    // 5. Render all modules
    Tanques.render();
    Lotes.render();
    MaoDeObra.render();
    Racao.renderEstoque();
    Racao.renderModelos();

    // 6. Render financial
    Dashboard.atualizar();
    renderDashboardFinanceiro();

    // 7. Navigate to menu
    Routes.go('menu');

    // 8. Register nav lifecycle hooks
    Routes.onNav(sectionId => {
      if (sectionId === 'dividas')   Dividas.render();
      if (sectionId === 'estrategia') Estrategia.render();
      if (sectionId === 'financeiro') renderDashboardFinanceiro();
      if (sectionId === 'despesas')  Despesas.render();
      if (sectionId === 'tanques')   Tanques.render();
      if (sectionId === 'lotes')     Lotes.render();
      if (sectionId === 'mao')       MaoDeObra.render();
      if (sectionId === 'racao')     { Racao.renderEstoque(); Racao.renderModelos(); }
    });

    // 9. Start day-check loop
    if (window.iniciarVerificacaoNovoDia) iniciarVerificacaoNovoDia();
  }

  return { init, seed, reloadAll };
})();

// ── Global shims ─────────────────────────────────────────────────────
function init()             { App.init(); }
function seedExemplo()      { App.seed(); }

// Boot on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  // Small timeout so all scripts have finished parsing
  setTimeout(() => { App.init(); }, 0);
});
