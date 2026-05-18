# 🐟 AquaGestor PRO v21 — Arquitetura Modular

## Estrutura do Projeto

```
AquaGestorPRO/
├── index.html          ← Entrada principal (HTML limpo + legacy bundle)
│
├── css/
│   ├── theme.css       ← Tokens CSS (variáveis, tipografia, reset)
│   ├── global.css      ← Layout, formulários, botões, cards, utils
│   ├── dashboard.css   ← Menu, KPIs, painel principal
│   ├── financeiro.css  ← Módulo financeiro, dívidas, estratégia
│   ├── componentes.css ← Tanques, lotes, ração, relatórios
│   ├── login.css       ← Tela de login
│   └── responsivo.css  ← Media queries, mobile-first
│
└── js/
    ├── storage.js      ← Camada de persistência centralizada (localStorage → IndexedDB ready)
    ├── utils.js        ← Formatadores, helpers, tabelas zootécnicas (sem DOM)
    ├── ui.js           ← Primitivas de UI: toast, confirm modal, helpers DOM
    ├── auth.js         ← Login, sessão, usuários
    ├── routes.js       ← Navegação e visibilidade de seções
    ├── pisciculturas.js← Sistema multi-piscicultura
    ├── tanques.js      ← Tanques: CRUD, ocupação, despesca
    ├── lotes.js        ← Lotes: distribuição avançada, cálculos de custo
    ├── charts.js       ← Gestão centralizada de gráficos Chart.js
    ├── dashboard.js    ← Dashboard principal, KPIs, alertas
    ├── racao.js        ← Estoque de ração, compras, modelos
    ├── maoDeObra.js    ← Colaboradores, folha, adiantamentos
    ├── vendas.js       ← Vendas, abas financeiras
    ├── financeiro.js   ← Dashboard financeiro, despesas, fluxo de caixa, pró-labore
    ├── dividas.js      ← Dívidas, parcelas, alertas de inadimplência
    ├── estrategia.js   ← Capital, projeção, simulador, IA insights
    └── app.js          ← Orquestrador principal, init, seed de dados
```

## Separação de Responsabilidades

| Camada       | Módulo(s)                  | Responsabilidade                    |
|--------------|----------------------------|-------------------------------------|
| Persistência | storage.js                 | Leitura/escrita de dados            |
| Lógica pura  | utils.js, lotes.js         | Cálculos sem DOM                    |
| UI           | ui.js, charts.js           | Renderização e interação            |
| Domínio      | tanques, lotes, vendas...  | Regras de negócio por módulo        |
| Auth         | auth.js                    | Segurança e sessão                  |
| Roteamento   | routes.js                  | Navegação entre seções              |
| Bootstrap    | app.js                     | Inicialização e orquestração        |

## Padrões de Código

- Cada módulo expõe um objeto namespace (ex: `Tanques.render()`)
- Global shims mantêm compatibilidade com chamadas HTML existentes (ex: `function renderTanques()`)
- `Storage.*` substitui chamadas diretas ao `localStorage`
- `Utils.*` centraliza formatadores e helpers reutilizáveis
- `UI.*` centraliza toast, modais e helpers DOM

## Preparação para o Futuro

- `Storage.exportAll()` / `importAll()` para backup JSON
- Estrutura pronta para IndexedDB (troca apenas storage.js)
- Pronto para PWA (adicionar manifest.json + service worker)
- Pronto para APK via Capacitor/Cordova
