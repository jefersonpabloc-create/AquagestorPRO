/**
 * AQUAGESTOR PRO — UTILS
 * Formatters, pure helper functions, shared utilities
 * No DOM dependencies — fully testable
 */

const Utils = (() => {
  // ── Number Formatters ──────────────────────────────────────────────
  function fmtMoney(v) {
    if (isNaN(v) || v === null) return 'R$ 0,00';
    return 'R$ ' + Number(v).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function fmtPct(v) {
    return (isNaN(v) || !isFinite(v)) ? '0%' : Number(v).toFixed(1) + '%';
  }

  function fmtKg(v, decimals = 1) {
    return (isNaN(v) ? 0 : Number(v)).toFixed(decimals) + ' kg';
  }

  function fmtNum(v, decimals = 0) {
    return Number(v || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  // ── Date Helpers ───────────────────────────────────────────────────
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function toDateLocal(isoStr) {
    if (!isoStr) return '—';
    try {
      return new Date(isoStr + 'T12:00:00').toLocaleDateString('pt-BR');
    } catch(e) { return isoStr; }
  }

  function monthIndex(dateStr) {
    try { return new Date(dateStr + 'T12:00:00').getMonth(); }
    catch(e) { return 0; }
  }

  function daysAgo(isoStr) {
    if (!isoStr) return null;
    return Math.round((Date.now() - new Date(isoStr).getTime()) / 86400000);
  }

  // ── Simple hash for passwords ──────────────────────────────────────
  function hashSimples(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return String(Math.abs(h));
  }

  // ── Array helpers ──────────────────────────────────────────────────
  function groupBy(arr, key) {
    return arr.reduce((acc, item) => {
      const k = typeof key === 'function' ? key(item) : item[key];
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {});
  }

  function sumBy(arr, key) {
    return arr.reduce((s, item) => {
      const v = typeof key === 'function' ? key(item) : (item[key] || 0);
      return s + (Number(v) || 0);
    }, 0);
  }

  function maxBy(arr, key) {
    return arr.reduce((max, item) => {
      const v = typeof key === 'function' ? key(item) : item[key];
      return v > max ? v : max;
    }, -Infinity);
  }

  function sortByDate(arr, field = 'dataISO', desc = true) {
    return [...arr].sort((a, b) => {
      const da = new Date(a[field] || a.data || 0).getTime();
      const db = new Date(b[field] || b.data || 0).getTime();
      return desc ? db - da : da - db;
    });
  }

  // ── ID generator ──────────────────────────────────────────────────
  function genId() { return Date.now(); }

  // ── Zootechnical tables ────────────────────────────────────────────
  const GPD_TABLE = [
    { min:0,     max:1,     gpd:0.10, ca:1.0 },
    { min:1,     max:2,     gpd:0.12, ca:1.0 },
    { min:2,     max:5,     gpd:0.20, ca:1.0 },
    { min:5,     max:10,    gpd:0.30, ca:1.1 },
    { min:10,    max:20,    gpd:0.45, ca:1.1 },
    { min:20,    max:30,    gpd:0.65, ca:1.2 },
    { min:30,    max:50,    gpd:0.80, ca:1.2 },
    { min:50,    max:80,    gpd:1.20, ca:1.3 },
    { min:80,    max:120,   gpd:1.60, ca:1.3 },
    { min:120,   max:180,   gpd:2.20, ca:1.4 },
    { min:180,   max:250,   gpd:2.80, ca:1.4 },
    { min:250,   max:350,   gpd:3.20, ca:1.5 },
    { min:350,   max:500,   gpd:3.50, ca:1.5 },
    { min:500,   max:700,   gpd:4.00, ca:1.6 },
    { min:700,   max:900,   gpd:4.20, ca:1.6 },
    { min:900,   max:1200,  gpd:4.50, ca:1.7 },
    { min:1200,  max:99999, gpd:5.00, ca:1.8 },
  ];

  function obterGPD(pesoGramas) {
    const row = GPD_TABLE.find(r => pesoGramas >= r.min && pesoGramas < r.max);
    return row ? row.gpd : 5.0;
  }

  function getCAEfetiva(pesoGramas, caSelecionado) {
    if (caSelecionado && caSelecionado > 0) return caSelecionado;
    const row = GPD_TABLE.find(r => pesoGramas >= r.min && pesoGramas < r.max);
    return row ? row.ca : 1.5;
  }

  function tipoRacaoPorPeso(pesoGramas) {
    if (pesoGramas < 1)   return '🍼 Pó (55% PB)';
    if (pesoGramas < 2)   return '⚫ 0.8–1mm (45% PB)';
    if (pesoGramas < 6)   return '🟤 1.3–1.5mm (45% PB)';
    if (pesoGramas < 15)  return '🟠 1.8–2.3mm (40% PB)';
    if (pesoGramas < 50)  return '🟡 2–3mm (36% PB)';
    if (pesoGramas < 250) return '🟢 4–6mm (32% PB)';
    return '🔵 6–8mm (32% PB)';
  }

  // ── Fish categorization ────────────────────────────────────────────
  const CATEGORIAS_PEIXE = {
    grade:   { label:'Grande (900g–1200g)', emoji:'🟢', min:900,  max:1200, cor:'#15803d' },
    media:   { label:'Médio (600g–899g)',   emoji:'🔵', min:600,  max:899,  cor:'#1d4ed8' },
    pequena: { label:'Pequeno (400g–599g)', emoji:'🟡', min:400,  max:599,  cor:'#92400e' },
    minima:  { label:'Abaixo de 400g',      emoji:'🔴', min:0,    max:399,  cor:'#b91c1c' },
  };

  function categorizarPeixe(pesoG) {
    const pm = parseFloat(pesoG) || 0;
    if (pm >= 900) return 'grade';
    if (pm >= 600) return 'media';
    if (pm >= 400) return 'pequena';
    return 'minima';
  }

  // ── Icon maps ──────────────────────────────────────────────────────
  const ICONES_DESP = {
    racao:'🌾', alevinos:'🎣', mao_de_obra:'👷', combustivel:'⛽',
    manutencao:'🔧', energia:'💡', medicamentos:'💊', frete:'🚛',
    equipamentos:'⚙️', casa:'🏠', outros:'📝',
  };

  const ICONES_DIVIDA = {
    racao:'🌾', custeio_rural:'🌿', emprestimo:'💳', energia:'💡',
    combustivel:'⛽', manutencao:'🔧', equipamentos:'⚙️', mao_de_obra:'👷',
    medicamentos:'💊', fornecedores:'📦', financiamento:'🏦', cartao:'💳', outros:'📝',
  };

  // ── Public API ─────────────────────────────────────────────────────
  return {
    fmtMoney, fmtPct, fmtKg, fmtNum,
    today, toDateLocal, monthIndex, daysAgo,
    hashSimples,
    groupBy, sumBy, maxBy, sortByDate, genId,
    GPD_TABLE, obterGPD, getCAEfetiva, tipoRacaoPorPeso,
    CATEGORIAS_PEIXE, categorizarPeixe,
    ICONES_DESP, ICONES_DIVIDA,
  };
})();

// ── Global shims ──────────────────────────────────────────────────────
function fmtR$(v)         { return Utils.fmtMoney(v); }
function fmtPct(v)        { return Utils.fmtPct(v); }
function obterGPD(p)      { return Utils.obterGPD(p); }
function getCAEfetiva(p,c){ return Utils.getCAEfetiva(p,c); }
function tipoRacaoPorPeso(p){ return Utils.tipoRacaoPorPeso(p); }
