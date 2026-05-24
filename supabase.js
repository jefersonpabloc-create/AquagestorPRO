/**
 * ═══════════════════════════════════════════════════════
 *  AQUAGESTOR — Módulo Supabase Compartilhado v1.1
 *  Inclua este arquivo em TODOS os htmls do sistema:
 *  <script src="supabase.js"></script>
 * ═══════════════════════════════════════════════════════
 */

(function () {
  /* ── Credenciais fixas do projeto AquaGestor PRO ── */
  var FIXED_URL = 'https://hzywzynmhaeuaczcgmdr.supabase.co';
  var FIXED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6eXd6eW5taGFldWFjemNnbWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzAwMTksImV4cCI6MjA5NTE0NjAxOX0.Ru9PNf_RkISb3pdGw2tuerDj0sElk0R1GiAHdI10SwQ';

  /* ── Lê config salva pelo setup (index.html) ── */
  function getCfg() {
    try { return JSON.parse(localStorage.getItem('aq_config') || '{}'); }
    catch (e) { return {}; }
  }

  var cfg = getCfg();
  /* Usa credenciais salvas OU as fixas acima como fallback */
  var URL_BASE = cfg.url || FIXED_URL;
  var ANON_KEY = cfg.key || FIXED_KEY;

  /* ── Garante que o localStorage tem as credenciais ── */
  if (!cfg.url || !cfg.key) {
    cfg.url = URL_BASE;
    cfg.key = ANON_KEY;
    try { localStorage.setItem('aq_config', JSON.stringify(cfg)); } catch(e) {}
  }

  /* ── NÃO redireciona mais — credenciais sempre disponíveis ── */

  /* ══════════════════════════════════════════════
     SB — cliente Supabase mínimo (sem SDK externo)
     ══════════════════════════════════════════════ */
  var SB = {
    url: URL_BASE,
    key: ANON_KEY,

    /* Retorna o token da sessão atual */
    _token: function () {
      try {
        var s = JSON.parse(localStorage.getItem('aq_session') || 'null');
        return s && s.access_token ? s.access_token : ANON_KEY;
      } catch (e) { return ANON_KEY; }
    },

    /* Requisição genérica à REST API */
    req: async function (path, opts) {
      opts = opts || {};
      var headers = {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + SB._token(),
        'Content-Type': 'application/json',
        'Prefer': opts.prefer || 'return=representation'
      };
      Object.assign(headers, opts.headers || {});
      var res = await fetch(URL_BASE + path, {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
      });
      var raw = await res.text();
      var data;
      try { data = JSON.parse(raw); } catch(e) { data = {}; }
      if (!res.ok) throw new Error(data.message || data.error_description || data.msg || ('Erro HTTP ' + res.status));
      return data;
    },

    /* ── Auth ── */
    auth: {
      signIn: async function (email, senha) {
        var res = await fetch(URL_BASE + '/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: senha })
        });
        var raw = await res.text();
        var data;
        try { data = JSON.parse(raw); } catch(e) {
          throw new Error('Resposta inválida do servidor. Verifique sua conexão.');
        }
        if (!res.ok) throw new Error(data.error_description || data.message || data.msg || 'Credenciais inválidas');
        localStorage.setItem('aq_session', JSON.stringify(data));
        return data;
      },

      signOut: async function () {
        var s = JSON.parse(localStorage.getItem('aq_session') || 'null');
        if (s && s.access_token) {
          await fetch(URL_BASE + '/auth/v1/logout', {
            method: 'POST',
            headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + s.access_token }
          }).catch(function () {});
        }
        localStorage.removeItem('aq_session');
      },

      session: function () {
        try {
          var s = JSON.parse(localStorage.getItem('aq_session') || 'null');
          if (!s) return null;
          if (s.expires_at && Date.now() / 1000 > s.expires_at) {
            localStorage.removeItem('aq_session');
            return null;
          }
          return s;
        } catch (e) { return null; }
      },

      user: function () {
        var s = SB.auth.session();
        return s ? s.user : null;
      }
    },

    /* ── Perfil do usuário logado ── */
    perfil: async function () {
      var u = SB.auth.user();
      if (!u) return null;
      var rows = await SB.req('/rest/v1/user_profiles?id=eq.' + u.id + '&select=*&limit=1');
      return Array.isArray(rows) ? rows[0] : null;
    },

    /* ── user_data ── */
    userData: {
      get: async function (adminId, chave) {
        var rows = await SB.req('/rest/v1/user_data?user_id=eq.' + adminId + '&full_key=eq.' + encodeURIComponent(chave) + '&select=data_value&limit=1');
        return (Array.isArray(rows) && rows[0]) ? rows[0].data_value : null;
      },
      set: async function (chave, valor) {
        var u = SB.auth.user();
        if (!u) throw new Error('Não autenticado');
        return SB.req('/rest/v1/user_data', {
          method: 'POST',
          prefer: 'resolution=merge-duplicates,return=representation',
          body: { user_id: u.id, full_key: chave, data_value: valor }
        });
      }
    },

    /* ── WiFi configs ── */
    wifi: {
      list: async function (adminId) {
        return SB.req('/rest/v1/wifi_configs?admin_id=eq.' + adminId + '&ativo=eq.true&select=*');
      },
      add: async function (adminId, nome, ssid, prefix) {
        return SB.req('/rest/v1/wifi_configs', {
          method: 'POST',
          body: { admin_id: adminId, nome: nome, ssid: ssid || '', ip_prefix: prefix, ativo: true }
        });
      },
      remove: async function (id) {
        return SB.req('/rest/v1/wifi_configs?id=eq.' + id, { method: 'DELETE', prefer: 'return=minimal' });
      }
    },

    /* ── Colaboradores ── */
    colaboradores: {
      list: async function (adminId) {
        return SB.req('/rest/v1/user_profiles?admin_id=eq.' + adminId + '&role=eq.colaborador&select=*&order=created_at.desc');
      },
      toggle: async function (id, ativo) {
        return SB.req('/rest/v1/user_profiles?id=eq.' + id, { method: 'PATCH', body: { ativo: ativo } });
      }
    },

    /* ── Tratos ── */
    tratos: {
      list: async function (adminId, filtros) {
        var q = '/rest/v1/colab_tratos?admin_id=eq.' + adminId + '&order=created_at.desc&select=*';
        if (filtros && filtros.data) q += '&data=eq.' + filtros.data;
        if (filtros && filtros.colabId) q += '&colaborador_id=eq.' + filtros.colabId;
        return SB.req(q);
      },
      add: async function (reg) {
        return SB.req('/rest/v1/colab_tratos', { method: 'POST', body: reg });
      },
      status: async function (id, status) {
        return SB.req('/rest/v1/colab_tratos?id=eq.' + id, { method: 'PATCH', body: { status: status } });
      }
    },

    /* ── Mortalidade ── */
    mortalidade: {
      list: async function (adminId, filtros) {
        var q = '/rest/v1/colab_mortalidade?admin_id=eq.' + adminId + '&order=created_at.desc&select=*';
        if (filtros && filtros.data) q += '&data=eq.' + filtros.data;
        return SB.req(q);
      },
      add: async function (reg) {
        return SB.req('/rest/v1/colab_mortalidade', { method: 'POST', body: reg });
      },
      status: async function (id, status) {
        return SB.req('/rest/v1/colab_mortalidade?id=eq.' + id, { method: 'PATCH', body: { status: status } });
      }
    },

    /* ── Vendas colaborador ── */
    vendas: {
      list: async function (adminId, filtros) {
        var q = '/rest/v1/colab_vendas?admin_id=eq.' + adminId + '&order=created_at.desc&select=*';
        if (filtros && filtros.data) q += '&data=eq.' + filtros.data;
        return SB.req(q);
      },
      add: async function (reg) {
        return SB.req('/rest/v1/colab_vendas', { method: 'POST', body: reg });
      },
      status: async function (id, status) {
        return SB.req('/rest/v1/colab_vendas?id=eq.' + id, { method: 'PATCH', body: { status: status } });
      }
    }
  };

  /* ── WebRTC: detectar IP local ── */
  SB.getLocalIP = async function () {
    return new Promise(function (resolve) {
      try {
        var pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        pc.createOffer().then(function (o) { pc.setLocalDescription(o); }).catch(function () { resolve(null); });
        pc.onicecandidate = function (ice) {
          if (!ice || !ice.candidate || !ice.candidate.candidate) return;
          var m = ice.candidate.candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
          if (m && !m[1].startsWith('127.')) { resolve(m[1]); pc.close(); }
        };
        setTimeout(function () { resolve(null); }, 4000);
      } catch (e) { resolve(null); }
    });
  };

  /* ── Expor globalmente ── */
  window.SB = SB;
  window.AQ_URL  = URL_BASE;
  window.AQ_KEY  = ANON_KEY;

})();
