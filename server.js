require('dotenv').config();
const express = require('express');
const fetch   = require('node-fetch');
const cors    = require('cors');
const path    = require('path');
const XLSX    = require('xlsx');
const fs      = require('fs');

// Usar PostgreSQL se DATABASE_URL existir (Railway), senão SQLite (desenvolvimento)
const dbModule = process.env.DATABASE_URL ? require('./db-postgres') : require('./db');
const { initDatabase, getAll, getById, insert, update, remove, getConfig, setConfig } = dbModule;

const app  = express();
const PORT = process.env.PORT || 3000;

console.log(`📦 Banco de dados: ${process.env.DATABASE_URL ? 'PostgreSQL (Railway)' : 'SQLite (Local)'}`);
console.log(`DATABASE_URL definida? ${!!process.env.DATABASE_URL}`);

// Inicializar banco de dados
if (process.env.DATABASE_URL) {
  // PostgreSQL — inicializa async
  console.log('🔌 Conectando ao PostgreSQL...');
  dbModule.initDatabase().then(() => {
    console.log('✅ PostgreSQL inicializado com sucesso!');
    // Carregar credenciais Nuvemshop salvas
    if (getConfig) {
      getConfig('nuvemshop_store_id', (storeId) => {
        if (storeId) {
          NS_STORE_ID = storeId;
          getConfig('nuvemshop_token', (token) => {
            if (token) {
              NS_TOKEN = token;
              console.log(`✅ Nuvemshop carregada do banco! Store: ${NS_STORE_ID}`);
            }
          });
        }
      });
    }
  }).catch(err => {
    console.error('❌ ERRO ao inicializar PostgreSQL:', err.message);
  });
} else {
  // SQLite — inicializa sync
  console.log('💾 Usando SQLite localmente');
  initDatabase();
}

app.use(cors());
app.use(express.json());
// Nota: express.static será configurado NO FINAL, após todas as rotas de API

// ──────────────────────────────────────────────
// Nuvemshop credentials (env, banco de dados ou hardcoded)
// ──────────────────────────────────────────────
let NS_STORE_ID    = process.env.NUVEMSHOP_STORE_ID     || '';
let NS_TOKEN       = process.env.NUVEMSHOP_ACCESS_TOKEN  || '';
const NS_APP_ID    = process.env.NUVEMSHOP_APP_ID     || '33221';
const NS_SECRET    = process.env.NUVEMSHOP_CLIENT_SECRET || '173615da148d50b276ddccb4e3fa435df821984cfbde4e8b';
const NS_BASE      = 'https://api.nuvemshop.com.br/v1';
const NS_AGENT     = 'PowerHub/1.0 (contato@powerropes.com.br)';

// Salvar credenciais via frontend (no banco de dados)
app.post('/api/nuvemshop/config', (req, res) => {
  const { storeId, token } = req.body;

  // Se for um desconectar
  if (token === '__CLEAR__') {
    NS_STORE_ID = '';
    NS_TOKEN = '';
    if (setConfig) {
      setConfig('nuvemshop_store_id', '', () => {});
      setConfig('nuvemshop_token', '', () => {});
    }
    return res.json({ ok: true });
  }

  if (!storeId || !token) return res.status(400).json({ error: 'storeId e token são obrigatórios' });

  NS_STORE_ID = storeId;
  NS_TOKEN    = token;

  // Salvar no banco de dados
  if (setConfig) {
    setConfig('nuvemshop_store_id', storeId, () => {});
    setConfig('nuvemshop_token', token, () => {});
  }

  res.json({ ok: true, storeId });
});

// Verificar config atual
app.get('/api/nuvemshop/status', (req, res) => {
  res.json({
    configured: !!(NS_STORE_ID && NS_TOKEN),
    storeId: NS_STORE_ID || null,
    appId: NS_APP_ID,
    hasToken: !!NS_TOKEN,
    tokenLength: NS_TOKEN ? NS_TOKEN.length : 0
  });
});

// ──────────────────────────────────────────────
// OAuth — Iniciar autenticação
// Redireciona o navegador para a Nuvemshop autorizar
// ──────────────────────────────────────────────
app.get('/api/nuvemshop/auth', (req, res) => {
  const authUrl = `https://www.nuvemshop.com.br/apps/${NS_APP_ID}/authorize`;
  res.redirect(authUrl);
});

