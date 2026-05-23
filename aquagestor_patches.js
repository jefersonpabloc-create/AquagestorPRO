/**
 * ═══════════════════════════════════════════════════════════════════
 * AQUAGESTOR PRO — PATCH DE CORREÇÕES v1.0
 * 
 * COMO APLICAR:
 * 1. Abra o arquivo aquagestor_corrigido_v3.html em um editor de texto
 * 2. Localize cada trecho marcado com "LOCALIZAR:" e substitua pelo
 *    trecho marcado com "SUBSTITUIR POR:"
 * 3. Ou aplique automaticamente colando este script antes de </body>
 * ═══════════════════════════════════════════════════════════════════
 */

// ══════════════════════════════════════════════════════════════════
// PATCH 1 — CORREÇÃO DO PDF (sem popup, sem bloqueio de pop-up)
// 
// LOCALIZAR no arquivo principal (~linha 9736):
//   let win = window.open('', '_blank', 'width=1000,height=800');
//   if (!win) { showMessage('⚠️ Permita pop-ups para gerar o PDF', true); return; }
//   win.document.write(htmlRelatorio);
//   win.document.close();
//   win.focus();
//   setTimeout(() => win.print(), 800);
//   showMessage('📄 Relatório gerado! Use "Salvar como PDF" na impressão.', 'success');
//
// SUBSTITUIR POR (copiar a função abaixo):
// ══════════════════════════════════════════════════════════════════

