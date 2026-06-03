/* ============================
   POWER HUB — Integração Nuvemshop
   Power Ropes
   ============================ */

const NS = {
  base: '/api/nuvemshop',
  connected: false,
  storeData: null,
  syncInterval: null,
};

// ============================
// API HELPER
// ============================
async function nsGet(endpoint) {
  const r = await fetch(NS.base + endpoint);
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(err.error || r.statusText);
  }
  return r.json();
}

async function nsPost(endpoint, body) {
  const r = await fetch(NS.base + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(err.error || r.statusText);
  }
  return r.json();
}

// ============================
// RENDER MÓDULO
// ============================
function renderNuvemshop() {
  checkNSStatus();
}

async function checkNSStatus() {
  try {
    const status = await nsGet('/status');
    NS.connected = status.configured;

    // Atualizar chip de status no header
    const chip = document.getElementById('nsStatusChip');
    if (chip) {
      if (status.configured) {
        chip.className = 'ns-status-chip online';
        chip.innerHTML = '<i class="fas fa-circle"></i> Conectada — Loja #' + status.storeId;
      } else {
        chip.className = 'ns-status-chip offline';
        chip.innerHTML = '<i class="fas fa-circle"></i> Desconectada';
      }
    }

    renderNSPanel(status);
  } catch (e) {
    renderNSPanel({ configured: false, error: 'Servidor não iniciado. Execute: node server.js' });
  }
}

