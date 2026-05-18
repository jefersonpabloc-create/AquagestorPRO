/**
 * AQUAGESTOR PRO — MÃO DE OBRA
 * Collaborators, salaries, advances
 */

const MaoDeObra = (() => {
  function adicionar() {
    const nome  = UI.getValue('cnome').trim();
    const tipo  = UI.getValue('ctipo') || 'mensalista';
    const valor = parseFloat(UI.getValue('cvalor')) || 0;
    if (!nome || valor <= 0) { UI.toast('Nome e valor válidos são obrigatórios', true); return; }
    const colabs = Storage.loadColabs();
    colabs.push({ id: Utils.genId(), nome, tipo, valorBase: valor });
    Storage.saveColabs(colabs);
    render();
    UI.clearFields(['cnome','cvalor']);
    UI.toast(`✅ ${nome} adicionado`);
  }

  function excluir(id) {
    UI.confirm({
      title: 'Excluir Colaborador?', msg: 'Esta ação não pode ser desfeita.', icon:'👷', type:'danger', okLabel:'🗑️ Excluir',
      onConfirm: () => {
        Storage.saveColabs(Storage.loadColabs().filter(c=>c.id!==id));
        render();
        UI.toast('✅ Colaborador removido');
      }
    });
  }

  function registrarAdiantamento() {
    const colabId = parseInt(UI.getValue('adColabId'));
    const valor   = parseFloat(UI.getValue('adValor')) || 0;
    const data    = UI.getValue('adData') || Utils.today();
    const obs     = UI.getValue('adObs');
    if (!colabId || valor <= 0) { UI.toast('❌ Selecione colaborador e valor', true); return; }
    const ads = Storage.load('adiantamentos') || [];
    ads.push({ id: Utils.genId(), colabId, valor, data, obs });
    Storage.save('adiantamentos', ads);
    UI.clearFields(['adValor','adObs']);
    render();
    UI.toast(`✅ Adiantamento de ${Utils.fmtMoney(valor)} registrado`);
  }

  function render() {
    const colabs = Storage.loadColabs();
    const div    = document.getElementById('colabLista');
    const cnt    = document.getElementById('dashColabs');
    if (cnt) cnt.textContent = colabs.length;
    if (!div) return;
    if (!colabs.length) { div.innerHTML = UI.emptyState('Nenhum colaborador cadastrado.'); return; }

    const ads       = Storage.load('adiantamentos') || [];
    const totalFolha= colabs.reduce((s,c)=>s+(c.valorBase||0),0);

    // Total da folha
    const totalDiv  = document.getElementById('totalFolhaSub');
    if (totalDiv) totalDiv.textContent = `Total folha: ${Utils.fmtMoney(totalFolha)}`;

    div.innerHTML = colabs.map(c => {
      const adsColab = ads.filter(a=>a.colabId===c.id);
      const totalAds = adsColab.reduce((s,a)=>s+(a.valor||0),0);
      return `<div class="list-item">
        <div class="list-item-main">
          <div class="list-item-title">👷 ${c.nome}</div>
          <div class="list-item-sub">${c.tipo} · ${Utils.fmtMoney(c.valorBase)}/base · Adiantamentos: ${Utils.fmtMoney(totalAds)}</div>
        </div>
        <button onclick="MaoDeObra.excluir(${c.id})" class="btn-danger btn-xs">🗑️</button>
      </div>`;
    }).join('');

    // Populate adiantamento select
    const sel = document.getElementById('adColabId');
    if (sel) {
      sel.innerHTML = '<option value="">— Selecione —</option>' +
        colabs.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
    }
  }

  return { adicionar, excluir, registrarAdiantamento, render };
})();

// ── Global shims ─────────────────────────────────────────────────────
function addColaborador()           { MaoDeObra.adicionar(); }
function excluirColaborador(id)     { MaoDeObra.excluir(id); }
function registrarAdiantamento()    { MaoDeObra.registrarAdiantamento(); }
function renderColab()              { MaoDeObra.render(); }
