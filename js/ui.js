/**
 * AQUAGESTOR PRO — UI
 * Toast notifications, confirm modal, DOM helpers
 * All presentation primitives with no business logic
 */

const UI = (() => {
  // ── Toast ──────────────────────────────────────────────────────────
  let _toastTimer = null;

  function toast(msg, isError = false) {
    const el = document.getElementById('toastMessage');
    if (!el) return;
    el.textContent = msg;
    el.className = 'message show' + (isError ? ' error' : ' success');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  // ── Confirm Modal ──────────────────────────────────────────────────
  function confirm({ title, msg, icon = '⚠️', type = 'warn',
                     okLabel = '✔ Confirmar', cancelLabel = '✕ Cancelar',
                     onConfirm, onCancel }) {
    const overlay = document.getElementById('confirmOverlay');
    if (!overlay) return;

    const set = (id, v) => { const e = document.getElementById(id); if(e) e.innerHTML = v; };
    set('confirmTitle', title);
    set('confirmMsg', msg);
    set('confirmIcon', icon);

    const iconEl = overlay.querySelector('.confirm-icon');
    if (iconEl) iconEl.className = `confirm-icon ${type}`;

    const okBtn = document.getElementById('confirmOkBtn');
    if (okBtn) {
      okBtn.textContent = okLabel;
      okBtn.className = `confirm-btn-ok ${type}`;
      okBtn.onclick = () => {
        overlay.style.display = 'none';
        if (onConfirm) onConfirm();
      };
    }
    const cancelBtn = document.getElementById('confirmCancelBtn');
    if (cancelBtn) {
      cancelBtn.textContent = cancelLabel;
      cancelBtn.onclick = () => {
        overlay.style.display = 'none';
        if (onCancel) onCancel();
      };
    }

    overlay.style.display = 'flex';
  }

  // ── DOM helpers ────────────────────────────────────────────────────
  function $(id)    { return document.getElementById(id); }
  function $$(sel)  { return Array.from(document.querySelectorAll(sel)); }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  }

  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function show(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function hide(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  function toggle(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden');
  }

  function toggleClass(id, cls) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle(cls);
  }

  function getValue(id, fallback = '') {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  }

  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function clearFields(ids) {
    ids.forEach(id => setValue(id, ''));
  }

  function populateSelect(id, options, emptyLabel = '— Selecione —') {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<option value="">${emptyLabel}</option>` +
      options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  }

  // ── Accordion toggle ───────────────────────────────────────────────
  function toggleAccordion(bodyId, btnId) {
    const body = document.getElementById(bodyId);
    const btn  = document.getElementById(btnId);
    if (!body) return;
    const open = body.classList.toggle('open');
    if (btn) btn.classList.toggle('open', open);
  }

  // ── Progress bar ───────────────────────────────────────────────────
  function renderProgressBar(current, max, color = 'var(--blue)') {
    const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
    return `<div class="progresso-bar">
      <div class="progresso-fill" style="width:${pct}%;background:${color};"></div>
    </div>`;
  }

  // ── Empty state ────────────────────────────────────────────────────
  function emptyState(msg = 'Nenhum item encontrado.') {
    return `<div class="list-item" style="justify-content:center;color:var(--text3);padding:20px;">${msg}</div>`;
  }

  // ── Public API ─────────────────────────────────────────────────────
  return {
    toast, confirm,
    $, $$, setText, setHTML, show, hide, toggle, toggleClass,
    getValue, setValue, clearFields, populateSelect,
    toggleAccordion, renderProgressBar, emptyState,
  };
})();

// ── Global shims ─────────────────────────────────────────────────────
function showMessage(msg, isError = false) { UI.toast(msg, isError); }
function showConfirm(opts)                 { UI.confirm(opts); }