function renderNSPanel(status) {
  const div = document.getElementById('nuvemshopContent');
  if (!div) return;

  if (!status.configured) {
    div.innerHTML = `
      <div class="ns-setup-card">
        <div class="ns-setup-icon"><i class="fas fa-plug"></i></div>
        <h3>Conectar Nuvemshop</h3>
        <p class="text-muted" style="margin-bottom:24px;line-height:1.6">
          Insira as credenciais da sua loja Nuvemshop para sincronizar produtos, pedidos e clientes automaticamente.
        </p>

        <div class="ns-how-to">
          <h4><i class="fas fa-info-circle"></i> Como obter as credenciais</h4>
          <ol>
            <li>Acesse <strong>Painel Nuvemshop → Configurações → APIs</strong></li>
            <li>Clique em <strong>"Criar aplicativo"</strong> ou use as credenciais existentes</li>
            <li>Copie o <strong>ID da Loja</strong> e o <strong>Token de Acesso</strong></li>
            <li>Cole abaixo e clique em <strong>Conectar</strong></li>
          </ol>
        </div>

        <div class="ns-form">
          <div class="field-group">
            <label><i class="fas fa-store"></i> ID da Loja (Store ID)</label>
            <input type="text" id="nsStoreId" placeholder="Ex: 123456" class="ns-input">
          </div>
          <div class="field-group">
            <label><i class="fas fa-key"></i> Token de Acesso</label>
            <div style="position:relative">
              <input type="password" id="nsToken" placeholder="Cole seu access token aqui" class="ns-input">
              <button onclick="toggleNSToken()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-3);cursor:pointer">
                <i class="fas fa-eye" id="nsTokenEye"></i>
              </button>
            </div>
          </div>
          <button class="btn-primary" onclick="connectNuvemshop()" style="width:100%;justify-content:center;padding:14px;margin-bottom:10px">
            <i class="fas fa-key"></i> Conectar com Token Manual
          </button>

          <div style="display:flex;align-items:center;gap:10px;margin:4px 0 10px">
            <div style="flex:1;height:1px;background:var(--border)"></div>
            <span style="font-size:12px;color:var(--text-3)">ou</span>
            <div style="flex:1;height:1px;background:var(--border)"></div>
          </div>

          <a href="/api/nuvemshop/auth" class="btn-primary"
             style="width:100%;justify-content:center;padding:14px;text-decoration:none;display:flex;gap:8px;
                    background:linear-gradient(135deg,#6a3fd4,#9333ea);box-shadow:0 4px 16px rgba(106,63,212,0.35)">
            <i class="fas fa-bolt"></i> Login automático via Nuvemshop (OAuth)
          </a>
          <p style="font-size:11px;color:var(--text-3);margin-top:8px;text-align:center">
            Recomendado — abre a Nuvemshop e conecta em 1 clique
          </p>
        </div>

        ${status.error ? `<div class="ns-error-box"><i class="fas fa-exclamation-triangle"></i> ${status.error}</div>` : ''}
      </div>`;
    return;
  }

  // Conectado — mostrar painel completo
  div.innerHTML = `
    <div class="ns-connected-header">
      <div class="ns-status-badge">
        <span class="ns-dot"></span>
        <span>Nuvemshop Conectada</span>
        <span class="text-muted" style="font-size:11px">Loja #${status.storeId}</span>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-primary btn-sm" onclick="syncNuvemshop()"><i class="fas fa-sync"></i> Sincronizar</button>
        <button class="btn-outline btn-sm" onclick="disconnectNS()"><i class="fas fa-unlink"></i> Desconectar</button>
      </div>
    </div>

    <div id="nsKPIs" class="kpi-grid kpi-4" style="margin-bottom:20px">
      <div class="kpi-card green"><div class="kpi-icon"><i class="fas fa-spinner fa-spin"></i></div>
        <div class="kpi-info"><span class="kpi-label">Carregando...</span><span class="kpi-value">—</span></div></div>
    </div>

    <div class="tabs-bar">
      <button class="tab active" onclick="switchTab('ns','produtos',this)">Produtos</button>
      <button class="tab" onclick="switchTab('ns','pedidos',this)">Pedidos Recentes</button>
      <button class="tab" onclick="switchTab('ns','clientes',this)">Clientes</button>
      <button class="tab" onclick="switchTab('ns','categorias',this)">Categorias</button>
      <button class="tab" onclick="switchTab('ns','estoque',this)">Estoque</button>
    </div>

    <div id="ns-produtos" class="tab-content active">
      <div class="table-card">
        <div class="table-actions">
          <input type="text" placeholder="Buscar produto na Nuvemshop..." class="search-input" id="nsProdSearch"
            onkeydown="if(event.key==='Enter')searchNSProducts()">
          <button class="btn-primary btn-sm" onclick="searchNSProducts()"><i class="fas fa-search"></i> Buscar</button>
          <button class="btn-outline btn-sm" onclick="loadNSProducts()"><i class="fas fa-sync"></i> Recarregar</button>
        </div>
        <div id="nsProdStatus" class="ns-loading"><i class="fas fa-spinner fa-spin"></i> Carregando produtos...</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Produto</th><th>SKU</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody id="tbodyNSProdutos"></tbody>
          </table>
        </div>
        <div id="nsProdPag" class="ns-pagination"></div>
      </div>
    </div>

    <div id="ns-pedidos" class="tab-content">
      <div class="table-card">
        <div class="table-actions">
          <select class="select-sm" id="nsPedFilter" onchange="loadNSOrders()">
            <option value="">Todos os pagamentos</option>
            <option value="paid">Pagos</option>
            <option value="pending">Pendentes</option>
            <option value="authorized">Autorizados</option>
            <option value="refunded">Reembolsados</option>
          </select>
          <button class="btn-outline btn-sm" onclick="loadNSOrders()"><i class="fas fa-sync"></i> Atualizar</button>
        </div>
        <div id="nsPedStatus" class="ns-loading"><i class="fas fa-spinner fa-spin"></i> Carregando pedidos...</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Nº Pedido</th><th>Cliente</th><th>Data</th><th>Produtos</th><th>Total</th><th>Pagamento</th><th>Envio</th></tr></thead>
            <tbody id="tbodyNSPedidos"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="ns-clientes" class="tab-content">
      <div class="table-card">
        <div class="table-actions">
          <input type="text" placeholder="Buscar cliente..." class="search-input" id="nsCliSearch"
            onkeydown="if(event.key==='Enter')searchNSCustomers()">
          <button class="btn-primary btn-sm" onclick="searchNSCustomers()"><i class="fas fa-search"></i> Buscar</button>
        </div>
        <div id="nsCliStatus" class="ns-loading"><i class="fas fa-spinner fa-spin"></i> Carregando clientes...</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Cidade</th><th>Pedidos</th><th>Total Gasto</th></tr></thead>
            <tbody id="tbodyNSClientes"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="ns-categorias" class="tab-content">
      <div id="nsCatStatus" class="ns-loading"><i class="fas fa-spinner fa-spin"></i> Carregando categorias...</div>
      <div id="nsCatGrid" class="ns-cat-grid"></div>
    </div>

    <div id="ns-estoque" class="tab-content">
      <div id="nsEstStatus" class="ns-loading"><i class="fas fa-spinner fa-spin"></i> Carregando estoque...</div>
      <div id="nsEstAlerts" style="margin-bottom:16px"></div>
      <div class="table-card">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Produto</th><th>Variante</th><th>SKU</th><th>Estoque</th><th>Status</th></tr></thead>
            <tbody id="tbodyNSEstoque"></tbody>
          </table>
        </div>
      </div>
    </div>`;

  // Carregar dados
  loadNSDashboard();
}

