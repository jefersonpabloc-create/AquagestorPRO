/**
 * AQUAGESTOR PRO — ROUTES
 * Navigation, section visibility, active state management
 */

const Routes = (() => {
  // All section IDs in the app
  const SECTIONS = [
    'menu','tanques','lotes','biometria','classificacao',
    'alimentacao','racao','mao','relatorios',
    'financeiro','despesas','dividas','estrategia',
  ];

  let _current = 'menu';
  let _onNavCallbacks = [];

  // ── Navigate ───────────────────────────────────────────────────────
  function go(sectionId) {
    // Hide all
    SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    // Show target
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');
    _current = sectionId;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Trigger module-specific lifecycle hooks
    _onNavCallbacks.forEach(cb => { try { cb(sectionId); } catch(e) {} });
  }

  function onNav(cb) { _onNavCallbacks.push(cb); }
  function current()  { return _current; }

  // ── Public API ─────────────────────────────────────────────────────
  return { go, onNav, current, SECTIONS };
})();

// Expose Routes on window for legacy code that checks window.Routes
// Some legacy shims check window.Routes (not just the Routes binding),
// so ensure it's available as a property on the global object.
window.Routes = window.Routes || Routes;

// ── Global shim ───────────────────────────────────────────────────────
// nav() provided by legacy bundle - do not override
