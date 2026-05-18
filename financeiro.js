/**
 * AQUAGESTOR PRO — DESPESAS & FINANCEIRO
 * Expense management + full financial dashboard
 */

// ── DESPESAS ──────────────────────────────────────────────────────────
const Despesas = (() => {
  function registrar() {
    const cat   = UI.getValue('dCat')    || 'outros';
    const valor = parseFloat(UI.getValue('dValor')) || 0;
    const desc  = UI.getValue('dDesc').trim();
    const data  = UI.getValue('dData')  || Utils.today();
    const resp  = UI.getValue('dResp')  || '';
    const tanq  = UI.getValue('dTanque')|| '';

    if (valor <= 0) { UI.toast('❌ Informe o valor da despesa', true); return; }

    const despesas = Storage.loadDespesas();
    despesas.push({ id: Utils.genId(), cat, valor, desc, data, resp, tanque: tanq });
    Storage.saveDespesas(despesas);
    render();
    renderDashboardFinanceiro();
    Dashboard.atualizar();
    UI.clearFields(['dValor','dDesc','dData','dResp']);
    const form = document.getElementById('formDespesa');
    if (form) form.classList.remove('open');
    UI.toast(`✅ Despesa de ${Utils.fmtMoney(valor)} registrada`);
  }

  function render() {
    const despesas = Storage.loadDespesas().slice().reverse();
    const div      = document.getElementById('despesasLista');
    const cnt      = document.getElementById('cntDespesas');
    if (cnt) cnt.textContent = despesas.length;
    if (!div) return;
    if (!despesas.length) { div.innerHTML = UI.emptyState('Nenhuma despesa registrada.'); return; }

    const total  = despesas.reduce((s,d) => s+(d.valor||0), 0);
    const sumDiv = document.getElementById('totalDespesasSub');
    if (sumDiv) sumDiv.textContent = `Total: ${Utils.fmtMoney(total)}`;

    div.innerHTML = despesas.map(d => {
      const ico = Utils.ICONES_DESP[d.cat] || '📝';
      return `<div class="list-item">
        <div class="list-item-main">
          <div class="list-item-title">${ico} ${d.desc || d.cat} <span class="desp-tag" style="background:var(--amber-l);color:var(--amber);">${d.cat}</span></div>
          <div class="list-item-sub">📅 ${Utils.toDateLocal(d.data)}${d.resp?' · 👤 '+d.resp:''}${d.tanque?' · 🏞️ '+d.tanque:''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-weight:800;color:var(--red);">${Utils.fmtMoney(d.valor)}</div>
          <button onclick="excluirDespesa(${d.id})" class="btn-danger btn-xs" style="margin-top:4px;">🗑️</button>
        </div>
      </div>`;
    }).join('');
  }

  function excluir(id) {
    UI.confirm({
      title:'Excluir Despesa?', msg:'Esta ação não pode ser desfeita.', icon:'🗑️', type:'danger', okLabel:'🗑️ Excluir',
      onConfirm: () => {
        Storage.saveDespesas(Storage.loadDespesas().filter(d => d.id !== id));
        render();
        renderDashboardFinanceiro();
        Dashboard.atualizar();
        UI.toast('✅ Despesa excluída');
      }
    });
  }

  return { registrar, render, excluir };
})();

// Global shims for Despesas
function registrarDespesa() { Despesas.registrar(); }
function renderDespesas()    { Despesas.render(); }
function excluirDespesa(id)  { Despesas.excluir(id); }