// ============================
// CONECTAR
// ============================
async function connectNuvemshop() {
  const storeId = document.getElementById('nsStoreId')?.value?.trim();
  const token   = document.getElementById('nsToken')?.value?.trim();
  if (!storeId || !token) return showToast('Preencha o ID da loja e o token', 'error');

  const btn = document.querySelector('[onclick="connectNuvemshop()"]');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...'; btn.disabled = true; }

  try {
    const r = await nsPost('/config', { storeId, token });
    if (r.ok) {
      NS.connected = true;
      showToast('Nuvemshop conectada com sucesso!', 'success');
      renderNSPanel({ configured: true, storeId });
    }
  } catch (e) {
    showToast('Erro ao conectar: ' + e.message, 'error');
    if (btn) { btn.innerHTML = '<i class="fas fa-plug"></i> Conectar com Nuvemshop'; btn.disabled = false; }
  }
}

function disconnectNS() {
  NS.connected = false;
  NS.storeData = null;
  nsPost('/config', { storeId: '', token: '__CLEAR__' }).catch(() => {});
  renderNSPanel({ configured: false });
  showToast('Nuvemshop desconectada', 'warning');
}

function toggleNSToken() {
  const inp = document.getElementById('nsToken');
  const eye = document.getElementById('nsTokenEye');
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  if (eye) eye.className = inp.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}

// ============================
// DASHBOARD NUVEMSHOP
// ============================
async function loadNSDashboard() {
  try {
    const data = await nsGet('/dashboard');
    NS.storeData = data;
    renderNSKPIs(data.metricas, data.store);
    renderNSProdutos(data.produtos);
    renderNSPedidos(data.pedidosRecentes);
  } catch (e) {
    showToast('Erro ao carregar dados: ' + e.message, 'error');
  }
}