window.gerarRelatorioPDFCliente = function(nomeCliente, dataInicio, dataFim) {
    var vendas = (window.loadVendas ? window.loadVendas() : (window.loadData ? window.loadData('vendas') : [])) || [];
    var todasVendas = vendas.filter(function(v){ return v.cliente === nomeCliente; });

    // Pedir período se não informado
    if (!dataInicio && !dataFim) {
        var periodoInicio = prompt('Data inicial (dd/mm/aaaa) — deixe em branco para todas:') || '';
        var periodoFim    = prompt('Data final (dd/mm/aaaa) — deixe em branco para todas:') || '';
        if (periodoInicio) {
            var p1 = periodoInicio.split('/');
            if (p1.length === 3) dataInicio = p1[2]+'-'+p1[1]+'-'+p1[0];
        }
        if (periodoFim) {
            var p2 = periodoFim.split('/');
            if (p2.length === 3) dataFim = p2[2]+'-'+p2[1]+'-'+p2[0];
        }
    }

    if (dataInicio || dataFim) {
        todasVendas = todasVendas.filter(function(v) {
            var d = new Date(v.data + 'T12:00:00');
            if (dataInicio && d < new Date(dataInicio + 'T00:00:00')) return false;
            if (dataFim    && d > new Date(dataFim    + 'T23:59:59')) return false;
            return true;
        });
    }

    if (!todasVendas.length) {
        if (window.showMessage) showMessage('Nenhuma venda encontrada para este cliente no período.', true);
        return;
    }

    todasVendas.sort(function(a,b){ return new Date(a.dataISO||a.data) - new Date(b.dataISO||b.data); });

    var CATS = {
        grade:   { label:'Grande (900g–1200g)',  emoji:'🟢' },
        media:   { label:'Médio (600g–899g)',     emoji:'🔵' },
        pequena: { label:'Pequeno (400g–599g)',   emoji:'🟡' },
        minima:  { label:'Abaixo de 400g',        emoji:'🔴' }
    };

    var totalGeral   = todasVendas.reduce(function(s,v){ return s+(v.valorTotal||0); }, 0);
    var totalPago    = todasVendas.reduce(function(s,v){
        if (v.pago === 'pago')    return s + (v.valorTotal||0);
        if (v.pago === 'parcial') return s + (v.valorPago||0);
        return s;
    }, 0);
    var totalPendente = totalGeral - totalPago;
    var totalKg      = todasVendas.reduce(function(s,v){ return s+(v.kgVendidos||0); }, 0);
    var ultimaVenda  = todasVendas[todasVendas.length-1];
    var piscNome     = (document.getElementById('hdrPiscNome') || {}).textContent || 'Piscicultura';
    var hoje         = new Date().toLocaleDateString('pt-BR');
    var periodoStr   = 'Todo o período';
    if (dataInicio || dataFim) {
        var ini = dataInicio ? new Date(dataInicio+'T12:00:00').toLocaleDateString('pt-BR') : '—';
        var fim = dataFim    ? new Date(dataFim   +'T12:00:00').toLocaleDateString('pt-BR') : 'Hoje';
        periodoStr = ini + ' a ' + fim;
    }

    var linhasVendas = todasVendas.map(function(v, i) {
        var dt   = v.data ? new Date(v.data+'T12:00:00').toLocaleDateString('pt-BR') : '—';
        var cat  = CATS[v.categoria] || CATS.media;
        var pago = v.pago === 'pago' ? '✅ Pago'
                 : v.pago === 'parcial' ? '🔶 Parcial (pago: R$ '+(v.valorPago||0).toFixed(2)+')'
                 : '⏳ Pendente';
        var saldo = v.pago === 'parcial' ? (v.valorTotal||0) - (v.valorPago||0)
                  : v.pago === 'pendente' ? (v.valorTotal||0) : 0;
        return '<tr style="background:'+(i%2===0?'#f8fafc':'#fff')+';">'
            + '<td style="padding:7px 10px;font-size:12px;border-bottom:1px solid #e2e8f0;">'+dt+'</td>'
            + '<td style="padding:7px 10px;font-size:12px;border-bottom:1px solid #e2e8f0;">'+cat.emoji+' '+cat.label+'</td>'
            + '<td style="padding:7px 10px;font-size:12px;border-bottom:1px solid #e2e8f0;text-align:center;">'+(v.kgVendidos||0).toFixed(1)+' kg</td>'
            + '<td style="padding:7px 10px;font-size:12px;border-bottom:1px solid #e2e8f0;text-align:center;">'+(v.qtdPeixes||'—')+'</td>'
            + '<td style="padding:7px 10px;font-size:12px;border-bottom:1px solid #e2e8f0;text-align:right;">R$ '+(v.valorKg||0).toFixed(2)+'</td>'
            + '<td style="padding:7px 10px;font-size:12px;font-weight:700;border-bottom:1px solid #e2e8f0;text-align:right;">R$ '+(v.valorTotal||0).toFixed(2)+'</td>'
            + '<td style="padding:7px 10px;font-size:11px;border-bottom:1px solid #e2e8f0;text-align:center;">'+pago+'</td>'
            + '<td style="padding:7px 10px;font-size:12px;font-weight:700;color:'+(saldo>0?'#dc2626':'#16a34a')+';border-bottom:1px solid #e2e8f0;text-align:right;">'+(saldo>0?'R$ '+saldo.toFixed(2):'—')+'</td>'
            + '</tr>';
    }).join('');

    var htmlRelatorio = '<!DOCTYPE html>'
        + '<html lang="pt-br"><head><meta charset="UTF-8">'
        + '<title>Relatório — '+nomeCliente+'</title>'
        + '<style>'
        + '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}'
        + 'body{font-family:"Segoe UI",Arial,sans-serif;margin:0;padding:0;background:#fff;color:#1e293b;}'
        + '.page{max-width:900px;margin:0 auto;padding:32px 40px;}'
        + '.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1d4ed8;padding-bottom:18px;margin-bottom:24px;}'
        + '.logo-area h1{font-size:24px;font-weight:900;color:#1d4ed8;margin:0 0 4px;}'
        + '.logo-area p{font-size:12px;color:#64748b;margin:0;}'
        + '.doc-info{text-align:right;font-size:12px;color:#64748b;}'
        + '.doc-info strong{display:block;font-size:14px;color:#1e293b;}'
        + '.client-box{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;border-radius:12px;padding:18px 22px;margin-bottom:22px;display:grid;grid-template-columns:1fr 1fr;gap:12px;}'
        + '.client-box h2{grid-column:1/-1;font-size:18px;font-weight:800;color:#1d4ed8;margin:0 0 6px;}'
        + '.client-info{font-size:12px;color:#475569;}'
        + '.client-info strong{display:block;font-size:13px;color:#1e293b;margin-bottom:2px;}'
        + '.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px;}'
        + '.kpi{border-radius:10px;padding:14px 16px;text-align:center;}'
        + '.kpi.green{background:#f0fdf4;border:1px solid #86efac;}'
        + '.kpi.blue{background:#eff6ff;border:1px solid #93c5fd;}'
        + '.kpi.red{background:#fef2f2;border:1px solid #fca5a5;}'
        + '.kpi-val{font-size:20px;font-weight:800;margin-bottom:4px;}'
        + '.kpi.green .kpi-val{color:#16a34a;}.kpi.blue .kpi-val{color:#1d4ed8;}.kpi.red .kpi-val{color:#dc2626;}'
        + '.kpi-lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#64748b;}'
        + 'h3{font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:#475569;border-left:4px solid #1d4ed8;padding-left:10px;margin:22px 0 12px;}'
        + 'table{width:100%;border-collapse:collapse;}'
        + 'thead tr{background:#1d4ed8;color:#fff;}'
        + 'thead th{padding:9px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:left;}'
        + 'thead th:last-child,thead th:nth-child(5),thead th:nth-child(6),thead th:nth-child(8){text-align:right;}'
        + 'thead th:nth-child(4),thead th:nth-child(7){text-align:center;}'
        + '.total-row{background:#1e293b!important;color:#fff;}'
        + '.total-row td{padding:9px 10px;font-size:13px;font-weight:800;}'
        + '.status-section{margin-top:22px;padding:16px 20px;border-radius:10px;}'
        + '.status-section.pendente{background:#fef2f2;border:1px solid #fca5a5;}'
        + '.status-section.quitado{background:#f0fdf4;border:1px solid #86efac;}'
        + '.footer{margin-top:36px;border-top:2px solid #e2e8f0;padding-top:16px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;}'
        + '@media print{.no-print{display:none!important;}}'
        + '.print-btn{display:block;width:200px;margin:0 auto 24px;padding:14px;background:#1d4ed8;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;text-align:center;}'
        + '</style></head><body>'
        + '<div class="page">'
        + '<button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>'
        + '<div class="header">'
        +   '<div class="logo-area"><h1>🐟 '+piscNome+'</h1><p>Relatório de Compras do Cliente</p><p>Período: '+periodoStr+'</p></div>'
        +   '<div class="doc-info"><strong>Emitido em: '+hoje+'</strong><span>AquaGestor PRO</span></div>'
        + '</div>'
        + '<div class="client-box">'
        +   '<h2>👤 '+nomeCliente+'</h2>'
        +   '<div class="client-info"><strong>Telefone</strong>'+(ultimaVenda.telefone||'Não informado')+'</div>'
        +   '<div class="client-info"><strong>Cidade</strong>'+(ultimaVenda.cidade||'Não informada')+'</div>'
        +   '<div class="client-info"><strong>Total de compras</strong>'+todasVendas.length+' pedido(s)</div>'
        +   '<div class="client-info"><strong>Total em kg</strong>'+totalKg.toFixed(1)+' kg</div>'
        + '</div>'
        + '<div class="kpi-grid">'
        +   '<div class="kpi green"><div class="kpi-val">R$ '+totalGeral.toFixed(2)+'</div><div class="kpi-lbl">Total em Compras</div></div>'
        +   '<div class="kpi blue"><div class="kpi-val">R$ '+totalPago.toFixed(2)+'</div><div class="kpi-lbl">Total Pago</div></div>'
        +   '<div class="kpi '+(totalPendente>0?'red':'green')+'"><div class="kpi-val">R$ '+Math.max(0,totalPendente).toFixed(2)+'</div><div class="kpi-lbl">'+(totalPendente>0?'Pendente':'Sem Pendências')+'</div></div>'
        + '</div>'
        + '<h3>📋 Detalhamento das Compras</h3>'
        + '<table><thead><tr>'
        + '<th>Data</th><th>Categoria</th><th>Kg</th><th>Peixes</th><th>R$/kg</th><th>Total</th><th>Status</th><th>Saldo Dev.</th>'
        + '</tr></thead><tbody>'
        + linhasVendas
        + '<tr class="total-row"><td colspan="2">TOTAL GERAL</td>'
        + '<td style="text-align:center;">'+totalKg.toFixed(1)+' kg</td><td></td><td></td>'
        + '<td style="text-align:right;">R$ '+totalGeral.toFixed(2)+'</td>'
        + '<td style="text-align:center;color:#4ade80;">Pago: R$ '+totalPago.toFixed(2)+'</td>'
        + '<td style="text-align:right;color:'+(totalPendente>0?'#f87171':'#4ade80')+';">'+(totalPendente>0?'R$ '+totalPendente.toFixed(2):'—')+'</td>'
        + '</tr></tbody></table>'
        + (totalPendente > 0
            ? '<div class="status-section pendente"><strong style="color:#dc2626;font-size:14px;">⏳ Situação: Pagamento Pendente</strong><br><p style="margin:8px 0 0;font-size:13px;color:#7f1d1d;">Saldo devedor: <strong>R$ '+totalPendente.toFixed(2)+'</strong></p></div>'
            : '<div class="status-section quitado"><strong style="color:#16a34a;font-size:14px;">✅ Situação: Em Dia</strong><br><p style="margin:8px 0 0;font-size:13px;color:#14532d;">Todas as compras estão quitadas.</p></div>')
        + '<div class="footer"><span>Gerado por AquaGestor PRO — '+piscNome+'</span><span>Emissão: '+hoje+'</span></div>'
        + '</div></body></html>';

    // ══ NOVA ABORDAGEM: Blob URL em vez de window.open ══
    // Cria um Blob com o HTML, gera URL temporária e abre numa nova aba
    // Esta técnica funciona mesmo com bloqueadores de popup ativos
    try {
        var blob = new Blob([htmlRelatorio], { type: 'text/html;charset=utf-8' });
        var blobUrl = URL.createObjectURL(blob);

        // Tentar abrir diretamente — funciona sem popup blocker
        var link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.rel = 'noopener';
        // Em mobile: abrir em nova aba
        // Em desktop: também abre em nova aba (sem popup blocker)
        link.click();

        // Também oferece download direto como HTML (que pode ser impresso como PDF)
        setTimeout(function() {
            URL.revokeObjectURL(blobUrl);
        }, 60000);

        if (window.showMessage) showMessage('📄 Relatório aberto! Pressione Imprimir e escolha "Salvar como PDF".', 'success');

    } catch(e) {
        // Fallback: download direto do arquivo HTML
        try {
            var blob2 = new Blob([htmlRelatorio], { type: 'text/html;charset=utf-8' });
            var url2  = URL.createObjectURL(blob2);
            var a2 = document.createElement('a');
            a2.href     = url2;
            a2.download = 'Relatorio_' + nomeCliente.replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.html';
            a2.style.display = 'none';
            document.body.appendChild(a2);
            a2.click();
            setTimeout(function(){ document.body.removeChild(a2); URL.revokeObjectURL(url2); }, 500);
            if (window.showMessage) showMessage('📥 Relatório baixado! Abra o arquivo e pressione Ctrl+P para salvar como PDF.', 'success');
        } catch(e2) {
            if (window.showMessage) showMessage('❌ Erro ao gerar relatório: ' + e2.message, true);
        }
    }
};

