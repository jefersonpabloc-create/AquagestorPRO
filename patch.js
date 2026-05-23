/**
 * ═══════════════════════════════════════════════════════════
 *  AQUAGESTOR PRO — patch.js
 *  Adicione ao app principal ANTES de </body>:
 *  <script src="supabase.js"></script>
 *  <script src="patch.js"></script>
 * ═══════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     1. SUPABASE AUTH — Login automático para o admin
     ══════════════════════════════════════════════════════════ */
  function injetarLoginAdmin() {
    // Se o app já tem login próprio, apenas expõe a sessão
    var sess = window.SB ? SB.auth.session() : null;
    var cfg  = {};
    try { cfg = JSON.parse(localStorage.getItem('aq_config') || '{}'); } catch(e) {}

    if (!cfg.url || !cfg.key) {
      // Redireciona para setup se não configurado
      if (!window.location.pathname.endsWith('index.html')) {
        window.location.href = 'index.html?from=' + encodeURIComponent(window.location.pathname.split('/').pop());
      }
      return;
    }

    if (sess) {
      // Expõe sessão globalmente para o app principal usar
      window._sbUser    = { uid: sess.user.id, email: sess.user.email, perfil: 'admin' };
      window._sbSession = sess;
      return;
    }

    // Overlay de login do admin
    var ovHTML = [
      '<div id="_aqLoginOv" style="position:fixed;inset:0;background:linear-gradient(135deg,#03060f,#071228,#030d1c);',
        'z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;',
        'font-family:Outfit,system-ui,sans-serif;backdrop-filter:blur(8px);">',
        '<div style="background:rgba(12,22,42,.95);border:1px solid rgba(74,157,255,.2);border-radius:28px;',
          'padding:36px 28px;width:100%;max-width:390px;box-shadow:0 32px 80px rgba(0,0,0,.7);">',
          '<div style="text-align:center;font-size:3rem;margin-bottom:6px">🐟</div>',
          '<div style="text-align:center;font-size:1.25rem;font-weight:900;color:#fff;margin-bottom:2px;letter-spacing:-.5px">',
            'Aqua<span style="background:linear-gradient(135deg,#4a9dff,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Gestor</span> PRO',
          '</div>',
          '<div style="text-align:center;font-size:.75rem;color:#4a6080;margin-bottom:24px">Painel Administrativo</div>',
          '<div style="margin-bottom:12px">',
            '<label style="display:block;font-size:.7rem;font-weight:700;color:#8ba8cc;margin-bottom:5px">E-mail</label>',
            '<input id="_aqLgEmail" type="email" placeholder="admin@piscicultura.com" autocomplete="email"',
              ' style="width:100%;padding:12px 16px;border:1.5px solid rgba(74,157,255,.15);border-radius:14px;',
              'font-family:inherit;font-size:.92rem;background:rgba(4,8,20,.6);color:#e8f0ff;',
              'box-sizing:border-box;-webkit-appearance:none;outline:none">',
          '</div>',
          '<div style="margin-bottom:12px">',
            '<label style="display:block;font-size:.7rem;font-weight:700;color:#8ba8cc;margin-bottom:5px">Senha</label>',
            '<input id="_aqLgSenha" type="password" placeholder="••••••••" autocomplete="current-password"',
              ' style="width:100%;padding:12px 16px;border:1.5px solid rgba(74,157,255,.15);border-radius:14px;',
              'font-family:inherit;font-size:.92rem;background:rgba(4,8,20,.6);color:#e8f0ff;',
              'box-sizing:border-box;-webkit-appearance:none;outline:none">',
          '</div>',
          '<button id="_aqLgBtn" onclick="window._aqDoLogin()"',
            ' style="width:100%;padding:14px;background:linear-gradient(135deg,#4a9dff,#1a6dff);color:#fff;',
            'font-family:inherit;font-weight:800;font-size:.95rem;border:none;border-radius:14px;cursor:pointer;',
            'margin-top:4px;letter-spacing:.2px">🔐 Entrar como Administrador</button>',
          '<div id="_aqLgErr" style="display:none;background:rgba(255,77,106,.1);color:#ff8fa3;',
            'border:1px solid rgba(255,77,106,.3);border-radius:12px;padding:10px 14px;font-size:.78rem;',
            'font-weight:600;margin-top:10px;text-align:center"></div>',
          '<p style="text-align:center;font-size:.68rem;color:#2a3a55;margin-top:14px">Acesso exclusivo para administradores</p>',
        '</div>',
      '</div>'
    ].join('');

    document.body.insertAdjacentHTML('beforeend', ovHTML);

    // Foco automático
    setTimeout(function () {
      var el = document.getElementById('_aqLgEmail');
      if (el) el.focus();
    }, 200);

    // Enter para logar
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && document.getElementById('_aqLoginOv')) {
        window._aqDoLogin();
      }
    });

    window._aqDoLogin = async function () {
      var email  = (document.getElementById('_aqLgEmail').value || '').trim();
      var senha  = document.getElementById('_aqLgSenha').value || '';
      var errEl  = document.getElementById('_aqLgErr');
      var btn    = document.getElementById('_aqLgBtn');

      errEl.style.display = 'none';
      if (!email || !senha) { errEl.textContent = '⚠️ Preencha e-mail e senha.'; errEl.style.display = 'block'; return; }

      btn.disabled = true;
      btn.textContent = '⏳ Entrando...';

      try {
        var auth = await SB.auth.signIn(email, senha);
        var perfil = await SB.perfil();

        if (!perfil) throw new Error('Perfil não encontrado. Execute a configuração em index.html');
        if (perfil.role !== 'admin') throw new Error('Acesso negado. Esta conta não é de administrador.');

        window._sbUser    = { uid: auth.user.id, nome: perfil.nome || email.split('@')[0], email: email, perfil: 'admin' };
        window._sbSession = SB.auth.session();

        // Atualizar UI do app principal se houver elementos de nome/perfil
        ['udNome','hdrNome','userNome'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.textContent = window._sbUser.nome;
        });

        // Remover overlay
        var ov = document.getElementById('_aqLoginOv');
        if (ov) {
          ov.style.opacity = '0';
          ov.style.transition = 'opacity .3s';
          setTimeout(function () { ov.remove(); }, 300);
        }

        if (window.showMessage) showMessage('✅ Bem-vindo, ' + window._sbUser.nome + '!');

      } catch (e) {
        errEl.textContent = '❌ ' + e.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = '🔐 Entrar como Administrador';
      }
    };
  }

  /* ══════════════════════════════════════════════════════════
     2. CORREÇÃO DO PDF — Sem popup, sem bloqueio
     ══════════════════════════════════════════════════════════ */
  window._abrirHtmlBlob = function (htmlStr, nomeArquivo) {
    try {
      var blob = new Blob([htmlStr], { type: 'text/html;charset=utf-8' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href   = url;
      a.target = '_blank';
      a.rel    = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 90000);
      return true;
    } catch (e) {
      // Fallback: download direto
      try {
        var blob2 = new Blob([htmlStr], { type: 'text/html;charset=utf-8' });
        var url2  = URL.createObjectURL(blob2);
        var a2    = document.createElement('a');
        a2.href     = url2;
        a2.download = (nomeArquivo || 'relatorio') + '.html';
        a2.style.display = 'none';
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);
        setTimeout(function () { URL.revokeObjectURL(url2); }, 3000);
        return false;
      } catch (e2) { return false; }
    }
  };

  // Interceptar window.open do app principal e substituir pela versão sem popup
  var _origOpen = window.open;
  window.open = function (url, target, features) {
    // Só intercepta chamadas internas que passam HTML (blob ou data:)
    if (url && (url.startsWith('blob:') || url === '' || url === 'about:blank') && target === '_blank') {
      // Deixa passar — já é blob seguro
      return _origOpen.call(window, url, target, features);
    }
    if (url === '' || url === 'about:blank') {
      // Retorna objeto fake que captura o conteúdo e abre como blob
      var _buf = '';
      var _fake = {
        document: {
          write: function (s) { _buf += s; },
          close: function () {
            setTimeout(function () {
              window._abrirHtmlBlob(_buf, 'relatorio');
              if (window.showMessage) showMessage('📄 Relatório aberto! Use "Imprimir → Salvar como PDF".', 'success');
            }, 100);
          }
        },
        focus: function () {},
        print: function () {}
      };
      return _fake;
    }
    return _origOpen.call(window, url, target, features);
  };

  /* ══════════════════════════════════════════════════════════
     3. EXPORTAR XLSX — Com seleção de pasta / SD Card
     ══════════════════════════════════════════════════════════ */
  window._exportarXlsxComEscolha = async function (wb, nomeArquivo) {
    if (typeof XLSX === 'undefined') {
      if (window.showMessage) showMessage('❌ Biblioteca XLSX não carregada', true);
      return;
    }
    nomeArquivo = nomeArquivo || ('AquaGestor_' + new Date().toLocaleDateString('pt-BR').replace(/\//g, '-') + '.xlsx');

    // Tenta File System Access API (Chrome 86+ / Android permite selecionar SD Card)
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        var fh = await window.showSaveFilePicker({
          suggestedName: nomeArquivo,
          startIn: 'downloads',
          types: [{ description: 'Planilha Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }]
        });
        var wout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        var wr = await fh.createWritable();
        await wr.write(new Blob([wout], { type: 'application/octet-stream' }));
        await wr.close();
        if (window.showMessage) showMessage('✅ Arquivo salvo com sucesso!', 'success');
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // usuário cancelou
      }
    }

    // Fallback: download padrão (vai para Downloads do Android)
    try {
      XLSX.writeFile(wb, nomeArquivo);
      if (window.showMessage) showMessage('✅ Salvo em Downloads! Para mover ao SD Card: abra o app "Arquivos" do celular.', 'success');
    } catch (e) {
      if (window.showMessage) showMessage('❌ Erro ao salvar: ' + e.message, true);
    }
  };

  /* ══════════════════════════════════════════════════════════
     4. BOTÃO DE ACESSO AO APP DO COLABORADOR
     ══════════════════════════════════════════════════════════ */
  function injetarBotaoColaboradores() {
    if (document.getElementById('_aqBtnColab')) return;

    var cfg = {};
    try { cfg = JSON.parse(localStorage.getItem('aq_config') || '{}'); } catch(e) {}
    var adminId = cfg.adminId || '';
    var token   = (SB && SB.auth.session()) ? SB.auth.session().access_token : '';

    var btnHTML = [
      '<div id="_aqBtnColab" style="position:fixed;bottom:96px;right:14px;z-index:800">',
        '<button onclick="window._abrirPainelColab()"',
          ' style="background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;border:none;',
          'border-radius:50%;width:52px;height:52px;font-size:1.3rem;cursor:pointer;',
          'box-shadow:0 0 0 4px rgba(124,58,237,.2),0 6px 20px rgba(124,58,237,.4);',
          'display:flex;align-items:center;justify-content:center;transition:all .2s;",',
          'title="Painel de Colaboradores">👷</button>',
      '</div>'
    ].join('');

    document.body.insertAdjacentHTML('beforeend', btnHTML);

    window._abrirPainelColab = function () {
      window.location.href = 'index.html';
    };
  }

  /* ══════════════════════════════════════════════════════════
     5. SINCRONIZAR DADOS DO APP PRINCIPAL COM SUPABASE
     Sobrescreve loadData/saveData para usar Supabase quando disponível
     ══════════════════════════════════════════════════════════ */
  function configurarSincronizacao() {
    if (!window.SB) return;
    var cfg = {};
    try { cfg = JSON.parse(localStorage.getItem('aq_config') || '{}'); } catch(e) {}
    var adminId = cfg.adminId || (SB.auth.user() && SB.auth.user().id) || '';
    if (!adminId) return;

    // Salvar no Supabase sempre que saveData for chamado
    var _origSave = window.saveData;
    window.saveData = async function (chave, valor) {
      // Mantém localStorage (funciona offline)
      if (_origSave) _origSave(chave, valor);
      else { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch(e) {} }

      // Sincroniza com Supabase em background
      try {
        await SB.userData.set(chave, valor);
      } catch (e) {
        console.warn('[AquaGestor] Sync Supabase falhou para "' + chave + '":', e.message);
      }
    };

    // Carregar do Supabase na inicialização (uma vez só)
    window._syncFromSupabase = async function () {
      var chaves = ['tanques','lotes','vendas','despesas','racoes','pisciculturas_lista','parametros'];
      var promises = chaves.map(async function (k) {
        try {
          var v = await SB.userData.get(adminId, k);
          if (v !== null) {
            // Atualiza localStorage com dados mais recentes do servidor
            localStorage.setItem(k, JSON.stringify(v));
          }
        } catch(e) {}
      });
      await Promise.allSettled(promises);
      // Recarregar UI se app tiver função de refresh
      if (window.recarregarDados) window.recarregarDados();
      else if (window.initApp) window.initApp();
    };

    // Sincroniza após login
    setTimeout(window._syncFromSupabase, 2000);
  }

  /* ══════════════════════════════════════════════════════════
     BOOT — executar após DOM pronto
     ══════════════════════════════════════════════════════════ */
  function boot() {
    injetarLoginAdmin();
    setTimeout(injetarBotaoColaboradores, 1000);
    setTimeout(configurarSincronizacao, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