function renderNSKPIs(m, store) {
  const div = document.getElementById('nsKPIs');
  if (!div || !m) return;

  const storeName = store?.name?.pt || store?.name?.es || 'Minha Loja';

  div.innerHTML = `
    <div class="kpi-card green">
      <div class="kpi-icon"><i class="fas fa-coins"></i></div>
      <div class="kpi-info">
        <span class="kpi-label">Faturamento do Mês</span>
        <span class="kpi-value">R$ ${parseFloat(m.fatMes).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
        <span class="kpi-trend up"><i class="fas fa-store"></i> ${storeName}</span>
      </div>
    </div>
    <div class="kpi-card gold">
      <div class="kpi-icon"><i class="fas fa-bag-shopping"></i></div>
      <div class="kpi-info">
        <span class="kpi-label">Pedidos no Mês</span>
        <span class="kpi-value">${m.pedidosMes}</span>
        <span class="kpi-trend neutral"><i class="fas fa-check"></i> ${m.pedidosPagos} pagos no total</span>
      </div>
    </div>
    <div class="kpi-card blue">
      <div class="kpi-icon"><i class="fas fa-receipt"></i></div>
      <div class="kpi-info">
        <span class="kpi-label">Ticket Médio</span>
        <span class="kpi-value">R$ ${parseFloat(m.ticketMedio).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
        <span class="kpi-trend neutral"><i class="fas fa-chart-line"></i> pedidos pagos</span>
      </div>
    </div>
    <div class="kpi-card ${m.semEstoque > 0 ? 'red' : 'green'}">
      <div class="kpi-icon"><i class="fas fa-boxes-stacked"></i></div>
      <div class="kpi-info">
        <span class="kpi-label">Produtos</span>
        <span class="kpi-value">${m.totalProdutos}</span>
        <span class="kpi-trend ${m.semEstoque > 0 ? 'down' : 'up'}">
          <i class="fas fa-${m.semEstoque > 0 ? 'exclamation-triangle' : 'check'}"></i>
          ${m.semEstoque > 0 ? m.semEstoque + ' sem estoque' : 'todos com estoque'}
        </span>
      </div>
    </div>`;
}

// ============================
// PRODUTOS
// ============================
let nsProdPage = 1;

