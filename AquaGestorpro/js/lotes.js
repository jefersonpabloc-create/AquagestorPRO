/**
 * AQUAGESTOR PRO — LOTES
 * Batch/lot management, fish distribution, cost calculations
 */

// ── Distribution state ────────────────────────────────────────────────
let _tanquesSelecionadosLote = new Set();

const Lotes = (() => {
  // ── Form ───────────────────────────────────────────────────────────
  function toggleForm() {
    const fm = document.getElementById('formLote');
    if (!fm) return;
    const isOpening = !fm.classList.contains('open');
    fm.classList.toggle('open');
    if (isOpening) {
      _tanquesSelecionadosLote = new Set();
      renderBotoesTanques();
      atualizarDistribuicao();
    }
  }

  function renderBotoesTanques() {
    const tanques    = Storage.loadTanques();
    const disponíveis = tanques.filter(t => !Tanques.isOcupado(t.num));
    const div        = document.getElementById('lTanquesBtns');
    if (!div) return;
    if (!disponíveis.length) {
      div.innerHTML = '<span style="color:var(--text3);font-size:.8rem;">Nenhum tanque disponível</span>';
      return;
    }
    div.innerHTML = disponíveis.map(t => {
      const sel = _tanquesSelecionadosLote.has(t.num);
      return `<button type="button" id="btnLT_${t.num}" onclick="toggleTanqueLote('${t.num}')"
        style="padding:6px 12px;border-radius:16px;border:1.5px solid ${sel?'var(--blue)':'var(--border)'};
        background:${sel?'var(--blue)':'var(--surf)'};color:${sel?'#fff':'var(--text2)'};
        font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s;">
        🏞️ ${t.num}<br><span style="font-size:.62rem;opacity:.8;">${t.vol||'—'}m³</span>
      </button>`;
    }).join('');
  }

  function toggleTanque(num) {
    if (_tanquesSelecionadosLote.has(num)) _tanquesSelecionadosLote.delete(num);
    else _tanquesSelecionadosLote.add(num);
    renderBotoesTanques();
    atualizarDistribuicao();
  }

  function atualizarDistribuicao() {
    const div    = document.getElementById('lDistribuicaoInputs');
    const status = document.getElementById('lDistribuicaoStatus');
    if (!div) return;
    const tanques    = [..._tanquesSelecionadosLote];
    const totalGeral = parseInt(UI.getValue('lqtd')) || 0;

    if (!tanques.length) {
      div.innerHTML = '<div style="color:var(--text3);font-size:.8rem;text-align:center;padding:8px;">Selecione os tanques acima 👆</div>';
      if (status) status.innerHTML = '';
      return;
    }
    const vals = {};
    tanques.forEach(t => { const el = document.getElementById('ldist_'+t); vals[t] = el ? (parseInt(el.value)||0) : 0; });

    div.innerHTML = tanques.map(t => {
      const info = Storage.loadTanques().find(tk => tk.num===t);
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--surf3);">
        <span style="flex:1;font-size:.82rem;font-weight:700;">🏞️ ${t} <span style="font-size:.65rem;color:var(--text3);">(${info?.vol||'—'}m³)</span></span>
        <input type="number" id="ldist_${t}" value="${vals[t]||''}" placeholder="0" min="0"
          style="width:100px;padding:7px 10px;border-radius:10px;border:1.5px solid var(--border);font-size:.88rem;text-align:right;"
          oninput="validarDistribuicaoLote()">
        <span style="font-size:.72rem;color:var(--text3);">peixes</span>
      </div>`;
    }).join('');
    validarDistribuicao();
  }

  function validarDistribuicao() {
    const tanques    = [..._tanquesSelecionadosLote];
    const totalGeral = parseInt(UI.getValue('lqtd')) || 0;
    const totalDist  = tanques.reduce((s,t) => { const el=document.getElementById('ldist_'+t); return s+(parseInt(el?.value)||0); }, 0);
    const saldo      = totalGeral - totalDist;
    const status     = document.getElementById('lDistribuicaoStatus');
    if (!status) return;
    if (!totalGeral) { status.innerHTML = ''; return; }
    if (saldo > 0)   status.innerHTML = `<span style="color:var(--amber);">⚠️ Saldo restante: <strong>${saldo.toLocaleString('pt-BR')}</strong> peixes não distribuídos</span>`;
    else if (saldo<0) status.innerHTML = `<span style="color:var(--red);">❌ Excesso: <strong>${Math.abs(saldo).toLocaleString('pt-BR')}</strong> a mais</span>`;
    else              status.innerHTML = `<span style="color:var(--green);">✅ Distribuição completa — ${totalDist.toLocaleString('pt-BR')} peixes</span>`;
  }

  function distribuirIgualmente() {
    const tanques    = [..._tanquesSelecionadosLote];
    const totalGeral = parseInt(UI.getValue('lqtd')) || 0;
    if (!tanques.length || !totalGeral) { UI.toast('Informe a quantidade total e selecione os tanques', true); return; }
    const base  = Math.floor(totalGeral / tanques.length);
    const resto = totalGeral % tanques.length;
    tanques.forEach((t,i) => { const el=document.getElementById('ldist_'+t); if(el) el.value = base+(i<resto?1:0); });
    validarDistribuicao();
  }

  // ── Add lot ────────────────────────────────────────────────────────
  function addLote() {
    const qtd         = parseInt(UI.getValue('lqtd'))              || 0;
    const valorTotal  = parseFloat(UI.getValue('lvalor'))          || 0;
    const fornecedor  = UI.getValue('lfornecedor').trim();
    const cidadeOrigem= UI.getValue('lcidadeOrigem').trim();
    const pesoMedioAlev = parseFloat(UI.getValue('lpesoMedioAlevino')) || 0;
    const dataEstocagem = UI.getValue('ldataEstocagem');
    const tanquesSel  = [..._tanquesSelecionadosLote];

    if (isNaN(qtd) || qtd <= 0)   { UI.toast('❌ Quantidade inválida', true); return; }
    if (pesoMedioAlev <= 0)       { UI.toast('❌ Informe o peso médio dos alevinos', true); return; }
    if (!tanquesSel.length)       { UI.toast('❌ Selecione ao menos um tanque', true); return; }
    for (const t of tanquesSel)   { if (Tanques.isOcupado(t)) { UI.toast(`❌ Tanque ${t} já está ocupado`, true); return; } }

    // Read distribution per tank
    let distrib = {}, totalDist = 0;
    tanquesSel.forEach(t => {
      const v = parseInt(document.getElementById('ldist_'+t)?.value) || 0;
      distrib[t] = v; totalDist += v;
    });
    if (totalDist === 0) {
      const base = Math.floor(qtd/tanquesSel.length), resto = qtd%tanquesSel.length;
      tanquesSel.forEach((t,i) => { distrib[t] = base+(i<resto?1:0); });
      totalDist = qtd;
    }
    if (totalDist !== qtd) { UI.toast(`❌ Total distribuído (${totalDist.toLocaleString('pt-BR')}) ≠ total de peixes (${qtd.toLocaleString('pt-BR')})`, true); return; }

    const biomassaInicial = (pesoMedioAlev/1000) * qtd;
    const tipoRacao       = Utils.tipoRacaoPorPeso(pesoMedioAlev);
    const lotes           = Storage.loadLotes();
    const maxId           = lotes.reduce((mx,l) => Math.max(mx, typeof l.id==='number'?l.id:0), 999);
    const novoId          = maxId + 1;

    const novoLote = {
      id: novoId, qtdTotal: qtd,
      valorAlevinos: valorTotal, custoUnitario: qtd>0?valorTotal/qtd:0,
      fornecedor: fornecedor||'Não informado', cidadeOrigem: cidadeOrigem||'Não informada',
      pesoMedioAlevino: pesoMedioAlev, dataEstocagem: dataEstocagem||Utils.today(),
      biomassaInicial, tipoRacao,
      tanques: tanquesSel.map(num => ({
        num, qtdPeixes: distrib[num], mortalidade: 0, consumoRacao: 0,
        consumoDetalhado: [], ultimoPesoMedio: pesoMedioAlev,
        ultimaBiomassa: (pesoMedioAlev/1000)*distrib[num],
      })),
      biometrias: [],
      historicoMovimentacao: [{ data: new Date().toISOString(), tipo:'Estocagem', qtd,
        obs: `${tanquesSel.length} tanques: ${tanquesSel.map(t=>`${t}(${distrib[t]})`).join(', ')}` }],
    };

    lotes.push(novoLote);
    Storage.saveLotes(lotes);
    render();
    Tanques.render();
    Dashboard.atualizar();
    renderDashboardFinanceiro();
    UI.clearFields(['lqtd','lvalor','lfornecedor','lcidadeOrigem','lpesoMedioAlevino','ldataEstocagem']);
    _tanquesSelecionadosLote = new Set();
    const fm = document.getElementById('formLote'); if(fm) fm.classList.remove('open');
    UI.toast(`✅ Lote #${novoId} · ${qtd.toLocaleString('pt-BR')} peixes · ${tipoRacao}`);
  }

  // ── Delete lot ─────────────────────────────────────────────────────
  function excluir(id) {
    UI.confirm({
      title:'🗑️ Remover Lote', msg:'Todos os tanques associados serão liberados.', icon:'🐟', type:'danger', okLabel:'🗑️ Remover',
      onConfirm: () => {
        const lotes = Storage.loadLotes();
        const lote  = lotes.find(l=>l.id===id);
        if (lote?.tanques) lote.tanques.forEach(t => Storage.removeTratos(t.num));
        Storage.saveLotes(lotes.filter(l=>l.id!==id));
        render();
        Tanques.render();
        Dashboard.atualizar();
        UI.toast('✅ Lote removido');
      }
    });
  }

  function toggleCard(loteId) {
    const body = document.getElementById('lb_'+loteId);
    const chv  = document.getElementById('lchv_'+loteId);
    if (!body) return;
    body.classList.toggle('open');
    if (chv) chv.classList.toggle('open');
  }

  // ── Render ─────────────────────────────────────────────────────────
  function render() {
    const lotes = Storage.loadLotes();
    const div   = document.getElementById('lotesLista');
    const cnt   = document.getElementById('contLotes');
    if (!div) return;
    if (cnt) cnt.textContent = lotes.length;
    if (!lotes.length) { div.innerHTML = UI.emptyState('Nenhum lote ativo. Clique em ➕ Registrar Novo Lote.'); return; }

    div.innerHTML = lotes.map(l => {
      const biomassaTotal = calcularBiomassaTotalLote(l);
      const ca            = calcularCALote(l);
      const custos        = calcularCustoPorKGLote(l);
      const ultimaBio     = l.biometrias?.length ? l.biometrias[l.biometrias.length-1] : null;
      const pesoAtual     = ultimaBio ? ultimaBio.pesoMedio : (l.pesoMedioAlevino||0);
      const diasVida      = l.dataEstocagem ? Utils.daysAgo(l.dataEstocagem+'T12:00:00') : 0;
      const ativos        = (l.tanques||[]).filter(t=>t.qtdPeixes>0).length;
      const tanquesInfo   = (l.tanques||[]).map(t => {
        const c = calcularCustoTanque(l, t.num);
        const isDp = !!t.despescado;
        return `<span class="tanque-tag" style="${isDp?'opacity:.55;text-decoration:line-through;'}">
          ${t.num}: ${isDp?'🎣':t.qtdPeixes+'p'}${!isDp?' · R$'+c.custoPorKg.toFixed(2)+'/kg':''}
        </span>`;
      }).join('');

      return `<div class="lote-card">
        <div class="lote-header" onclick="Lotes.toggleCard(${l.id})">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:800;font-size:.9rem;">🐟 Lote #${l.id} <span style="font-size:.68rem;font-weight:600;color:${l.encerrado?'var(--text3)':'var(--green)'}">${l.encerrado?'✅ Encerrado':'● Ativo'}</span></div>
            <div style="font-size:.7rem;color:var(--text3);margin-top:2px;">${l.qtdTotal?.toLocaleString('pt-BR')||0} peixes · ${pesoAtual.toFixed(0)}g · ${biomassaTotal.toFixed(1)} kg · ${ativos} tanque(s) ativo(s)</div>
          </div>
          <div id="lchv_${l.id}" class="lote-chevron">▼</div>
        </div>
        <div class="lote-body" id="lb_${l.id}">
          <div class="stat-row">
            <div class="stat-cell"><strong>${Utils.fmtMoney(custos.custoTotal)}</strong><span>Custo total</span></div>
            <div class="stat-cell"><strong>R$ ${custos.custoPorKg.toFixed(2)}/kg</strong><span>Custo/kg</span></div>
            <div class="stat-cell"><strong>${ca.toFixed(2)}</strong><span>Conv. Alimentar</span></div>
            <div class="stat-cell"><strong>${diasVida||0} dias</strong><span>Tempo de cultivo</span></div>
          </div>
          <div style="margin:8px 0;">${tanquesInfo}</div>
          <div class="flex-row" style="gap:6px;flex-wrap:wrap;">
            <button onclick="Lotes.excluir(${l.id})" class="btn-danger btn-xs">🗑️ Remover</button>
          </div>
          ${l.biometrias?.length ? `<div style="margin-top:8px;font-size:.72rem;color:var(--text3);">📏 ${l.biometrias.length} biometria(s) · Último peso: ${pesoAtual.toFixed(0)}g</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  // ── Ração type auto-update ─────────────────────────────────────────
  function atualizarTipoRacao() {
    const peso  = parseFloat(UI.getValue('lpesoMedioAlevino'));
    const campo = document.getElementById('lTipoRacao');
    if (campo) campo.value = (!isNaN(peso) && peso>0) ? Utils.tipoRacaoPorPeso(peso) : '';
  }

  // ── Public API ─────────────────────────────────────────────────────
  return {
    toggleForm, renderBotoesTanques, toggleTanque,
    atualizarDistribuicao, validarDistribuicao, distribuirIgualmente,
    addLote, excluir, toggleCard, render, atualizarTipoRacao,
  };
})();

// ── Calculation helpers (global, used by many modules) ─────────────────
function calcularConsumoRacaoLote(lote) {
  return (lote.tanques||[]).reduce((s,t) => s + (t.consumoRacao||0), 0);
}

function calcularBiomassaTotalLote(lote) {
  return (lote.tanques||[]).reduce((s,t) => {
    if (!t.qtdPeixes) return s;
    return s + (t.ultimaBiomassa || (t.ultimoPesoMedio||lote.pesoMedioAlevino||0)/1000 * t.qtdPeixes);
  }, 0);
}

function calcularCALote(lote) {
  const consumo  = calcularConsumoRacaoLote(lote);
  const gainKg   = calcularBiomassaTotalLote(lote) - (lote.biomassaInicial||0);
  return gainKg > 0 ? consumo/gainKg : 0;
}

function calcularCustoTanque(lote, tanqueNum) {
  const t = (lote.tanques||[]).find(t => t.num===tanqueNum);
  if (!t) return { custoTotal:0, custoPorKg:0 };
  const estoque  = Storage.loadEstoqueRacao();
  const precoMed = estoque.length ? estoque.reduce((s,e)=>s+(e.valorKg||0),0)/estoque.length : 3.50;
  const ratioQtd = lote.qtdTotal > 0 ? (t.qtdPeixes||0)/lote.qtdTotal : 0;
  const valorAlev= (lote.valorAlevinos||0) * ratioQtd;
  const custoRac = (t.consumoRacao||0) * precoMed;
  const custoTotal = valorAlev + custoRac;
  const biomassa = t.ultimaBiomassa || ((t.ultimoPesoMedio||lote.pesoMedioAlevino||0)/1000*(t.qtdPeixes||0));
  const custoPorKg = biomassa > 0 ? custoTotal/biomassa : 0;
  return { custoTotal, custoPorKg };
}

function calcularCustoPorKGLote(lote) {
  const estoque  = Storage.loadEstoqueRacao();
  const precoMed = estoque.length ? estoque.reduce((s,e)=>s+(e.valorKg||0),0)/estoque.length : 3.50;
  const consumo  = calcularConsumoRacaoLote(lote);
  const custoRac = consumo * precoMed;
  const custoTot = (lote.valorAlevinos||0) + custoRac;
  const biomassa = calcularBiomassaTotalLote(lote);
  return { custoTotal: custoTot, custoPorKg: biomassa>0?custoTot/biomassa:0, consumoKg: consumo };
}

function calcularCustoRacaoLoteReal(lote) {
  const estoque  = Storage.loadEstoqueRacao();
  const precoMed = estoque.length ? estoque.reduce((s,e)=>s+(e.valorKg||0),0)/estoque.length : 3.50;
  const porTipo  = {}, temDadosLegados = false;
  let custoTotal = 0;

  (lote.tanques||[]).forEach(t => {
    const consumoReal = (t.consumoDetalhado||[]).filter(c => !(c.origem?.startsWith('Transferido')));
    if (consumoReal.length) {
      consumoReal.forEach(c => {
        const chave = c.tipoIdeal||c.tipo||'Não identificado';
        if (!porTipo[chave]) porTipo[chave] = { kg:0, custo:0, marcas:[], legado:false };
        porTipo[chave].kg    += c.kg||0;
        porTipo[chave].custo += c.custoTotal||0;
        if (c.marca && !porTipo[chave].marcas.includes(c.marca)) porTipo[chave].marcas.push(c.marca);
        custoTotal += c.custoTotal||0;
      });
    } else if ((t.consumoRacao||0) > 0) {
      const tipoKey = Utils.tipoRacaoPorPeso(t.ultimoPesoMedio||lote.pesoMedioAlevino||0);
      if (!porTipo[tipoKey]) porTipo[tipoKey] = { kg:0, custo:0, marcas:[], legado:true };
      const kg = t.consumoRacao||0;
      const cu = kg * precoMed;
      porTipo[tipoKey].kg    += kg;
      porTipo[tipoKey].custo += cu;
      porTipo[tipoKey].legado = true;
      custoTotal += cu;
    }
  });

  return { porTipo, custoTotal, temDadosLegados };
}

function reconstruirFasesConsumo(tanque, lote) {
  // Simplified reconstruction for legacy data
  const tipoKey = Utils.tipoRacaoPorPeso(tanque.ultimoPesoMedio||lote.pesoMedioAlevino||0);
  const estoque = Storage.loadEstoqueRacao();
  const precoMed= estoque.length ? estoque.reduce((s,e)=>s+(e.valorKg||0),0)/estoque.length : 3.50;
  const kg      = tanque.consumoRacao||0;
  return [{ tipoIdeal: tipoKey, kg, custo: kg*precoMed }];
}

// ── Global shims ─────────────────────────────────────────────────────
function toggleFormLote()           { Lotes.toggleForm(); }
function renderBotoesTanquesLote()  { Lotes.renderBotoesTanques(); }
function toggleTanqueLote(n)        { Lotes.toggleTanque(n); }
function atualizarDistribuicaoLote(){ Lotes.atualizarDistribuicao(); }
function validarDistribuicaoLote()  { Lotes.validarDistribuicao(); }
function distribuirIgualmente()     { Lotes.distribuirIgualmente(); }
function addLote()                  { Lotes.addLote(); }
function excluirLote(id)            { Lotes.excluir(id); }
function renderLotes()              { Lotes.render(); }
function atualizarTipoRacaoLote()   { Lotes.atualizarTipoRacao(); }
function toggleLoteCard(id)         { Lotes.toggleCard(id); }
