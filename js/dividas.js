/**
 * AQUAGESTOR PRO — DÍVIDAS (REBUILD)
 * Basic debt register, parcel calculation and rendering
 */

const Dividas = (() => {
  function toggleForm() { const el = document.getElementById('formDivida'); if (el) el.classList.toggle('open'); }

  function calcularParcelas() {
    const total = parseFloat(UI.getValue('dvValorTotal')) || 0;
    const entrada = parseFloat(UI.getValue('dvEntrada')) || 0;
    const n = parseInt(UI.getValue('dvParcelas')) || 1;
    const saldo = Math.max(0, total - entrada);
    const parcela = parseFloat((saldo / n).toFixed(2));
    UI.setValue('dvValorParcela', parcela);
    const preview = document.getElementById('previewDivida');
    if (preview) { preview.style.display='block'; preview.innerHTML = `Saldo: ${Utils.fmtMoney(saldo)} · ${n}x de ${Utils.fmtMoney(parcela)}`; }
  }

  function registrar() {
    const fornecedor = UI.getValue('dvFornecedor') || '—';
    const categoria = UI.getValue('dvCategoria') || 'outros';
    const total = parseFloat(UI.getValue('dvValorTotal')) || 0;
    const entrada = parseFloat(UI.getValue('dvEntrada')) || 0;
    const n = parseInt(UI.getValue('dvParcelas')) || 1;
    const venc = UI.getValue('dvVencimento') || Utils.today();
    const parcelas = [];
    const saldo = Math.max(0, total - entrada);
    const valorParcela = parseFloat((saldo / n).toFixed(2));
    for (let i=0;i<n;i++) parcelas.push({ num:i+1, valor: valorParcela, vencimento: new Date(new Date(venc+'T12:00:00').getFullYear(), new Date(venc+'T12:00:00').getMonth()+i, new Date(venc+'T12:00:00').getDate()).toISOString().slice(0,10), paga:false });
    const dividas = Storage.loadDividas();
    const d = { id: Utils.genId(), fornecedor, categoria, valorTotal: total, entrada, parcelas, saldo: saldo, observacoes: UI.getValue('dvObs') };
    dividas.push(d); Storage.saveDividas(dividas); render(); UI.toast('✅ Dívida registrada');
    toggleForm();
  }

  function pagarParcela(dividaId, parcelaNum) {
    const dividas = Storage.loadDividas();
    const d = dividas.find(x=>x.id===dividaId);
    if (!d) return; const p = d.parcelas.find(x=>x.num===parcelaNum); if (!p) return;
    p.paga = true; d.saldo = d.parcelas.filter(x=>!x.paga).reduce((s,x)=>s+x.valor,0); Storage.saveDividas(dividas); render(); UI.toast('✅ Parcela marcada como paga');
  }

  function excluir(id) {
    UI.confirm({ icon:'🗑️', title:'Excluir Dívida?', msg:'Esta ação não pode ser desfeita.', type:'danger', okLabel:'🗑️ Excluir', onConfirm: () => {
      Storage.saveDividas(Storage.loadDividas().filter(d=>d.id!==id)); render(); UI.toast('✅ Dívida excluída');
    }});
  }

  function toggleCard(id) { const el = document.getElementById('dc_'+id); if (el) el.classList.toggle('open'); }

  function render() {
    const div = document.getElementById('dividasLista'); const cnt = document.getElementById('cntDividas');
    const dividas = Storage.loadDividas(); if (cnt) cnt.textContent = dividas.length;
    if (!div) return; if (!dividas.length) { div.innerHTML = UI.emptyState('Nenhuma dívida cadastrada.'); return; }
    div.innerHTML = dividas.map(d => `
      <div class="card" id="dc_${d.id}">
        <div style="display:flex;justify-content:space-between;align-items:center;"><div><strong>${d.fornecedor}</strong><div style="font-size:.85rem;color:var(--text3);">${d.categoria} · ${Utils.fmtMoney(d.valorTotal)}</div></div>
        <div><button onclick="toggleDividaCard(${d.id})" class="btn-sm">Ver</button><button onclick="excluirDivida(${d.id})" class="btn-danger btn-sm">🗑️</button></div></div>
        <div style="margin-top:8px;display:none;" class="card-body">
          <div>Saldo: ${Utils.fmtMoney(d.saldo)}</div>
          <div>Parcelas:</div>
          ${d.parcelas.map(p=>`<div style="display:flex;gap:8px;align-items:center;"><div>#${p.num} — ${Utils.fmtMoney(p.valor)} — ${p.vencimento}</div><button onclick="pagarParcela(${d.id},${p.num})" class="btn-sm">Pagar</button></div>`).join('')}
        </div>
      </div>
    `).join('');
  }

  return { toggleForm, calcularParcelas, registrar, pagarParcela, excluir, toggleCard, render };
})();

// Global wrappers
function toggleFormDivida(){ Dividas.toggleForm(); }
function calcularParcelasDivida(){ Dividas.calcularParcelas(); }
function registrarDivida(){ Dividas.registrar(); }
function pagarParcela(id,n){ Dividas.pagarParcela(id,n); }
function excluirDivida(id){ Dividas.excluir(id); }
function toggleDividaCard(id){ Dividas.toggleCard(id); }
function renderModuloDividas(){ Dividas.render(); }
