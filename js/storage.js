/**
 * AQUAGESTOR PRO — STORAGE
 * Centralized data persistence layer
 * Supports localStorage today, prepared for IndexedDB/sync future
 */

const Storage = (() => {
  // ── Active piscicultura prefix ─────────────────────────────────────
  let _prefix = 'default_';

  function setPrefix(p) { _prefix = p; }
  function getPrefix()  { return _prefix; }
  function pKey(key)    { return _prefix + key; }

  // ── Core operations ────────────────────────────────────────────────
  function save(key, data) {
    try {
      localStorage.setItem(pKey(key), JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[Storage] save error:', key, e);
      return false;
    }
  }

  function load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(pKey(key));
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error('[Storage] load error:', key, e);
      return fallback;
    }
  }

  function remove(key) {
    try { localStorage.removeItem(pKey(key)); } catch(e) {}
  }

  function exists(key) {
    return localStorage.getItem(pKey(key)) !== null;
  }

  // ── Global (cross-piscicultura) ops ────────────────────────────────
  function saveGlobal(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); return true; }
    catch(e) { return false; }
  }

  function loadGlobal(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch(e) { return fallback; }
  }

  // ── Per-tank feeding helpers ───────────────────────────────────────
  function saveTratos(tanqueNum, data) {
    localStorage.setItem(pKey('tratos_' + tanqueNum), JSON.stringify(data));
  }
  function loadTratos(tanqueNum) {
    try { return JSON.parse(localStorage.getItem(pKey('tratos_' + tanqueNum))) || []; }
    catch(e) { return []; }
  }
  function removeTratos(tanqueNum) {
    localStorage.removeItem(pKey('tratos_' + tanqueNum));
  }

  // ── Domain shortcuts (typed accessors) ────────────────────────────
  function loadTanques()    { return load('tanques', []); }
  function saveTanques(d)   { return save('tanques', d); }
  function loadLotes()      { return load('lotes', []); }
  function saveLotes(d)     { return save('lotes', d); }
  function loadVendas()     { return load('vendas', []); }
  function saveVendas(d)    { return save('vendas', d); }
  function loadDespesas()   { return load('despesas', []); }
  function saveDespesas(d)  { return save('despesas', d); }
  function loadDividas()    { return load('dividas', []); }
  function saveDividas(d)   { return save('dividas', d); }
  function loadEstoqueRacao() { return load('estoqueRacao', []); }
  function saveEstoqueRacao(d){ return save('estoqueRacao', d); }
  function loadColabs()     { return load('colaboradores', []); }
  function saveColabs(d)    { return save('colaboradores', d); }
  function loadCapital()    { return load('capitalAtual', {}); }
  function saveCapital(d)   { return save('capitalAtual', d); }
  function loadModelosRacao() { return load('modelosRacao', []); }
  function saveModelosRacao(d){ return save('modelosRacao', d); }

  // ── Export (backup) ────────────────────────────────────────────────
  function exportAll() {
    const keys = ['tanques','lotes','vendas','despesas','dividas','estoqueRacao',
                  'colaboradores','capitalAtual','modelosRacao'];
    const snapshot = {};
    keys.forEach(k => { snapshot[k] = load(k); });
    snapshot._prefix = _prefix;
    snapshot._exportedAt = new Date().toISOString();
    return JSON.stringify(snapshot, null, 2);
  }

  function importAll(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      const keys = ['tanques','lotes','vendas','despesas','dividas','estoqueRacao',
                    'colaboradores','capitalAtual','modelosRacao'];
      keys.forEach(k => { if (data[k] !== undefined) save(k, data[k]); });
      return true;
    } catch(e) { return false; }
  }

  // ── Public API ─────────────────────────────────────────────────────
  return {
    setPrefix, getPrefix, pKey,
    save, load, remove, exists,
    saveGlobal, loadGlobal,
    saveTratos, loadTratos, removeTratos,
    // Domain shortcuts
    loadTanques, saveTanques,
    loadLotes, saveLotes,
    loadVendas, saveVendas,
    loadDespesas, saveDespesas,
    loadDividas, saveDividas,
    loadEstoqueRacao, saveEstoqueRacao,
    loadColabs, saveColabs,
    loadCapital, saveCapital,
    loadModelosRacao, saveModelosRacao,
    exportAll, importAll,
  };
})();

// Backward-compat shims (so existing code using loadData/saveData still works)
function saveData(key, data) { return Storage.save(key, data); }
function loadData(key) { return Storage.load(key); }
function tLoad(n)  { return Storage.loadTratos(n); }
function tSave(n,d){ return Storage.saveTratos(n,d); }
function tRemove(n){ return Storage.removeTratos(n); }
function pKey(k)   { return Storage.pKey(k); }