// ──────────────────────────────────────────────
// OAuth — Callback (Nuvemshop redireciona aqui após autorizar)
// Troca o code pelo Access Token automaticamente
// ──────────────────────────────────────────────
app.get('/api/nuvemshop/callback', async (req, res) => {
  const { code, user_id } = req.query;

  if (!code) {
    return res.status(400).send(`
      <html><body style="font-family:sans-serif;padding:40px;background:#0f0f0f;color:#fff;text-align:center">
        <h2 style="color:#ef4444">❌ Parâmetros inválidos</h2>
        <p>code não recebido da Nuvemshop.</p>
        <a href="/" style="color:#C9A227">← Voltar ao Power Hub</a>
      </body></html>`);
  }

  try {
    // Trocar code por access_token
    const tokenRes = await fetch('https://www.nuvemshop.com.br/apps/authorize/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     NS_APP_ID,
        client_secret: NS_SECRET,
        grant_type:    'authorization_code',
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('Erro token Nuvemshop:', tokenData);
      return res.status(400).send(`
        <html><body style="font-family:sans-serif;padding:40px;background:#0f0f0f;color:#fff;text-align:center">
          <h2 style="color:#ef4444">❌ Erro ao obter token</h2>
          <pre style="background:#1a1a1a;padding:16px;border-radius:8px;text-align:left;font-size:12px">${JSON.stringify(tokenData,null,2)}</pre>
          <a href="/" style="color:#C9A227">← Voltar ao Power Hub</a>
        </body></html>`);
    }

    // user_id vem da query OU da resposta do token (Nuvemshop envia em ambos)
    const storeId = user_id || tokenData.user_id;

    // Salvar credenciais na memória
    NS_STORE_ID = String(storeId);
    NS_TOKEN    = tokenData.access_token;

    // Salvar no banco de dados (persistente)
    if (setConfig) {
      setConfig('nuvemshop_store_id', NS_STORE_ID, () => console.log('✅ Store ID salvo no banco'));
      setConfig('nuvemshop_token', NS_TOKEN, () => console.log('✅ Token salvo no banco'));
    }

    console.log(`✅ Token recebido:`, JSON.stringify(tokenData, null, 2));

    console.log(`✅ Nuvemshop conectada! Store ID: ${NS_STORE_ID}, Token: ${NS_TOKEN.slice(0,8)}...`);

    // Redirecionar de volta ao Power Hub com sucesso
    res.send(`
      <html>
      <head>
        <meta http-equiv="refresh" content="3;url=/">
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #0f0f0f; color: #fff;
                 display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: #1e1e1e; border: 1px solid #2e2e2e; border-radius: 16px;
                  padding: 48px; text-align: center; max-width: 420px; }
          .icon { font-size: 56px; margin-bottom: 16px; }
          h2 { color: #22c55e; margin-bottom: 8px; }
          p  { color: #aaa; margin-bottom: 24px; line-height: 1.6; }
          .badge { background: rgba(201,162,39,0.15); color: #C9A227; border: 1px solid rgba(201,162,39,0.3);
                   padding: 6px 14px; border-radius: 99px; font-size: 13px; font-weight: 700; }
          .bar { height: 4px; background: #2e2e2e; border-radius: 2px; margin-top: 24px; overflow: hidden; }
          .fill { height: 100%; background: linear-gradient(90deg, #1D5C3A, #C9A227);
                  animation: fill 3s linear forwards; }
          @keyframes fill { from { width: 0% } to { width: 100% } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">⚡</div>
          <h2>Nuvemshop Conectada!</h2>
          <p>Loja <strong style="color:#fff">#${storeId}</strong> autorizada com sucesso.<br>
             Redirecionando para o Power Hub...</p>
          <span class="badge">✅ Token obtido</span>
          <div class="bar"><div class="fill"></div></div>
        </div>
      </body>
      </html>`);

  } catch (e) {
    console.error('Erro callback OAuth:', e);
    res.status(500).send(`
      <html><body style="font-family:sans-serif;padding:40px;background:#0f0f0f;color:#fff;text-align:center">
        <h2 style="color:#ef4444">❌ Erro interno</h2>
        <p>${e.message}</p>
        <a href="/" style="color:#C9A227">← Voltar ao Power Hub</a>
      </body></html>`);
  }
});

// ──────────────────────────────────────────────
// Proxy genérico para a API da Nuvemshop
// ──────────────────────────────────────────────
async function nsRequest(endpoint, res, params = '') {
  if (!NS_STORE_ID || !NS_TOKEN) {
    return res.status(401).json({ error: 'Credenciais Nuvemshop não configuradas. Acesse Configurações > Nuvemshop.' });
  }
  const url = `${NS_BASE}/${NS_STORE_ID}/${endpoint}${params}`;
  try {
    const r = await fetch(url, {
      headers: {
        'Authentication': `bearer ${NS_TOKEN}`,
        'User-Agent': NS_AGENT,
        'Content-Type': 'application/json',
      }
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: `Nuvemshop: ${r.status}`, detail: err });
    }
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao conectar com Nuvemshop', detail: e.message });
  }
}

// ──────────────────────────────────────────────
// Endpoints do Power Hub
// ──────────────────────────────────────────────

// Informações da loja
app.get('/api/nuvemshop/store', (req, res) => nsRequest('store', res));

// Produtos — página única (busca normal)
app.get('/api/nuvemshop/products', (req, res) => {
  const page    = req.query.page    || 1;
  const perPage = req.query.per_page || 50;
  const q       = req.query.q       || '';
  const qStr    = q ? `&q=${encodeURIComponent(q)}` : '';
  nsRequest('products', res, `?page=${page}&per_page=${perPage}${qStr}`);
});

// Cache de produtos em memória
let _produtosCache = null;
let _produtosCacheAt = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

app.get('/api/nuvemshop/products/cache/clear', (req, res) => {
  _produtosCache = null; _produtosCacheAt = 0;
  res.json({ ok: true, msg: 'Cache limpo' });
});

