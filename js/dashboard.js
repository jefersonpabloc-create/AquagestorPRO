/**
 * AQUAGESTOR PRO — DASHBOARD
 * Main dashboard KPIs, alerts, task list
 */

const Dashboard = (() => {
  function atualizar() {
    const lotes   = Storage.loadLotes();
    const estoque = Storage.loadEstoqueRacao();
    const colabs  = Storage.loadColabs();
    const set     = (id, v) => UI.setText(id, v);

    // ── Basic totals ──────────────────────────────────────────────────
    const totalPeixes = lotes.reduce((s,l) => s + (l.qtdTotal||0), 0);
    const totalRacao  = estoque.reduce((s,i) => s + (i.kgTotal||0), 0);
    set('dashPeixes',  totalPeixes.toLocaleString('pt-BR'));
    set('dashLotes',   lotes.length);
    set('dashRacao',   totalRacao.toFixed(0) + ' kg');
    set('dashColabs',  colabs.length);
    Pisciculturas.atualizarHeader();

    // ── Biomass ───────────────────────────────────────────────────────
    let biomassaTotal = 0, biomassaVenda = 0, custoTotalGlobal = 0;
    const tanksProntos = [];

    for (const l of lotes) {
      const ultimaBio   = l.biometrias?.length ? l.biometrias[l.biometrias.length-1] : null;
      const pesoMedioLote = ultimaBio ? ultimaBio.pesoMedio : (l.pesoMedioAlevino||0);
      for (const t of (l.tanques||[])) {
        if (!t.qtdPeixes) continue;
        const peso = t.ultimoPesoMedio || pesoMedioLote;
        const bio  = t.ultimaBiomassa  || (peso/1000) * t.qtdPeixes;
        biomassaTotal += bio;
        if (peso >= 600) { biomassaVenda += bio; tanksProntos.push({ tanque:t.num, loteId:l.id, bio:bio.toFixed(1), peso:peso.toFixed(0) }); }
      }
      // calcularCustoPorKGLote is a global from lotes.js
      if (window.calcularCustoPorKGLote) {
        const c = calcularCustoPorKGLote(l);
        custoTotalGlobal += (c.custoTotal||0);
      }
    }

    const custoPorKgGlobal = biomassaTotal > 0 ? custoTotalGlobal/biomassaTotal : 0;
    set('dashBiomassaTotal',    biomassaTotal.toFixed(1) + ' kg');
    set('dashBiomassaTotalSub', lotes.length + ' lotes · ' + totalPeixes.toLocaleString() + ' peixes');
    UI.setText('dashBiomassaVenda', biomassaVenda.toFixed(1) + ' kg');
    UI.setText('dashBiomassaVendaSub', tanksProntos.length ? tanksProntos.map(t=>`${t.tanque}(${t.peso}g)`).join(', ') : 'Nenhum tanque ≥ 600g');
    UI.setText('dashCustoPorKg', 'R$ ' + custoPorKgGlobal.toFixed(2) + '/kg');
    UI.setText('dashCustoTotal', 'Total investido: R$ ' + custoTotalGlobal.toFixed(2));

    // ── Today's feeding ───────────────────────────────────────────────
    let consumoHoje = 0;
    for (const l of lotes) {
      for (const t of (l.tanques||[])) {
        if (!t.qtdPeixes) continue;
        const tratos = Storage.loadTratos(t.num);
        for (const tr of tratos) if (tr.tratado) consumoHoje += (tr.kgFornecidos||0);
      }
    }
    set('dashConsumoHoje', consumoHoje.toFixed(1) + ' kg');

    // ── Financial quick view ──────────────────────────────────────────
    _renderFinanceiroRapido();

    // ── Tasks / Alerts ────────────────────────────────────────────────
    _renderTarefas(lotes);
  }

  function _renderFinanceiroRapido() {
    const vendas      = Storage.loadVendas();
    const despesas    = Storage.loadDespesas();
    const dividas     = Storage.loadDividas();
    const totalR      = vendas.reduce((s,v) => s + (v.valorTotal||0), 0);
    const totalD      = despesas.reduce((s,d) => s + (d.valor||0), 0);
    const totalLucro  = totalR - totalD;
    const margem      = totalR > 0 ? totalLucro/totalR*100 : 0;
    const totalPend   = vendas.filter(v=>v.pago!=='pago').reduce((s,v) => s+(v.valorTotal||0), 0);
    const dividaTotal = dividas.filter(d=>!d.quitada).reduce((s,d) => s+(d.saldo||0), 0);
    const hoje        = new Date();
    let parcelasMes   = 0;
    dividas.forEach(d => {
      if (d.quitada) return;
      (d.parcelas||[]).forEach(p => {
        if (p.paga) return;
        const pdt = new Date(p.vencimento+'T12:00:00');
        if (pdt.getMonth()===hoje.getMonth() && pdt.getFullYear()===hoje.getFullYear()) parcelasMes += p.valor;
      });
    });

    const div = document.getElementById('dashFinanceiroRapido');
    if (!div || (totalR === 0 && totalD === 0)) return;
    div.innerHTML = `<div class="kpi-grid" style="margin-top:4px;">
      <div class="kpi-card kpi-green"><div class="kpi-val">${Utils.fmtMoney(totalR)}</div><div class="kpi-lbl">💰 Receita vendas</div></div>
      <div class="kpi-card kpi-blue"><div class="kpi-val" style="color:${totalLucro>=0?'var(--green)':'var(--red)'};">${Utils.fmtMoney(totalLucro)}</div><div class="kpi-lbl">📈 Lucro líquido</div></div>
      <div class="kpi-card kpi-amber"><div class="kpi-val">${Utils.fmtPct(margem)}</div><div class="kpi-lbl">📊 Margem</div></div>
      <div class="kpi-card kpi-blue"><div class="kpi-val">${Utils.fmtMoney(totalPend)}</div><div class="kpi-lbl">⏳ A receber</div></div>
      ${dividaTotal>0?`<div class="kpi-card kpi-red" style="grid-column:1/-1;"><div class="kpi-val" style="color:var(--red);">${Utils.fmtMoney(dividaTotal)}</div><div class="kpi-lbl">📉 Dívida total · ${Utils.fmtMoney(parcelasMes)} este mês</div></div>`:''}
    </div>`;
  }

  function _renderTarefas(lotes) {
    const tarefas = [];
    const agora   = new Date();

    for (const l of lotes) {
      const ultimaBio     = l.biometrias?.length ? l.biometrias[l.biometrias.length-1] : null;
      const pesoMedioLote = ultimaBio ? ultimaBio.pesoMedio : (l.pesoMedioAlevino||0);
      const diasSemBio    = ultimaBio
        ? Math.floor((agora - new Date(ultimaBio.data)) / 86400000)
        : Math.floor((agora - new Date(l.dataEstocagem||agora)) / 86400000);

      for (const t of (l.tanques||[])) {
        if (!t.qtdPeixes) continue;
        const peso = t.ultimoPesoMedio || pesoMedioLote;

        if (diasSemBio > 21) {
          tarefas.push({ tipo: diasSemBio > 35 ? 'urgent' : 'warn', ico: '📏',
            head: `Biometria necessária — Tanque ${t.num} (Lote #${l.id})`,
            sub:  `${diasSemBio} dias sem biometria. Peso estimado: ${peso.toFixed(0)}g` });
        }
        if (peso >= 600) {
          tarefas.push({ tipo: 'ok', ico: '🎣',
            head: `Pronto para despesca — Tanque ${t.num} (Lote #${l.id})`,
            sub:  `Peso médio: ${peso.toFixed(0)}g · Biomassa: ${(t.ultimaBiomassa||(peso/1000)*t.qtdPeixes).toFixed(1)} kg` });
        }
        if (peso > 50 && diasSemBio > 30) {
          tarefas.push({ tipo: 'info', ico: '🔀',
            head: `Classificação recomendada — Tanque ${t.num} (Lote #${l.id})`,
            sub:  `Peso ${peso.toFixed(0)}g · ${diasSemBio} dias sem revisão` });
        }
      }
    }

    const unicas  = tarefas.filter((t,i,a) => i === a.findIndex(x => x.head === t.head));
    const divTar  = document.getElementById('dashTarefas');
    if (!divTar) return;
    divTar.innerHTML = !unicas.length ? '' : `
      <div class="task-title">⚡ Tarefas Pendentes <span style="background:#fff;color:var(--text2);padding:2px 9px;border-radius:12px;font-size:.7rem;border:1px solid var(--border);">${unicas.length}</span></div>
      ${unicas.map(t => `<div class="task-item task-${t.tipo}"><div class="task-ico">${t.ico}</div><div class="task-body"><div class="task-head">${t.head}</div><div class="task-sub">${t.sub}</div></div></div>`).join('')}`;
  }

  return { atualizar };
})();

// ── Global shim ───────────────────────────────────────────────────────
function atualizarDashboard() { Dashboard.atualizar(); }
