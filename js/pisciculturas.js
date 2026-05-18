/**
 * AQUAGESTOR PRO — PISCICULTURAS
 * Multi-farm management: create, switch, delete
 */

const Pisciculturas = (() => {
  const LISTA_KEY  = '__pisciculturas__';
  const ATIVA_KEY  = '__piscAtiva__';

  // ── Data ───────────────────────────────────────────────────────────
  function getLista()      { return Storage.loadGlobal(LISTA_KEY, []); }
  function setLista(lista) { Storage.saveGlobal(LISTA_KEY, lista); }
  function getAtiva()      { return Storage.loadGlobal(ATIVA_KEY, null); }
  function setAtiva(id)    { Storage.saveGlobal(ATIVA_KEY, id); }

  // ── Init ───────────────────────────────────────────────────────────
  function init() {
    let lista = getLista();
    if (!lista.length) {
      const id = 'pisc_' + Date.now();
      lista = [{ id, nome: 'Minha Piscicultura', criadaEm: new Date().toISOString() }];
      setLista(lista);
      setAtiva(id);
    }
    const ativaId = getAtiva() || lista[0].id;
    // Ensure active is valid
    if (!lista.find(p => p.id === ativaId)) setAtiva(lista[0].id);
    Storage.setPrefix(getAtiva() + '_');
    atualizarHeader();
  }

  // ── Header ─────────────────────────────────────────────────────────
  function atualizarHeader() {
    const lista  = getLista();
    const ativaId = getAtiva();
    const ativa  = lista.find(p => p.id === ativaId);
    const badge  = document.getElementById('headerBadge');
    if (badge && ativa) {
      badge.textContent = `🐟 ${ativa.nome}`;
    }
  }

  // ── CRUD ───────────────────────────────────────────────────────────
  function criar() {
    const nome = UI.getValue('novaPiscNome').trim();
    if (!nome) { UI.toast('❌ Informe o nome da piscicultura', true); return; }
    const lista = getLista();
    const id    = 'pisc_' + Date.now();
    lista.push({ id, nome, criadaEm: new Date().toISOString() });
    setLista(lista);
    UI.setValue('novaPiscNome', '');
    const formEl = document.getElementById('formNovaPisc');
    if (formEl) formEl.classList.remove('open');
    renderGerenciador();
    UI.toast(`✅ Piscicultura "${nome}" criada!`);
  }

  function trocar(id) {
    const lista = getLista();
    if (!lista.find(p => p.id === id)) return;
    setAtiva(id);
    Storage.setPrefix(id + '_');
    fecharModal();
    atualizarHeader();
    if (window.App) App.reloadAll();
    UI.toast('✅ Piscicultura alterada!');
  }

  function excluir(id) {
    const lista   = getLista();
    const pisc    = lista.find(p => p.id === id);
    if (!pisc) return;
    UI.confirm({
      title: '🗑️ Excluir Piscicultura',
      msg:   `Excluir "${pisc.nome}"?\nTodos os dados serão removidos permanentemente.`,
      icon: '🗑️', type: 'danger', okLabel: '🗑️ Excluir',
      onConfirm: () => {
        // Remove all storage keys for this piscicultura
        const prefix = id + '_';
        Object.keys(localStorage)
          .filter(k => k.startsWith(prefix))
          .forEach(k => localStorage.removeItem(k));
        setLista(lista.filter(p => p.id !== id));
        if (getAtiva() === id) {
          const remaining = getLista();
          if (remaining.length) trocar(remaining[0].id);
          else init();
        }
        renderGerenciador();
        UI.toast('✅ Piscicultura excluída');
      }
    });
  }

  function resetar() {
    const ativaId = getAtiva();
    const lista   = getLista();
    const pisc    = lista.find(p => p.id === ativaId);
    UI.confirm({
      title: '🔄 Resetar Piscicultura',
      msg:   `Apagar TODOS os dados de "${pisc?.nome}"?\nEsta ação não pode ser desfeita.`,
      icon: '🔄', type: 'danger', okLabel: '🔄 Resetar',
      onConfirm: () => {
        const prefix = ativaId + '_';
        Object.keys(localStorage)
          .filter(k => k.startsWith(prefix))
          .forEach(k => localStorage.removeItem(k));
        fecharModal();
        if (window.App) App.reloadAll();
        UI.toast('✅ Dados resetados');
      }
    });
  }

  // ── Modal ──────────────────────────────────────────────────────────
  function abrir() {
    const modal = document.getElementById('piscModal');
    if (modal) { modal.style.display = 'flex'; renderGerenciador(); }
  }

  function fecharModal() {
    const modal = document.getElementById('piscModal');
    if (modal) modal.style.display = 'none';
  }

  function fecharEvent(e) {
    if (e.target === document.getElementById('piscModal')) fecharModal();
  }

  function renderGerenciador() {
    const lista   = getLista();
    const ativaId = getAtiva();
    const div     = document.getElementById('piscLista');
    if (!div) return;
    div.innerHTML = lista.map(p => `
      <div class="pisc-item ${p.id === ativaId ? 'active' : ''}" onclick="Pisciculturas.trocar('${p.id}')">
        <div>
          <div class="pisc-item-name">${p.nome}</div>
          <div class="pisc-item-sub">Criada: ${Utils.toDateLocal(p.criadaEm.slice(0,10))}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${p.id === ativaId ? '<span class="pisc-badge">✅ Ativa</span>' : ''}
          <button onclick="event.stopPropagation();Pisciculturas.excluir('${p.id}')" class="btn-danger btn-xs">🗑️</button>
        </div>
      </div>`).join('');
  }

  // ── Public API ─────────────────────────────────────────────────────
  return {
    init, atualizarHeader,
    criar, trocar, excluir, resetar,
    abrir, fecharModal, fecharEvent, renderGerenciador,
    getLista, getAtiva,
  };
})();

// ── Global shims ─────────────────────────────────────────────────────
function initPisciculturas()                { Pisciculturas.init(); }
function abrirGerenciadorPisciculturas()    { Pisciculturas.abrir(); }
function fecharGerenciadorPisciculturas(e)  { Pisciculturas.fecharEvent(e); }
function fecharModalPisc()                  { Pisciculturas.fecharModal(); }
function criarNovaPiscicultura()            { Pisciculturas.criar(); }
function trocarParaPiscicultura(id)         { Pisciculturas.trocar(id); }
function excluirPiscicultura(id)            { Pisciculturas.excluir(id); }
function resetarDadosPiscicultura()         { Pisciculturas.resetar(); }
function renderGerenciadorPisciculturas()   { Pisciculturas.renderGerenciador(); }
function atualizarHeaderPisc()              { Pisciculturas.atualizarHeader(); }
