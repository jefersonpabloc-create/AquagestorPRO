/**
 * AQUAGESTOR PRO — TANQUES
 * Tank registration, listing, occupancy, harvest
 */

const Tanques = (() => {
  // ── Queries ────────────────────────────────────────────────────────
  function getAll()    { return Storage.loadTanques(); }
  function getByNum(n) { return getAll().find(t => t.num === n); }

  function isOcupado(numTanque) {
    return Storage.loadLotes().some(l =>
      l.tanques && l.tanques.some(t => t.num === numTanque && t.qtdPeixes > 0)
    );
  }

  function getInfoOcupado(numTanque) {
    for (const l of Storage.loadLotes()) {
      const t = l.tanques && l.tanques.find(t => t.num === numTanque);
      if (t && t.qtdPeixes > 0) return { loteId: l.id, qtdPeixes: t.qtdPeixes, lote: l, tanque: t };
    }
    return null;
  }

  // ── Add single ─────────────────────────────────────────────────────
  function addTanque() {
    const num      = UI.getValue('tnum').trim();
    const vol      = parseFloat(UI.getValue('tvol'));
    const malha    = UI.getValue('tmalha');
    const material = UI.getValue('tmat');

    if (!num || isNaN(vol) || vol <= 0) { UI.toast('Preencha número e volume', true); return; }
    const tanques = getAll();
    if (tanques.some(t => t.num === num)) { UI.toast('Tanque já existe!', true); return; }

    tanques.push({ id: Utils.genId(), num, vol, malha, material });
    Storage.saveTanques(tanques);
    render();
    UI.clearFields(['tnum','tvol','tmalha']);
    UI.toast(`✅ Tanque ${num} adicionado`);
    const fi = document.getElementById('formTanqueIndividual');
    if (fi) fi.classList.remove('open');
  }

  // ── Add batch ──────────────────────────────────────────────────────
  function addMultiplos() {
    const qtd      = parseInt(UI.getValue('loteQtde'));
    const prefixo  = UI.getValue('lotePrefix').trim() || 'T';
    const volume   = parseFloat(UI.getValue('loteVol'));
    const malha    = UI.getValue('loteMalha');
    const material = UI.getValue('loteMat');

    if (isNaN(qtd) || qtd <= 0 || isNaN(volume) || volume <= 0) { UI.toast('Dados inválidos', true); return; }

    const existentes = getAll();
    const nums = existentes
      .filter(t => t.num.startsWith(prefixo))
      .map(t => parseInt(t.num.substring(prefixo.length), 10))
      .filter(n => !isNaN(n) && n > 0);
    const proximo = nums.length ? Math.max(...nums) + 1 : 1;

    const novos = [], nomes = [];
    for (let i = 0; i < qtd; i++) {
      const n = `${prefixo}${String(proximo + i).padStart(2, '0')}`;
      if (existentes.some(t => t.num === n)) continue;
      novos.push({ id: Utils.genId() + i, num: n, vol: volume, malha, material });
      nomes.push(n);
    }
    if (!novos.length) { UI.toast('Nenhum tanque criado (duplicados)', true); return; }
    Storage.saveTanques([...existentes, ...novos]);
    render();
    UI.toast(`✅ ${novos.length} tanques: ${nomes.join(', ')}`);
    const fl = document.getElementById('formTanqueLote');
    if (fl) fl.classList.remove('open');
  }

  // ── Delete ─────────────────────────────────────────────────────────
  function excluir(id) {
    const t = getAll().find(t => t.id === id);
    if (!t) return;
    if (isOcupado(t.num)) { UI.toast('Não é possível excluir tanque ocupado', true); return; }
    UI.confirm({
      title: 'Excluir Tanque', msg: `Remover permanentemente o tanque "${t.num}"?`,
      icon: '🗑️', type: 'danger', okLabel: '🗑️ Excluir',
      onConfirm: () => {
        Storage.saveTanques(Storage.loadTanques().filter(x => x.id !== id));
        render();
        UI.toast(`✅ Tanque ${t.num} removido`);
      }
    });
  }

  // ── Harvest (despescar) ────────────────────────────────────────────
  function liberar(numTanque) {
    const lotes = Storage.loadLotes();
    let loteIndex = -1, tanqueIndex = -1;
    for (let i = 0; i < lotes.length; i++) {
      const idx = (lotes[i].tanques || []).findIndex(t => t.num === numTanque);
      if (idx !== -1) { loteIndex = i; tanqueIndex = idx; break; }
    }
    if (loteIndex === -1) { UI.toast('Tanque não está ocupado', true); return; }

    const lote  = lotes[loteIndex];
    const tObj  = lote.tanques[tanqueIndex];
    const qtd   = tObj.qtdPeixes;

    UI.confirm({
      title: '🎣 Despescar Tanque',
      msg: `Despescar tanque ${numTanque}?\n\n${qtd} peixes serão removidos do lote.`,
      icon: '🎣', type: 'warn', okLabel: '🎣 Despescar',
      onConfirm: () => {
        tObj.despescado      = true;
        tObj.dataDespesca    = new Date().toLocaleDateString('pt-BR');
        tObj.qtdDespescada   = qtd;
        tObj.qtdPeixes       = 0;
        lote.qtdTotal        = lote.tanques.reduce((s,t) => s + (t.qtdPeixes||0), 0);
        const ativos         = lote.tanques.filter(t => !t.despescado && t.qtdPeixes > 0);
        if (!ativos.length) { lote.encerrado = true; lote.dataEncerramento = new Date().toLocaleDateString('pt-BR'); }
        Storage.saveLotes(lotes);
        if (window.Lotes) Lotes.render();
        render();
        UI.toast(`✅ Tanque ${numTanque} despescado`);
      }
    });
  }

  // ── Populate selects ───────────────────────────────────────────────
  function populateSelect(selectId, tipo = 'todos', withEmpty = false) {
    const tanques = getAll();
    const sel     = document.getElementById(selectId);
    if (!sel) return;
    let opts = [];
    if (withEmpty) opts.push('<option value="">— Não usar —</option>');
    if (tipo === 'distribuicao') {
      const disponiveis = tanques.filter(t => !isOcupado(t.num));
      if (!disponiveis.length) {
        opts.push('<option value="" disabled selected>Nenhum tanque disponível</option>');
      } else {
        disponiveis.forEach(t => opts.push(`<option value="${t.num}">${t.num} (${t.vol}m³)${t.malha?' - '+t.malha:''}</option>`));
      }
    } else if (tipo === 'ocupados') {
      const ocupados = tanques.filter(t => isOcupado(t.num));
      if (!ocupados.length && !withEmpty) {
        opts.push('<option value="" disabled selected>Nenhum tanque ocupado</option>');
      } else {
        ocupados.forEach(t => opts.push(`<option value="${t.num}">${t.num} (${t.vol}m³)</option>`));
      }
    } else {
      tanques.forEach(t => opts.push(`<option value="${t.num}">${t.num} (${t.vol}m³)</option>`));
    }
    if (!withEmpty && tipo !== 'distribuicao' && !opts.length)
      opts.push('<option value="">Nenhum tanque disponível</option>');
    sel.innerHTML = opts.join('');
  }

  // ── Render ─────────────────────────────────────────────────────────
  function render() {
    const tanques = getAll();
    const div     = document.getElementById('tanquesLista');
    const cnt     = document.getElementById('contTanques');
    if (cnt) cnt.textContent = tanques.length;
    if (!div) return;

    if (!tanques.length) {
      div.innerHTML = UI.emptyState('Nenhum tanque cadastrado. Clique em ➕ Individual ou ⚡ Em Lote.');
      return;
    }
    div.innerHTML = tanques.map(t => {
      const ocupado = isOcupado(t.num);
      const info    = ocupado ? getInfoOcupado(t.num) : null;
      const loteLabel = info ? String(info.loteId).slice(-4) : '?';
      const badge = ocupado
        ? `<span class="badge-ocupado">🐟 Lote #${loteLabel}</span>`
        : `<span class="badge-disponivel">✅ Livre</span>`;
      const pesoMedio = info && (info.lote.biometrias||[]).length
        ? info.lote.biometrias[info.lote.biometrias.length-1].pesoMedio
        : (info ? (info.lote.pesoMedioAlevino||0) : 0);
      const subInfo = info
        ? `${info.qtdPeixes} peixes · ${pesoMedio.toFixed(0)}g · ${t.vol}m³ · ${t.malha||'-'} · ${t.material||''}`
        : `${t.vol}m³ · ${t.malha||'-'} · ${t.material||''}`;
      return `<div class="list-item">
        <div class="list-item-main">
          <div class="list-item-title">🏞️ ${t.num} ${badge}</div>
          <div class="list-item-sub">${subInfo}</div>
        </div>
        <div class="list-item-actions">
          ${ocupado ? `<button onclick="Tanques.liberar('${t.num}')" class="btn-success btn-xs">🎣 Despescar</button>` : ''}
          <button onclick="Tanques.excluir(${t.id})" class="btn-danger btn-xs">🗑️</button>
        </div>
      </div>`;
    }).join('');

    // Refresh dependent selects
    populateSelect('lTanquesSelect', 'distribuicao');
    populateSelect('bioTanque', 'ocupados');
    populateSelect('alimTanque', 'ocupados');
    populateSelect('mortTanque', 'ocupados');
    populateSelect('origemTanque', 'ocupados');
  }

  // ── Public API ─────────────────────────────────────────────────────
  return { getAll, getByNum, isOcupado, getInfoOcupado, addTanque, addMultiplos, excluir, liberar, populateSelect, render };
})();

// ── Global shims ─────────────────────────────────────────────────────
function addTanque()               { Tanques.addTanque(); }
function addMultiplosTanques()     { Tanques.addMultiplos(); }
function renderTanques()           { Tanques.render(); }
function excluirTanque(id)         { Tanques.excluir(id); }
function liberarTanque(n)          { Tanques.liberar(n); }
function isTanqueOcupado(n)        { return Tanques.isOcupado(n); }
function getInfoTanqueOcupado(n)   { return Tanques.getInfoOcupado(n); }
function atualizarSelectTanques(id, tipo, empty) { Tanques.populateSelect(id, tipo, empty); }
