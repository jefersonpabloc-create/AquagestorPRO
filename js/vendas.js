/**
 * AQUAGESTOR PRO — VENDAS
 * Sales registration, listing, auto-calculation
 */

const Vendas = (() => {
  // ── Tab management ─────────────────────────────────────────────────
  function abrirFinTab(aba) {
    ['dashboard','vendas','fluxo','prolabore','tanques'].forEach(t => {
      const pane = document.getElementById('finPane_'+t);
      const tab  = document.getElementById('finTab_'+t);
      if (pane) pane.classList.toggle('hidden', t !== aba);
      if (tab)  tab.classList.toggle('ativo', t === aba);
    });
    if (aba === 'dashboard') renderDashboardFinanceiro();
    if (aba === 'vendas')    { render(); atualizarSelectVenda(); }
    if (aba === 'fluxo')     renderFluxoCaixa();
    if (aba === 'prolabore') calcularProLabore();
    if (aba === 'tanques')   renderRentabTanques();
  }

  // ── Selects ────────────────────────────────────────────────────────
  function atualizarSelectVenda() {
    const sel = document.getElementById('vTanque');
    if (!sel) return;
    const tanques = Storage.loadTanques();
    sel.innerHTML = '<option value="">— Selecione o tanque —</option>';
    tanques.forEach(t => {
      if (Tanques.isOcupado(t.num))
        sel.innerHTML += `<option value="${t.num}">${t.num} (${t.vol||'—'}m³) 🐟 Ocupado</option>`;
    });
    const dSel = document.getElementById('dTanque');
    if (dSel) {
      dSel.innerHTML = '<option value="">— Sem tanque —</option>';
      tanques.forEach(t => { dSel.innerHTML += `<option value="${t.num}">${t.num}</option>`; });
    }
  }

  // ── Auto-calculation ───────────────────────────────────────────────
  function calcularAuto() {
    const pm    = parseFloat(UI.getValue('vPesoMedio')) || 0;
    const kg    = parseFloat(UI.getValue('vKg'))        || 0;
    const vKg   = parseFloat(UI.getValue('vValorKg'))   || 0;
    const prev  = document.getElementById('vendaPreview');
    if (!prev) return;
    if (!kg || !vKg) { prev.style.display = 'none'; return; }

    const total   = kg * vKg;
    const lotes   = Storage.loadLotes();
    const tankSel = UI.getValue('vTanque');
    let custoPorKgProd = 0;
    if (tankSel) {
      lotes.forEach(l => {
        (l.tanques||[]).forEach(t => {
          if (t.num === tankSel && window.calcularCustoPorKGLote) {
            const c = calcularCustoPorKGLote(l);
            custoPorKgProd = c.custoPorKg || 0;
          }
        });
      });
    }
    const lucroEstimado = (vKg - custoPorKgProd) * kg;
    const margem        = total > 0 ? lucroEstimado/total*100 : 0;
    const cat           = Utils.categorizarPeixe(pm);
    const catInfo       = Utils.CATEGORIAS_PEIXE[cat];

    prev.style.display = 'block';
    prev.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
        <span class="cat-peixe cat-${cat}">${catInfo.emoji} ${catInfo.label}</span>
        <span style="font-size:1.1rem;font-weight:800;color:var(--green);">${Utils.fmtMoney(total)}</span>
      </div>
      <div style="margin-top:7px;display:flex;justify-content:space-between;font-size:.78rem;flex-wrap:wrap;gap:4px;">
        <span>⚖️ <strong>${kg.toFixed(1)} kg</strong> · R$ <strong>${vKg.toFixed(2)}/kg</strong></span>
        <span style="color:${lucroEstimado>=0?'var(--green)':'var(--red)'};">📈 Lucro est.: <strong>${Utils.fmtMoney(lucroEstimado)}</strong> (${Utils.fmtPct(margem)})</span>
      </div>`;
  }

  // ── Register sale ──────────────────────────────────────────────────
  function registrar() {
    const kg       = parseFloat(UI.getValue('vKg'))         || 0;
    const vKg      = parseFloat(UI.getValue('vValorKg'))    || 0;
    const pm       = parseFloat(UI.getValue('vPesoMedio'))  || 0;
    const qtd      = parseInt(UI.getValue('vQtdPeixes'))    || 0;
    const cliente  = UI.getValue('vCliente').trim();
    const data     = UI.getValue('vData')     || Utils.today();
    const pago     = UI.getValue('vPago')     || 'pago';
    const obs      = UI.getValue('vObs');
    const tankSel  = UI.getValue('vTanque');

    if (kg <= 0)  { UI.toast('❌ Informe o peso vendido', true); return; }
    if (vKg <= 0) { UI.toast('❌ Informe o valor por kg', true); return; }

    const total  = kg * vKg;
    const lotes  = Storage.loadLotes();
    let custoPorKgProd = 0, loteOrigem = null;
    if (tankSel) {
      lotes.forEach(l => {
        (l.tanques||[]).forEach(t => {
          if (t.num === tankSel && window.calcularCustoPorKGLote) {
            const c = calcularCustoPorKGLote(l);
            custoPorKgProd = c.custoPorKg || 0;
            loteOrigem = l.id;
          }
        });
      });
    }
    const lucroEstimado = (vKg - custoPorKgProd) * kg;
    const cat    = Utils.categorizarPeixe(pm);

    const vendas = Storage.loadVendas();
    vendas.push({
      id: Utils.genId(), kg, valorKg: vKg, valorTotal: total,
      lucroEstimado, pesoMedio: pm, qtdPeixes: qtd,
      cliente: cliente || 'Não informado', data, pago, obs,
      categoria: cat, tanqueOrigem: tankSel || '', loteOrigem,
    });
    Storage.saveVendas(vendas);

    // Atualizar tanque no lote (baixar estoque de peixes)
    if (tankSel && qtd > 0) {
      const lotesAtt = Storage.loadLotes();
      for (const l of lotesAtt) {
        const t = (l.tanques||[]).find(t => t.num === tankSel);
        if (t && t.qtdPeixes > 0) {
          t.qtdPeixes   = Math.max(0, t.qtdPeixes - qtd);
          l.qtdTotal    = l.tanques.reduce((s,t) => s+(t.qtdPeixes||0), 0);
          if (t.qtdPeixes === 0) { t.despescado=true; t.dataDespesca=Utils.today(); }
          break;
        }
      }
      Storage.saveLotes(lotesAtt);
      Tanques.render();
      if (window.Lotes) Lotes.render();
    }

    render();
    renderDashboardFinanceiro();
    Dashboard.atualizar();
    UI.clearFields(['vKg','vValorKg','vPesoMedio','vQtdPeixes','vCliente','vObs']);
    const prev = document.getElementById('vendaPreview');
    if (prev) prev.style.display = 'none';
    const form = document.getElementById('formVenda');
    if (form) form.classList.remove('open');
    UI.toast(`✅ Venda de ${kg.toFixed(1)} kg registrada · ${Utils.fmtMoney(total)}`);
  }

  // ── Render list ────────────────────────────────────────────────────
  function render() {
    const vendas = Storage.loadVendas().slice().reverse();
    const div    = document.getElementById('vendasLista');
    const cnt    = document.getElementById('cntVendas');
    if (cnt) cnt.textContent = vendas.length;
    if (!div) return;
    if (!vendas.length) { div.innerHTML = UI.emptyState('Nenhuma venda registrada.'); return; }

    div.innerHTML = vendas.map(v => {
      const cat     = v.categoria || Utils.categorizarPeixe(v.pesoMedio||0);
      const catInfo = Utils.CATEGORIAS_PEIXE[cat] || Utils.CATEGORIAS_PEIXE.minima;
      const statusPill = v.pago === 'pago'
        ? `<span class="status-pill concluido">✅ Pago</span>`
        : `<span class="status-pill pendente">⏳ Pendente</span>`;
      return `<div class="venda-card">
        <div class="venda-header" onclick="toggleVendaCard(${v.id})">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:800;font-size:.88rem;">${catInfo.emoji} ${v.kg?.toFixed(1)||0} kg · ${Utils.fmtMoney(v.valorTotal)}</div>
            <div style="font-size:.72rem;color:var(--text3);margin-top:2px;">📅 ${Utils.toDateLocal(v.data)} · 👤 ${v.cliente||'—'} ${v.tanqueOrigem?'· 🏞️ '+v.tanqueOrigem:''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">${statusPill}</div>
        </div>
        <div class="venda-body" id="vb_${v.id}">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.78rem;margin-bottom:8px;">
            <div>⚖️ Kg: <strong>${v.kg?.toFixed(1)||0}</strong></div>
            <div>💰 R$/kg: <strong>${Utils.fmtMoney(v.valorKg||0)}</strong></div>
            <div>📈 Lucro est.: <strong style="color:${(v.lucroEstimado||0)>=0?'var(--green)':'var(--red)'}">${Utils.fmtMoney(v.lucroEstimado||0)}</strong></div>
            <div>🐟 ${v.qtdPeixes||0} peixes · ${(v.pesoMedio||0).toFixed(0)}g</div>
            ${v.obs?`<div style="grid-column:1/-1;color:var(--text3);">📝 ${v.obs}</div>`:''}
          </div>
          <button onclick="excluirVenda(${v.id})" class="btn-danger btn-xs">🗑️ Excluir</button>
        </div>
      </div>`;
    }).join('');
  }

  function toggleCard(id) {
    const el = document.getElementById('vb_'+id);
    if (el) el.classList.toggle('open');
  }

  function excluir(id) {
    UI.confirm({
      title:'Excluir Venda?', msg:'Esta ação não pode ser desfeita.', icon:'🗑️', type:'danger', okLabel:'🗑️ Excluir',
      onConfirm: () => {
        Storage.saveVendas(Storage.loadVendas().filter(v => v.id !== id));
        render();
        renderDashboardFinanceiro();
        Dashboard.atualizar();
        UI.toast('✅ Venda excluída');
      }
    });
  }

  // ── Public API ─────────────────────────────────────────────────────
  return { abrirFinTab, atualizarSelectVenda, calcularAuto, registrar, render, toggleCard, excluir };
})();

// ── Global shims ─────────────────────────────────────────────────────
function abrirFinTab(aba)         { Vendas.abrirFinTab(aba); }
function toggleFinForm(id)        { const el=document.getElementById(id); if(el) el.classList.toggle('open'); }
function atualizarSelectVenda()   { Vendas.atualizarSelectVenda(); }
function calcularVendaAuto()      { Vendas.calcularAuto(); }
function atualizarInfoVenda()     { Vendas.calcularAuto(); }
function registrarVenda()         { Vendas.registrar(); }
function renderVendas()           { Vendas.render(); }
function toggleVendaCard(id)      { Vendas.toggleCard(id); }
function excluirVenda(id)         { Vendas.excluir(id); }
function atualizarPrecoCategoria(){ /* noop */ }
