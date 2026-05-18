/**
 * AQUAGESTOR PRO — TANQUES (REBUILD)
 * Minimal, robust implementation to replace placeholders and provide core features
 */

const Tanques = (() => {
  function getAll() { return Storage.loadTanques(); }
  function getByNum(n) { return getAll().find(t => t.num === n); }

  function isOcupado(numTanque) {
    const lotes = Storage.loadLotes();
    return lotes.some(l => (l.tanques||[]).some(t => t.num === numTanque && (t.qtdPeixes||0) > 0));
  }

  function getInfoOcupado(numTanque) {
    const lotes = Storage.loadLotes();
    for (const l of lotes) {
      const t = (l.tanques||[]).find(x => x.num === numTanque);
      if (t) return { loteId: l.id, lote: l, tanque: t };
    }
    return null;
  }

  function addTanque() {
    const num = UI.getValue('tnum').trim();
    if (!num) { UI.toast('Informe o número do tanque', true); return; }
    const vol = parseFloat(UI.getValue('tvol')) || 0;
    const malha = UI.getValue('tmalha') || '';
    const material = UI.getValue('tmat') || '';
    const tanques = Storage.loadTanques();
    if (tanques.find(t => t.num === num)) { UI.toast('Número já existe', true); return; }
    tanques.push({ id: Utils.genId(), num, vol, malha, material });
    Storage.saveTanques(tanques);
    UI.clearFields(['tnum','tvol','tmalha']);
    render();
    UI.toast('✅ Tanque adicionado');
  }

  function addMultiplos() {
    const qtd = parseInt(UI.getValue('loteQtde')) || 0;
    const prefix = UI.getValue('lotePrefix') || 'T';
    const vol = parseFloat(UI.getValue('loteVol')) || 0;
    const malha = UI.getValue('loteMalha') || '';
    const mat = UI.getValue('loteMat') || '';
    if (qtd <= 0) { UI.toast('Informe quantidade', true); return; }
    const tanques = Storage.loadTanques();
    // find last numeric suffix
    let maxNum = 0;
    tanques.forEach(t => {
      const m = t.num.match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
    });
    for (let i = 1; i <= qtd; i++) {
      maxNum++;
      const num = prefix + String(maxNum).padStart(2,'0');
      tanques.push({ id: Utils.genId()+i, num, vol, malha, material: mat });
    }
    Storage.saveTanques(tanques);
    render();
    UI.toast(`✅ ${qtd} tanques criados`);
  }

  function excluir(id) {
    UI.confirm({ title:'Excluir Tanque?', msg:'Remover tanque permanentemente?', icon:'🗑️', type:'danger', okLabel:'🗑️ Excluir',
      onConfirm: () => {
        Storage.saveTanques(Storage.loadTanques().filter(t => t.id !== id));
        render(); UI.toast('✅ Tanque removido');
      }
    });
  }

  function liberar(numTanque) {
    UI.confirm({ title:'Liberar Tanque?', msg:`Liberar tanque ${numTanque} (remover peixes)?`, icon:'🔓', type:'warn', okLabel:'🔓 Liberar',
      onConfirm: () => {
        const lotes = Storage.loadLotes();
        lotes.forEach(l => { l.tanques = (l.tanques||[]).map(t => t.num===numTanque ? ({...t, qtdPeixes:0, mortalidade:0}) : t); });
        Storage.saveLotes(lotes);
        render(); UI.toast('✅ Tanque liberado');
      }
    });
  }

  function populateSelect(selectId, tipo = 'todos', withEmpty = false) {
    const el = document.getElementById(selectId);
    if (!el) return;
    const tanques = Storage.loadTanques();
    let opts = tanques;
    if (tipo === 'ocupados') opts = tanques.filter(t => isOcupado(t.num));
    if (tipo === 'livres') opts = tanques.filter(t => !isOcupado(t.num));
    el.innerHTML = (withEmpty?'<option value="">—</option>':'') + opts.map(t => `<option value="${t.num}">${t.num} ${t.vol?'- '+t.vol+'m³':''}</option>`).join('');
  }

  function render() {
    const tanques = Storage.loadTanques();
    const div = document.getElementById('tanquesLista');
    const cont = document.getElementById('contTanques');
    if (cont) cont.textContent = tanques.length;
    if (!div) return;
    if (!tanques.length) { div.innerHTML = UI.emptyState('Nenhum tanque cadastrado.'); return; }
    div.innerHTML = tanques.map(t => {
      const ocupado = isOcupado(t.num);
      const info = ocupado ? getInfoOcupado(t.num) : null;
      return `<div class="card" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div>
          <div style="font-weight:700">${t.num} ${t.vol?'- '+t.vol+'m³':''}</div>
          <div style="font-size:.85rem;color:var(--text3);">${t.malha||''} ${t.material?'- '+t.material:''} ${ocupado?`· Ocupado (Lote ${info.loteId})`:''}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button onclick="tanqueDetalhes('${t.num}')" class="btn-sm">Detalhes</button>
          <button onclick="excluirTanque(${t.id})" class="btn-danger btn-sm">🗑️</button>
        </div>
      </div>`;
    }).join('');
    // update selects used elsewhere
    populateSelect('bioTanque'); populateSelect('alimTanque'); populateSelect('vTanque'); populateSelect('dTanque');
  }

  // small helper exported methods
  return { getAll, getByNum, isOcupado, getInfoOcupado, addTanque, addMultiplos, excluir, liberar, populateSelect, render };
})();

// Global wrappers
function tanqueDetalhes(n){ const info=Tanques.getInfoOcupado(n); if(info) UI.toast(`Tanque ${n}: Lote ${info.loteId}`); else UI.toast(`Tanque ${n}: livre`); }
function addTanque() { Tanques.addTanque(); }
function addMultiplosTanques(){ Tanques.addMultiplos(); }
function excluirTanque(id){ Tanques.excluir(id); }
function liberarTanque(n){ Tanques.liberar(n); }
function renderTanques(){ Tanques.render(); }