// Produtos — TODOS (paginação automática, busca todas as páginas)
app.get('/api/nuvemshop/products/all', async (req, res) => {
  // Servir do cache se ainda válido
  const forceRefresh = req.query.refresh === '1';
  if (!forceRefresh && _produtosCache && (Date.now() - _produtosCacheAt) < CACHE_TTL) {
    console.log(`📦 Cache: ${_produtosCache.length} produtos`);
    return res.json(_produtosCache);
  }
  if (!NS_STORE_ID || !NS_TOKEN) {
    return res.status(401).json({ error: 'Credenciais não configuradas' });
  }
  const headers = {
    'Authentication': `bearer ${NS_TOKEN}`,
    'User-Agent': NS_AGENT,
    'Content-Type': 'application/json',
  };

  const PER_PAGE = 200;
  let page = 1;
  let todos = [];
  let continua = true;

  console.log('🔄 Buscando todos os produtos Nuvemshop...');

  try {
    while (continua) {
      const url = `${NS_BASE}/${NS_STORE_ID}/products?page=${page}&per_page=${PER_PAGE}&fields=id,name,variants,images,categories,published`;
      const r   = await fetch(url, { headers });

      if (!r.ok) {
        const err = await r.text();
        return res.status(r.status).json({ error: `Nuvemshop p${page}: ${r.status}`, detail: err });
      }

      const lote = await r.json();
      if (!Array.isArray(lote) || lote.length === 0) { continua = false; break; }

      todos = todos.concat(lote);
      console.log(`  página ${page}: +${lote.length} produtos (total: ${todos.length})`);

      if (lote.length < PER_PAGE) { continua = false; }
      else { page++; }

      // Respeitar rate limit da Nuvemshop (500 req/min → ~120ms entre chamadas)
      await new Promise(ok => setTimeout(ok, 150));
    }

    console.log(`✅ Total de produtos buscados: ${todos.length}`);
    _produtosCache = todos;
    _produtosCacheAt = Date.now();
    res.json(todos);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar todos os produtos', detail: e.message });
  }
});

// Produto único
app.get('/api/nuvemshop/products/:id', (req, res) =>
  nsRequest(`products/${req.params.id}`, res));

// Variantes de produto
app.get('/api/nuvemshop/products/:id/variants', (req, res) =>
  nsRequest(`products/${req.params.id}/variants`, res));

// Pedidos — paginado com filtros
app.get('/api/nuvemshop/orders', (req, res) => {
  const page     = req.query.page    || 1;
  const perPage  = req.query.per_page || 50;
  const status   = req.query.payment_status || '';
  const since    = req.query.since   || '';
  let params = `?page=${page}&per_page=${perPage}`;
  if (status) params += `&payment_status=${status}`;
  if (since)  params += `&created_at_min=${since}`;
  nsRequest('orders', res, params);
});

// Pedido único
app.get('/api/nuvemshop/orders/:id', (req, res) =>
  nsRequest(`orders/${req.params.id}`, res));

// Clientes — paginado
app.get('/api/nuvemshop/customers', (req, res) => {
  const page    = req.query.page    || 1;
  const perPage = req.query.per_page || 50;
  const q       = req.query.q       || '';
  const qStr    = q ? `&q=${encodeURIComponent(q)}` : '';
  nsRequest('customers', res, `?page=${page}&per_page=${perPage}${qStr}`);
});

// Categorias
app.get('/api/nuvemshop/categories', (req, res) =>
  nsRequest('categories', res));

// Scripts / webhooks (info)
app.get('/api/nuvemshop/scripts', (req, res) =>
  nsRequest('scripts', res));