// ── FINANCEIRO DASHBOARD ──────────────────────────────────────────────
function renderDashboardFinanceiro() {
  const vendas   = Storage.loadVendas();
  const despesas = Storage.loadDespesas();
  const dividas  = Storage.loadDividas ? Storage.loadDividas() : [];

  const totalReceita = vendas.reduce((s,v) => s+(v.valorTotal||0), 0);
  const totalPago    = vendas.filter(v=>v.pago==='pago').reduce((s,v) => s+(v.valorTotal||0), 0);
  const totalPendente= totalReceita - totalPago;
  const totalDesp    = despesas.reduce((s,d) => s+(d.valor||0), 0);
  const totalLucro   = totalReceita - totalDesp;
  const margem       = totalReceita > 0 ? totalLucro/totalReceita*100 : 0;
  const ticketMedio  = vendas.length ? totalReceita/vendas.length : 0;
  const totalKg      = vendas.reduce((s,v) => s+(v.kg||0), 0);
  const precoMedKg   = totalKg > 0 ? totalReceita/totalKg : 0;

  const set = (id,v) => UI.setText(id, v);
  set('fKpiReceita',    Utils.fmtMoney(totalReceita));
  set('fKpiReceitaSub', `${vendas.length} venda(s) · ${Utils.fmtMoney(totalPago)} recebido`);
  set('fKpiDespesa',    Utils.fmtMoney(totalDesp));
  set('fKpiDespesaSub', `${despesas.length} despesa(s)`);
  set('fKpiLucro',      Utils.fmtMoney(totalLucro));
  set('fKpiLucroSub',   `${Utils.fmtPct(margem)} de margem`);
  set('fKpiMargem',     Utils.fmtPct(margem));
  set('fKpiTicket',     Utils.fmtMoney(ticketMedio));
  set('fKpiPrecoPorKg', Utils.fmtMoney(precoMedKg));
  set('fKpiKgTotal',    totalKg.toFixed(1)+' kg');
  // a receber
  const recEl = document.getElementById('fKpiAReceber');
  if (recEl) recEl.textContent = Utils.fmtMoney(totalPendente);

  // Alertas financeiros
  _renderAlertasFinanceiros(totalReceita, totalDesp, totalLucro, margem, totalPendente);

  // Charts
  Charts.receita(vendas);
  Charts.lucroDespesas(vendas, despesas);
  Charts.despezasPizza(despesas);
  Charts.despesasCat(despesas);

  // Dashboard rápido no menu
  Dashboard.atualizar();
}

function _renderAlertasFinanceiros(receita, despesa, lucro, margem, pendente) {
  const div = document.getElementById('finAlertas');
  if (!div) return;
  const als = [];
  if (lucro < 0) als.push({t:'danger', msg:'⛔ Operação com prejuízo! Despesas superam as receitas.'});
  else if (margem < 15) als.push({t:'warn', msg:`⚠️ Margem baixa (${Utils.fmtPct(margem)}). Meta: acima de 20%.`});
  else als.push({t:'ok', msg:`✅ Lucratividade saudável — margem de ${Utils.fmtPct(margem)}`});
  if (pendente > 0) als.push({t:'warn', msg:`💰 ${Utils.fmtMoney(pendente)} a receber de clientes.`});
  div.innerHTML = als.map(a=>`<div class="alerta-fin ${a.t}">${a.msg}</div>`).join('');
}

