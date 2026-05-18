/**
 * AQUAGESTOR PRO — RAÇÃO
 * Feed stock management, models, colab
 */

const Racao = (() => {
  // ── Estoque ────────────────────────────────────────────────────────
  function comprar() {
    const marca   = UI.getValue('rMarca').trim() || 'Não informada';
    const pellet  = UI.getValue('rPellet').trim() || '—';
    const pb      = parseFloat(UI.getValue('rPB'))     || 0;
    const sacos   = parseFloat(UI.getValue('rSacos'))  || 0;
    const pesoPorSaco = parseFloat(UI.getValue('rPesoPorSaco')) || 25;
    const valorKg = parseFloat(UI.getValue('rValorKg'))|| 0;
    const data    = UI.getValue('rDataCompra') || Utils.today();

    if (sacos <= 0 || valorKg <= 0) { UI.toast('❌ Informe sacos e valor/kg', true); return; }
    const kgTotal = sacos * pesoPorSaco;
    const estoque = Storage.loadEstoqueRacao();
    estoque.push({ id: Utils.genId(), marca, pellet, pb, kgTotal, valorKg, data, quantidadeSacos: sacos, pesoPorSaco });
    Storage.saveEstoqueRacao(estoque);
    renderEstoque();
    Dashboard.atualizar();
    UI.clearFields(['rMarca','rPellet','rPB','rSacos','rPesoPorSaco','rValorKg']);
    const form = document.getElementById('formCompraRacao');
    if (form) form.classList.remove('open');
    UI.toast(`✅ ${kgTotal.toFixed(0)} kg de ração comprada · ${Utils.fmtMoney(kgTotal*valorKg)}`);
  }

  function renderEstoque() {
    const estoque = Storage.loadEstoqueRacao();
    const div     = document.getElementById('estoqueRacao');
    if (!div) return;
    if (!estoque.length) { div.innerHTML = "<div class='card'>📦 Estoque vazio. Compre ração para começar.</div>"; return; }
    const totalKg = estoque.filter(i=>!['estornado','suspenso'].includes((i.pellet||'').toLowerCase()))
                           .reduce((s,i)=>s+(i.kgTotal||0),0);
    div.innerHTML = `<div class='card' style="background:#f0f9ff;">
      <strong>📊 Resumo do Estoque</strong><br>
      📦 Total disponível: ${totalKg.toFixed(1)} kg | 🏷️ ${estoque.length} lote(s)
    </div>` + estoque.map((i,idx) => `<div class='card' style="position:relative;padding-right:60px;">
      <div>🥣 <strong>${i.marca||'—'}</strong> | ${i.pellet||'—'} | PB ${i.pb||0}%<br>
      📦 ${(i.kgTotal||0).toFixed(1)}kg | 💰 R$ ${(i.valorKg||0).toFixed(2)}/kg<br>
      📅 ${i.data||'—'} | ${i.quantidadeSacos||'?'} sacos de ${i.pesoPorSaco||0}kg</div>
      <button onclick="Racao.removerIdx(${idx})" class="btn-danger btn-xs" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);margin:0;">🗑️</button>
    </div>`).join('');
  }

  function removerIdx(idx) {
    const estoque = Storage.loadEstoqueRacao();
    const item    = estoque[idx];
    UI.confirm({
      title:'🗑️ Remover do Estoque', msg:`Remover "${item?.marca||'item'}"?\n${(item?.kgTotal||0).toFixed(1)}kg serão removidos.`,
      icon:'📦', type:'danger', okLabel:'🗑️ Remover',
      onConfirm: () => { estoque.splice(idx,1); Storage.saveEstoqueRacao(estoque); renderEstoque(); UI.toast('✅ Item removido'); }
    });
  }

  // ── Modelos de ração ───────────────────────────────────────────────
  function adicionarModelo() {
    const marca    = UI.getValue('mrmarca').trim();
    const pellet   = UI.getValue('mrpellet').trim();
    const proteina = parseFloat(UI.getValue('mrpb'))  || 0;
    const pesoSaco = parseFloat(UI.getValue('mrkg'))  || 25;
    if (!marca) { UI.toast('❌ Informe a marca', true); return; }
    const modelos = Storage.loadModelosRacao();
    modelos.push({ id: Utils.genId(), marca, pellet, proteina, pesoSaco });
    Storage.saveModelosRacao(modelos);
    renderModelos();
    UI.clearFields(['mrmarca','mrpellet','mrpb','mrkg']);
    UI.toast('✅ Modelo adicionado');
  }

  function renderModelos() {
    const modelos = Storage.loadModelosRacao();
    const div     = document.getElementById('modelosRacaoLista');
    if (!div) return;
    if (!modelos.length) { div.innerHTML = UI.emptyState('Nenhum modelo cadastrado.'); return; }
    div.innerHTML = modelos.map((m,i) => `<div class="list-item">
      <div class="list-item-main"><div class="list-item-title">🌾 ${m.marca} — ${m.pellet||'—'}</div>
      <div class="list-item-sub">PB ${m.proteina||0}% · ${m.pesoSaco||25}kg/saco</div></div>
      <button onclick="Racao.removerModelo(${m.id})" class="btn-danger btn-xs">🗑️</button>
    </div>`).join('');
    // Atualizar datalist
    const dl = document.getElementById('pelletSuggestions');
    if (dl) dl.innerHTML = modelos.map(m=>`<option value="${m.pellet||''}">`).join('');
  }

  function removerModelo(id) {
    Storage.saveModelosRacao(Storage.loadModelosRacao().filter(m=>m.id!==id));
    renderModelos();
    UI.toast('✅ Modelo removido');
  }

  // ── Public API ─────────────────────────────────────────────────────
  return { comprar, renderEstoque, removerIdx, adicionarModelo, renderModelos, removerModelo };
})();

// ── Global shims ─────────────────────────────────────────────────────
function comprarRacao()              { Racao.comprar(); }
function renderEstoqueRacao()        { Racao.renderEstoque(); }
function removerItemEstoqueIdx(i)    { Racao.removerIdx(i); }
function removerItemEstoque(id)      { const e=Storage.loadEstoqueRacao(); const i=e.findIndex(x=>String(x.id)===String(id)); if(i>=0) Racao.removerIdx(i); }
function adicionarModeloRacao()      { Racao.adicionarModelo(); }
function renderModelosRacao()        { Racao.renderModelos(); }