// ══════════════════════════════════════════════════════════════════
// PATCH 2 — EXPORTAR XLSX COM SELEÇÃO DE LOCAL (SD Card)
// Substitui a função exportarExcel existente com suporte ao
// File System Access API (permite escolher pasta incluindo SD card)
// ══════════════════════════════════════════════════════════════════

window._exportarExcelComEscolha = async function() {
    // Verificar se File System Access API está disponível (Chrome/Edge Android)
    var supportsFilePicker = typeof window.showSaveFilePicker === 'function';

    // Gerar o arquivo Excel (reutilizando a lógica existente)
    var wb = null;
    try {
        // Tentar chamar a função original de geração do workbook
        if (typeof XLSX === 'undefined') {
            if (window.showMessage) showMessage('❌ Biblioteca XLSX não carregada', true);
            return;
        }

        wb = XLSX.utils.book_new();
        var ts = new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');

        // Dados dos tanques
        var tanques = window.loadData ? (window.loadData('tanques') || []) : [];
        if (tanques.length > 0) {
            var tData = [['Num','Volume (m³)','Malha','Material','Status']];
            tanques.forEach(function(t) {
                tData.push([t.num, t.vol||'', t.malha||'', t.material||'', 'ativo']);
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tData), 'Tanques');
        }

        // Vendas
        var vendas = window.loadVendas ? window.loadVendas() : (window.loadData ? window.loadData('vendas') : []) || [];
        if (vendas.length > 0) {
            var vData = [['ID','Data','Cliente','Kg','Preço/kg','Total','Categoria','Tanque','Pago','Lucro']];
            vendas.forEach(function(v) {
                vData.push([v.id, v.data, v.cliente, v.kgVendidos, v.valorKg, v.valorTotal, v.categoria, v.tanqueOrigem, v.pago, (v.lucroEstimado||0).toFixed(2)]);
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vData), 'Vendas');
        }

        // Despesas
        var despesas = window.loadDespesas ? window.loadDespesas() : (window.loadData ? window.loadData('despesas') : []) || [];
        if (despesas.length > 0) {
            var dData = [['ID','Data','Descrição','Categoria','Valor']];
            despesas.forEach(function(d) {
                dData.push([d.id, d.data, d.desc, d.cat, d.valor]);
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dData), 'Despesas');
        }

        var nomeArq = 'AquaGestor_' + ts + '.xlsx';

        if (supportsFilePicker) {
            // ── Modo com seleção de pasta (File System Access API) ──
            // Funciona no Chrome/Edge e permite salvar em qualquer local, incluindo SD card
            try {
                var fileHandle = await window.showSaveFilePicker({
                    suggestedName: nomeArq,
                    types: [{
                        description: 'Planilha Excel',
                        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
                    }],
                    startIn: 'downloads' // Começa na pasta Downloads, usuário pode navegar para SD card
                });

                var wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                var writable = await fileHandle.createWritable();
                await writable.write(new Blob([wbout], { type: 'application/octet-stream' }));
                await writable.close();

                if (window.showMessage) showMessage('✅ Excel salvo com sucesso!', 'success');
                return;
            } catch(fsErr) {
                if (fsErr.name === 'AbortError') {
                    // Usuário cancelou o dialog
                    return;
                }
                // Falhou — cair no método padrão
                console.warn('File System Access falhou:', fsErr);
            }
        }

        // ── Modo padrão (download automático) ──
        // O Android salva na pasta Downloads por padrão
        // Para mover para SD card depois: use o app Files/Arquivos do Android
        XLSX.writeFile(wb, nomeArq);
        if (window.showMessage) {
            showMessage('✅ Excel salvo na pasta Downloads! Para mover ao cartão SD, use o app "Arquivos" do celular.', 'success');
        }

    } catch(e) {
        console.error('Erro ao gerar Excel:', e);
        if (window.showMessage) showMessage('❌ Erro: ' + e.message, true);
    }
};