async function loadNSProducts(page = 1) {
  nsProdPage = page;
  const status = document.getElementById('nsProdStatus');
  if (status) { status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...'; status.style.display='block'; }

  try {
    const data = await nsGet(`/products?page=${page}&per_page=30`);
    if (status) status.style.display = 'none';
    renderNSProdutos(data);
    renderNSPagination('nsProdPag', page, data.length >= 30, loadNSProducts);
  } catch (e) {
    if (status) status.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${e.message}`;
    showToast(e.message, 'error');
  }
}

async function searchNSProducts() {
  const q = document.getElementById('nsProdSearch')?.value?.trim();
  if (!q) return loadNSProducts();
  const status = document.getElementById('nsProdStatus');
  if (status) { status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...'; status.style.display='block'; }
  try {
    const data = await nsGet(`/products?q=${encodeURIComponent(q)}&per_page=50`);
    if (status) status.style.display = 'none';
    renderNSProdutos(data);
  } catch (e) {
    if (status) status.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${e.message}`;
  }
}

function renderNSProdutos(produtos) {
  const tbody = document.getElementById('tbodyNSProdutos');
  if (!tbody) return;
  if (!produtos || !produtos.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-3)">
      <i class="fas fa-box-open" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.3"></i>Nenhum produto encontrado
    </td></tr>`;
    return;
  }

  tbody.innerHTML = produtos.map(p => {
    const variant  = p.variants?.[0] || {};
    const preco    = parseFloat(variant.price || p.price || 0);
    const estoque  = variant.stock ?? '∞';
    const sku      = variant.sku || p.sku || '—';
    const imgUrl   = p.images?.[0]?.src || '';
    const statusCl = p.published ? 'pago' : 'pendente';
    const statusTx = p.published ? 'Publicado' : 'Rascunho';
    const estoqueNum = typeof estoque === 'number' ? estoque : null;
    const estCl    = estoqueNum === 0 ? 'vencido' : estoqueNum !== null && estoqueNum <= 5 ? 'pendente' : 'pago';

    return `<tr>
      <td style="color:var(--text-3);font-size:11px">#${p.id}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          ${imgUrl ? `<img src="${imgUrl}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">` : `<div style="width:36px;height:36px;background:var(--bg-2);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--text-3)"><i class="fas fa-image"></i></div>`}
          <div>
            <div style="font-weight:600;font-size:13px">${p.name?.pt || p.name?.es || '—'}</div>
            ${p.variants?.length > 1 ? `<div style="font-size:11px;color:var(--text-3)">${p.variants.length} variantes</div>` : ''}
          </div>
        </div>
      </td>
      <td><code style="font-size:11px;color:var(--gold)">${sku}</code></td>
      <td><strong>R$ ${preco.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></td>
      <td><span class="status-badge ${estCl}">${estoque}</span></td>
      <td><span class="status-badge ${statusCl}">${statusTx}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon" onclick="syncProductToStock(${JSON.stringify(p).replace(/"/g,'&quot;')})" title="Importar para Estoque"><i class="fas fa-download"></i></button>
          <a href="https://www.nuvemshop.com.br/admin/products/${p.id}" target="_blank" class="btn-icon" title="Abrir na Nuvemshop"><i class="fas fa-external-link-alt"></i></a>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ============================
// PEDIDOS
// ============================
async function loadNSOrders() {
  const filter = document.getElementById('nsPedFilter')?.value || '';
  const status = document.getElementById('nsPedStatus');
  if (status) { status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...'; status.style.display='block'; }

  try {
    const url = `/orders?per_page=50${filter ? '&payment_status='+filter : ''}`;
    const data = await nsGet(url);
    if (status) status.style.display = 'none';
    renderNSPedidos(data);
  } catch (e) {
    if (status) status.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${e.message}`;
    showToast(e.message, 'error');
  }
}

function renderNSPedidos(pedidos) {
  const tbody = document.getElementById('tbodyNSPedidos');
  if (!tbody) return;
  if (!pedidos || !pedidos.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-3)">Nenhum pedido encontrado</td></tr>`;
    return;
  }

  const payMap = { paid:'pago', pending:'pendente', authorized:'pago', refunded:'vencido', voided:'vencido', in_dispute:'pendente' };
  const shipMap = { fulfilled:'pago', unfulfilled:'pendente', unshipped:'pendente', shipped:'pago' };

  tbody.innerHTML = pedidos.map(o => {
    const data     = new Date(o.created_at).toLocaleDateString('pt-BR');
    const hora     = new Date(o.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    const cliente  = o.customer ? `${o.customer.name || ''}` : 'Cliente removido';
    const total    = parseFloat(o.total || 0).toLocaleString('pt-BR',{minimumFractionDigits:2, style:'currency', currency:'BRL'});
    const payStatus = payMap[o.payment_status] || 'pendente';
    const payLabel  = o.payment_status === 'paid' ? 'Pago' : o.payment_status === 'pending' ? 'Pendente' : o.payment_status || '—';
    const shipStatus = shipMap[o.shipping_status] || 'pendente';
    const shipLabel  = o.shipping_status === 'fulfilled' ? 'Enviado' : o.shipping_status === 'shipped' ? 'Despachado' : 'Aguardando';
    const numProd   = o.products?.length || '—';

    return `<tr>
      <td><strong style="color:var(--gold)">#${o.number || o.id}</strong></td>
      <td>${cliente}</td>
      <td><small>${data}</small><br><small style="color:var(--text-3)">${hora}</small></td>
      <td>${numProd} item(s)</td>
      <td><strong>${total}</strong></td>
      <td><span class="status-badge ${payStatus}">${payLabel}</span></td>
      <td><span class="status-badge ${shipStatus}">${shipLabel}</span></td>
    </tr>`;
  }).join('');
}

// ============================
// CLIENTES
// ============================
async function loadNSCustomers(page = 1) {
  const status = document.getElementById('nsCliStatus');
  if (status) { status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...'; status.style.display='block'; }
  try {
    const data = await nsGet(`/customers?page=${page}&per_page=50`);
    if (status) status.style.display = 'none';
    renderNSClientes(data);
  } catch (e) {
    if (status) status.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${e.message}`;
    showToast(e.message, 'error');
  }
}

async function searchNSCustomers() {
  const q = document.getElementById('nsCliSearch')?.value?.trim();
  if (!q) return loadNSCustomers();
  const status = document.getElementById('nsCliStatus');
  if (status) { status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...'; status.style.display='block'; }
  try {
    const data = await nsGet(`/customers?q=${encodeURIComponent(q)}&per_page=50`);
    if (status) status.style.display = 'none';
    renderNSClientes(data);
  } catch (e) {
    if (status) status.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${e.message}`;
  }
}

function renderNSClientes(clientes) {
  const tbody = document.getElementById('tbodyNSClientes');
  if (!tbody) return;
  if (!clientes || !clientes.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-3)">Nenhum cliente encontrado</td></tr>`;
    return;
  }
  tbody.innerHTML = clientes.map(c => {
    const addr = c.addresses?.[0] || {};
    return `<tr>
      <td><strong>${c.name || '—'}</strong></td>
      <td>${c.email || '—'}</td>
      <td>${c.phone || '—'}</td>
      <td>${addr.city || '—'}${addr.province ? '/'+addr.province : ''}</td>
      <td>${c.orders_count ?? '—'}</td>
      <td><strong>R$ ${parseFloat(c.total_spent || 0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></td>
    </tr>`;
  }).join('');
}

// ============================
// CATEGORIAS
// ============================
async function loadNSCategories() {
  const status = document.getElementById('nsCatStatus');
  if (status) { status.style.display = 'block'; }
  try {
    const data = await nsGet('/categories');
    if (status) status.style.display = 'none';
    const grid = document.getElementById('nsCatGrid');
    if (!grid) return;
    if (!data || !data.length) { grid.innerHTML = '<p class="text-muted">Nenhuma categoria</p>'; return; }
    grid.innerHTML = data.map(cat => `
      <div class="ns-cat-card">
        <div class="ns-cat-icon"><i class="fas fa-tag"></i></div>
        <div class="ns-cat-name">${cat.name?.pt || cat.name?.es || '—'}</div>
        <div class="ns-cat-id">#${cat.id}</div>
      </div>`).join('');
  } catch (e) {
    if (status) status.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${e.message}`;
  }
}

// ============================
// ESTOQUE (aba interna)
// ============================
async function loadNSEstoque() {
  const status = document.getElementById('nsEstStatus');
  if (status) { status.style.display = 'block'; }
  try {
    const data = await nsGet('/products/all');
    if (status) status.style.display = 'none';

    const alerts = document.getElementById('nsEstAlerts');
    const tbody  = document.getElementById('tbodyNSEstoque');
    if (!data || !data.length) return;

    const alertsHTML = [];
    const rows = [];

    data.forEach(p => {
      const nome = p.name?.pt || p.name?.es || '—';
      (p.variants || []).forEach(v => {
        const est = v.stock;
        let estCl = 'pago', estTx = 'Normal';
        if (est === 0)       { estCl = 'vencido'; estTx = 'Sem Estoque'; alertsHTML.push(`<div class="stock-alert danger"><i class="fas fa-ban"></i> <strong>❌ ${nome}</strong> — sem estoque (SKU: ${v.sku || '—'})</div>`); }
        else if (est !== null && est <= 3) { estCl = 'vencido'; estTx = 'Crítico'; alertsHTML.push(`<div class="stock-alert critical"><i class="fas fa-triangle-exclamation"></i> <strong>⚠️ ${nome}</strong> — apenas <strong>${est}</strong> unidades</div>`); }
        else if (est !== null && est <= 10) { estCl = 'pendente'; estTx = 'Baixo'; alertsHTML.push(`<div class="stock-alert warning"><i class="fas fa-exclamation-circle"></i> ${nome} — ${est} unidades</div>`); }

        rows.push(`<tr>
          <td><strong>${nome}</strong></td>
          <td>${v.values?.map(x => x.pt || x.es || x).join(' / ') || 'Padrão'}</td>
          <td><code style="font-size:11px;color:var(--gold)">${v.sku || '—'}</code></td>
          <td><strong style="color:${est === 0 ? '#ef4444' : est !== null && est <= 10 ? '#eab308' : 'var(--text)'}">${est ?? '∞'}</strong></td>
          <td><span class="status-badge ${estCl}">${estTx}</span></td>
        </tr>`);
      });
    });

    if (alerts) alerts.innerHTML = alertsHTML.slice(0, 10).join('');
    if (tbody)  tbody.innerHTML  = rows.join('');
  } catch (e) {
    if (status) status.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${e.message}`;
  }
}

// ============================
// SINCRONIZAR PRODUTO → ESTOQUE POWER HUB
// ============================
function syncProductToStock(produto) {
  const v = produto.variants?.[0] || {};
  const novoItem = {
    id: Date.now(),
    nome: produto.name?.pt || produto.name?.es || 'Produto Nuvemshop',
    sku:  v.sku || 'NS-' + produto.id,
    categoria: 'Nuvemshop',
    fornecedor: 'Nuvemshop',
    qtd: v.stock ?? 0,
    qtdMin: 5,
    custo: parseFloat(v.cost || 0),
    venda: parseFloat(v.price || produto.price || 0),
  };
  if (!window.DB) return showToast('Erro: sistema não inicializado', 'error');
  const existe = DB.produtos.find(p => p.sku === novoItem.sku);
  if (existe) {
    existe.qtd   = novoItem.qtd;
    existe.venda = novoItem.venda;
    showToast(`"${novoItem.nome}" atualizado no estoque`, 'success');
  } else {
    DB.produtos.push(novoItem);
    showToast(`"${novoItem.nome}" importado para o Estoque`, 'success');
  }
  if (typeof renderEstoque === 'function') renderEstoque();
}

// ============================
// SYNC COMPLETO
// ============================
async function syncNuvemshop() {
  showToast('Sincronizando com Nuvemshop...', 'info');
  await loadNSDashboard();
  showToast('Sincronização concluída!', 'success');
}

// ============================
// PAGINAÇÃO
// ============================
function renderNSPagination(containerId, page, hasNext, loadFn) {
  const div = document.getElementById(containerId);
  if (!div) return;
  div.innerHTML = `
    <div style="display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--border);align-items:center">
      ${page > 1 ? `<button class="btn-outline btn-sm" onclick="${loadFn.name}(${page-1})"><i class="fas fa-chevron-left"></i> Anterior</button>` : ''}
      <span style="font-size:12px;color:var(--text-2)">Página ${page}</span>
      ${hasNext ? `<button class="btn-outline btn-sm" onclick="${loadFn.name}(${page+1})">Próxima <i class="fas fa-chevron-right"></i></button>` : ''}
    </div>`;
}

// ============================
// TAB HOOK
// ============================
const _origSwitchTab = window.switchTab;
window.switchTab = function(module, tab, btn) {
  _origSwitchTab(module, tab, btn);
  if (module !== 'ns') return;
  if (tab === 'produtos')   loadNSProducts();
  if (tab === 'pedidos')    loadNSOrders();
  if (tab === 'clientes')   loadNSCustomers();
  if (tab === 'categorias') loadNSCategories();
  if (tab === 'estoque')    loadNSEstoque();
};

// ============================
// SYNC PRODUTOS → MÓDULO ESTOQUE PRINCIPAL
// Chamado ao entrar no módulo Estoque e pelo botão "Sync Nuvemshop"
// ============================
async function syncEstoqueFromNuvemshop(manual = false) {
  const btn = document.getElementById('btnSyncNS');

  // Atualizar botão
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...'; }

  // Banner de status no módulo Estoque
  function showBanner(msg, type) {
    const old = document.getElementById('nsEstoqueSyncBanner');
    if (old) old.remove();
    const estMod = document.getElementById('mod-estoque');
    if (!estMod) return;
    const kpiGrid = estMod.querySelector('.kpi-grid');
    if (!kpiGrid) return;
    const colors = {
      loading: 'background:rgba(106,63,212,0.12);border-color:rgba(106,63,212,0.35);color:#a78bfa',
      success: 'background:rgba(34,197,94,0.1);border-color:rgba(34,197,94,0.3);color:#22c55e',
      error:   'background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.3);color:#ef4444',
    };
    const icon = type === 'loading' ? 'fa-spinner fa-spin' : type === 'success' ? 'fa-check-circle' : 'fa-times-circle';
    const close = type !== 'loading' ? `<button onclick="this.parentElement.remove()" style="margin-left:auto;background:none;border:none;color:inherit;cursor:pointer;opacity:0.7;font-size:14px"><i class="fas fa-times"></i></button>` : '';
    kpiGrid.insertAdjacentHTML('beforebegin', `
      <div id="nsEstoqueSyncBanner" style="display:flex;align-items:center;gap:10px;padding:12px 16px;margin-bottom:12px;
           border-radius:8px;border:1px solid;font-size:13px;font-weight:500;${colors[type]}">
        <i class="fas ${icon}"></i><span style="flex:1">${msg}</span>${close}
      </div>`);
  }

  try {
    // 1. Verificar conexão
    const status = await nsGet('/status');
    if (!status.configured) {
      if (manual) showBanner('Nuvemshop não configurada. Acesse o módulo Nuvemshop para conectar.', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-store"></i> Sync Nuvemshop'; }
      return;
    }

    // 2. Mostrar loading
    showBanner('Buscando todos os produtos da Nuvemshop... (aguarde, pode levar até 30s na 1ª vez)', 'loading');

    // 3. Buscar TODOS os produtos via endpoint com paginação automática
    const data = await nsGet('/products/all');

    if (!Array.isArray(data)) {
      showBanner('Resposta inválida da API Nuvemshop: ' + JSON.stringify(data).slice(0, 100), 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-store"></i> Sync Nuvemshop'; }
      return;
    }

    if (data.length === 0) {
      showBanner('Nenhum produto retornado pela Nuvemshop.', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-store"></i> Sync Nuvemshop'; }
      return;
    }

    // 4. Converter para formato interno do Power Hub
    const produtosNS = [];
    data.forEach(p => {
      const nome = p.name?.pt || p.name?.es || String(p.name) || 'Produto';
      const cat  = p.categories?.[0]?.name?.pt || p.categories?.[0]?.name?.es || 'Nuvemshop';
      const vars = (p.variants && p.variants.length > 0) ? p.variants : [{}];

      vars.forEach((v, idx) => {
        let varLabel = '';
        if (vars.length > 1 && v.values) {
          varLabel = v.values.map(x => {
            if (typeof x === 'object') return x.pt || x.es || x.en || '';
            return String(x);
          }).filter(Boolean).join(' / ');
        }

        produtosNS.push({
          id:         (Number(p.id) || 0) * 100 + idx,
          nome:       varLabel ? `${nome} — ${varLabel}` : nome,
          sku:        v.sku || `NS-${p.id}${idx > 0 ? '-' + idx : ''}`,
          categoria:  cat,
          fornecedor: 'Nuvemshop',
          qtd:        typeof v.stock === 'number' ? v.stock : 0,
          qtdMin:     5,
          custo:      parseFloat(v.cost  || 0) || 0,
          venda:      parseFloat(v.price || p.price || 0) || 0,
          _nsId:      p.id,
          _nsImg:     p.images?.[0]?.src || '',
          _published: !!p.published,
        });
      });
    });

    // 5. Atualizar DB global
    if (window.DB) {
      window.DB.produtos = produtosNS;
    }

    // 6. Re-renderizar tabela de estoque
    if (typeof renderEstoque === 'function') {
      renderEstoque();
    }

    // 7. Feedback de sucesso
    showBanner(`✅ ${produtosNS.length} produtos sincronizados da Nuvemshop — ${new Date().toLocaleTimeString('pt-BR')}`, 'success');
    NS.connected = true;

    const badge = document.getElementById('nsBadge');
    if (badge) badge.style.display = 'inline';

  } catch (e) {
    showBanner(`Erro ao sincronizar: ${e.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-store"></i> Sync Nuvemshop'; }
  }
}

// ============================
// HOOK DE MÓDULO
// ============================
const _origShowModuleNS = window.showModule;
window.showModule = function(name, el) {
  _origShowModuleNS(name, el);
  if (name === 'nuvemshop') renderNuvemshop();
  if (name === 'estoque')   syncEstoqueFromNuvemshop(false);
};