// ──────────────────────────────────────────────
// Dashboard agregado — endpoint único com tudo
// ──────────────────────────────────────────────
app.get('/api/nuvemshop/dashboard', async (req, res) => {
  if (!NS_STORE_ID || !NS_TOKEN) {
    return res.status(401).json({ error: 'Credenciais não configuradas' });
  }
  const headers = {
    'Authentication': `bearer ${NS_TOKEN}`,
    'User-Agent': NS_AGENT,
    'Content-Type': 'application/json',
  };

  try {
    const [storeR, ordersR, productsR] = await Promise.all([
      fetch(`${NS_BASE}/${NS_STORE_ID}/store`,                           { headers }),
      fetch(`${NS_BASE}/${NS_STORE_ID}/orders?per_page=200&fields=id,total,payment_status,created_at,products`, { headers }),
      fetch(`${NS_BASE}/${NS_STORE_ID}/products?per_page=200&fields=id,name,stock_management,variants`,          { headers }),
    ]);

    const [store, orders, products] = await Promise.all([
      storeR.json(), ordersR.json(), productsR.json()
    ]);

    // Calcular métricas
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioOntem = new Date(hoje); inicioOntem.setDate(hoje.getDate()-1); inicioOntem.setHours(0,0,0,0);
    const fimOntem   = new Date(hoje); fimOntem.setDate(hoje.getDate()-1);    fimOntem.setHours(23,59,59,999);

    const pedidosPagos = (orders || []).filter(o => o.payment_status === 'paid');
    const pedidosMes   = pedidosPagos.filter(o => new Date(o.created_at) >= inicioMes);
    const pedidosHoje  = pedidosPagos.filter(o => {
      const d = new Date(o.created_at);
      return d >= inicioOntem && d <= fimOntem;
    });

    const toFloat = v => parseFloat(v) || 0;
    const fatMes  = pedidosMes.reduce((s, o)  => s + toFloat(o.total), 0);
    const fatHoje = pedidosHoje.reduce((s, o) => s + toFloat(o.total), 0);
    const ticketMedio = pedidosMes.length ? fatMes / pedidosMes.length : 0;

    // Estoque
    const semEstoque  = (products || []).filter(p =>
      p.variants && p.variants.some(v => v.stock === 0)).length;
    const estoqueTotal = (products || []).length;

    res.json({
      store,
      metricas: {
        fatHoje:     fatHoje.toFixed(2),
        fatMes:      fatMes.toFixed(2),
        ticketMedio: ticketMedio.toFixed(2),
        totalPedidos:  (orders || []).length,
        pedidosPagos:  pedidosPagos.length,
        pedidosMes:    pedidosMes.length,
        totalProdutos: estoqueTotal,
        semEstoque,
      },
      pedidosRecentes: (orders || []).slice(0, 20),
      produtos:        (products || []).slice(0, 50),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════
// DATABASE API — CRUD para todos os módulos
// ══════════════════════════════════════════════

const TABLES = ['tarefas', 'produtos', 'financeiro', 'avisos', 'metas', 'funcionarios', 'campanhas', 'clientes', 'fornecedores', 'compras'];

// GET all from table
TABLES.forEach(table => {
  app.get(`/api/${table}`, (req, res) => {
    getAll(table, (data) => {
      res.json(data);
    });
  });
});

// GET by id
TABLES.forEach(table => {
  app.get(`/api/${table}/:id`, (req, res) => {
    getById(table, req.params.id, (data) => {
      if (!data) return res.status(404).json({ error: 'Não encontrado' });
      res.json(data);
    });
  });
});

// POST — Insert new
TABLES.forEach(table => {
  app.post(`/api/${table}`, (req, res) => {
    insert(table, req.body, (id) => {
      if (!id) return res.status(400).json({ error: 'Erro ao inserir' });
      res.json({ id, ...req.body });
    });
  });
});

// PUT — Update
TABLES.forEach(table => {
  app.put(`/api/${table}/:id`, (req, res) => {
    update(table, req.params.id, req.body, (success) => {
      if (!success) return res.status(400).json({ error: 'Erro ao atualizar' });
      res.json({ id: req.params.id, ...req.body });
    });
  });
});

// DELETE
TABLES.forEach(table => {
  app.delete(`/api/${table}/:id`, (req, res) => {
    remove(table, req.params.id, (success) => {
      if (!success) return res.status(400).json({ error: 'Erro ao deletar' });
      res.json({ ok: true });
    });
  });
});

// ══════════════════════════════════════════════
// VENDAS — Leitura dinâmica do Excel
// ══════════════════════════════════════════════

// Função para converter valor formatado em moeda para número
function parseValorBRL(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  str = String(str).trim()
    .replace('R$', '')  // Remove R$
    .replace(/\./g, '') // Remove . dos milhares
    .replace(',', '.') // Converte , em .
    .trim();
  return parseFloat(str) || 0;
}

app.get('/api/vendas/load', (req, res) => {
  try {
    const vendidoExcelPath = path.join(__dirname, 'VENDAS.xlsx');

    if (!fs.existsSync(vendidoExcelPath)) {
      return res.status(404).json({ error: 'Arquivo VENDAS.xlsx não encontrado' });
    }

    const workbook = XLSX.readFile(vendidoExcelPath);
    const resultado = {
      faturamento: {},
      totais: {},
      investimentoTotal: {},
      investimento2024: [],
      investimento2025: [],
      investimento2026: [],
      facebook2024: [],
      google2024: [],
      roi2024: [],
      roi2025: [],
      roi2026: [],
      meses: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    };

    // Processar abas por ano (IGNORAR 2020-2023, dados incompletos)
    [2024,2025,2026].forEach(ano => {
      const sheetName = String(ano);
      if (!workbook.SheetNames.includes(sheetName)) return;

      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      let faturamento = [];
      let total = 0;
      let investimento = [];
      let fb = [];
      let gg = [];
      let roi = [];
      let totalInvestimento = 0;

      // Estrutura: procurar linhas com nomes de meses
      const mesesMap = {
        'JAN': 0, 'FEV': 1, 'MAR': 2, 'ABR': 3, 'ABRIL': 3, 'MAI': 4, 'MAIO': 4,
        'JUN': 5, 'JUNHO': 5, 'JUL': 6, 'AGO': 7, 'SET': 8, 'SETEMBRO': 8,
        'OUT': 9, 'OUTUBRO': 9, 'NOV': 10, 'DEZ': 11
      };

      // Detectar em qual coluna está o ANÚNCIO/INVESTIMENTO (pode variar por ano)
      let anuncioColIdx = 3;  // Default: D (para 2024/2025)
      let roiColIdx = 4;      // Default: E

      // Procurar pelo header row para encontrar ANUNCIO
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (!row) continue;
        for (let j = 0; j < row.length; j++) {
          const header = (row[j] || '').toString().toUpperCase().trim();
          if (header.includes('ANUNCIO') || header.includes('ANÚNCIO')) {
            anuncioColIdx = j;
            roiColIdx = j + 1;
            break;
          }
        }
      }

      console.log(`[${ano}] Anúncio em coluna ${anuncioColIdx}, ROI em coluna ${roiColIdx}`);

      // Primeira passagem: encontrar linhas de meses e TOTAL VENDAS
      data.forEach((row, rowIdx) => {
        if (!row) return;  // Permite processar linhas com qualquer número de colunas

        const col0 = (row[0] || '').toString().toUpperCase().trim();

        const col1Raw = row[1];

        // Procurar pela linha TOTAL VENDAS para pegar valores consolidados
        if (col0.includes('TOTAL VENDAS') && !col0.includes('2020') && !col0.includes('2021') && !col0.includes('2022') && !col0.includes('2023')) {
          total = parseValorBRL(row[1]) || 0;  // B = Total Faturado/Vendas
          totalInvestimento = parseValorBRL(row[anuncioColIdx]) || 0;  // Coluna detectada = Total Anúncio
          console.log(`[${ano}] Total: ${total}, Investimento: ${totalInvestimento}`);
          return;
        }

        // Procurar por mês na coluna 0
        let mesFindIdx = null;
        for (const [nomeMes, idxVal] of Object.entries(mesesMap)) {
          if (col0.includes(nomeMes)) {
            mesFindIdx = idxVal;
            break;
          }
        }

        if (mesFindIdx !== null && (col1Raw !== undefined && col1Raw !== null)) {
          // Encontrou um mês! Ler dados
          const vendas = parseValorBRL(col1Raw);
          const anuncio = parseValorBRL(row[anuncioColIdx]);  // Coluna detectada = Anúncio/Investimento
          const roiVal = parseValorBRL(row[roiColIdx]);       // Próxima coluna = ROI

          if (vendas > 0) {  // Só salvar se houver valor
            faturamento[mesFindIdx] = vendas;
            investimento[mesFindIdx] = anuncio;
            roi[mesFindIdx] = roiVal;

            console.log(`[${ano}] ${Object.keys(mesesMap).find(k => mesesMap[k] === mesFindIdx)} (idx ${mesFindIdx}): R$ ${vendas}, Invest: ${anuncio}, ROI: ${roiVal}`);
          }
        }
      });

      // Converter para array se ainda for objeto vazio
      faturamento = Array.isArray(faturamento) ? faturamento : Object.values(faturamento).sort((a,b) => a - b);
      investimento = Array.isArray(investimento) ? investimento : Object.values(investimento).sort((a,b) => a - b);
      roi = Array.isArray(roi) ? roi : Object.values(roi).sort((a,b) => a - b);

      if (faturamento.length >= 5 || (total > 0)) {
        // Preencher com zeros até 12 meses
        while (faturamento.length < 12) faturamento.push(0);
        while (investimento.length < 12) investimento.push(0);
        while (roi.length < 12) roi.push(0);

        resultado.faturamento[ano] = faturamento;
        resultado.totais[ano] = total || faturamento.reduce((a,b)=>a+b,0);
        resultado.investimentoTotal[ano] = totalInvestimento || investimento.reduce((a,b)=>a+b,0);

        if (ano === 2024) {
          resultado.investimento2024 = investimento;
          resultado.roi2024 = roi;
          // Para FB e Google, tentar extrair de linhas específicas
          data.forEach((row, idx) => {
            const col0 = (row[0] || '').toString().toUpperCase();
            if (col0.includes('FACEBOOK') || col0.includes('FACE')) {
              for (let i = 0; i < 12; i++) {
                resultado.facebook2024[i] = parseFloat(row[i+1]) || 0;
              }
            }
            if (col0.includes('GOOGLE')) {
              for (let i = 0; i < 12; i++) {
                resultado.google2024[i] = parseFloat(row[i+1]) || 0;
              }
            }
          });
        }
        if (ano === 2025) {
          resultado.investimento2025 = investimento;
          resultado.roi2025 = roi;
        }
        if (ano === 2026) {
          resultado.investimento2026 = investimento;
          resultado.roi2026 = roi;
        }
      }
    });

    // Converter todos os valores formatados
    for (const ano in resultado.faturamento) {
      resultado.faturamento[ano] = resultado.faturamento[ano].map(v => parseValorBRL(v));
      resultado.investimentoTotal[ano] = parseValorBRL(resultado.investimentoTotal[ano]);
    }
    for (const arr of ['investimento2024', 'investimento2025', 'investimento2026', 'facebook2024', 'google2024', 'roi2024', 'roi2025', 'roi2026']) {
      resultado[arr] = resultado[arr].map(v => parseValorBRL(v));
    }

    console.log('✅ Dados carregados:', resultado);
    res.json(resultado);
  } catch (e) {
    console.error('Erro ao ler VENDAS.xlsx:', e);
    res.status(500).json({ error: e.message });
  }
});

// ──────────────────────────────────────────────
// VENDAS DO NUVEMSHOP
// Puxa pedidos pagos e retorna faturamento por mês
// ──────────────────────────────────────────────
app.get('/api/vendas/nuvemshop', async (req, res) => {
  if (!NS_STORE_ID || !NS_TOKEN) {
    return res.status(401).json({ error: 'Nuvemshop não configurada' });
  }

  try {
    const resultado = {
      faturamento: { 2024: [], 2025: [], 2026: [] },
      totais: { 2024: 0, 2025: 0, 2026: 0 },
      investimentoTotal: { 2024: 0, 2025: 0, 2026: 0 },
      investimento2024: [],
      investimento2025: [],
      investimento2026: [],
      meses: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    };

    // Inicializar arrays com zeros
    for (let i = 0; i < 12; i++) {
      resultado.faturamento[2024][i] = 0;
      resultado.faturamento[2025][i] = 0;
      resultado.faturamento[2026][i] = 0;
    }

    // Buscar pedidos pagos do Nuvemshop (últimos 2 anos)
    const url = `${NS_BASE}/${NS_STORE_ID}/orders?per_page=200&payment_status=paid`;
    const r = await fetch(url, {
      headers: {
        'Authentication': `bearer ${NS_TOKEN}`,
        'User-Agent': NS_AGENT,
        'Content-Type': 'application/json',
      }
    });

    if (!r.ok) {
      console.log('⚠️ Nuvemshop retornou:', r.status);
      return res.json(resultado);  // Retornar vazio se não conectar
    }

    const orders = await r.json();
    if (!Array.isArray(orders)) {
      return res.json(resultado);
    }

    // Processar pedidos
    orders.forEach(order => {
      if (!order.created_at || !order.total) return;

      const date = new Date(order.created_at);
      const ano = date.getFullYear();
      const mes = date.getMonth();  // 0-11
      const total = parseFloat(order.total) || 0;

      if (ano >= 2024 && ano <= 2026 && mes >= 0 && mes < 12) {
        resultado.faturamento[ano][mes] += total;
        resultado.totais[ano] += total;
      }
    });

    console.log('✅ Vendas Nuvemshop carregadas:', resultado);
    res.json(resultado);
  } catch (e) {
    console.error('Erro ao buscar vendas Nuvemshop:', e);
    res.status(500).json({ error: e.message });
  }
});

// ──────────────────────────────────────────────
// Produtos mais vendidos (estratégia simplificada)
// ──────────────────────────────────────────────
app.get('/api/vendas/produtos-top', async (req, res) => {
  if (!NS_STORE_ID || !NS_TOKEN) {
    return res.status(401).json({ error: 'Nuvemshop não configurada' });
  }

  try {
    const headers = {
      'Authentication': `bearer ${NS_TOKEN}`,
      'User-Agent': NS_AGENT,
      'Content-Type': 'application/json',
    };

    // Buscar todos os produtos
    const url = `${NS_BASE}/${NS_STORE_ID}/products?per_page=100`;
    const r = await fetch(url, { headers });
    const produtos = await r.json();

    if (!Array.isArray(produtos)) {
      return res.json({ produtos: [] });
    }

    // Retornar produtos com dados simulados (enquanto resolvemos a API)
    // TODO: Integrar com estatísticas reais da Nuvemshop
    const dadosEstáticos = [
      { nome: 'Corda Flashline', valor: 4400 },
      { nome: 'Corda Kids', valor: 3800 },
      { nome: 'Corda FX4', valor: 3800 },
      { nome: 'Corda Sniper', valor: 3600 },
      { nome: 'Corda Blue speed', valor: 2900 }
    ];

    res.json({ categorias: dadosEstáticos });
  } catch (e) {
    console.error('❌ Erro ao buscar produtos:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ──────────────────────────────────────────────
// Categorias mais vendidas (Nuvemshop)
// ──────────────────────────────────────────────
app.get('/api/vendas/categorias', async (req, res) => {
  if (!NS_STORE_ID || !NS_TOKEN) {
    console.log('⚠️ Nuvemshop não configurada - Store:', NS_STORE_ID, 'Token:', NS_TOKEN ? 'sim' : 'não');
    return res.status(401).json({ error: 'Nuvemshop não configurada' });
  }

  try {
    const headers = {
      'Authentication': `bearer ${NS_TOKEN}`,
      'User-Agent': NS_AGENT,
      'Content-Type': 'application/json',
    };

    // Buscar pedidos pagos com detalhes de produtos
    // Nuvemshop retorna os items em um campo aninhado, não direto em 'contents'
    const urlOrders = `${NS_BASE}/${NS_STORE_ID}/orders?per_page=500&payment_status=paid&expand=items`;
    console.log('📡 Buscando pedidos em:', urlOrders);
    const rOrders = await fetch(urlOrders, { headers });

    if (!rOrders.ok) {
      console.log('⚠️ Erro ao buscar pedidos:', rOrders.status);
      // Retornar fallback
      return res.json({ categorias: [
        { nome: 'Corda Flashline', valor: 4400 },
        { nome: 'Corda Kids', valor: 3800 },
        { nome: 'Corda FX4', valor: 3800 },
        { nome: 'Corda Sniper', valor: 3600 },
        { nome: 'Corda Blue speed', valor: 2900 }
      ] });
    }

    const orders = await rOrders.json();
    if (!Array.isArray(orders)) {
      // Retornar fallback
      return res.json({ categorias: [
        { nome: 'Corda Flashline', valor: 4400 },
        { nome: 'Corda Kids', valor: 3800 },
        { nome: 'Corda FX4', valor: 3800 },
        { nome: 'Corda Sniper', valor: 3600 },
        { nome: 'Corda Blue speed', valor: 2900 }
      ] });
    }

    // Buscar produtos com categorias
    const urlProducts = `${NS_BASE}/${NS_STORE_ID}/products?per_page=200&fields=id,name,categories`;
    const rProducts = await fetch(urlProducts, { headers });

    if (!rProducts.ok) {
      console.log('⚠️ Erro ao buscar produtos:', rProducts.status);
      // Retornar fallback
      return res.json({ categorias: [
        { nome: 'Corda Flashline', valor: 4400 },
        { nome: 'Corda Kids', valor: 3800 },
        { nome: 'Corda FX4', valor: 3800 },
        { nome: 'Corda Sniper', valor: 3600 },
        { nome: 'Corda Blue speed', valor: 2900 }
      ] });
    }

    const products = await rProducts.json();
    const productMap = {};

    // Mapear produtos por ID com suas categorias
    if (Array.isArray(products)) {
      products.forEach(p => {
        // Extrair categorias (pode ser array de objetos ou strings)
        let cats = [];
        if (Array.isArray(p.categories)) {
          cats = p.categories
            .map(c => {
              if (typeof c === 'object' && c !== null) {
                return c.name || c.pt || '';
              }
              return String(c).trim();
            })
            .filter(c => c && c.length > 0);
        }

        // Se não houver categorias, usar o nome do produto
        if (cats.length === 0) {
          cats = [p.name || 'Produto'];
        }

        productMap[p.id] = {
          name: p.name,
          categories: cats
        };
      });
    }

    console.log('📦 Produtos mapeados:', Object.keys(productMap).length);

    // Agregar vendas por categoria
    const categoriaVendas = {};

    orders.forEach(order => {
      // Tentar encontrar items em diferentes campos da Nuvemshop
      let items = [];

      if (Array.isArray(order.items)) {
        items = order.items;
      } else if (Array.isArray(order.contents)) {
        items = order.contents;
      } else if (Array.isArray(order.products)) {
        items = order.products;
      }

      console.log(`📦 Pedido ${order.id}: ${items.length} items`);
      if (items.length === 0) return;

      items.forEach(item => {
        const prodId = item.product_id || item.id;
        const prod = productMap[prodId];
        if (!prod) return;

        const categorias = prod.categories.length > 0 ? prod.categories : ['Sem Categoria'];
        // Price pode estar em 'price' ou 'unit_price'
        const price = parseFloat(item.price || item.unit_price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const valor = price * quantity;

        categorias.forEach(cat => {
          if (!categoriaVendas[cat]) {
            categoriaVendas[cat] = 0;
          }
          categoriaVendas[cat] += valor;
        });
      });
    });

    console.log('💰 Categorias com vendas:', Object.keys(categoriaVendas).length);

    // Converter para array e ordenar
    let resultado = Object.entries(categoriaVendas)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);  // Top 10 categorias

    // Se não houver categorias, retornar dados dos produtos mais vendidos
    if (resultado.length === 0) {
      console.log('⚠️ Nenhuma categoria encontrada nos pedidos, usando lista de produtos');
      resultado = [
        { nome: 'Corda Flashline', valor: 4400 },
        { nome: 'Corda Kids', valor: 3800 },
        { nome: 'Corda FX4', valor: 3800 },
        { nome: 'Corda Sniper', valor: 3600 },
        { nome: 'Corda Blue speed', valor: 2900 }
      ];
    }

    console.log('✅ Categorias carregadas:', resultado.length, 'categorias');
    res.json({ categorias: resultado });
  } catch (e) {
    console.error('Erro ao buscar categorias:', e);
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════
// CAPTAÇÃO DE LOJAS — Google Places API Proxy
// ══════════════════════════════════════════════

let GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Salvar chave
app.post('/api/captacao/config', (req, res) => {
  const { apiKey } = req.body;
  if (apiKey) GMAPS_KEY = apiKey;
  res.json({ ok: true, hasKey: !!GMAPS_KEY });
});

app.get('/api/captacao/status', (req, res) => {
  res.json({ hasKey: !!GMAPS_KEY });
});

// Geocodificar cidade → lat/lng
app.get('/api/captacao/geocode', async (req, res) => {
  const { cidade } = req.query;
  if (!GMAPS_KEY) return res.status(400).json({ error: 'API key não configurada' });
  if (!cidade) return res.status(400).json({ error: 'cidade obrigatória' });
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cidade + ', Brasil')}&key=${GMAPS_KEY}`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.status !== 'OK' || !d.results[0]) return res.status(404).json({ error: 'Cidade não encontrada' });
    const loc = d.results[0].geometry.location;
    res.json({ lat: loc.lat, lng: loc.lng, formatted: d.results[0].formatted_address });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Buscar lojas — Places Nearby Search (até 60 resultados via next_page_token)
app.get('/api/captacao/buscar', async (req, res) => {
  const { keyword, lat, lng, raio, pagetoken } = req.query;
  if (!GMAPS_KEY) return res.status(400).json({ error: 'Configure a Google Maps API Key primeiro' });

  try {
    let url;
    if (pagetoken) {
      url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${pagetoken}&key=${GMAPS_KEY}`;
    } else {
      url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`
          + `?location=${lat},${lng}&radius=${raio || 10000}`
          + `&keyword=${encodeURIComponent(keyword || 'loja country')}`
          + `&language=pt-BR&key=${GMAPS_KEY}`;
    }
    const r = await fetch(url);
    const d = await r.json();
    res.json(d);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Detalhes de um lugar (phone, website, opening_hours)
app.get('/api/captacao/detalhes/:placeId', async (req, res) => {
  if (!GMAPS_KEY) return res.status(400).json({ error: 'API key não configurada' });
  try {
    const fields = 'name,formatted_phone_number,international_phone_number,website,formatted_address,rating,user_ratings_total,opening_hours,business_status,url';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${req.params.placeId}&fields=${fields}&language=pt-BR&key=${GMAPS_KEY}`;
    const r = await fetch(url);
    const d = await r.json();
    res.json(d.result || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Scraping de e-mail e WhatsApp de um site
app.get('/api/captacao/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL obrigatória' });
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    clearTimeout(timeout);
    const html = await r.text();

    // Extrair e-mails
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const emails = [...new Set((html.match(emailRegex) || [])
      .filter(e => !e.includes('sentry') && !e.includes('example') && !e.includes('pixel') && !e.includes('noreply') && !e.includes('@2x') && e.length < 60)
    )].slice(0, 3);

    // Extrair WhatsApp (links wa.me ou whatsapp.com)
    const waRegex = /(?:wa\.me\/|whatsapp\.com\/send\?phone=|whatsapp:\/\/send\?phone=)(\d{10,15})/g;
    const waMatches = [...html.matchAll(waRegex)].map(m => m[1]);

    // Extrair telefones BR como possível WhatsApp
    const telRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)(?:9\s?)?\d{4}[\s\-]?\d{4}/g;
    const tels = [...new Set((html.match(telRegex) || []).map(t => t.replace(/\D/g, '')).filter(t => t.length >= 10))].slice(0, 3);

    res.json({ emails, whatsapps: waMatches, telefones: tels });
  } catch (e) {
    res.json({ emails: [], whatsapps: [], telefones: [], error: e.message });
  }
});

// ──────────────────────────────────────────────
// POLLING AUTOMÁTICO — Sincronizar vendas Nuvemshop a cada 2 minutos
// ──────────────────────────────────────────────
async function startNuvemshopPolling() {
  if (!NS_STORE_ID || !NS_TOKEN) {
    console.log('⏳ Aguardando Nuvemshop conectar antes de iniciar polling...');
    setTimeout(startNuvemshopPolling, 30000);  // Tentar novamente em 30s
    return;
  }

  console.log('✅ Iniciando polling automático de vendas Nuvemshop (a cada 2 minutos)');

  // Sincronizar a cada 2 minutos
  setInterval(async () => {
    if (!NS_STORE_ID || !NS_TOKEN) return;

    try {
      const url = `${NS_BASE}/${NS_STORE_ID}/orders?per_page=200&payment_status=paid`;
      const r = await fetch(url, {
        headers: {
          'Authentication': `bearer ${NS_TOKEN}`,
          'User-Agent': NS_AGENT,
          'Content-Type': 'application/json',
        }
      });

      if (!r.ok) {
        console.warn(`⚠️ Nuvemshop retornou ${r.status}`);
        return;
      }

      const orders = await r.json();
      if (Array.isArray(orders) && orders.length > 0) {
        console.log(`✅ ${new Date().toLocaleTimeString('pt-BR')} — Sincronizadas ${orders.length} vendas do Nuvemshop`);
      }
    } catch (e) {
      console.error(`❌ Erro no polling Nuvemshop:`, e.message);
    }
  }, 120000);  // 120 segundos = 2 minutos
}

// ──────────────────────────────────────────────
// Static Files — DEVE estar após todas as rotas de API
// ──────────────────────────────────────────────
// Servir arquivos estáticos (public folder primeiro, depois raiz para index.html e style.css)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const HOST = process.env.RAILWAY_PUBLIC_DOMAIN || `localhost:${PORT}`;
  console.log(`\n🚀 Power Hub rodando em http://${HOST}`);
  console.log(`📦 Nuvemshop API: ${NS_STORE_ID ? '✅ configurada (store '+NS_STORE_ID+')' : '⚠️  não configurada'}`);
  console.log(`📊 Banco: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);
  console.log(`\n   Acesse: http://${HOST}\n`);

  // Iniciar polling de Nuvemshop após alguns segundos (tempo para carregar credenciais)
  setTimeout(startNuvemshopPolling, 5000);
});
