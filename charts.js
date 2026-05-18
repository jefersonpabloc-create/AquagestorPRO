/**
 * AQUAGESTOR PRO — CHARTS
 * Centralized Chart.js instance management
 * All chart creation, updates, and teardown
 */

const Charts = (() => {
  const _instances = {};

  // ── Instance management ────────────────────────────────────────────
  function destroy(id) {
    if (_instances[id]) { _instances[id].destroy(); delete _instances[id]; }
  }

  function destroyAll() {
    Object.keys(_instances).forEach(id => destroy(id));
  }

  function create(id, config) {
    destroy(id);
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    _instances[id] = new Chart(canvas, config);
    return _instances[id];
  }

  // ── Shared defaults ────────────────────────────────────────────────
  const COLORS = {
    green:  '#15803d', greenA: '#dcfce755',
    blue:   '#0a7ea4', blueA:  '#dbeafe55',
    red:    '#c2410c', redA:   '#fee2e255',
    amber:  '#b45309', amberA: '#fef3c755',
    purple: '#7c3aed', purpleA:'#f3f0ff55',
    teal:   '#0f766e', tealA:  '#ccfbf155',
  };

  function moneyTicks(val) {
    return 'R$' + Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0 });
  }

  const baseOptions = {
    responsive: true,
    plugins: { legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 10 } } },
    scales:  { y: { ticks: { callback: moneyTicks }, beginAtZero: true } },
  };

  // ── Financial charts ───────────────────────────────────────────────
  function receita(vendas) {
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const vals  = Array(12).fill(0);
    vendas.forEach(v => {
      const m = Utils.monthIndex(v.data);
      vals[m] += v.valorTotal || 0;
    });
    return create('graficoReceita', {
      type: 'bar',
      data: { labels: meses, datasets: [{ label: 'Receita (R$)', data: vals,
        backgroundColor: COLORS.blueA, borderColor: COLORS.blue,
        borderWidth: 2, borderRadius: 7 }] },
      options: { ...baseOptions },
    });
  }

  function despezasPizza(despesas) {
    if (!despesas.length) return;
    const cats = {}, total = despesas.reduce((s,d) => s+(d.valor||0), 0);
    despesas.forEach(d => { cats[d.cat] = (cats[d.cat]||0) + (d.valor||0); });
    const labels = Object.keys(cats);
    const data   = Object.values(cats);
    const palette = ['#0a7ea4','#15803d','#c2410c','#7c3aed','#b45309','#0f766e','#1d4ed8','#9333ea','#dc2626'];
    return create('graficoDespesasPizza', {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: palette.slice(0, labels.length), borderWidth: 2 }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font:{size:10}, boxWidth:10 } } } },
    });
  }

  function lucroDespesas(vendas, despesas) {
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const lucros= Array(12).fill(0), custos = Array(12).fill(0);
    vendas.forEach(v => { lucros[Utils.monthIndex(v.data)] += v.valorTotal||0; });
    despesas.forEach(d => { custos[Utils.monthIndex(d.data)] += d.valor||0; });
    const netLucro = lucros.map((r,i) => r - custos[i]);
    return create('graficoLucroDespesas', {
      type: 'bar',
      data: { labels: meses, datasets: [
        { label:'Receita', data: lucros, backgroundColor: COLORS.greenA, borderColor: COLORS.green, borderWidth:2, borderRadius:5 },
        { label:'Despesas', data: custos, backgroundColor: COLORS.redA,  borderColor: COLORS.red,   borderWidth:2, borderRadius:5 },
        { label:'Lucro Líquido', data: netLucro, type:'line', borderColor: COLORS.blue, backgroundColor:'transparent', tension:.4, borderWidth:2.5, pointRadius:4 },
      ]},
      options: { ...baseOptions },
    });
  }

  function despesasCat(despesas) {
    const cats = {};
    despesas.forEach(d => { cats[d.cat] = (cats[d.cat]||0)+(d.valor||0); });
    const sorted = Object.entries(cats).sort((a,b) => b[1]-a[1]);
    return create('graficoDespesasCat', {
      type: 'bar',
      data: { labels: sorted.map(x=>x[0]), datasets: [{ label:'Despesa (R$)', data: sorted.map(x=>x[1]),
        backgroundColor: COLORS.redA, borderColor: COLORS.red, borderWidth:2, borderRadius:6 }] },
      options: { ...baseOptions, indexAxis: 'y' },
    });
  }

  function dividas(dividasData, hoje) {
    const meses = [], vals = [];
    for (let i = 0; i < 8; i++) {
      const dt = new Date(hoje.getFullYear(), hoje.getMonth()+i, 1);
      meses.push(dt.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}));
      let soma = 0;
      dividasData.forEach(d => {
        if (d.quitada) return;
        (d.parcelas||[]).forEach(p => {
          if (p.paga) return;
          const pdt = new Date(p.vencimento+'T12:00:00');
          if (pdt.getMonth()===dt.getMonth() && pdt.getFullYear()===dt.getFullYear()) soma += p.valor;
        });
      });
      vals.push(parseFloat(soma.toFixed(2)));
    }
    return create('graficoDividas', {
      type: 'bar',
      data: { labels: meses, datasets: [{ label:'Parcelas (R$)', data: vals,
        backgroundColor: vals.map((_,i)=>i===0?COLORS.redA:COLORS.blueA+'88'),
        borderColor: vals.map((_,i)=>i===0?COLORS.red:COLORS.blue),
        borderWidth:2, borderRadius:6 }] },
      options: { responsive:true, plugins:{legend:{display:false}},
        scales:{ y:{ ticks:{callback:moneyTicks}, beginAtZero:true } } },
    });
  }

  function projecao(labels, lucros, caixas, divSaldos) {
    return create('graficoProjecao', {
      type: 'line',
      data: { labels, datasets: [
        { label:'Lucro mensal', data:lucros, borderColor:COLORS.green, backgroundColor:COLORS.greenA, fill:true, tension:.3, borderWidth:2 },
        { label:'Saldo caixa', data:caixas,  borderColor:COLORS.blue,  backgroundColor:'transparent', tension:.3, borderWidth:2, borderDash:[5,3] },
        { label:'Dívidas',     data:divSaldos, borderColor:COLORS.red, backgroundColor:'transparent', tension:.3, borderWidth:2, borderDash:[4,4] },
      ]},
      options: { responsive:true, plugins:{legend:{position:'top',labels:{font:{size:10},boxWidth:10}}},
        scales:{ y:{ ticks:{callback:moneyTicks}, beginAtZero:false } } },
    });
  }

  function impactoParcelas(labels, vals) {
    return create('graficoImpactoParcelas', {
      type: 'line',
      data: { labels, datasets: [{ label:'Saldo após parcelas', data:vals,
        borderColor:COLORS.purple, backgroundColor:COLORS.purpleA, fill:true, tension:.3, borderWidth:2 }] },
      options: { responsive:true, plugins:{legend:{display:false}},
        scales:{ y:{ ticks:{callback:moneyTicks}, beginAtZero:false } } },
    });
  }

  function cenarios(labels, lucrosCen) {
    return create('graficoCenarios', {
      type: 'bar',
      data: { labels, datasets: [{ label:'Lucro mensal (R$)', data:lucrosCen,
        backgroundColor: lucrosCen.map(v=>v>=0?COLORS.greenA:COLORS.redA),
        borderColor: lucrosCen.map(v=>v>=0?COLORS.green:COLORS.red),
        borderWidth:2, borderRadius:6 }] },
      options: { responsive:true, plugins:{legend:{display:false}},
        scales:{ y:{ ticks:{callback:moneyTicks}, beginAtZero:true } } },
    });
  }

  function patrimonial(labels, vals) {
    return create('graficoPatrimonial', {
      type: 'line',
      data: { labels, datasets: [{ label:'Patrimônio', data:vals,
        borderColor:COLORS.teal, backgroundColor:COLORS.tealA, fill:true, tension:.4, borderWidth:2, pointRadius:4 }] },
      options: { responsive:true, plugins:{legend:{display:false}},
        scales:{ y:{ ticks:{callback:moneyTicks}, beginAtZero:false } } },
    });
  }

  // ── Public API ─────────────────────────────────────────────────────
  return {
    destroy, destroyAll, create, COLORS,
    receita, despezasPizza, lucroDespesas, despesasCat,
    dividas, projecao, impactoParcelas, cenarios, patrimonial,
  };
})();

// ── Global shim ───────────────────────────────────────────────────────
const _charts = {};
function destroyChart(id) { Charts.destroy(id); }