// ── FLUXO DE CAIXA ────────────────────────────────────────────────────
function renderFluxoCaixa() {
  const vendas   = Storage.loadVendas();
  const despesas = Storage.loadDespesas();

  // Consolidar por mês
  const dados = {};
  const addEntry = (mes, tipo, val) => {
    if (!dados[mes]) dados[mes] = { receita:0, despesa:0 };
    dados[mes][tipo] += val;
  };
  vendas.forEach(v => { if(v.pago==='pago') addEntry(v.data?.slice(0,7)||'', 'receita', v.valorTotal||0); });
  despesas.forEach(d => addEntry(d.data?.slice(0,7)||'', 'despesa', d.valor||0));

  const meses  = Object.keys(dados).sort();
  let saldoAcum = 0;
  const rows = meses.map(m => {
    const { receita, despesa } = dados[m];
    const saldo = receita - despesa;
    saldoAcum += saldo;
    const [ano,mes] = m.split('-');
    const nomeMes = new Date(+ano, +mes-1, 1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    return `<div class="fluxo-row"><span>${nomeMes}</span><span style="color:var(--green);">${Utils.fmtMoney(receita)}</span><span style="color:var(--red);">${Utils.fmtMoney(despesa)}</span><span style="font-weight:800;color:${saldo>=0?'var(--green)':'var(--red)'}">${Utils.fmtMoney(saldo)}</span></div>`;
  });

  const header = `<div class="fluxo-row" style="background:var(--surf3);font-weight:800;font-size:.7rem;border-radius:var(--r-sm) var(--r-sm) 0 0;">
    <span>Mês</span><span style="color:var(--green);">Receitas</span><span style="color:var(--red);">Despesas</span><span>Saldo</span>
  </div>`;
  const footer = `<div class="fluxo-row saldo"><span style="font-weight:800;">Saldo Acumulado</span><span></span><span></span><span style="color:${saldoAcum>=0?'var(--green)':'var(--red)'};">${Utils.fmtMoney(saldoAcum)}</span></div>`;
  const extrato = document.getElementById('extratoFluxo');
  if (extrato) extrato.innerHTML = rows.length ? header + rows.join('') + footer : UI.emptyState('Sem movimentações registradas.');
}

// ── PRÓ-LABORE ────────────────────────────────────────────────────────
function calcularProLabore() {
  const vendas   = Storage.loadVendas();
  const despesas = Storage.loadDespesas();
  const lotes    = Storage.loadLotes();
  const estoque  = Storage.loadEstoqueRacao();
  const dividas  = Storage.loadDividas ? Storage.loadDividas() : [];

  const totalR    = vendas.filter(v=>v.pago==='pago').reduce((s,v)=>s+(v.valorTotal||0),0);
  const totalD    = despesas.reduce((s,d)=>s+(d.valor||0),0);
  const saldo     = totalR - totalD;
  const meses     = parseInt(UI.getValue('plMesesReserva')) || 2;
  const pct       = parseInt(UI.getValue('plPctSeguro'))    || 30;

  // Parcelas futuras (próximos 3 meses)
  const hoje = new Date();
  let parcelasFuturas = 0;
  for (let i = 0; i < 3; i++) {
    const dt = new Date(hoje.getFullYear(), hoje.getMonth()+i, 1);
    dividas.forEach(d => {
      if (d.quitada) return;
      (d.parcelas||[]).forEach(p => {
        if (p.paga) return;
        const pdt = new Date(p.vencimento+'T12:00:00');
        if (pdt.getMonth()===dt.getMonth() && pdt.getFullYear()===dt.getFullYear()) parcelasFuturas += p.valor;
      });
    });
  }

  // Custo mensal médio
  const despPorMes = {};
  despesas.forEach(d => {
    const m = Utils.monthIndex(d.data);
    despPorMes[m] = (despPorMes[m]||0) + (d.valor||0);
  });
  const nMeses     = Math.max(1, Object.keys(despPorMes).length);
  const custoMensal= Object.values(despPorMes).reduce((s,v)=>s+v,0) / nMeses;
  const reservaMin = custoMensal * meses + parcelasFuturas;
  const disponivel = Math.max(0, saldo - reservaMin);
  const sugerido   = disponivel * (pct/100);

  const precoMedioKg  = vendas.length ? vendas.reduce((s,v)=>s+(v.valorKg||0),0)/vendas.length : 10;
  const biomassaTotal = lotes.reduce((s,l) => s+(l.tanques||[]).reduce((s2,t)=>s2+(t.ultimaBiomassa||0),0),0);
  const valBiomassa   = biomassaTotal * precoMedioKg;
  const valEstoque    = estoque.reduce((s,e)=>s+(e.kgTotal||0)*(e.valorKg||0),0);

  UI.setText('prolaboreVal',    Utils.fmtMoney(sugerido));
  UI.setText('prolaboreSub',    `${pct}% do disponível após reserva de ${meses} meses + parcelas futuras`);

  const analise = document.getElementById('prolaboreAnalise');
  if (analise) {
    analise.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.78rem;">
        <div>💰 Receita paga:<br><strong>${Utils.fmtMoney(totalR)}</strong></div>
        <div>💸 Despesas:<br><strong>${Utils.fmtMoney(totalD)}</strong></div>
        <div>🏦 Saldo caixa:<br><strong style="color:${saldo>=0?'var(--green)':'var(--red)'};">${Utils.fmtMoney(saldo)}</strong></div>
        <div>🛡️ Reserva mínima:<br><strong>${Utils.fmtMoney(reservaMin)}</strong></div>
        <div>📅 Parcelas 3m:<br><strong>${Utils.fmtMoney(parcelasFuturas)}</strong></div>
        <div>💵 Disponível:<br><strong>${Utils.fmtMoney(disponivel)}</strong></div>
        <div>🐟 Biomassa:<br><strong>${biomassaTotal.toFixed(0)} kg · ${Utils.fmtMoney(valBiomassa)}</strong></div>
        <div>📦 Estoque:<br><strong>${Utils.fmtMoney(valEstoque)}</strong></div>
      </div>`;
  }

  const alertas = document.getElementById('alertasProlabore');
  if (alertas) {
    const als = [];
    if (sugerido <= 0) als.push({t:'critico', msg:'⛔ Sem capital disponível para retirada segura.'});
    if (saldo < reservaMin) als.push({t:'aviso', msg:`⚠️ Caixa abaixo da reserva mínima de ${Utils.fmtMoney(reservaMin)}.`});
    if (parcelasFuturas > 0) als.push({t:'aviso', msg:`⚠️ ${Utils.fmtMoney(parcelasFuturas)} em parcelas nos próximos 3 meses.`});
    if (sugerido > 0) als.push({t:'ok', msg:`✅ Retirada segura: até ${Utils.fmtMoney(sugerido)}.`});
    alertas.innerHTML = als.map(a=>`<div class="alerta-auto ${a.t}">${a.msg}</div>`).join('');
  }
}

// ── RENTABILIDADE POR TANQUE ──────────────────────────────────────────
function renderRentabTanques() {
  const vendas  = Storage.loadVendas();
  const despesas= Storage.loadDespesas();
  const div     = document.getElementById('rentabTanquesLista');
  if (!div) return;

  const porTanque = {};
  vendas.forEach(v => {
    const t = v.tanqueOrigem || '(sem tanque)';
    if (!porTanque[t]) porTanque[t] = { receita:0, lucro:0, kg:0, vendas:0 };
    porTanque[t].receita += v.valorTotal||0;
    porTanque[t].lucro   += v.lucroEstimado||0;
    porTanque[t].kg      += v.kg||0;
    porTanque[t].vendas++;
  });

  const entries = Object.entries(porTanque).sort((a,b)=>b[1].lucro-a[1].lucro);
  if (!entries.length) { div.innerHTML = UI.emptyState('Nenhuma venda com tanque vinculado.'); return; }

  div.innerHTML = entries.map(([nome,d]) => {
    const margem = d.receita > 0 ? d.lucro/d.receita*100 : 0;
    return `<div class="tanque-rentab">
      <div class="tanque-rentab-header">
        <span>🏞️ ${nome}</span>
        <span style="color:${d.lucro>=0?'var(--green)':'var(--red)'};">${Utils.fmtMoney(d.lucro)}</span>
      </div>
      <div style="font-size:.72rem;color:var(--text3);margin-top:4px;display:flex;gap:14px;flex-wrap:wrap;">
        <span>💰 ${Utils.fmtMoney(d.receita)}</span>
        <span>⚖️ ${d.kg.toFixed(1)} kg</span>
        <span>📊 ${Utils.fmtPct(margem)}</span>
        <span>🛒 ${d.vendas} venda(s)</span>
      </div>
      ${UI.renderProgressBar(Math.max(0,margem), 40, margem>=20?'var(--green)':margem>=10?'var(--amber)':'var(--red)')}
    </div>`;
  }).join('');
}

// ── RELATÓRIOS FINANCEIROS ────────────────────────────────────────────
function relVendas() {
  const vendas  = Storage.loadVendas();
  const total   = vendas.reduce((s,v)=>s+(v.valorTotal||0),0);
  const pagas   = vendas.filter(v=>v.pago==='pago').reduce((s,v)=>s+(v.valorTotal||0),0);
  const pend    = total - pagas;
  const el      = document.getElementById('resultadoRel');
  if (!el) return;
  el.innerHTML = `<strong>🛒 Relatório de Vendas</strong><br>
    Total de vendas: <strong>${vendas.length}</strong><br>
    Faturamento: <strong>${Utils.fmtMoney(total)}</strong><br>
    Recebido: <strong style="color:var(--green);">${Utils.fmtMoney(pagas)}</strong><br>
    A receber: <strong style="color:var(--red);">${Utils.fmtMoney(pend)}</strong>`;
}

function relLucratividade() {
  const vendas  = Storage.loadVendas();
  const despesas= Storage.loadDespesas();
  const totalR  = vendas.reduce((s,v)=>s+(v.valorTotal||0),0);
  const totalD  = despesas.reduce((s,d)=>s+(d.valor||0),0);
  const lucro   = totalR - totalD;
  const margem  = totalR>0?lucro/totalR*100:0;
  const el      = document.getElementById('resultadoRel');
  if (!el) return;
  el.innerHTML = `<strong>💹 Relatório de Lucratividade</strong><br>
    Receita: <strong>${Utils.fmtMoney(totalR)}</strong><br>
    Despesas: <strong>${Utils.fmtMoney(totalD)}</strong><br>
    Lucro: <strong style="color:${lucro>=0?'var(--green)':'var(--red)'};">${Utils.fmtMoney(lucro)}</strong><br>
    Margem: <strong style="color:${margem>=20?'var(--green)':margem>=10?'var(--amber)':'var(--red)'};">${Utils.fmtPct(margem)}</strong>`;
}

function relFluxoCaixa() {
  const el = document.getElementById('resultadoRel');
  if (el) el.innerHTML = '📊 Consulte a aba <strong>Fluxo de Caixa</strong> no módulo Financeiro para o relatório detalhado.';
}

function relCapitalDeGiro() {
  const vendas  = Storage.loadVendas();
  const despesas= Storage.loadDespesas();
  const dividas = Storage.loadDividas ? Storage.loadDividas() : [];
  const totalR  = vendas.filter(v=>v.pago==='pago').reduce((s,v)=>s+(v.valorTotal||0),0);
  const totalD  = despesas.reduce((s,d)=>s+(d.valor||0),0);
  const saldo   = totalR - totalD;
  const divida  = dividas.filter(d=>!d.quitada).reduce((s,d)=>s+(d.saldo||0),0);
  const livre   = Math.max(0, saldo - divida);
  const el      = document.getElementById('resultadoRel');
  if (!el) return;
  el.innerHTML = `<strong>🏦 Capital de Giro</strong><br>
    Saldo caixa: <strong>${Utils.fmtMoney(saldo)}</strong><br>
    Dívidas: <strong style="color:var(--red);">${Utils.fmtMoney(divida)}</strong><br>
    Capital livre: <strong style="color:${livre>=0?'var(--green)':'var(--red)'};">${Utils.fmtMoney(livre)}</strong>`;
}

function relDespesasOp() {
  const despesas = Storage.loadDespesas();
  const total    = despesas.reduce((s,d)=>s+(d.valor||0),0);
  const por_cat  = {};
  despesas.forEach(d => { por_cat[d.cat] = (por_cat[d.cat]||0)+(d.valor||0); });
  const el = document.getElementById('resultadoRel');
  if (!el) return;
  el.innerHTML = `<strong>📋 Despesas Operacionais</strong><br>
    Total: <strong style="color:var(--red);">${Utils.fmtMoney(total)}</strong><br>
    ${Object.entries(por_cat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`${Utils.ICONES_DESP[c]||'📝'} ${c}: <strong>${Utils.fmtMoney(v)}</strong> (${Utils.fmtPct(total>0?v/total*100:0)})`).join('<br>')}`;
}

function relVendasCompleto() {
  const vendas = Storage.loadVendas().slice().reverse();
  const el     = document.getElementById('resultadoRel');
  if (!el) return;
  el.innerHTML = `<strong>🛒 Vendas Completo</strong><br>` +
    vendas.map(v => `📅 ${Utils.toDateLocal(v.data)} · ⚖️ ${v.kg?.toFixed(1)}kg · 💰 ${Utils.fmtMoney(v.valorTotal)} · ${v.cliente||'—'}`).join('<br>');
}
