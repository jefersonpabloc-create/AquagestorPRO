/**
 * AQUAGESTOR PRO — FINANCEIRO (REBUILD)
 * Minimal implementations for registering despesas, rendering dashboard and wiring charts
 */

const Despesas = (() => {
  function registrar() {
    const cat = UI.getValue('dCategoria');
    const data = UI.getValue('dData') || Utils.today();
    const desc = UI.getValue('dDesc') || '';
    const valor = parseFloat(UI.getValue('dValor')) || 0;
    const tanque = UI.getValue('dTanque') || '';
    const tipo = UI.getValue('dTipo') || 'variavel';
    const pago = UI.getValue('dPago') || 'pago';
    if (!valor || !data) { UI.toast('Data e valor são obrigatórios', true); return; }
    const ds = Storage.loadDespesas(); ds.push({ id: Utils.genId(), cat, data, desc, valor, tanque, tipo, pago }); Storage.saveDespesas(ds);
    UI.clearFields(['dDesc','dValor']); render(); UI.toast('✅ Despesa registrada');
  }

  function render() {
    const ds = Storage.loadDespesas(); const div = document.getElementById('despesasLista'); const cnt = document.getElementById('cntDespesas'); if (cnt) cnt.textContent = ds.length;
    if (!div) return; if (!ds.length) { div.innerHTML = UI.emptyState('Nenhuma despesa.'); return; }
    div.innerHTML = ds.map(d => `<div class="card"><div><strong>${d.desc}</strong> — ${Utils.fmtMoney(d.valor)}</div></div>`).join('');
  }

  function excluir(id) {
    UI.confirm({ title:'Excluir Despesa?', msg:'Esta ação não pode ser desfeita.', icon:'🗑️', type:'danger', okLabel:'🗑️ Excluir', onConfirm: () => {
      Storage.saveDespesas(Storage.loadDespesas().filter(x=>x.id!==id)); render(); UI.toast('✅ Despesa excluída');
    }});
  }

  return { registrar, render, excluir };
})();

function registrarDespesa(){ Despesas.registrar(); }
function renderDespesas(){ Despesas.render(); }
function excluirDespesa(id){ Despesas.excluir(id); }

// Dashboard financial
function renderDashboardFinanceiro(){
  const vendas = Storage.loadVendas(); const despesas = Storage.loadDespesas(); const dividas = Storage.loadDividas();
  const set = (id,v) => UI.setText(id, v);
  const totalR = vendas.reduce((s,v)=>s+(v.valorTotal||0),0);
  const totalD = despesas.reduce((s,d)=>s+(d.valor||0),0);
  const lucro = totalR - totalD;
  set('fKpiReceita', Utils.fmtMoney(totalR)); set('fKpiDespesa', Utils.fmtMoney(totalD)); set('fKpiLucro', Utils.fmtMoney(lucro));
  // charts
  try { Charts.destroyAll(); Charts.receita(vendas); Charts.lucroDespesas(vendas, despesas); Charts.despesasCat(despesas); Charts.dividas(dividas, new Date()); } catch(e){ console.warn('Charts render failed', e); }
}

// Additional helpers (simplified)
function renderFluxoCaixa(){ const el = document.getElementById('extratoFluxo'); if (!el) return; el.innerHTML = '<div class="card">Fluxo de caixa (resumo)</div>'; }
function calcularProLabore(){ /* noop but safe */ }
function renderRentabTanques(){ /* noop */ }

function relFluxoCaixa(){ const el = document.getElementById('resultadoRel'); if (el) el.innerHTML = '📊 Consulte a aba Fluxo de Caixa'; }

