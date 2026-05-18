/**
 * AQUAGESTOR PRO — DÍVIDAS & CUSTEIOS
 * Debt registration, installments, payments, alerts
 */

const Dividas = (() => {
  // ── Form helpers ───────────────────────────────────────────────────
  function toggleForm() {
    const el = document.getElementById('formDivida');
    if (el) el.classList.toggle('open');
  }

  function calcularParcelas() {
    const vTotal    = parseFloat(UI.getValue('dvValorTotal')) || 0;
    const entrada   = parseFloat(UI.getValue('dvEntrada'))    || 0;
    const nparcelas = parseInt(UI.getValue('dvParcelas'))     || 0;
    const prev      = document.getElementById('previewDivida');
    if (!prev) return;
    if (vTotal > 0 && nparcelas > 0) {
      const saldo   = vTotal - entrada;
      const parcela = saldo / nparcelas;
      const vpEl    = document.getElementById('dvValorParcela');
      if (vpEl && !vpEl.value) vpEl.placeholder = Utils.fmtMoney(parcela);
      prev.style.display = 'block';
      prev.innerHTML = `💰 Saldo: <strong>${Utils.fmtMoney(saldo)}</strong> · Parcela estimada: <strong>${Utils.fmtMoney(parcela)}</strong> x${nparcelas}`;
    } else {
      prev.style.display = 'none';
    }
  }

  // ── Register debt ──────────────────────────────────────────────────
  function registrar() {
    const fornecedor = UI.getValue('dvFornecedor').trim();
    const categoria  = UI.getValue('dvCategoria')  || 'outros';
    const vTotal     = parseFloat(UI.getValue('dvValorTotal'))   || 0;
    const entrada    = parseFloat(UI.getValue('dvEntrada'))      || 0;
    const juros      = parseFloat(UI.getValue('dvJuros'))        || 0;
    const vencimento = UI.getValue('dvVencimento');
    const nparcelas  = parseInt(UI.getValue('dvParcelas'))       || 1;
    let vParcela     = parseFloat(UI.getValue('dvValorParcela')) || 0;
    const obs        = UI.getValue('dvObs');

    if (!fornecedor) { UI.toast('❌ Informe o fornecedor/credor', true); return; }
    if (vTotal <= 0) { UI.toast('❌ Informe o valor total', true); return; }

    const saldo = vTotal - entrada;
    if (vParcela <= 0) vParcela = saldo / nparcelas;

    const parcelas = [];
    const dtBase   = vencimento ? new Date(vencimento + 'T12:00:00') : new Date();
    for (let i = 0; i < nparcelas; i++) {
      const dt = new Date(dtBase);
      dt.setMonth(dt.getMonth() + i);
      const vJuros = juros > 0 ? vParcela * Math.pow(1 + juros/100, i) : vParcela;
      parcelas.push({ num: i+1, vencimento: dt.toISOString().slice(0,10), valor: +vJuros.toFixed(2), paga: false, dataPagamento: null });
    }

    const dividas = Storage.loadDividas();
    dividas.push({
      id: Utils.genId(), fornecedor, categoria, valorTotal: vTotal,
      entrada, saldo, juros, nparcelas, valorParcela: vParcela,
      parcelas, obs, dataCadastro: new Date().toISOString(), quitada: false,
    });
    Storage.saveDividas(dividas);
    toggleForm();
    UI.clearFields(['dvFornecedor','dvValorTotal','dvEntrada','dvJuros','dvVencimento','dvParcelas','dvValorParcela','dvObs']);
    render();
    UI.toast(`✅ Dívida com ${fornecedor} registrada — ${Utils.fmtMoney(vTotal)} em ${nparcelas}x`);
  }

  // ── Pay installment ────────────────────────────────────────────────
  function pagarParcela(dividaId, parcelaNum) {
    const dividas = Storage.loadDividas();
    const d       = dividas.find(x => x.id === dividaId);
    if (!d) return;
    const p = (d.parcelas||[]).find(x => x.num === parcelaNum);
    if (!p) return;
    p.paga           = true;
    p.dataPagamento  = Utils.today();
    const pagas      = d.parcelas.filter(x=>x.paga).reduce((s,x)=>s+x.valor,0);
    d.saldo          = Math.max(0, d.valorTotal - (d.entrada||0) - pagas);
    if (d.parcelas.every(x=>x.paga)) d.quitada = true;
    Storage.saveDividas(dividas);
    render();
    Dashboard.atualizar();
    UI.toast(`✅ Parcela ${parcelaNum} paga!`);
  }

  // ── Delete ─────────────────────────────────────────────────────────
  function excluir(id) {
    UI.confirm({
      icon:'🗑️', title:'Excluir Dívida?', msg:'Esta ação não pode ser desfeita.', type:'danger', okLabel:'🗑️ Excluir',
      onConfirm: () => {
        Storage.saveDividas(Storage.loadDividas().filter(d=>d.id!==id));
        render();
        UI.toast('✅ Dívida excluída');
      }
    });
  }

  function toggleCard(id) {
    const el = document.getElementById('dc_'+id);
    if (el) el.classList.toggle('open');
  }

  // ── Render ─────────────────────────────────────────────────────────
  function render() {
    const dividas = Storage.loadDividas();
    const hoje    = new Date(); hoje.setHours(0,0,0,0);
    const m7      = new Date(hoje); m7.setDate(m7.getDate()+7);
    const mesA    = hoje.getMonth(), anoA = hoje.getFullYear();

    // KPIs
    let dividaTotal=0, parcelasAtras=0, valAtrasado=0, jurosTotal=0, parcelasMes=0, valMes=0;
    dividas.forEach(d => {
      if (d.quitada) return;
      dividaTotal += d.saldo||0;
      (d.parcelas||[]).forEach(p => {
        if (p.paga) return;
        const dt = new Date(p.vencimento+'T12:00:00');
        if (dt.getMonth()===mesA && dt.getFullYear()===anoA) { parcelasMes++; valMes += p.valor; }
        if (dt < hoje) { parcelasAtras++; valAtrasado += p.valor; }
        if (d.juros > 0) jurosTotal += p.valor * (d.juros/100);
      });
    });

    const s = (id,v) => UI.setText(id,v);
    s('kpiDividaTotal', Utils.fmtMoney(dividaTotal));
    s('kpiDividaTotalSub', `${dividas.filter(d=>!d.quitada).length} ativa(s)`);
    s('kpiDividaMes', Utils.fmtMoney(valMes));
    s('kpiDividaMesSub', `${parcelasMes} parcela(s) este mês`);
    s('kpiDividaAtrasada', Utils.fmtMoney(valAtrasado));
    s('kpiDividaAtrasadaSub', `${parcelasAtras} atrasada(s)`);
    s('kpiJurosTotal', Utils.fmtMoney(jurosTotal));
    s('cntDividas', dividas.filter(d=>!d.quitada).length);

    // Alertas
    const alertDiv = document.getElementById('alertasDividas');
    if (alertDiv) {
      const al = [];
      if (parcelasAtras>0) al.push({t:'critico',txt:`🚨 ${parcelasAtras} parcela(s) ATRASADA(s) — ${Utils.fmtMoney(valAtrasado)}`});
      if (valMes>0) al.push({t:'aviso',txt:`⚠️ ${Utils.fmtMoney(valMes)} em parcelas este mês (${parcelasMes}x)`});
      const vendas   = Storage.loadVendas();
      const receitaT = vendas.reduce((s,v)=>s+(v.valorTotal||0),0);
      if (receitaT>0 && dividaTotal>receitaT*0.5) al.push({t:'aviso',txt:`⚠️ Dívida representa ${((dividaTotal/receitaT)*100).toFixed(0)}% da receita acumulada`});
      if (!al.length) al.push({t:'ok',txt:'✅ Situação de dívidas sob controle'});
      alertDiv.innerHTML = al.map(a=>`<div class="alerta-auto ${a.t}">${a.txt}</div>`).join('');
    }

    // Chart parcelas futuras
    Charts.dividas(dividas, hoje);

    // Lista
    const listDiv = document.getElementById('dividasLista');
    if (!listDiv) return;
    const ativas  = dividas.filter(d=>!d.quitada);
    const quitadas= dividas.filter(d=>d.quitada);
    const todas   = [...ativas, ...quitadas];
    if (!todas.length) { listDiv.innerHTML = UI.emptyState('Nenhuma dívida cadastrada.'); return; }

    listDiv.innerHTML = todas.map(d => {
      const ico      = Utils.ICONES_DIVIDA[d.categoria]||'📝';
      const pagas    = (d.parcelas||[]).filter(p=>p.paga).length;
      const total    = (d.parcelas||[]).length;
      const atrasD   = (d.parcelas||[]).filter(p=>!p.paga&&new Date(p.vencimento+'T12:00:00')<hoje).length;
      const classCd  = d.quitada?'quitada':atrasD>0?'atrasada':'';
      const statusLbl= d.quitada?'✅ Quitada':atrasD>0?`🚨 ${atrasD} atrasada(s)`:'⏳ Em dia';
      const statusClr= d.quitada?'var(--green)':atrasD>0?'var(--red)':'var(--blue)';

      const parcelasHTML = (d.parcelas||[]).map(p => {
        const dt    = new Date(p.vencimento+'T12:00:00');
        const dtStr = dt.toLocaleDateString('pt-BR');
        const cls   = p.paga?'paga':dt<hoje?'atrasada':dt<=m7?'vencendo':'';
        const statusP = p.paga?'✅':dt<hoje?'🚨':dt<=m7?'⚠️':'📅';
        const btnPagar = !p.paga ? `<button onclick="Dividas.pagar(${d.id},${p.num})" class="btn-success btn-xs">✓ Pagar</button>` : '';
        return `<div class="parcela-row ${cls}"><span>${statusP} Parcela ${p.num}/${total}</span><span>${dtStr}</span><strong>${Utils.fmtMoney(p.valor)}</strong>${btnPagar}</div>`;
      }).join('');

      return `<div class="divida-card ${classCd}">
        <div class="divida-header" onclick="Dividas.toggleCard(${d.id})">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:800;font-size:.88rem;">${ico} ${d.fornecedor}</div>
            <div style="font-size:.73rem;color:var(--text3);margin-top:2px;">${d.categoria} · ${pagas}/${total} parcelas pagas</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-weight:800;color:var(--red);">${Utils.fmtMoney(d.saldo)}</div>
            <div style="font-size:.7rem;color:${statusClr};">${statusLbl}</div>
          </div>
        </div>
        <div class="divida-body" id="dc_${d.id}">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.78rem;margin-bottom:8px;">
            <div>💰 Total: <strong>${Utils.fmtMoney(d.valorTotal)}</strong></div>
            <div>🏦 Entrada: <strong>${Utils.fmtMoney(d.entrada||0)}</strong></div>
            <div>💸 Saldo: <strong style="color:var(--red);">${Utils.fmtMoney(d.saldo)}</strong></div>
            <div>📊 Juros: <strong>${d.juros||0}% a.m.</strong></div>
            ${d.obs?`<div style="grid-column:1/-1;color:var(--text3);">📝 ${d.obs}</div>`:''}
          </div>
          <div style="font-size:.65rem;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--text3);margin-bottom:6px;">PARCELAS</div>
          <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--r-sm);">${parcelasHTML}</div>
          <button onclick="Dividas.excluir(${d.id})" class="btn-danger btn-xs" style="margin-top:8px;">🗑️ Excluir dívida</button>
        </div>
      </div>`;
    }).join('');
  }

  // ── Public API ─────────────────────────────────────────────────────
  return { toggleForm, calcularParcelas, registrar, pagarParcela: pagarParcela, pagar: pagarParcela, excluir, toggleCard, render };
})();

// ── Global shims ─────────────────────────────────────────────────────
function toggleFormDivida()          { Dividas.toggleForm(); }
function calcularParcelasDivida()    { Dividas.calcularParcelas(); }
function registrarDivida()           { Dividas.registrar(); }
function pagarParcela(id,n)          { Dividas.pagar(id,n); }
function excluirDivida(id)           { Dividas.excluir(id); }
function toggleDividaCard(id)        { Dividas.toggleCard(id); }
function renderModuloDividas()       { Dividas.render(); }
