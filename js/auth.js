/**
 * AQUAGESTOR PRO — AUTH
 * Login, session management, user persistence
 */

const Auth = (() => {
  const LOGIN_DB_KEY = '__aqua_users__';
  const SESSION_KEY  = '__aqua_session__';

  // ── Internal ───────────────────────────────────────────────────────
  function _getUsers() {
    try { return JSON.parse(localStorage.getItem(LOGIN_DB_KEY)) || []; }
    catch(e) { return []; }
  }
  function _setUsers(u) {
    localStorage.setItem(LOGIN_DB_KEY, JSON.stringify(u));
  }

  // ── Seed default user ──────────────────────────────────────────────
  function init() {
    const users = _getUsers();
    if (!users.length) {
      _setUsers([{
        username: 'admin',
        password: Utils.hashSimples('admin123'),
        nome: 'Administrador',
        role: 'admin',
      }]);
    }
  }

  // ── Login ──────────────────────────────────────────────────────────
  function login() {
    const username = UI.getValue('loginUser').trim().toLowerCase();
    const password = UI.getValue('loginSenha');
    const errEl    = document.getElementById('loginErr');

    if (!username || !password) {
      if (errEl) { errEl.textContent = 'Preencha usuário e senha.'; errEl.style.display = 'block'; }
      return;
    }

    const users = _getUsers();
    const user  = users.find(u =>
      u.username.toLowerCase() === username &&
      u.password === Utils.hashSimples(password)
    );

    if (!user) {
      if (errEl) { errEl.textContent = 'Usuário ou senha incorretos.'; errEl.style.display = 'block'; }
      return;
    }

    // Save session
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      username: user.username,
      nome:     user.nome,
      loginAt:  new Date().toISOString(),
    }));

    const overlay = document.getElementById('loginOverlay');
    if (overlay) overlay.style.display = 'none';
    if (errEl) errEl.style.display = 'none';
  }

  // ── Session check ──────────────────────────────────────────────────
  function checkSession() {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (session && session.username) {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = 'none';
        return true;
      }
    } catch(e) {}
    return false;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    location.reload();
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch(e) { return null; }
  }

  // ── Public API ─────────────────────────────────────────────────────
  return { init, login, checkSession, logout, getSession };
})();

// ── Global shims ─────────────────────────────────────────────────────
function fazerLogin()      { Auth.login(); }
function verificarSessao() { Auth.checkSession(); }
