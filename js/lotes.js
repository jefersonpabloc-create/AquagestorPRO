/**
 * AQUAGESTOR PRO — LOTES (REBUILD)
 * Minimal implementation to handle creation/distribution and basic calculations
 */

const Lotes = (() => {
  // temporary UI state
  const state = { selectedTanques: new Set() };

  function toggleForm() {
    const el = document.getElementById('formLote'); if (el) el.classList.toggle('open');
  }

  function renderBotoesTanques() {
    const btns = document.getElementById('lTanquesBtns'); if (!btns) return;
    const tanques = Storage.loadTanques();
    btns.innerHTML = tanques.map(t => `<button type="button" onclick="toggleTanqueLote('${t.num}')" class="btn-sm">${t.num}</button>`).join('');
  }

  function toggleTanque(num) {
    if (state.selectedTanques.has(num)) state.selectedTanques.delete(num); else state.selectedTanques.add(num);
    atualizarDistribuicao();
  }

  function atualizarDistribuicao() {
    const container = document.getElementById('lDistribuicaoInputs');
    const total = parseInt(UI.getValue('lqtd')) || 0;
    if (!container) return;
    const selected = Array.from(state.selectedTanques);
    if (!selected.length) { container.innerHTML = ''; UI.setText('lDistribuicaoStatus','Selecione tanques para distribuir'); return; }
    container.innerHTML = selected.map(n => `
      <div class="field" style="display:flex;gap:8px;align-items:center;">
        <label style="width:120px">${n}</label>
        <input type="number" class="dist-input" data-tanque="${n}" value="${Math.floor(total/selected.length)}" style="flex:1;padding:6px;">
      </div>
    `).join('');
    validarDistribuicao();
  }

  function validarDistribuicao() {
    const total = parseInt(UI.getValue('lqtd')) || 0;
    const inputs = Array.from(document.querySelectorAll('.dist-input'));
    const som = inputs.reduce((s,ip) => s + (parseInt(ip.value)||0), 0);
    const status = document.getElementById('lDistribuicaoStatus');
    if (!status) return;
    if (som === total) { status.textContent = 'Distribuição válida'; status.style.color = 'green'; } else { status.textContent = `Total definido ${som} de ${total}`; status.style.color='orange'; }
  }

  function distribuirIgualmente() {
    const total = parseInt(UI.getValue('lqtd')) || 0;
    const buttons = document.querySelectorAll('#lTanquesBtns button');
    const selected = Array.from(buttons).map(b=>b.textContent.trim());
    if (!selected.length) { UI.toast('Selecione tanques', true); return; }
    const per = Math.floor(total/selected.length);
    state.selectedTanques = new Set(selected);
    atualizarDistribuicao();
    document.querySelectorAll('.dist-input').forEach(ip => ip.value = per);
    validarDistribuicao();
  }

  function addLote() {
    const qtdTotal = parseInt(UI.getValue('lqtd')) || 0;
    if (qtdTotal <= 0) { UI.toast('Informe a quantidade total', true); return; }
    const fornecedor = UI.getValue('lfornecedor');
    const cidade = UI.getValue('lcidadeOrigem');
    const pesoMedioAlevino = parseFloat(UI.getValue('lpesoMedioAlevino')) || 0;
    const tipoRacao = UI.getValue('lTipoRacao') || Utils.tipoRacaoPorPeso(pesoMedioAlevino);
    const distrib = Array.from(document.querySelectorAll('.dist-input')).map(i => ({ num: i.dataset.tanque, qtd: parseInt(i.value)||0 }));
    const tanques = distrib.map(d => ({ num: d.num, qtdPeixes: d.qtd, mortalidade:0, consumoRacao:0, consumoDetalhado:[], ultimoPesoMedio: pesoMedioAlevino, ultimaBiomassa: (pesoMedioAlevino/1000)*(d.qtd||0) }));
    const lotes = Storage.loadLotes();
    const lote = { id: Utils.genId(), qtdTotal, valorAlevinos: parseFloat(UI.getValue('lvalor'))||0, custoUnitario:0, fornecedor, cidadeOrigem:cidade, pesoMedioAlevino, dataEstocagem: UI.getValue('ldataEstocagem')||Utils.today(), biomassaInicial:0, tipoRacao, tanques, biometrias:[] };
    lotes.push(lote);
    Storage.saveLotes(lotes);
    UI.clearFields(['lqtd','lfornecedor','lcidadeOrigem','lvalor','ldataEstocagem']);
    state.selectedTanques.clear();
    render();
    UI.toast('✅ Lote registrado');
  }

  function excluir(id) {
    UI.confirm({ title:'Remover Lote?', msg:'Remover lote e liberar tanques?', icon:'🗑️', type:'danger', okLabel:'🗑️ Remover', onConfirm: () => {
      Storage.saveLotes(Storage.loadLotes().filter(l => l.id !== id)); render(); UI.toast('✅ Lote removido');
    }});
  }

  function toggleCard(loteId) {
    const el = document.getElementById('l_'+loteId); if (el) el.classList.toggle('open');
  }

  function render() {
    const lotes = Storage.loadLotes();
    const div = document.getElementById('lotesLista'); const cnt = document.getElementById('contLotes');
    if (cnt) cnt.textContent = lotes.length;
    if (!div) return; if (!lotes.length) { div.innerHTML = UI.emptyState('Nenhum lote cadastrado.'); return; }
    div.innerHTML = lotes.map(l => `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><div><strong>Lote #${l.id}</strong><div style="font-size:.85rem;color:var(--text3);">${l.qtdTotal} alevinos · ${l.fornecedor||''}</div></div><div><button onclick="toggleLoteCard(${l.id})" class="btn-sm">Ver</button><button onclick="excluirLote(${l.id})" class="btn-danger btn-sm">🗑️</button></div></div></div>`).join('');
    renderBotoesTanques();
  }

  function atualizarTipoRacao() {
    const peso = parseFloat(UI.getValue('lpesoMedioAlevino')) || 0;
    UI.setValue('lTipoRacao', Utils.tipoRacaoPorPeso(peso));
  }

  // helper calculators
  function calcularConsumoRacaoLote(lote) {
    return (lote.tanques||[]).reduce((s,t) => s + (t.consumoRacao||0), 0);
  }

  function calcularBiomassaTotalLote(lote) {
    return (lote.tanques||[]).reduce((s,t) => s + ((t.ultimaBiomassa) || ((t.ultimoPesoMedio||lote.pesoMedioAlevino||0)/1000)*(t.qtdPeixes||0)), 0);
  }

  function calcularCustoPorKGLote(lote) {
    const custoTotal = lote.valorAlevinos || 0; const biomassa = calcularBiomassaTotalLote(lote) || 0.0001; return { custoTotal, custoPorKg: custoTotal/biomassa };
  }

  return { toggleForm, renderBotoesTanques, toggleTanque, atualizarDistribuicao, validarDistribuicao, distribuirIgualmente, addLote, excluir, toggleCard, render, atualizarTipoRacao, calcularConsumoRacaoLote, calcularBiomassaTotalLote, calcularCustoPorKGLote };
})();

// Global wrappers
function toggleFormLote(){ Lotes.toggleForm(); }
function renderLotes(){ Lotes.render(); }
function renderBotoesTanquesLote(){ Lotes.renderBotoesTanques(); }
function toggleTanqueLote(n){ Lotes.toggleTanque(n); }
function addLote(){ Lotes.addLote(); }
function excluirLote(id){ Lotes.excluir(id); }
function distribuirIgualmente(){ Lotes.distribuirIgualmente(); }
function atualizarTipoRacaoLote(){ Lotes.atualizarTipoRacao(); }
