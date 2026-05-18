/**
 * AQUAGESTOR PRO — ESTRATÉGIA FINANCEIRA
 * Capital, projections, pro-labore, simulator, AI insights
 */

const Estrategia = (() => {
  // ── Tab management ─────────────────────────────────────────────────
  function abrirTab(aba) {
    ['capital','projecao','prolabore','simulador','insights'].forEach(t => {
      const pane = document.getElementById('estPane_'+t);
      const tab  = document.getElementById('estTab_'+t);
      if (pane) pane.classList.toggle('hidden', t !== aba);
      if (tab)  tab.classList.toggle('ativo', t === aba);
    });
    if (aba==='capital')   calcularCapitalTotal();
    if (aba==='projecao')  calcularProjecao();
    if (aba==='prolabore') calcularProLaboreInteligente();
    if (aba==='simulador') executarSimulacao();
    if (aba==='insights')  gerarInsights();
  }

  function render() {
    // Restaurar capital salvo
    const cap = Storage.loadCapital();
    if (cap && cap.caixa !== undefined) {
      UI.setValue('capCaixa',      cap.caixa||'');
      UI.setValue('capBanco',      cap.banco||'');
      UI.setValue('capReservas',   cap.reservas||'');
      UI.setValue('capAplicacoes', cap.aplicacoes||'');
    }
    abrirTab('capital');
  }

  // ── Capital Atual ──────────────────────────────────────────────────
  function calcularCapitalTotal() {
    const caixa    = parseFloat(UI.getValue('capCaixa'))      || 0;
    const banco    = parseFloat(UI.getValue('capBanco'))      || 0;
    const reservas = parseFloat(UI.getValue('capReservas'))   || 0;
    const aplic    = parseFloat(UI.getValue('capAplicacoes')) || 0;

    const lotes   = Storage.loadLotes();
    const vendas  = Storage.loadVendas();
    const estoque = Storage.loadEstoqueRacao();
    const dividas = Storage.loadDividas();

    const precoMedioKg  = vendas.length ? vendas.reduce((s,v)=>s+(v.valorKg||0),0)/vendas.length : 10;
    const biomassaTotal = lotes.reduce((s,l)=>s+(l.tanques||[]).reduce((s2,t)=>s2+(t.ultimaBiomassa||0),0),0);
    const valBiomassa   = biomassaTotal * precoMedioKg;
    const valEstoque    = estoque.reduce((s,e)=>s+(e.kgTotal||0)*(e.valorKg||0),0);
    const dividaTotal   = dividas.filter(d=>!d.quitada).reduce((s,d)=>s+(d.saldo||0),0);

    const liquidez          = caixa + banco + reservas + aplic;
    const capitalTotal      = liquidez + valBiomassa + valEstoque;
    const capitalComprometido = dividaTotal;
    const capitalLivre      = Math.max(0, liquidez - dividaTotal);
    const capitalGiro       = liquidez + valEstoque;
    const capitalOperacional= Math.max(0, liquidez - dividaTotal);
    const capInvestimento   = Math.max(0, capitalLivre * 0.4);

    const s = (id,v) => UI.setText(id,v);
    s('capitalTotalVal', Utils.fmtMoney(capitalTotal));
    s('capitalTotalSub', `Liquidez: ${Utils.fmtMoney(liquidez)} + Biomassa: ${Utils.fmtMoney(valBiomassa)}`);
    s('capitalLivre',    Utils.fmtMoney(capitalLivre));
    s('capitalComprometido', Utils.fmtMoney(capitalComprometido));
    s('capitalBiomassa', Utils.fmtMoney(valBiomassa));
    s('capitalEstoque',  Utils.fmtMoney(valEstoque));
    s('capInvestimento', Utils.fmtMoney(capInvestimento));
    s('capGiro',         Utils.fmtMoney(capitalGiro));
    s('capOperacional',  Utils.fmtMoney(capitalOperacional));

    return { liquidez, capitalTotal, capitalLivre, capitalComprometido, capitalGiro, capitalOperacional, valBiomassa, valEstoque, dividaTotal };
  }

  function salvarCapital() {
    const cap = {
      caixa:      parseFloat(UI.getValue('capCaixa'))      || 0,
      banco:      parseFloat(UI.getValue('capBanco'))      || 0,
      reservas:   parseFloat(UI.getValue('capReservas'))   || 0,
      aplicacoes: parseFloat(UI.getValue('capAplicacoes')) || 0,
      data: new Date().toISOString(),
    };
    Storage.saveCapital(cap);
    calcularCapitalTotal();
    UI.toast('💾 Capital salvo!');
  }

  // ── Projeção ───────────────────────────────────────────────────────
  function calcularProjecao() {
    const receitaMes  = parseFloat(UI.getValue('projReceita'))    || 0;
    const custoMes    = parseFloat(UI.getValue('projCusto'))      || 0;
    const meses       = parseInt(UI.getValue('projMeses'))        || 12;
    const crescimento = parseFloat(UI.getValue('projCrescimento'))|| 0;
    const dividas     = Storage.loadDividas();
    const hoje        = new Date();

    const labels=[], lucros=[], caixas=[], divSaldos=[];
    let caixaAcum = 0;
    let dividaAtual = dividas.filter(d=>!d.quitada).reduce((s,d)=>s+(d.saldo||0),0);

    for (let i = 0; i < meses; i++) {
      const dt = new Date(hoje.getFullYear(), hoje.getMonth()+i, 1);
      const r  = receitaMes * Math.pow(1+crescimento/100, i);
      let parcelasMes = 0;
      dividas.forEach(d => {
        if (d.quitada) return;
        (d.parcelas||[]).forEach(p => {
          if (p.paga) return;
          const pdt = new Date(p.vencimento+'T12:00:00');
          if (pdt.getMonth()===dt.getMonth() && pdt.getFullYear()===dt.getFullYear()) parcelasMes += p.valor;
        });
      });
      const lucroMes = r - custoMes - parcelasMes;
      caixaAcum += lucroMes;
      dividaAtual -= parcelasMes;
      labels.push(dt.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}));
      lucros.push(+lucroMes.toFixed(2));
      caixas.push(+caixaAcum.toFixed(2));
      divSaldos.push(Math.max(0, +dividaAtual.toFixed(2)));
    }

    const divRes = document.getElementById('resultadoProjecao');
    if (divRes) {
      const lucroTotal = lucros.reduce((s,v)=>s+v,0);
      divRes.innerHTML = `<div class="fin-kpi-grid">
        <div class="fin-kpi verde"><div class="fin-kpi-val">${Utils.fmtMoney(lucroTotal)}</div><div class="fin-kpi-lbl">Lucro ${meses} meses</div></div>
        <div class="fin-kpi azul"><div class="fin-kpi-val">${Utils.fmtMoney(caixas[caixas.length-1]||0)}</div><div class="fin-kpi-lbl">Caixa projetado</div></div>
      </div>`;
    }

    // Prazo quitação
    const prazoDiv = document.getElementById('prazoQuitacao');
    if (prazoDiv) {
      const dividaOrig = dividas.filter(d=>!d.quitada).reduce((s,d)=>s+(d.saldo||0),0);
      let saldoTemp = dividaOrig, mesesQ = 0;
      for (let i = 0; i < 60 && saldoTemp > 0; i++) {
        const dt = new Date(hoje.getFullYear(), hoje.getMonth()+i, 1);
        dividas.forEach(d => {
          if (d.quitada) return;
          (d.parcelas||[]).forEach(p => {
            if (p.paga) return;
            const pdt = new Date(p.vencimento+'T12:00:00');
            if (pdt.getMonth()===dt.getMonth() && pdt.getFullYear()===dt.getFullYear()) saldoTemp -= p.valor;
          });
        });
        mesesQ = i+1;
        if (saldoTemp <= 0) break;
      }
      prazoDiv.innerHTML = dividaOrig <= 0
        ? `<div class="alerta-auto ok">✅ Sem dívidas ativas. Operação livre!</div>`
        : `<div class="alerta-auto info">🏦 Previsão de quitação: <strong>${mesesQ} meses</strong> (${Utils.fmtMoney(dividaOrig)} total)</div>`;
    }

    Charts.projecao(labels, lucros, caixas, divSaldos);
  }

  // ── Pró-labore Inteligente ─────────────────────────────────────────
  function calcularProLaboreInteligente() {
    const mesesReserva = parseFloat(UI.getValue('plMesesReservaEst')) || 2;
    const pctSeguro    = parseFloat(UI.getValue('plPctSeguroEst'))    || 30;
    const vendas       = Storage.loadVendas();
    const despesas     = Storage.loadDespesas();
    const dividas      = Storage.loadDividas();
    const lotes        = Storage.loadLotes();
    const estoque      = Storage.loadEstoqueRacao();
    const hoje         = new Date();

    const totalReceita = vendas.filter(v=>v.pago==='pago').reduce((s,v)=>s+(v.valorTotal||0),0);
    const totalDesp    = despesas.reduce((s,d)=>s+(d.valor||0),0);
    const saldoCaixa   = totalReceita - totalDesp;

    const despPorMes   = {};
    despesas.forEach(d => { const m=Utils.monthIndex(d.data); despPorMes[m]=(despPorMes[m]||0)+(d.valor||0); });
    const nMes         = Math.max(1, Object.keys(despPorMes).length);
    const custoMensal  = Object.values(despPorMes).reduce((s,v)=>s+v,0) / nMes;

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

    const reservaMin       = custoMensal * mesesReserva + parcelasFuturas;
    const disponivelRet    = Math.max(0, saldoCaixa - reservaMin);
    const proLaboreSeguro  = disponivelRet * (pctSeguro/100);
    const precoMedioKg     = vendas.length ? vendas.reduce((s,v)=>s+(v.valorKg||0),0)/vendas.length : 10;
    const biomassaTotal    = lotes.reduce((s,l)=>s+(l.tanques||[]).reduce((s2,t)=>s2+(t.ultimaBiomassa||0),0),0);
    const valBiomassa      = biomassaTotal * precoMedioKg;
    const valEstoque       = estoque.reduce((s,e)=>s+(e.kgTotal||0)*(e.valorKg||0),0);
    const caixaApos        = saldoCaixa - proLaboreSeguro;

    UI.setText('prolaboreValorEst', Utils.fmtMoney(proLaboreSeguro));
    UI.setText('prolaboreSubEst', `${pctSeguro}% do disponível após reserva de ${mesesReserva} meses + parcelas futuras`);

    const grid = document.getElementById('prolaboreAnaliseEst');
    if (grid) {
      grid.innerHTML = `
        <div class="prolabore-analise-item"><strong>${Utils.fmtMoney(totalReceita)}</strong><span>💰 Receita recebida</span></div>
        <div class="prolabore-analise-item"><strong>${Utils.fmtMoney(totalDesp)}</strong><span>💸 Despesas totais</span></div>
        <div class="prolabore-analise-item"><strong style="color:${saldoCaixa>=0?'var(--green)':'var(--red)'};">${Utils.fmtMoney(saldoCaixa)}</strong><span>🏦 Saldo em caixa</span></div>
        <div class="prolabore-analise-item"><strong>${Utils.fmtMoney(reservaMin)}</strong><span>🛡️ Reserva mínima</span></div>
        <div class="prolabore-analise-item"><strong>${Utils.fmtMoney(parcelasFuturas)}</strong><span>📅 Parcelas 3 meses</span></div>
        <div class="prolabore-analise-item"><strong style="color:${caixaApos>=0?'var(--green)':'var(--red)'};">${Utils.fmtMoney(caixaApos)}</strong><span>💵 Caixa após retirada</span></div>
        <div class="prolabore-analise-item"><strong>${biomassaTotal.toFixed(0)} kg</strong><span>🐟 Biomassa viva</span></div>
        <div class="prolabore-analise-item"><strong>${Utils.fmtMoney(valBiomassa+valEstoque)}</strong><span>📦 Ativos operacionais</span></div>`;
    }

    const alertDiv = document.getElementById('alertasProlaboreEst');
    if (alertDiv) {
      const al = [];
      if (proLaboreSeguro <= 0) al.push({t:'critico',txt:'⛔ Sem capital disponível para retirada segura.'});
      if (saldoCaixa < reservaMin) al.push({t:'aviso',txt:`⚠️ Caixa abaixo da reserva mínima de ${Utils.fmtMoney(reservaMin)}.`});
      if (parcelasFuturas > 0) al.push({t:'aviso',txt:`⚠️ Parcelas próximos 3 meses: ${Utils.fmtMoney(parcelasFuturas)}.`});
      if (proLaboreSeguro > 0) al.push({t:'ok',txt:`✅ Retirada segura: até ${Utils.fmtMoney(proLaboreSeguro)}.`});
      alertDiv.innerHTML = al.map(a=>`<div class="alerta-auto ${a.t}">${a.txt}</div>`).join('');
    }

    // Chart impacto parcelas
    const labels2=[], vals2=[];
    let acum = saldoCaixa;
    for (let i = 0; i < 6; i++) {
      const dt = new Date(hoje.getFullYear(), hoje.getMonth()+i, 1);
      let pm = 0;
      dividas.forEach(d => {
        if (d.quitada) return;
        (d.parcelas||[]).forEach(p => {
          if (p.paga) return;
          const pdt = new Date(p.vencimento+'T12:00:00');
          if (pdt.getMonth()===dt.getMonth() && pdt.getFullYear()===dt.getFullYear()) pm += p.valor;
        });
      });
      acum -= pm;
      labels2.push(dt.toLocaleDateString('pt-BR',{month:'short'}));
      vals2.push(+acum.toFixed(2));
    }
    Charts.impactoParcelas(labels2, vals2);
  }

  // ── Simulador ──────────────────────────────────────────────────────
  function executarSimulacao() {
    const prod     = parseFloat(UI.getValue('simProd'))          || 0;
    const preco    = parseFloat(UI.getValue('simPrecoVenda'))    || 0;
    const prRacao  = parseFloat(UI.getValue('simPrecoRacao'))    || 0;
    const ca       = parseFloat(UI.getValue('simCA'))            || 1.4;
    const mort     = parseFloat(UI.getValue('simMortalidade'))   || 0;
    const outDesp  = parseFloat(UI.getValue('simOutrasDespesas'))|| 0;
    if (!prod || !preco) return;

    const prodReal = prod * (1 - mort/100);
    const receita  = prodReal * preco;
    const custoRac = prod * ca * prRacao;
    const custTot  = custoRac + outDesp;
    const lucroMes = receita - custTot;
    const margem   = receita > 0 ? lucroMes/receita*100 : 0;
    const custKg   = prodReal > 0 ? custTot/prodReal : 0;

    const dividas  = Storage.loadDividas();
    const hoje     = new Date();
    let parcelaMes = 0;
    dividas.forEach(d => {
      if (d.quitada) return;
      (d.parcelas||[]).forEach(p => {
        if (p.paga) return;
        const pdt = new Date(p.vencimento+'T12:00:00');
        if (pdt.getMonth()===hoje.getMonth() && pdt.getFullYear()===hoje.getFullYear()) parcelaMes += p.valor;
      });
    });
    const lucroReal  = lucroMes - parcelaMes;
    const dividaT    = dividas.filter(d=>!d.quitada).reduce((s,d)=>s+(d.saldo||0),0);
    const mesesQ     = lucroMes > 0 ? Math.ceil(dividaT/lucroMes) : 999;

    const div = document.getElementById('simResultHTML');
    if (div) div.innerHTML = `
      <div class="simul-row"><span>📦 Produção real</span><strong>${prodReal.toFixed(0)} kg</strong></div>
      <div class="simul-row"><span>💰 Receita mensal</span><strong style="color:#4ade80">${Utils.fmtMoney(receita)}</strong></div>
      <div class="simul-row"><span>🌾 Custo ração</span><strong style="color:#f87171">${Utils.fmtMoney(custoRac)}</strong></div>
      <div class="simul-row"><span>📊 Custo total</span><strong style="color:#f87171">${Utils.fmtMoney(custTot)}</strong></div>
      <div class="simul-row"><span>💵 Custo/kg</span><strong>${Utils.fmtMoney(custKg)}</strong></div>
      <div class="simul-row"><span>📈 Lucro operacional</span><strong style="color:${lucroMes>=0?'#4ade80':'#f87171'}">${Utils.fmtMoney(lucroMes)}</strong></div>
      <div class="simul-row"><span>📅 Parcelas este mês</span><strong style="color:#fbbf24">${Utils.fmtMoney(parcelaMes)}</strong></div>
      <div class="simul-row"><span>💹 Lucro líquido real</span><strong style="color:${lucroReal>=0?'#4ade80':'#f87171'}">${Utils.fmtMoney(lucroReal)}</strong></div>
      <div class="simul-row"><span>📊 Margem</span><strong style="color:${margem>=20?'#4ade80':margem>=10?'#fbbf24':'#f87171'}">${Utils.fmtPct(margem)}</strong></div>
      ${dividaT>0?`<div class="simul-row"><span>🏦 Quitação est.</span><strong style="color:#60a5fa">${mesesQ<100?mesesQ+' meses':'> 100 meses'}</strong></div>`:''}`;

    // Chart cenários
    const labels  = ['50%','75%','Atual','125%','150%'];
    const fatores = [.5,.75,1,1.25,1.5];
    const lucros  = fatores.map(f => {
      const pr = prod*f*(1-mort/100);
      return +(pr*preco - (prod*f*ca*prRacao) - outDesp).toFixed(2);
    });
    Charts.cenarios(labels, lucros);
  }

  // ── IA Insights ────────────────────────────────────────────────────
  function gerarInsights() {
    const vendas   = Storage.loadVendas();
    const despesas = Storage.loadDespesas();
    const dividas  = Storage.loadDividas();
    const lotes    = Storage.loadLotes();
    const hoje     = new Date();

    const totalR   = vendas.reduce((s,v)=>s+(v.valorTotal||0),0);
    const totalD   = despesas.reduce((s,d)=>s+(d.valor||0),0);
    const lucro    = totalR - totalD;
    const margem   = totalR > 0 ? lucro/totalR*100 : 0;
    const dividaT  = dividas.filter(d=>!d.quitada).reduce((s,d)=>s+(d.saldo||0),0);
    const bioTotal = lotes.reduce((s,l)=>s+(l.tanques||[]).reduce((s2,t)=>s2+(t.ultimaBiomassa||0),0),0);
    const nMeses   = Math.max(1, new Set(vendas.map(v=>new Date(v.data+'T12:00:00').getMonth())).size);

    const insights = [];

    // Margem
    if (margem < 0) insights.push({ico:'🚨',txt:'Operação com PREJUÍZO',sub:`Margem: ${Utils.fmtPct(margem)}. Receitas não cobrem os custos.`,cor:'var(--red)'});
    else if (margem < 15) insights.push({ico:'⚠️',txt:'Margem abaixo do ideal',sub:`Margem atual ${Utils.fmtPct(margem)}. Meta: acima de 22%.`,cor:'var(--amber)'});
    else insights.push({ico:'✅',txt:`Boa margem: ${Utils.fmtPct(margem)}`,sub:'Operação financeiramente saudável.',cor:'var(--green)'});

    // Dívidas
    if (dividaT > 0 && lucro > 0) {
      const mQ = Math.ceil(dividaT / (lucro/nMeses));
      insights.push({ico:'🏦',txt:`Quitação estimada em ~${mQ} meses`,sub:`Saldo devedor: ${Utils.fmtMoney(dividaT)}`,cor:'var(--blue)'});
    }

    // Maior categoria de custo
    const custoPorCat = {};
    despesas.forEach(d => { custoPorCat[d.cat]=(custoPorCat[d.cat]||0)+d.valor; });
    if (totalD > 0) {
      const [cat,val] = Object.entries(custoPorCat).sort((a,b)=>b[1]-a[1])[0]||[];
      if (cat) {
        const pct = (val/totalD*100).toFixed(0);
        insights.push({ico:'📊',txt:`${Utils.ICONES_DESP[cat]||'📝'} ${cat} representa ${pct}% dos custos`,sub:`${Utils.fmtMoney(val)} em ${cat}`,cor:'var(--amber)'});
      }
    }

    // Melhor tanque
    const porTanque = {};
    vendas.forEach(v => {
      const t = v.tanqueOrigem||''; if(!t) return;
      if (!porTanque[t]) porTanque[t] = {lucro:0};
      porTanque[t].lucro += v.lucroEstimado||0;
    });
    const entries = Object.entries(porTanque).sort((a,b)=>b[1].lucro-a[1].lucro);
    if (entries.length) {
      insights.push({ico:'🏆',txt:`Tanque ${entries[0][0]} é o mais rentável`,sub:'Maior lucro acumulado entre todos os tanques.',cor:'var(--teal)'});
    }

    // Biomassa
    if (bioTotal > 0) {
      const precoMed = vendas.length ? vendas.reduce((s,v)=>s+(v.valorKg||0),0)/vendas.length : 10;
      insights.push({ico:'🐟',txt:`${bioTotal.toFixed(0)} kg de biomassa viva`,sub:`Valor estimado: ${Utils.fmtMoney(bioTotal*precoMed)}`,cor:'var(--blue)'});
    }

    // Pró-labore sugerido
    if (lucro > 0) {
      insights.push({ico:'💵',txt:`Pró-labore sugerido: ${Utils.fmtMoney(lucro*0.3/nMeses)}/mês`,sub:'30% do lucro mensal médio.',cor:'var(--teal)'});
    }

    const div = document.getElementById('insightsIA');
    if (div) div.innerHTML = insights.map(i=>`<div class="insight-card">
      <div class="insight-icon">${i.ico}</div>
      <div><div class="insight-text" style="color:${i.cor||'var(--text)'};">${i.txt}</div><div class="insight-sub">${i.sub}</div></div>
    </div>`).join('');

    // KPIs avançados
    let parcelasMesA = 0;
    const h2 = new Date();
    dividas.forEach(d => {
      if (d.quitada) return;
      (d.parcelas||[]).forEach(p => {
        if (p.paga) return;
        const pdt = new Date(p.vencimento+'T12:00:00');
        if (pdt.getMonth()===h2.getMonth() && pdt.getFullYear()===h2.getFullYear()) parcelasMesA += p.valor;
      });
    });
    const lucroReal = lucro - parcelasMesA;
    const efic      = totalR > 0 ? Math.min(100, lucro/totalR*100) : 0;
    UI.setText('kpiLucroOperacional', Utils.fmtMoney(lucro));
    UI.setText('kpiLucroLiquidoReal', Utils.fmtMoney(lucroReal));
    UI.setText('kpiEficienciaFin', Utils.fmtPct(efic));
    UI.setText('kpiValorProjetado', Utils.fmtMoney(lucroReal*12));

    // Chart patrimonial
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const recM  = Array(12).fill(0), despM = Array(12).fill(0);
    vendas.forEach(v => { recM[Utils.monthIndex(v.data)] += v.valorTotal||0; });
    despesas.forEach(d => { despM[Utils.monthIndex(d.data)] += d.valor||0; });
    let acum = 0;
    const patrimL = Array(12).fill(0).map((_,i) => { acum += recM[i]-despM[i]; return +acum.toFixed(2); });
    Charts.patrimonial(meses, patrimL);
  }

  // ── Relatórios estratégicos ────────────────────────────────────────
  function relEstrategico() {
    const vendas  = Storage.loadVendas(), despesas = Storage.loadDespesas(), dividas = Storage.loadDividas();
    const lotes   = Storage.loadLotes();
    const totalR  = vendas.reduce((s,v)=>s+(v.valorTotal||0),0);
    const totalD  = despesas.reduce((s,d)=>s+(d.valor||0),0);
    const lucro   = totalR - totalD;
    const margem  = totalR>0?lucro/totalR*100:0;
    const dividaT = dividas.filter(d=>!d.quitada).reduce((s,d)=>s+(d.saldo||0),0);
    const bio     = lotes.reduce((s,l)=>s+(l.tanques||[]).reduce((s2,t)=>s2+(t.ultimaBiomassa||0),0),0);
    const div     = document.getElementById('resultadoRelEstrategico');
    if (!div) return;
    div.innerHTML = `<div class="rel-estrategico">
      <div style="font-size:.72rem;opacity:.7;letter-spacing:.8px;text-transform:uppercase;margin-bottom:12px;">📊 RELATÓRIO ESTRATÉGICO</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.82rem;">
        <div><div style="opacity:.7;font-size:.65rem;">Receita Total</div><div style="font-size:1.1rem;font-weight:800;color:#4ade80;">${Utils.fmtMoney(totalR)}</div></div>
        <div><div style="opacity:.7;font-size:.65rem;">Despesas</div><div style="font-size:1.1rem;font-weight:800;color:#f87171;">${Utils.fmtMoney(totalD)}</div></div>
        <div><div style="opacity:.7;font-size:.65rem;">Lucro</div><div style="font-size:1.1rem;font-weight:800;color:${lucro>=0?'#4ade80':'#f87171'};">${Utils.fmtMoney(lucro)}</div></div>
        <div><div style="opacity:.7;font-size:.65rem;">Margem</div><div style="font-size:1.1rem;font-weight:800;color:${margem>=20?'#4ade80':margem>=10?'#fbbf24':'#f87171'};">${Utils.fmtPct(margem)}</div></div>
        <div><div style="opacity:.7;font-size:.65rem;">Dívida Total</div><div style="font-size:1.1rem;font-weight:800;color:#f87171;">${Utils.fmtMoney(dividaT)}</div></div>
        <div><div style="opacity:.7;font-size:.65rem;">Biomassa Viva</div><div style="font-size:1.1rem;font-weight:800;color:#60a5fa;">${bio.toFixed(0)} kg</div></div>
      </div>
      <div style="margin-top:12px;font-size:.78rem;opacity:.8;">${margem<0?'⛔ Operação com prejuízo.':margem<15?'⚠️ Margem abaixo do recomendado (22%).':margem>=25?'✅ Excelente lucratividade.':'📊 Lucratividade razoável.'}</div>
    </div>`;
  }

  function relDividasEst() {
    const dividas = Storage.loadDividas();
    const hoje    = new Date(); hoje.setHours(0,0,0,0);
    let atrasadas = 0;
    dividas.forEach(d => (d.parcelas||[]).forEach(p => { if(!p.paga && new Date(p.vencimento+'T12:00:00')<hoje) atrasadas++; }));
    const div = document.getElementById('resultadoRelEstrategico');
    if (!div) return;
    div.innerHTML = `<div class="card"><strong>📉 Relatório de Dívidas</strong><br>
      📋 Total: <strong>${dividas.length}</strong> · ✅ Quitadas: <strong>${dividas.filter(d=>d.quitada).length}</strong><br>
      💰 Contratado: <strong>${Utils.fmtMoney(dividas.reduce((s,d)=>s+(d.valorTotal||0),0))}</strong><br>
      💸 Saldo devedor: <strong style="color:var(--red);">${Utils.fmtMoney(dividas.filter(d=>!d.quitada).reduce((s,d)=>s+(d.saldo||0),0))}</strong><br>
      🚨 Parcelas atrasadas: <strong style="color:${atrasadas>0?'var(--red)':'var(--green)'};">${atrasadas}</strong>
    </div>`;
  }

  function relLucratiReal() {
    const vendas  = Storage.loadVendas(), despesas = Storage.loadDespesas(), dividas = Storage.loadDividas();
    const totalR  = vendas.reduce((s,v)=>s+(v.valorTotal||0),0);
    const totalD  = despesas.reduce((s,d)=>s+(d.valor||0),0);
    const lucroOp = totalR - totalD;
    const hoje    = new Date();
    let parcelasMes = 0;
    dividas.forEach(d => { if(d.quitada) return; (d.parcelas||[]).forEach(p => {
      if(p.paga) return;
      const pdt = new Date(p.vencimento+'T12:00:00');
      if(pdt.getMonth()===hoje.getMonth() && pdt.getFullYear()===hoje.getFullYear()) parcelasMes += p.valor;
    }); });
    const lucroReal = lucroOp - parcelasMes;
    const div = document.getElementById('resultadoRelEstrategico');
    if (!div) return;
    div.innerHTML = `<div class="card"><strong>💹 Lucratividade Real</strong><br>
      💰 Receita: <strong>${Utils.fmtMoney(totalR)}</strong><br>
      💸 Despesas: <strong>${Utils.fmtMoney(totalD)}</strong><br>
      📈 Lucro operacional: <strong style="color:${lucroOp>=0?'var(--green)':'var(--red)'};">${Utils.fmtMoney(lucroOp)}</strong><br>
      📅 Parcelas este mês: <strong style="color:var(--red);">${Utils.fmtMoney(parcelasMes)}</strong><br>
      💹 Lucro líquido REAL: <strong style="color:${lucroReal>=0?'var(--green)':'var(--red)'};">${Utils.fmtMoney(lucroReal)}</strong>
    </div>`;
  }

  function relQuitacao() {
    const dividas = Storage.loadDividas();
    const div     = document.getElementById('resultadoRelEstrategico');
    if (!div) return;
    const rows = dividas.filter(d=>!d.quitada).map(d => {
      const pend = (d.parcelas||[]).filter(p=>!p.paga).sort((a,b)=>new Date(a.vencimento)-new Date(b.vencimento));
      const ultima = pend[pend.length-1];
      const dtUlt  = ultima ? new Date(ultima.vencimento+'T12:00:00').toLocaleDateString('pt-BR') : '—';
      return `<tr><td style="padding:5px 4px;">${Utils.ICONES_DIVIDA[d.categoria]||'📝'} ${d.fornecedor}</td><td style="padding:5px 4px;text-align:right;">${Utils.fmtMoney(d.saldo)}</td><td style="padding:5px 4px;text-align:center;">${pend.length}x</td><td style="padding:5px 4px;text-align:right;">${dtUlt}</td></tr>`;
    }).join('');
    div.innerHTML = `<div class="card"><strong>🏦 Previsão de Quitação</strong>
      <table style="width:100%;font-size:.78rem;margin-top:8px;border-collapse:collapse;">
        <thead><tr style="background:var(--surf3);"><th style="padding:5px 4px;text-align:left;">Credor</th><th style="padding:5px 4px;">Saldo</th><th>Parcelas</th><th>Quitação</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="4" style="text-align:center;color:var(--text3);">Sem dívidas ativas</td></tr>'}</tbody>
      </table></div>`;
  }

  function relCapitalGiro() {
    const cap = calcularCapitalTotal();
    const div = document.getElementById('resultadoRelEstrategico');
    if (!div) return;
    div.innerHTML = `<div class="card"><strong>💰 Capital de Giro</strong><br>
      💵 Capital total: <strong>${Utils.fmtMoney(cap.capitalTotal)}</strong><br>
      🟢 Capital livre: <strong style="color:var(--green);">${Utils.fmtMoney(cap.capitalLivre)}</strong><br>
      🔴 Comprometido: <strong style="color:var(--red);">${Utils.fmtMoney(cap.capitalComprometido)}</strong><br>
      🌾 Estoque: <strong>${Utils.fmtMoney(cap.valEstoque)}</strong><br>
      🐟 Biomassa: <strong>${Utils.fmtMoney(cap.valBiomassa)}</strong>
    </div>`;
  }

  function relFinConsolidado() {
    relEstrategico();
    setTimeout(() => {
      const div = document.getElementById('resultadoRelEstrategico');
      if (!div) return;
      const dividas  = Storage.loadDividas();
      const dividaT  = dividas.filter(d=>!d.quitada).reduce((s,d)=>s+(d.saldo||0),0);
      div.innerHTML += `<div class="card" style="margin-top:4px;"><strong>📋 Dívidas consolidado</strong><br>
        Total de dívidas: <strong style="color:var(--red);">${Utils.fmtMoney(dividaT)}</strong>
      </div>`;
    }, 50);
  }

  // ── Public API ─────────────────────────────────────────────────────
  return {
    abrirTab, render,
    calcularCapitalTotal, salvarCapital,
    calcularProjecao, calcularProLaboreInteligente, executarSimulacao, gerarInsights,
    relEstrategico, relDividasEst, relLucratiReal, relQuitacao, relCapitalGiro, relFinConsolidado,
  };
})();

// ── Global shims ─────────────────────────────────────────────────────
function abrirEstTab(aba)              { Estrategia.abrirTab(aba); }
function renderModuloEstrategia()      { Estrategia.render(); }
function calcularCapitalTotal()        { return Estrategia.calcularCapitalTotal(); }
function salvarCapital()               { Estrategia.salvarCapital(); }
function calcularProjecao()            { Estrategia.calcularProjecao(); }
function calcularProLaboreInteligente(){ Estrategia.calcularProLaboreInteligente(); }
function executarSimulacao()           { Estrategia.executarSimulacao(); }
function gerarInsightsIA()             { Estrategia.gerarInsights(); }
function relEstrategico()              { Estrategia.relEstrategico(); }
function relDividas()                  { Estrategia.relDividasEst(); }
function relLucratiReal()              { Estrategia.relLucratiReal(); }
function relQuitacao()                 { Estrategia.relQuitacao(); }
function relCapitalGiro()              { Estrategia.relCapitalGiro(); }
function relFinConsolidado()           { Estrategia.relFinConsolidado(); }