// ══════════════════════════════════════════════════════════════════
// PATCH 3 — BOTÃO DE CONTROLE DE COLABORADORES NO MENU PRINCIPAL
//
// Adiciona automaticamente ao menu de configurações do app principal
// um botão para acessar o Painel de Controle de Colaboradores
// ══════════════════════════════════════════════════════════════════

(function adicionarBotaoColaboradores() {
    function injetar() {
        // Tentar adicionar no dropdown do usuário se existir
        var userDropdown = document.getElementById('userDropdown');
        if (userDropdown && !document.getElementById('btnAbrirPainelColab')) {
            var btn = document.createElement('button');
            btn.id = 'btnAbrirPainelColab';
            btn.innerHTML = '👷 Painel de Colaboradores';
            btn.style.cssText = 'width:100%;margin-top:6px;background:linear-gradient(135deg,#7c3aed,#5b21b6);font-size:.78rem;padding:8px 14px;border-radius:20px;';
            btn.onclick = function() {
                // Passar token e adminId para o painel via URL
                var session = null;
                try { session = JSON.parse(localStorage.getItem('colab_session') || localStorage.getItem('sb_session') || '{}'); } catch(e) {}
                var token   = session?.session?.access_token || session?.access_token || '';
                var adminId = session?.user?.id || session?.adminId || '';
                var url = 'aquagestor_painel_admin.html';
                if (token && adminId) {
                    url += '?adminId=' + encodeURIComponent(adminId) + '&token=' + encodeURIComponent(token);
                }
                window.open(url, '_blank');
            };
            userDropdown.appendChild(btn);
            return true;
        }

        // Alternativa: adicionar na seção de configurações/relatórios
        var relSection = document.getElementById('relatorios');
        if (relSection && !document.getElementById('secaoColaboradores')) {
            var div = document.createElement('div');
            div.id = 'secaoColaboradores';
            div.style.cssText = 'background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.3);border-radius:20px;padding:16px;margin:10px 0;';
            div.innerHTML = '<div style="font-size:.63rem;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#a78bfa;margin-bottom:12px;display:flex;align-items:center;gap:7px;">👷 CONTROLE DE COLABORADORES<span style="flex:1;height:1px;background:rgba(124,58,237,.3);display:block;"></span></div>'
                + '<p style="font-size:.78rem;color:#c4b5fd;margin-bottom:12px;">Gerencie colaboradores do app secundário, configure redes WiFi autorizadas e revise os registros enviados.</p>'
                + '<button onclick="document.getElementById(\'btnAbrirPainelColab2\').click()" style="background:linear-gradient(135deg,#7c3aed,#5b21b6);width:100%;padding:12px;border-radius:20px;font-size:.85rem;font-weight:700;">👷 Abrir Painel de Controle</button>'
                + '<button id="btnAbrirPainelColab2" style="display:none;" onclick="window.open(\'aquagestor_painel_admin.html\',\'_blank\')"></button>';
            var firstCard = relSection.querySelector('.card') || relSection.querySelector('.container');
            if (firstCard) {
                firstCard.parentNode.insertBefore(div, firstCard);
            } else {
                relSection.prepend(div);
            }
            return true;
        }
        return false;
    }

    // Tentar imediatamente e após carregar
    if (!injetar()) {
        document.addEventListener('DOMContentLoaded', injetar);
        setTimeout(injetar, 2000);
    }
})();

