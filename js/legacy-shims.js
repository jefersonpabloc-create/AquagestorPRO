// AQUAGESTOR PRO — LEGACY SHIMS
// Minimal compatibility shims to support onclick handlers and legacy global functions

// Provide a global `nav(sectionId)` used by inline HTML buttons
function nav(sectionId) {
  if (window.Routes && typeof Routes.go === 'function') {
    Routes.go(sectionId);
  } else {
    console.warn('Routes.go not available — nav() fallback called for', sectionId);
  }
}

// Toggle the small forms for tanque creation used by index.html
function toggleFormTanque(tipo) {
  const id = tipo === 'individual' ? 'formTanqueIndividual' : 'formTanqueLote';
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

// Backwards-compatible alias for older confirm modal id (v20)
// Ensures scripts referencing #confirmOkBtn won't fail when UI.confirm sets handlers
window._legacyConfirm = window._legacyConfirm || {};

// Safe no-op for functions that may be absent in partial builds
function iniciarVerificacaoNovoDia() { /* noop if not provided by newer modules */ }

// Export to window for debugging
window.legacyShims = { nav: nav, toggleFormTanque: toggleFormTanque };