// ══════════════════════════════════════════════════════════════════
// PATCH 4 — SUPABASE AUTH (Login para o app principal)
//
// INSTRUÇÕES:
// No arquivo principal, localize este bloco (~linha 12408):
//
//   // ── Supabase config ──
//   // ── App sem autenticação ────────────────────────────────────────
//   // Supabase removido — app funciona com dados locais (localStorage)
//   let _sbUser  = { uid: 'local', nome: 'Usuário', email: '', perfil: 'admin' };
//
// E substitua pelo bloco abaixo (ou adicione ANTES de </body>):
// ══════════════════════════════════════════════════════════════════

(function configurarSupabaseAdmin() {
    // Configurações do Supabase — SUBSTITUA PELOS SEUS DADOS
    var SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
    var SUPABASE_KEY = 'sua_anon_key_aqui';

    // Verificar se as credenciais foram configuradas
    if (SUPABASE_URL === 'https://SEU_PROJETO.supabase.co') {
        console.warn('⚠️ AquaGestor: Configure SUPABASE_URL e SUPABASE_KEY para habilitar o login via Supabase');
        return; // Mantém modo local se não configurado
    }

    // Overlay de login para o app ADMIN
    var loginHTML = '<div id="adminLoginOverlay" style="position:fixed;inset:0;background:linear-gradient(135deg,#060c1a,#0d1e3d,#041828);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Outfit,sans-serif;">'
        + '<div style="background:rgba(30,41,59,.9);border:1px solid rgba(148,163,184,.15);border-radius:24px;padding:36px 28px;width:100%;max-width:380px;box-shadow:0 24px 64px rgba(0,0,0,.6);">'
        + '<div style="text-align:center;font-size:3rem;margin-bottom:4px;">🐟</div>'
        + '<div style="text-align:center;font-size:1.25rem;font-weight:800;color:#f1f5f9;margin-bottom:4px;">AquaGestor <span style="background:linear-gradient(135deg,#3b82f6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">PRO</span></div>'
        + '<div style="text-align:center;font-size:.75rem;color:#94a3b8;margin-bottom:24px;">Painel Administrativo</div>'
        + '<div style="margin-bottom:12px;"><label style="display:block;font-size:.72rem;font-weight:700;color:#cbd5e1;margin-bottom:5px;">E-mail</label><input id="adminLoginEmail" type="email" placeholder="admin@piscicultura.com" autocomplete="email" style="width:100%;padding:12px 16px;border:1.5px solid rgba(148,163,184,.15);border-radius:12px;font-family:inherit;font-size:.9rem;background:rgba(15,23,42,.7);color:#f1f5f9;box-sizing:border-box;"></div>'
        + '<div style="margin-bottom:12px;"><label style="display:block;font-size:.72rem;font-weight:700;color:#cbd5e1;margin-bottom:5px;">Senha</label><input id="adminLoginSenha" type="password" placeholder="••••••••" autocomplete="current-password" style="width:100%;padding:12px 16px;border:1.5px solid rgba(148,163,184,.15);border-radius:12px;font-family:inherit;font-size:.9rem;background:rgba(15,23,42,.7);color:#f1f5f9;box-sizing:border-box;"></div>'
        + '<button id="adminLoginBtn" onclick="_fazerLoginAdmin()" style="width:100%;padding:13px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-family:inherit;font-weight:800;font-size:.95rem;border:none;border-radius:12px;cursor:pointer;margin-top:4px;">🔐 Entrar como Administrador</button>'
        + '<div id="adminLoginErr" style="background:rgba(239,68,68,.1);color:#fca5a5;border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:9px 12px;font-size:.78rem;font-weight:600;margin-top:10px;text-align:center;display:none;"></div>'
        + '<p style="text-align:center;font-size:.68rem;color:#475569;margin-top:16px;">Acesso exclusivo para administradores</p>'
        + '</div></div>';

    // Verificar sessão salva
    var savedSession = null;
    try {
        var raw = localStorage.getItem('admin_sb_session');
        if (raw) {
            savedSession = JSON.parse(raw);
            // Verificar expiração
            if (savedSession.expires_at && Date.now() / 1000 > savedSession.expires_at) {
                savedSession = null;
                localStorage.removeItem('admin_sb_session');
            }
        }
    } catch(e) { savedSession = null; }

    if (savedSession) {
        // Sessão válida — continuar sem mostrar login
        console.log('✅ Sessão admin restaurada');
        window._sbUser = { uid: savedSession.user?.id || 'local', nome: savedSession.nome || 'Admin', email: savedSession.user?.email || '', perfil: 'admin' };
        window._sbSession = savedSession;
        return;
    }

    // Inserir overlay de login no DOM
    document.addEventListener('DOMContentLoaded', function() {
        document.body.insertAdjacentHTML('beforeend', loginHTML);
    });

    window._fazerLoginAdmin = async function() {
        var email = (document.getElementById('adminLoginEmail') || {}).value?.trim() || '';
        var senha = (document.getElementById('adminLoginSenha') || {}).value || '';
        var errEl = document.getElementById('adminLoginErr');
        var btn   = document.getElementById('adminLoginBtn');

        if (!email || !senha) { errEl.textContent='⚠️ Preencha e-mail e senha'; errEl.style.display='block'; return; }

        btn.disabled = true;
        btn.textContent = '⏳ Entrando...';
        errEl.style.display = 'none';

        try {
            var res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
                method: 'POST',
                headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: senha })
            });
            var data = await res.json();
            if (!res.ok) throw new Error(data.error_description || data.msg || 'Credenciais inválidas');

            // Verificar se é admin
            var profileRes = await fetch(SUPABASE_URL + '/rest/v1/user_profiles?id=eq.' + data.user.id + '&select=role,nome', {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + data.access_token }
            });
            var profiles = await profileRes.json();
            var profile = profiles[0];
            if (!profile) throw new Error('Perfil não encontrado. Execute o SQL de configuração no Supabase.');
            if (profile.role !== 'admin') throw new Error('Acesso negado. Apenas administradores podem usar este app.');

            // Salvar sessão
            var sessionData = Object.assign({}, data, { nome: profile.nome || email.split('@')[0] });
            localStorage.setItem('admin_sb_session', JSON.stringify(sessionData));

            window._sbUser = { uid: data.user.id, nome: profile.nome || email.split('@')[0], email: email, perfil: 'admin' };
            window._sbSession = sessionData;

            // Atualizar UI
            var udN = document.getElementById('udNome');
            var udE = document.getElementById('udEmail');
            if (udN) udN.textContent = window._sbUser.nome;
            if (udE) udE.textContent = email;

            // Remover overlay
            var overlay = document.getElementById('adminLoginOverlay');
            if (overlay) overlay.remove();

            if (window.showMessage) showMessage('✅ Bem-vindo, ' + window._sbUser.nome + '!');

        } catch(e) {
            errEl.textContent = '❌ ' + e.message;
            errEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = '🔐 Entrar como Administrador';
        }
    };

    // Enter para login
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && document.getElementById('adminLoginOverlay')) {
            window._fazerLoginAdmin();
        }
    });

    // Override do logout para limpar sessão Supabase
    var _origLogout = window.fazerLogout;
    window.fazerLogout = async function() {
        var session = window._sbSession;
        if (session?.access_token) {
            await fetch(SUPABASE_URL + '/auth/v1/logout', {
                method: 'POST',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + session.access_token }
            }).catch(function(){});
        }
        localStorage.removeItem('admin_sb_session');
        window._sbUser = null;
        window._sbSession = null;
        if (_origLogout) _origLogout();
        else location.reload();
    };
})();

console.log('✅ AquaGestor — Patches aplicados: PDF, XLSX, Colaboradores, Auth');
