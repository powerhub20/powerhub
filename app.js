/* ============================
   POWER HUB — App Logic
   Power Ropes
   ============================ */

// ============================
// ERROR HANDLING
// ============================
window.addEventListener('error', e => {
  console.error('[Erro Não Tratado]', e.message);
  console.error(e.error);
});

window.addEventListener('unhandledrejection', e => {
  console.error('[Promise Rejeitada]', e.reason);
});

// ============================
// DATA STORE
// ============================
const DB = {
  user: null,
  produtos: [],
  financeiro: [],
  tarefas: [],
  avisos: [],
  metas: [],
  funcionarios: [],
  campanhas: [],
  clientes: [],
  fornecedores: [],
  compras: [],
  notificacoes: [],
};
// Expor globalmente para integração Nuvemshop
window.DB = DB;

// ============================
// PERSISTENCE — SQLite via API
// ============================

async function loadDB() {
  try {
    const tables = ['tarefas', 'produtos', 'financeiro', 'avisos', 'metas', 'funcionarios', 'campanhas', 'clientes', 'fornecedores', 'compras'];

    const results = await Promise.all(
      tables.map(table =>
        fetch(`/api/${table}`)
          .then(r => r.json())
          .then(data => ({ table, data }))
          .catch(e => {
            console.error(`Erro ao carregar ${table}:`, e);
            return { table, data: [] };
          })
      )
    );

    results.forEach(({ table, data }) => {
      if (Array.isArray(data) && data.length > 0) {
        DB[table] = data;
      }
      // Se API retornar vazio, preservar dados hardcoded já carregados
    });

    console.log('✅ Dados carregados do SQLite');
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
  }
}

async function apiRequest(method, endpoint, data = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(endpoint, options);
    if (!response.ok) {
      const error = await response.json();
      console.error(`Erro ${method} ${endpoint}:`, error);
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error(`Erro API ${method} ${endpoint}:`, e);
    return null;
  }
}

// Wrapper para salvar dados
async function saveDB() {
  // Agora saveDB() é apenas um placeholder
  // Todos os dados são salvos direto via apiRequest() em cada operação
}

// ============================
// PERMISSIONS
// ============================
const ROLE_MODULES = {
  admin:      ['dashboard','financeiro','estoque','compras','funcionarios','tarefas','avisos','metas','marketing','crm','relatorios','inteligencia'],
  gestor:     ['dashboard','financeiro','estoque','compras','funcionarios','tarefas','avisos','metas','marketing','crm','relatorios','inteligencia'],
  financeiro: ['dashboard','financeiro','tarefas','avisos','relatorios','inteligencia'],
  marketing:  ['dashboard','marketing','crm','tarefas','avisos','metas','inteligencia'],
  estoque:    ['dashboard','estoque','compras','tarefas','avisos','inteligencia'],
  funcionario:['dashboard','tarefas','avisos','metas','inteligencia'],
};

// ============================
// SEED DATA
// ============================
function seedData() {
  // Produtos — carregar da Nuvemshop via syncEstoqueFromNuvemshop()
  DB.produtos = [];

  // Financeiro
  DB.financeiro = [
    { id:1, tipo:'Receita', desc:'Vendas Shopee – Maio', categoria:'Vendas', valor:18420, data:'2025-05-30', status:'Pago' },
    { id:2, tipo:'Receita', desc:'Vendas Mercado Livre – Maio', categoria:'Vendas', valor:24380, data:'2025-05-30', status:'Pago' },
    { id:3, tipo:'Receita', desc:'Vendas Site – Maio', categoria:'Vendas', valor:12800, data:'2025-05-30', status:'Pago' },
    { id:4, tipo:'Despesa', desc:'Meta Ads – Maio', categoria:'Marketing', valor:6500, data:'2025-05-01', status:'Pago' },
    { id:5, tipo:'Despesa', desc:'Google Ads – Maio', categoria:'Marketing', valor:3200, data:'2025-05-01', status:'Pago' },
    { id:6, tipo:'Despesa', desc:'Folha de Pagamento', categoria:'RH', valor:8900, data:'2025-05-05', status:'Pago' },
    { id:7, tipo:'Conta a Pagar', desc:'NF Fornecedor SupraNutri', categoria:'Estoque', valor:4200, data:'2025-06-10', status:'Pendente' },
    { id:8, tipo:'Conta a Receber', desc:'Parcela Cliente João Silva', categoria:'Vendas', valor:890, data:'2025-06-05', status:'Pendente' },
    { id:9, tipo:'Imposto', desc:'Simples Nacional – Maio', categoria:'Fiscal', valor:3100, data:'2025-06-20', status:'Pendente' },
    { id:10, tipo:'Investimento', desc:'Equipamentos Fotografia', categoria:'Marketing', valor:2400, data:'2025-05-15', status:'Pago' },
  ];

  // Tarefas
  DB.tarefas = [
    { id:1, titulo:'Criar campanha Meta Ads Junho', desc:'Campanha focada em Whey Protein com foco em leads', resp:'Marina Costa', data:'2025-06-05', prioridade:'alta', status:'doing', checklist:['Definir público','Criar criativos','Configurar pixel','Subir campanha'], checkDone:[true,true,false,false] },
    { id:2, titulo:'Reposição de Creatina 300g', desc:'Entrar em contato com SupraNutri para pedido urgente', resp:'Carlos Mendes', data:'2025-06-02', prioridade:'urgente', status:'todo', checklist:['Contatar fornecedor','Enviar pedido','Confirmar entrega'], checkDone:[false,false,false] },
    { id:3, titulo:'Atualizar fotos produtos site', desc:'Refazer fotos de toda linha de roupas', resp:'Ana Lima', data:'2025-06-10', prioridade:'media', status:'todo', checklist:['Agendar sessão foto','Editar imagens','Subir no sistema'], checkDone:[true,false,false] },
    { id:4, titulo:'Relatório financeiro Q2', desc:'Relatório completo do segundo trimestre', resp:'Paulo Souza', data:'2025-05-31', prioridade:'alta', status:'review', checklist:['Coletar dados','Montar planilha','Revisar'], checkDone:[true,true,true] },
    { id:5, titulo:'Treinar equipe novo ERP', desc:'Treinamento para todos os funcionários', resp:'Roberto Alves', data:'2025-06-15', prioridade:'media', status:'todo', checklist:['Preparar material','Agendar sala'], checkDone:[false,false] },
    { id:6, titulo:'Análise ROI campanhas Maio', desc:'Comparar Meta Ads vs Google Ads', resp:'Marina Costa', data:'2025-06-01', prioridade:'alta', status:'done', checklist:['Extrair dados','Calcular ROI','Apresentar gestão'], checkDone:[true,true,true] },
  ];

  // Avisos
  DB.avisos = [
    { id:1, tipo:'Chegada de Produto', titulo:'Chegada de novos Whey Proteins', msg:'Chegaram 100 unidades de Whey Protein 900g sabor Baunilha. Já disponível no estoque.', dest:'Todos', prioridade:'normal', data:'2025-06-01' },
    { id:2, tipo:'Reunião', titulo:'Reunião de Resultados – Sexta 14h', msg:'Reunião com toda a equipe para apresentação dos resultados de maio e metas de junho. Presença obrigatória.', dest:'Todos', prioridade:'importante', data:'2025-06-01' },
    { id:3, tipo:'Comunicado Geral', titulo:'Novo horário de atendimento', msg:'A partir de segunda-feira o atendimento ao cliente passa a ser das 8h às 20h, incluindo sábado.', dest:'Todos', prioridade:'normal', data:'2025-05-30' },
    { id:4, tipo:'Treinamento', titulo:'Treinamento Power Hub – Sistema Novo', msg:'Treinamento do novo sistema de gestão acontece na próxima semana. Confira o cronograma no mural.', dest:'Todos', prioridade:'urgente', data:'2025-05-29' },
  ];

  // Metas
  DB.metas = [
    { id:1, tipo:'Faturamento', titulo:'Faturar R$ 100k em Junho', valor:100000, atual:87420, prazo:'2025-06-30', resp:'Equipe Comercial' },
    { id:2, tipo:'Vendas', titulo:'500 pedidos em Junho', valor:500, atual:467, prazo:'2025-06-30', resp:'Equipe Comercial' },
    { id:3, tipo:'Marketing', titulo:'ROI acima de 600%', valor:700, atual:612, prazo:'2025-06-30', resp:'Marina Costa' },
    { id:4, tipo:'Estoque', titulo:'Zerar produtos sem estoque', valor:0, atual:1, prazo:'2025-06-15', resp:'Carlos Mendes' },
    { id:5, tipo:'ROI', titulo:'ROAS acima de 8x', valor:8, atual:7.1, prazo:'2025-06-30', resp:'Marina Costa' },
  ];

  // Funcionários
  DB.funcionarios = [
    { id:1, nome:'Paulo Souza', cargo:'CEO', depto:'Administrativo', tel:'(11) 99999-0001', email:'paulo@powerropes.com', contratacao:'2020-03-01', salario:12000, status:'Ativo', tarefas:18, concluidas:15 },
    { id:2, nome:'Roberto Alves', cargo:'Gestor Operacional', depto:'Administrativo', tel:'(11) 99999-0002', email:'roberto@powerropes.com', contratacao:'2021-01-15', salario:7500, status:'Ativo', tarefas:24, concluidas:22 },
    { id:3, nome:'Marina Costa', cargo:'Gestora de Marketing', depto:'Marketing', tel:'(11) 99999-0003', email:'marina@powerropes.com', contratacao:'2021-06-01', salario:6800, status:'Ativo', tarefas:31, concluidas:28 },
    { id:4, nome:'Ana Lima', cargo:'Designer', depto:'Marketing', tel:'(11) 99999-0004', email:'ana@powerropes.com', contratacao:'2022-02-10', salario:4200, status:'Ativo', tarefas:19, concluidas:14 },
    { id:5, nome:'Carlos Mendes', cargo:'Gerente de Estoque', depto:'Estoque', tel:'(11) 99999-0005', email:'carlos@powerropes.com', contratacao:'2020-08-20', salario:5500, status:'Ativo', tarefas:22, concluidas:20 },
    { id:6, nome:'Fernanda Reis', cargo:'Analista Financeiro', depto:'Financeiro', tel:'(11) 99999-0006', email:'fernanda@powerropes.com', contratacao:'2022-05-01', salario:5800, status:'Férias', tarefas:16, concluidas:16 },
  ];

  // Campanhas
  DB.campanhas = [
    { id:1, canal:'Meta Ads', nome:'Whey Protein – Conversão', invest:3500, cliques:18400, conv:312, receita:28080, periodo:'2025-05', status:'Ativa' },
    { id:2, canal:'Meta Ads', nome:'Roupas Fitness – Remarketing', invest:1800, cliques:9200, conv:184, receita:10120, periodo:'2025-05', status:'Ativa' },
    { id:3, canal:'Google Ads', nome:'Suplementos – Search', invest:2400, cliques:14200, conv:198, receita:17820, periodo:'2025-05', status:'Ativa' },
    { id:4, canal:'Google Ads', nome:'Power Ropes – Brand', invest:800, cliques:6800, conv:145, receita:13050, periodo:'2025-05', status:'Ativa' },
    { id:5, canal:'Mercado Livre', nome:'Catálogo Completo', invest:1200, cliques:0, conv:287, receita:24395, periodo:'2025-05', status:'Ativa' },
    { id:6, canal:'Shopee', nome:'Loja Oficial', invest:600, cliques:0, conv:341, receita:18410, periodo:'2025-05', status:'Ativa' },
  ];

  // Clientes
  DB.clientes = [
    { id:1, tipo:'Cliente', nome:'João Silva', email:'joao@email.com', tel:'(11) 98888-0001', origem:'Instagram', estagio:'Cliente', compras:12, totalGasto:2340, ultimaCompra:'2025-05-28', obs:'' },
    { id:2, tipo:'Cliente', nome:'Carla Nunes', email:'carla@email.com', tel:'(11) 98888-0002', origem:'Google', estagio:'Cliente', compras:8, totalGasto:1560, ultimaCompra:'2025-05-25', obs:'' },
    { id:3, tipo:'Lead', nome:'Thiago Martins', email:'thiago@email.com', tel:'(11) 98888-0003', origem:'Site', estagio:'Proposta', compras:0, totalGasto:0, ultimaCompra:'-', obs:'Interessado em kit Whey + Creatina' },
    { id:4, tipo:'Lead', nome:'Bianca Ferreira', email:'bianca@email.com', tel:'(11) 98888-0004', origem:'Indicação', estagio:'Contato Feito', compras:0, totalGasto:0, ultimaCompra:'-', obs:'' },
    { id:5, tipo:'Cliente', nome:'Rafael Torres', email:'rafael@email.com', tel:'(11) 98888-0005', origem:'Shopee', estagio:'Cliente', compras:25, totalGasto:4875, ultimaCompra:'2025-06-01', obs:'VIP – desconto fidelidade' },
  ];

  // Fornecedores
  DB.fornecedores = [
    { id:1, nome:'SupraNutri Ltda', cnpj:'12.345.678/0001-99', contato:'José Rodrigues', tel:'(11) 3333-0001', email:'comercial@supranutri.com', prazo:'7 dias úteis' },
    { id:2, nome:'MaxForce Suplementos', cnpj:'98.765.432/0001-11', contato:'Claudia Alves', tel:'(11) 3333-0002', email:'pedidos@maxforce.com', prazo:'5 dias úteis' },
    { id:3, nome:'Têxtil Sul Confecções', cnpj:'45.678.901/0001-22', contato:'Marcos Ribeiro', tel:'(11) 3333-0003', email:'vendas@textilsul.com', prazo:'12 dias úteis' },
    { id:4, nome:'PowerGear Acessórios', cnpj:'33.444.555/0001-66', contato:'Aline Castro', tel:'(11) 3333-0004', email:'orcamento@powergear.com', prazo:'3 dias úteis' },
  ];

  // Compras
  DB.compras = [
    { id:1, fornecedor:'SupraNutri Ltda', data:'2025-05-20', produtos:'Whey Protein x50, Creatina x30', total:5920, status:'Entregue', entrega:'2025-05-27' },
    { id:2, fornecedor:'PowerGear Acessórios', data:'2025-05-22', produtos:'Shaker x100, Elástico Kit x20', total:3900, status:'Entregue', entrega:'2025-05-25' },
    { id:3, fornecedor:'Têxtil Sul Confecções', data:'2025-05-28', produtos:'Camiseta P x30, Legging M x20', total:1180, status:'Confirmada', entrega:'2025-06-09' },
    { id:4, fornecedor:'MaxForce Suplementos', data:'2025-06-01', produtos:'Pré-Treino x20, BCAA x30', total:1940, status:'Pendente', entrega:'2025-06-06' },
  ];
}

// ============================
// LOGIN
// ============================
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const role  = document.getElementById('loginRole').value;
  if (!email) return showToast('Preencha o e-mail', 'error');

  const roleNames = { admin:'Administrador', gestor:'Gestor', financeiro:'Financeiro', marketing:'Marketing', estoque:'Estoque', funcionario:'Funcionário' };
  DB.user = { email, role, name: roleNames[role] };

  // Persistir sessão
  sessionStorage.setItem('userSession', JSON.stringify(DB.user));

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  document.getElementById('sidebarUserName').textContent = roleNames[role];
  document.getElementById('sidebarUserRole').textContent = role;
  document.getElementById('topbarUser').textContent = roleNames[role];

  applyPermissions(role);
  seedData();
  initApp();
  showToast('Bem-vindo ao Power Hub! 🚀', 'success');
});

function logout() {
  DB.user = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

function applyPermissions(role) {
  const allowed = ROLE_MODULES[role] || [];
  document.querySelectorAll('.nav-item[data-roles]').forEach(el => {
    const roles = el.getAttribute('data-roles').split(',');
    el.style.display = roles.includes(role) ? '' : 'none';
  });
}

// ============================
// MODULE NAVIGATION
// ============================
const moduleNames = {
  dashboard:'Dashboard Executivo', financeiro:'Financeiro', estoque:'Estoque',
  compras:'Compras', funcionarios:'Funcionários', tarefas:'Tarefas', avisos:'Avisos Internos',
  metas:'Metas', marketing:'Marketing', crm:'CRM', relatorios:'Relatórios', inteligencia:'Inteligência IA',
};

function showModule(name, el) {
  document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const mod = document.getElementById('mod-' + name);
  if (mod) mod.classList.add('active');
  if (el) el.classList.add('active');
  document.getElementById('breadcrumb').textContent = moduleNames[name] || name;

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('mobile-open');

  // Render module
  const renders = {
    dashboard: renderDashboardCharts,
    estoque: renderEstoque,
    financeiro: renderFinanceiro,
    tarefas: renderKanban,
    avisos: renderAvisos,
    metas: renderMetas,
    funcionarios: renderFuncionarios,
    marketing: renderMarketing,
    crm: renderCRM,
    compras: renderCompras,
    relatorios: () => {},
  };
  if (renders[name]) renders[name]();
}

// ============================
// SIDEBAR TOGGLE
// ============================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

// ============================
// THEME
// ============================
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('themeIcon').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

// ============================
// INIT APP
// ============================
function initApp() {
  loadDB();
  renderDashboardCharts();
  renderEstoque();
  renderFinanceiro();
  renderKanban();
  renderAvisos();
  renderMetas();
  renderFuncionarios();
  renderMarketing();
  renderCRM();
  renderCompras();
  buildNotifications();
}

// ============================
// CHARTS — DASHBOARD
// ============================
let charts = {};

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

const COLORS = {
  green: '#1D5C3A', greenL: '#2a7a4f', gold: '#C9A227', goldL: '#e0b83a',
  blue: '#3b82f6', purple: '#8b5cf6', orange: '#f97316', red: '#ef4444',
  cyan: '#06b6d4',
};

function isDark() { return document.documentElement.getAttribute('data-theme') !== 'light'; }
function gridColor() { return isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; }
function textColor() { return isDark() ? '#aaaaaa' : '#555566'; }

Chart.defaults.color = textColor();
Chart.defaults.borderColor = gridColor();
Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";

function renderDashboardCharts(period = 'mes') {
  // Vendas por Mês
  destroyChart('vendas');
  const ctxV = document.getElementById('chartVendasMes');
  if (ctxV && typeof VENDAS_DATA !== 'undefined') {
    let chartData, title, maxVal;

    if (period === 'todo') {
      // Mostrar todos os anos como linhas
      const anos = [2020,2021,2022,2023,2024,2025,2026];
      const cores = { 2020:'#999999', 2021:'#8b5cf6', 2022:'#ef4444', 2023:'#f97316', 2024:'#1D5C3A', 2025:'#C9A227', 2026:'#3b82f6' };
      const datasets = anos.map(a => {
        const dados = VENDAS_DATA.faturamento[a] || Array(12).fill(0);
        return {
          label: String(a),
          data: dados,
          borderColor: cores[a],
          backgroundColor: 'transparent',
          borderWidth: a === 2026 ? 3 : 2,
          tension: 0.4,
          pointRadius: 3
        };
      });
      chartData = {
        labels: VENDAS_DATA.meses || Array(12).fill(''),
        datasets: datasets
      };
      title = 'Comparativo de Vendas — Todos os Anos';
      maxVal = null;
    } else {
      // Mostrar apenas 2026 (padrão)
      const dados2026 = VENDAS_DATA.faturamento[2026] || [0,0,0,0,0,0,0,0,0,0,0,0];
      chartData = {
        labels: VENDAS_DATA.meses || ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
        datasets: [{
          label: 'Faturamento 2026 (R$)',
          data: dados2026,
          backgroundColor: (ctx) => ctx.parsed.y > 0 ? COLORS.green : 'rgba(29,92,58,0.15)',
          borderRadius: 6,
          borderSkipped: false,
        }]
      };
      title = 'Faturamento Mensal — 2026';
      maxVal = Math.max(...dados2026) * 1.2 || 25000;
    }

    charts['vendas'] = new Chart(ctxV, {
      type: period === 'todo' ? 'line' : 'bar',
      data: chartData,
      options: {
        ...chartOpts({ prefix:'R$ ', yMax: maxVal }),
        plugins: {
          ...chartOpts({ prefix:'R$ ', yMax: maxVal }).plugins,
          legend: period === 'todo' ? { position: 'bottom', labels: { padding: 12, usePointStyle: true, color: textColor(), font:{size:11} } } : { display: false }
        }
      }
    });
  }

  // Categorias
  destroyChart('cat');
  // Carregar categorias da Nuvemshop (respeitando o período)
  carregarCategoriasNuvemshop(period);

  // Canal vendas
  destroyChart('canal');
  const ctxCn = document.getElementById('chartCanal');
  if (ctxCn) charts['canal'] = new Chart(ctxCn, {
    type: 'doughnut',
    data: {
      labels: ['Mercado Livre','Shopee','Site','Instagram','Outros'],
      datasets: [{ data:[32,28,22,12,6], backgroundColor:[COLORS.gold,COLORS.orange,COLORS.blue,COLORS.purple,COLORS.cyan], borderWidth:0, hoverOffset:6 }]
    },
    options: { responsive:true, cutout:'60%', plugins:{ legend:{ position:'bottom', labels:{ padding:12, usePointStyle:true } } } }
  });

  // ROI por canal
  destroyChart('roi');
  const ctxR = document.getElementById('chartROICanal');
  if (ctxR) charts['roi'] = new Chart(ctxR, {
    type: 'bar',
    data: {
      labels: ['Meta Ads','Google Ads','Shopee','ML','Site'],
      datasets: [{ label:'ROI %', data:[703,648,550,490,820], backgroundColor:[COLORS.gold,COLORS.blue,COLORS.orange,COLORS.red,COLORS.green], borderRadius:6, borderSkipped:false }]
    },
    options: chartOpts({ suffix:'%', yMax:1000 })
  });

  // Ads comparativo
  destroyChart('ads');
  const ctxA = document.getElementById('chartAds');
  if (ctxA) charts['ads'] = new Chart(ctxA, {
    type: 'line',
    data: {
      labels: ['Jan','Fev','Mar','Abr','Mai'],
      datasets: [
        { label:'Meta Ads', data:[3200,4100,4800,5200,5300], borderColor:COLORS.blue, backgroundColor:'rgba(59,130,246,0.1)', tension:0.4, fill:true, pointRadius:4 },
        { label:'Google Ads', data:[2100,2400,2800,3000,3200], borderColor:COLORS.gold, backgroundColor:'rgba(201,162,39,0.1)', tension:0.4, fill:true, pointRadius:4 }
      ]
    },
    options: chartOpts({ prefix:'R$ ' })
  });

  // Fluxo de caixa
  destroyChart('fluxo');
  const ctxF = document.getElementById('chartFluxo');
  if (ctxF && typeof VENDAS_DATA !== 'undefined') {
    let fluxoData;
    if (period === 'todo') {
      // Mostrar consolidado de todos os anos (últimos 5 meses com dados)
      const anos = [2020,2021,2022,2023,2024,2025,2026];
      const mesesConsolidados = VENDAS_DATA.meses.slice(0,5);
      const receitas = mesesConsolidados.map((_, idx) => {
        return anos.reduce((sum, ano) => sum + ((VENDAS_DATA.faturamento[ano] || [])[idx] || 0), 0);
      });
      const investimentos = mesesConsolidados.map((_, idx) => {
        const invest2024 = (VENDAS_DATA.investimento2024 || [])[idx] || 0;
        const invest2025 = (VENDAS_DATA.investimento2025 || [])[idx] || 0;
        const invest2026 = (VENDAS_DATA.investimento2026 || [])[idx] || 0;
        return invest2024 + invest2025 + invest2026;
      });
      fluxoData = {
        labels: mesesConsolidados,
        datasets: [
          { label:'Receitas Totais', data: receitas, borderColor:COLORS.green, backgroundColor:'rgba(29,92,58,0.1)', tension:0.4, fill:true, pointRadius:4 },
          { label:'Investimento Anúncios', data: investimentos, borderColor:COLORS.red, backgroundColor:'rgba(239,68,68,0.1)', tension:0.4, fill:true, pointRadius:4 }
        ]
      };
    } else {
      // Mostrar 2026
      const receitas2026 = (VENDAS_DATA.faturamento[2026] || [0,0,0,0,0]).slice(0,5);
      const investimento2026 = (VENDAS_DATA.investimento2026 || [0,0,0,0,0]).slice(0,5);
      fluxoData = {
        labels: VENDAS_DATA.meses.slice(0,5) || ['Jan','Fev','Mar','Abr','Mai'],
        datasets: [
          { label:'Receitas 2026', data: receitas2026, borderColor:COLORS.green, backgroundColor:'rgba(29,92,58,0.1)', tension:0.4, fill:true, pointRadius:4 },
          { label:'Investimento 2026', data: investimento2026, borderColor:COLORS.red, backgroundColor:'rgba(239,68,68,0.1)', tension:0.4, fill:true, pointRadius:4 }
        ]
      };
    }
    charts['fluxo'] = new Chart(ctxF, {
      type: 'line',
      data: fluxoData,
      options: chartOpts({ prefix:'R$ ' })
    });
  }

  // Crescimento (histórico anual)
  destroyChart('cresc');
  const ctxCr = document.getElementById('chartCrescimento');
  if (ctxCr && typeof VENDAS_DATA !== 'undefined') {
    const totaisArray = [
      VENDAS_DATA.totais[2021],
      VENDAS_DATA.totais[2022],
      VENDAS_DATA.totais[2023],
      VENDAS_DATA.totais[2024],
      VENDAS_DATA.totais[2025],
      VENDAS_DATA.totais[2026]
    ];
    charts['cresc'] = new Chart(ctxCr, {
      type: 'line',
      data: {
        labels: ['2021','2022','2023','2024','2025','2026*'],
        datasets: [{ label:'Faturamento Anual', data: totaisArray, borderColor:COLORS.gold, backgroundColor:'rgba(201,162,39,0.15)', tension:0.4, fill:true, pointRadius:5, pointBackgroundColor:COLORS.gold }]
      },
      options: chartOpts({ prefix:'R$ ' })
    });
  }

  // Comparativo de Crescimento (Jan-Dez vs Ano Anterior, ou Jan-Mes Atual para ano corrente)
  destroyChart('growth');
  const ctxG = document.getElementById('chartGrowthComparison');
  if (ctxG && typeof VENDAS_DATA !== 'undefined') {
    const anoAtual = 2026;
    const mesAtual = 5; // Maio (0-indexed seria 4, mas aqui é 1-indexed)
    const anos = [2022, 2023, 2024, 2025, 2026];

    const crescimentos = anos.map(ano => {
      const anoAnterior = ano - 1;

      // Determinar quantos meses considerar
      const mesesParaConsiderar = (ano === anoAtual) ? mesAtual : 12;

      // Calcular vendas do ano
      const vendasAno = (VENDAS_DATA.faturamento[ano] || Array(12).fill(0))
        .slice(0, mesesParaConsiderar)
        .reduce((a,b) => a+b, 0);

      // Calcular vendas do ano anterior (sempre considerar mesmo período)
      const vendasAnterior = (VENDAS_DATA.faturamento[anoAnterior] || Array(12).fill(0))
        .slice(0, mesesParaConsiderar)
        .reduce((a,b) => a+b, 0);

      if (vendasAnterior === 0) return 0;
      return ((vendasAno - vendasAnterior) / vendasAnterior * 100).toFixed(1);
    });

    charts['growth'] = new Chart(ctxG, {
      type: 'bar',
      data: {
        labels: ['2022','2023','2024','2025','2026*'],
        datasets: [{
          label: 'Crescimento %',
          data: crescimentos,
          backgroundColor: crescimentos.map(v => v >= 0 ? COLORS.green : COLORS.red),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: chartOpts({ suffix:'%' })
    });
  }
}

function chartOpts({ prefix='', suffix='', yMax=null }={}) {
  return {
    responsive:true, maintainAspectRatio:true,
    plugins:{ legend:{ display:false } },
    scales:{
      x:{ grid:{ color:gridColor() }, ticks:{ color:textColor(), font:{size:11} } },
      y:{ grid:{ color:gridColor() }, ticks:{ color:textColor(), font:{size:11}, callback: v => prefix + v.toLocaleString('pt-BR') + suffix }, max: yMax||undefined, beginAtZero:true }
    }
  };
}

// ============================
// Carregar Categorias da Nuvemshop
// ============================
function carregarCategoriasNuvemshop(period = 'mes') {
  console.log('📊 Chamando carregarCategoriasNuvemshop(period=' + period + ')');

  // Se for período específico, usar dados locais
  if (period !== 'todo' && typeof VENDAS_DATA !== 'undefined') {
    // Pegar categorias baseadas no faturamento do período
    const anoAtual = 2026;
    const mesAtual = new Date().getMonth();

    // Para período mensal, mostrar dados do mês
    if (period === 'mes') {
      const fatMes = (VENDAS_DATA.faturamento[anoAtual] || [])[mesAtual] || 0;
      const categorias = [
        { nome: 'Corda Flashline', valor: fatMes * 0.40 },
        { nome: 'Corda Kids', valor: fatMes * 0.25 },
        { nome: 'Corda FX4', valor: fatMes * 0.20 },
        { nome: 'Corda Sniper', valor: fatMes * 0.10 },
        { nome: 'Corda Blue speed', valor: fatMes * 0.05 }
      ];
      renderizarCategorias(categorias);
      return;
    }

    // Para período anual, mostrar dados do ano
    if (period === 'ano') {
      const fatAno = VENDAS_DATA.totais[anoAtual] || 0;
      const categorias = [
        { nome: 'Corda Flashline', valor: fatAno * 0.40 },
        { nome: 'Corda Kids', valor: fatAno * 0.25 },
        { nome: 'Corda FX4', valor: fatAno * 0.20 },
        { nome: 'Corda Sniper', valor: fatAno * 0.10 },
        { nome: 'Corda Blue speed', valor: fatAno * 0.05 }
      ];
      renderizarCategorias(categorias);
      return;
    }
  }

  // Fallback: tentar API
  fetch('/api/vendas/categorias')
    .then(r => r.json())
    .then(data => {
      console.log('📦 Resposta da API de categorias:', data);

      if (!data || !data.categorias || data.categorias.length === 0) {
        console.log('⚠️ Sem dados de categorias, usando padrão');
        renderCategoriasDefault();
        return;
      }

      renderizarCategorias(data.categorias);
    })
    .catch(err => {
      console.error('❌ Erro ao carregar categorias:', err);
      renderCategoriasDefault();
    });
}

function renderizarCategorias(categorias) {
  const ctxC = document.getElementById('chartCategoria');
  console.log('🎨 Canvas encontrado?', !!ctxC);
  if (!ctxC) {
    console.error('❌ Canvas #chartCategoria não encontrado!');
    return;
  }

  // Preparar dados
  const labels = categorias.map(c => c.nome);
  const valores = categorias.map(c => c.valor);
  console.log('📊 Labels:', labels);
  console.log('💰 Valores:', valores);

  const cores = [COLORS.green, COLORS.gold, COLORS.blue, COLORS.purple, COLORS.orange, COLORS.red, COLORS.cyan, COLORS.pink, COLORS.yellow, COLORS.lime];

  // Destruir gráfico anterior
  if (charts['cat']) {
    console.log('🗑️ Destruindo gráfico anterior');
    charts['cat'].destroy();
    delete charts['cat'];
  }

  // Criar novo gráfico
  console.log('✨ Criando novo gráfico de categorias');
  charts['cat'] = new Chart(ctxC, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: valores,
        backgroundColor: cores.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            usePointStyle: true,
            color: textColor(),
            font: { size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed || 0;
              return ' R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            }
          }
        }
      }
    }
  });
}

// Fallback com dados estáticos
function renderCategoriasDefault() {
  const ctxC = document.getElementById('chartCategoria');
  if (!ctxC) return;

  if (charts['cat']) {
    charts['cat'].destroy();
    delete charts['cat'];
  }

  charts['cat'] = new Chart(ctxC, {
    type: 'doughnut',
    data: {
      labels: ['Suplementos','Roupas','Acessórios','Equipamentos'],
      datasets: [{ data: [58,22,14,6], backgroundColor: [COLORS.green, COLORS.gold, COLORS.blue, COLORS.purple], borderWidth: 0, hoverOffset: 6 }]
    },
    options: { responsive:true, cutout:'65%', plugins:{ legend:{ position:'bottom', labels:{ padding:16, usePointStyle:true } } } }
  });
}

// ============================
// ESTOQUE
// ============================
function renderEstoque() {
  const tbody = document.getElementById('tbodyEstoque');
  if (!tbody) return;

  let baixo=0, semEst=0, totalVal=0;
  const alertsDiv = document.getElementById('stockAlerts');
  if (alertsDiv) alertsDiv.innerHTML = '';

  tbody.innerHTML = DB.produtos.map(p => {
    const margem = ((p.venda - p.custo) / p.venda * 100).toFixed(1);
    const val = p.qtd * p.custo;
    totalVal += val;

    let statusClass='pago', statusTxt='Normal';
    if (p.qtd === 0) { statusClass='vencido'; statusTxt='Sem Estoque'; semEst++; }
    else if (p.qtd <= p.qtdMin * 0.5) { statusClass='vencido'; statusTxt='Crítico'; baixo++; }
    else if (p.qtd <= p.qtdMin) { statusClass='pendente'; statusTxt='Baixo'; baixo++; }

    // Alerts
    if (alertsDiv) {
      if (p.qtd === 0) alertsDiv.innerHTML += `<div class="stock-alert danger"><i class="fas fa-ban"></i> <strong>❌ ${p.nome}</strong> — sem estoque (SKU: ${p.sku})</div>`;
      else if (p.qtd <= p.qtdMin * 0.5) alertsDiv.innerHTML += `<div class="stock-alert critical"><i class="fas fa-triangle-exclamation"></i> <strong>⚠️ ${p.nome}</strong> possui apenas <strong>${p.qtd}</strong> unidades em estoque (crítico).</div>`;
      else if (p.qtd <= p.qtdMin) alertsDiv.innerHTML += `<div class="stock-alert warning"><i class="fas fa-exclamation-circle"></i> <strong>${p.nome}</strong> está com estoque baixo: ${p.qtd} unidades (mínimo: ${p.qtdMin}).</div>`;
    }

    return `<tr>
      <td><code style="color:var(--gold);font-size:12px">${p.sku}</code></td>
      <td><strong>${p.nome}</strong></td>
      <td>${p.categoria}</td>
      <td>${p.fornecedor}</td>
      <td><strong style="color:${p.qtd<=p.qtdMin?'#ef4444':'var(--text)'}">${p.qtd}</strong></td>
      <td>R$ ${p.custo.toLocaleString('pt-BR')}</td>
      <td>R$ ${p.venda.toLocaleString('pt-BR')}</td>
      <td><span class="text-green fw-700">${margem}%</span></td>
      <td><span class="status-badge ${statusClass}">${statusTxt}</span></td>
      <td><div class="actions-cell">
        <button class="btn-icon" onclick="editProduto(${p.id})" title="Editar"><i class="fas fa-pen"></i></button>
        <button class="btn-icon del" onclick="deleteProduto(${p.id})" title="Excluir"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('');

  // Stats
  el('totalProdutos', DB.produtos.length);
  el('valorEstoque', 'R$ ' + totalVal.toLocaleString('pt-BR'));
  el('estoqueBaixo', baixo);
  el('semEstoque', semEst);
}

// ============================
// FINANCEIRO
// ============================
function renderFinanceiro() {
  renderFinTable('Receita', 'tbodyReceitas');
  renderFinTable('Despesa', 'tbodyDespesas');
  renderFinTable('Conta a Pagar', 'tbodyPagar');
  renderFinTable('Conta a Receber', 'tbodyReceber');
  renderFinTable('Investimento', 'tbodyInvest');
  renderFinTable('Imposto', 'tbodyImpostos');

  // Charts
  setTimeout(() => {
    destroyChart('recDesp');
    const c1 = document.getElementById('chartRecDesp');
    if (c1) charts['recDesp'] = new Chart(c1, {
      type:'bar',
      data:{ labels:['Jan','Fev','Mar','Abr','Mai'], datasets:[
        { label:'Receitas', data:[42000,48000,55000,61000,87420], backgroundColor:COLORS.green, borderRadius:4 },
        { label:'Despesas', data:[28000,32000,34000,38000,49000], backgroundColor:COLORS.red, borderRadius:4 }
      ]},
      options: chartOpts({ prefix:'R$ ' })
    });

    destroyChart('fluxoMes');
    const c2 = document.getElementById('chartFluxoMes');
    if (c2) charts['fluxoMes'] = new Chart(c2, {
      type:'line',
      data:{ labels:['Sem 1','Sem 2','Sem 3','Sem 4'], datasets:[
        { label:'Saldo', data:[18000,32000,26000,38740], borderColor:COLORS.gold, backgroundColor:'rgba(201,162,39,0.1)', fill:true, tension:0.4, pointRadius:5 }
      ]},
      options: chartOpts({ prefix:'R$ ' })
    });
  }, 100);
}

function renderFinTable(tipo, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const items = DB.financeiro.filter(f => f.tipo === tipo);
  if (!items.length) { tbody.innerHTML = emptyRow(6); return; }
  tbody.innerHTML = items.map(f => `<tr>
    <td>${f.data}</td>
    <td>${f.desc}</td>
    <td>${f.categoria}</td>
    <td><strong>R$ ${f.valor.toLocaleString('pt-BR')}</strong></td>
    <td><span class="status-badge ${f.status.toLowerCase()}">${f.status}</span></td>
    <td><div class="actions-cell">
      <button class="btn-icon del" onclick="deleteFinanceiro(${f.id})"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`).join('');
}

// ============================
// KANBAN
// ============================
function renderKanban() {
  ['todo','doing','review','done'].forEach(s => {
    const cards = document.getElementById('cards-' + s);
    const count = document.getElementById('count-' + s);
    if (!cards) return;
    const tasks = DB.tarefas.filter(t => t.status === s);
    if (count) count.textContent = tasks.length;
    if (!tasks.length) { cards.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-3);font-size:12px">Arraste tarefas aqui</div>'; return; }
    cards.innerHTML = tasks.map(t => {
      const done = (t.checkDone || []).filter(Boolean).length;
      const total = (t.checklist || []).length;
      const pct = total ? Math.round(done/total*100) : 0;
      const isLate = t.data && new Date(t.data) < new Date() && t.status !== 'done';
      return `<div class="kanban-card" draggable="true" ondragstart="drag(event,${t.id})" onclick="openTarefaDetail(${t.id})">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div class="card-title">${t.titulo}</div>
          <button class="btn-icon-delete" onclick="event.stopPropagation(); if(confirm('Excluir tarefa?')) deleteTarefa(${t.id})" title="Excluir tarefa"><i class="fas fa-trash"></i></button>
        </div>
        <div class="card-meta">
          <span class="card-resp"><i class="fas fa-user"></i> ${t.resp}</span>
          <span class="priority-badge ${t.prioridade}">${t.prioridade}</span>
        </div>
        <div class="card-meta" style="margin-top:6px">
          <span class="card-date ${isLate?'late':''}"><i class="fas fa-calendar"></i> ${t.data||'—'}</span>
        </div>
        ${total ? `<div class="card-checklist">
          <span>${done}/${total} itens</span>
          <div class="card-checklist-bar"><div class="card-checklist-fill" style="width:${pct}%"></div></div>
        </div>` : ''}
      </div>`;
    }).join('');
  });
}

let dragTaskId = null;
function drag(e, id) { dragTaskId = id; e.dataTransfer.effectAllowed = 'move'; }
function allowDrop(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
async function drop(e, status) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!dragTaskId) return;
  const t = DB.tarefas.find(t => t.id === dragTaskId);
  if (t) {
    await apiRequest('PUT', `/api/tarefas/${dragTaskId}`, { status });
    t.status = status;
    renderKanban();
    showToast('Tarefa movida!', 'info');
  }
  dragTaskId = null;
}
document.querySelectorAll('.kanban-col').forEach(col => col.addEventListener('dragleave', e => e.currentTarget.classList.remove('drag-over')));

// ============================
// AVISOS
// ============================
const avisoIcons = { 'Chegada de Produto':'fas fa-box', 'Reunião':'fas fa-users', 'Treinamento':'fas fa-graduation-cap', 'Comunicado Geral':'fas fa-bullhorn' };

function renderAvisos() {
  const wall = document.getElementById('avisosWall');
  if (!wall) return;
  if (!DB.avisos.length) { wall.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>Nenhum aviso publicado</p></div>'; return; }
  wall.innerHTML = DB.avisos.map(a => `
    <div class="aviso-card ${a.prioridade}">
      <div class="aviso-type-icon"><i class="${avisoIcons[a.tipo]||'fas fa-bell'}"></i></div>
      <div class="aviso-titulo">${a.titulo}</div>
      <div class="aviso-msg">${a.msg}</div>
      <div class="aviso-footer">
        <span><i class="fas fa-calendar"></i> ${a.data}</span>
        <span><i class="fas fa-users"></i> ${a.dest}</span>
        <span class="status-badge ${a.prioridade}">${a.prioridade}</span>
        <button class="btn-icon del" onclick="deleteAviso(${a.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('');
  el('avisosBadge', DB.avisos.length);
}

// ============================
// METAS
// ============================
function renderMetas() {
  const grid = document.getElementById('metasGrid');
  if (!grid) return;
  if (!DB.metas.length) { grid.innerHTML = '<div class="empty-state"><i class="fas fa-bullseye"></i><p>Nenhuma meta cadastrada</p></div>'; return; }
  grid.innerHTML = DB.metas.map(m => {
    const pct = Math.min(Math.round(m.atual / m.valor * 100), 100);
    const fmt = v => typeof v === 'number' && v > 100 ? 'R$ ' + v.toLocaleString('pt-BR') : v + (v < 100 ? (m.tipo==='ROI'?'%':'') : '');
    return `<div class="meta-card">
      <div class="meta-header">
        <div><div class="meta-title">${m.titulo}</div><div class="meta-resp"><i class="fas fa-user"></i> ${m.resp}</div></div>
        <span class="meta-type-badge ${m.tipo.toLowerCase()}">${m.tipo}</span>
      </div>
      <div class="meta-values">
        <span class="meta-atual">${fmt(m.atual)}</span>
        <span class="meta-goal">Meta: ${fmt(m.valor)}</span>
      </div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="meta-percent">${pct}% concluído</span>
        <button class="btn-icon del" onclick="deleteMeta(${m.id})"><i class="fas fa-trash"></i></button>
      </div>
      <div class="meta-prazo"><i class="fas fa-calendar"></i> Prazo: ${m.prazo}</div>
    </div>`;
  }).join('');
}

// ============================
// FUNCIONÁRIOS
// ============================
function renderFuncionarios() {
  const grid = document.getElementById('funcionariosGrid');
  if (!grid) return;
  grid.innerHTML = DB.funcionarios.map(f => {
    const initials = f.nome.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const statusClass = f.status === 'Ativo' ? 'online' : f.status === 'Férias' ? 'ferias' : 'offline';
    return `<div class="employee-card">
      <div class="emp-avatar">${initials}</div>
      <div class="emp-name">${f.nome}</div>
      <div class="emp-cargo">${f.cargo}</div>
      <div class="emp-depto"><span class="emp-status-dot ${statusClass}"></span>${f.depto} — ${f.status}</div>
      <div class="emp-stats">
        <div class="emp-stat"><span class="emp-stat-val">${f.tarefas}</span><span class="emp-stat-lbl">Tarefas</span></div>
        <div class="emp-stat"><span class="emp-stat-val">${f.concluidas}</span><span class="emp-stat-lbl">Feitas</span></div>
        <div class="emp-stat"><span class="emp-stat-val">${Math.round(f.concluidas/f.tarefas*100)}%</span><span class="emp-stat-lbl">Taxa</span></div>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 10px;">
        <button class="btn-primary" onclick="abrirAlterarSenha(${f.id}, '${f.nome}', '${f.email}')" style="flex: 1; padding: 8px; font-size: 12px;"><i class="fas fa-key"></i> Alterar Senha</button>
        <button class="btn-icon-delete" onclick="if(confirm('Deletar ${f.nome}? Ele perderá acesso ao sistema!')) deleteFuncionario(${f.id})" title="Deletar funcionário"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');

  // Desempenho
  const dGrid = document.getElementById('desempenhoGrid');
  if (dGrid) dGrid.innerHTML = DB.funcionarios.map(f => {
    const perf = Math.round(f.concluidas/f.tarefas*100);
    return `<div class="desempenho-card">
      <div class="desemp-header">
        <div class="desemp-avatar">${f.nome.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
        <div><div class="desemp-name">${f.nome}</div><div class="desemp-cargo">${f.cargo}</div></div>
      </div>
      <div class="desemp-metrics">
        ${metric('Produtividade', perf)}
        ${metric('Pontualidade', 80 + Math.floor(Math.random()*20))}
        ${metric('Qualidade', 75 + Math.floor(Math.random()*25))}
        ${metric('Colaboração', 70 + Math.floor(Math.random()*30))}
      </div>
    </div>`;
  }).join('');

  // Presença
  const tP = document.getElementById('tbodyPresenca');
  if (tP) tP.innerHTML = DB.funcionarios.filter(f=>f.status==='Ativo').map(f => `<tr>
    <td><strong>${f.nome}</strong></td>
    <td>08:${String(Math.floor(Math.random()*30)).padStart(2,'0')}</td>
    <td>18:${String(Math.floor(Math.random()*30)).padStart(2,'0')}</td>
    <td>9h ${String(Math.floor(Math.random()*60)).padStart(2,'0')}min</td>
    <td><span class="status-badge pago">Presente</span></td>
  </tr>`).join('');
}

function metric(label, val) {
  return `<div class="desemp-metric-row">
    <span class="desemp-metric-label">${label}</span>
    <div class="desemp-metric-bar"><div class="desemp-metric-fill" style="width:${val}%"></div></div>
    <span class="desemp-metric-val">${val}%</span>
  </div>`;
}

// ============================
// MARKETING
// ============================
function renderMarketing() {
  const tbody = document.getElementById('tbodyCampanhas');
  if (tbody) tbody.innerHTML = DB.campanhas.map(c => {
    const roi = ((c.receita - c.invest) / c.invest * 100).toFixed(0);
    const roas = c.invest > 0 ? (c.receita / c.invest).toFixed(1) : '—';
    const cac = c.conv > 0 ? (c.invest / c.conv).toFixed(2) : '—';
    return `<tr>
      <td><strong>${c.canal}</strong></td>
      <td>${c.nome}</td>
      <td>R$ ${c.invest.toLocaleString('pt-BR')}</td>
      <td>${c.cliques ? c.cliques.toLocaleString('pt-BR') : '—'}</td>
      <td>${c.conv}</td>
      <td>R$ ${c.receita.toLocaleString('pt-BR')}</td>
      <td>R$ ${cac}</td>
      <td><strong class="text-gold">${roas}x</strong></td>
      <td><span class="text-green fw-700">${roi}%</span></td>
    </tr>`;
  }).join('');

  // Charts
  setTimeout(() => {
    destroyChart('mktInvest');
    const c1 = document.getElementById('chartMktInvest');
    if (c1) charts['mktInvest'] = new Chart(c1, {
      type:'doughnut',
      data:{ labels:['Meta Ads','Google Ads','Shopee','ML','Site'], datasets:[{ data:[5300,3200,600,1200,0], backgroundColor:[COLORS.blue,COLORS.gold,COLORS.orange,COLORS.red,COLORS.green], borderWidth:0 }] },
      options:{ responsive:true, cutout:'60%', plugins:{ legend:{ position:'bottom', labels:{ padding:12, usePointStyle:true } } } }
    });

    destroyChart('mktROI');
    const c2 = document.getElementById('chartMktROI');
    if (c2) charts['mktROI'] = new Chart(c2, {
      type:'bar',
      data:{ labels:DB.campanhas.map(c=>c.nome.slice(0,20)), datasets:[{ label:'ROI %', data:DB.campanhas.map(c=>((c.receita-c.invest)/c.invest*100).toFixed(0)), backgroundColor:COLORS.green, borderRadius:4 }] },
      options: chartOpts({ suffix:'%' })
    });

    destroyChart('metaAds');
    const c3 = document.getElementById('chartMetaAds');
    if (c3) charts['metaAds'] = new Chart(c3, {
      type:'line',
      data:{ labels:['Jan','Fev','Mar','Abr','Mai'], datasets:[
        { label:'Investimento', data:[2800,3200,3600,4100,5300], borderColor:COLORS.blue, tension:0.4, fill:false },
        { label:'Receita', data:[18000,22000,26000,31200,38200], borderColor:COLORS.green, tension:0.4, fill:false }
      ]},
      options: chartOpts({ prefix:'R$ ' })
    });

    // Marketplaces
    const tM = document.getElementById('tbodyMktplaces');
    if (tM) tM.innerHTML = [
      { p:'Mercado Livre', v:287, r:24395, t:14 }, { p:'Shopee', v:341, r:18410, t:12 }, { p:'Site', v:108, r:12800, t:0 }
    ].map(m => `<tr>
      <td><strong>${m.p}</strong></td>
      <td>${m.v} pedidos</td>
      <td>R$ ${m.r.toLocaleString('pt-BR')}</td>
      <td>${m.t}%</td>
      <td>R$ ${Math.round(m.r*(1-m.t/100)).toLocaleString('pt-BR')}</td>
    </tr>`).join('');
  }, 100);
}

// ============================
// CRM
// ============================
function renderCRM() {
  // Funil
  const funil = document.getElementById('funilStages');
  if (funil) {
    const stages = [
      { label:'Novo Lead', count:18, value:'R$ 8.200' },
      { label:'Contato', count:12, value:'R$ 5.400' },
      { label:'Proposta', count:8, value:'R$ 4.100' },
      { label:'Negociação', count:5, value:'R$ 2.800' },
      { label:'Cliente', count:3, value:'R$ 1.890' },
    ];
    funil.innerHTML = stages.map(s => `
      <div class="funil-stage">
        <div class="funil-count">${s.count}</div>
        <div class="funil-label">${s.label}</div>
        <div class="funil-value">${s.value}</div>
      </div>`).join('');
  }

  const clientes = DB.clientes.filter(c => c.tipo === 'Cliente');
  const leads = DB.clientes.filter(c => c.tipo === 'Lead');

  const tC = document.getElementById('tbodyClientes');
  if (tC) tC.innerHTML = clientes.map(c => `<tr>
    <td><strong>${c.nome}</strong></td>
    <td>${c.email}</td>
    <td>${c.tel}</td>
    <td>${c.compras}</td>
    <td><strong class="text-gold">R$ ${c.totalGasto.toLocaleString('pt-BR')}</strong></td>
    <td>${c.ultimaCompra}</td>
    <td><div class="actions-cell">
      <button class="btn-icon"><i class="fas fa-eye"></i></button>
      <button class="btn-icon del" onclick="deleteCliente(${c.id})"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`).join('');

  const tL = document.getElementById('tbodyLeads');
  if (tL) tL.innerHTML = leads.map(c => `<tr>
    <td><strong>${c.nome}</strong></td>
    <td>${c.email}</td>
    <td>${c.origem}</td>
    <td><span class="status-badge pendente">${c.estagio}</span></td>
    <td>—</td>
    <td><div class="actions-cell">
      <button class="btn-icon del" onclick="deleteCliente(${c.id})"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`).join('');

  const tF = document.getElementById('tbodyFornCRM');
  if (tF) tF.innerHTML = DB.fornecedores.map(f => `<tr>
    <td><strong>${f.nome}</strong></td><td>${f.cnpj}</td><td>Suplementos</td>
    <td>${f.contato}</td><td>${f.prazo}</td>
    <td><div class="actions-cell"><button class="btn-icon del" onclick="deleteFornCRM(${f.id})"><i class="fas fa-trash"></i></button></div></td>
  </tr>`).join('');
}

// ============================
// COMPRAS
// ============================
function renderCompras() {
  const tC = document.getElementById('tbodyCompras');
  if (tC) tC.innerHTML = DB.compras.map(c => `<tr>
    <td>${c.data}</td>
    <td><strong>${c.fornecedor}</strong></td>
    <td>${c.produtos}</td>
    <td><strong>R$ ${c.total.toLocaleString('pt-BR')}</strong></td>
    <td><span class="status-badge ${c.status.toLowerCase()}">${c.status}</span></td>
    <td><div class="actions-cell"><button class="btn-icon del" onclick="deleteCompra(${c.id})"><i class="fas fa-trash"></i></button></div></td>
  </tr>`).join('');

  const tF = document.getElementById('tbodyFornecedores');
  if (tF) tF.innerHTML = DB.fornecedores.map(f => `<tr>
    <td><strong>${f.nome}</strong></td>
    <td><code style="font-size:12px">${f.cnpj}</code></td>
    <td>${f.contato}</td>
    <td>${f.tel}</td>
    <td>${f.email}</td>
    <td><div class="actions-cell">
      <button class="btn-icon del" onclick="deleteFornecedor(${f.id})"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`).join('');

  const tE = document.getElementById('tbodyEntradas');
  if (tE) {
    const entradas = [
      { data:'2025-05-27', prod:'Whey Protein 900g', qtd:50, custo:89, total:4450 },
      { data:'2025-05-25', prod:'Shaker 600ml', qtd:100, custo:9, total:900 },
      { data:'2025-05-25', prod:'Elástico Resistência Kit', qtd:20, custo:35, total:700 },
    ];
    tE.innerHTML = entradas.map(e => `<tr>
      <td>${e.data}</td><td><strong>${e.prod}</strong></td><td>${e.qtd}</td>
      <td>R$ ${e.custo}</td><td><strong>R$ ${e.total.toLocaleString('pt-BR')}</strong></td>
      <td><div class="actions-cell"><button class="btn-icon"><i class="fas fa-eye"></i></button></div></td>
    </tr>`).join('');
  }
}

// ============================
// NOTIFICATIONS
// ============================
function buildNotifications() {
  const baixo = DB.produtos.filter(p => p.qtd <= p.qtdMin);
  DB.notificacoes = [
    ...baixo.map(p => ({ icon:'fa-boxes-stacked', text:`Estoque baixo: ${p.nome} (${p.qtd} un.)`, time:'agora', color:'warning' })),
    { icon:'fa-bell', text:'Nova reunião agendada para sexta 14h', time:'2h atrás', color:'info' },
    { icon:'fa-check', text:'Meta de vendas atingiu 93.4%', time:'3h atrás', color:'success' },
  ];

  const list = document.getElementById('notifList');
  if (list) list.innerHTML = DB.notificacoes.map(n => `
    <div class="notif-item">
      <i class="fas ${n.icon}" style="color:var(--${n.color==='warning'?'gold':n.color==='success'?'green-light':n.color==='info'?'blue':'text-2'})"></i>
      ${n.text}
      <div class="notif-time">${n.time}</div>
    </div>`).join('');

  if (DB.notificacoes.length) document.getElementById('notifDot').style.display = 'block';
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('hidden');
}

function clearNotifs() {
  document.getElementById('notifList').innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-3)">Nenhuma notificação</div>';
  document.getElementById('notifDot').style.display = 'none';
  document.getElementById('notifPanel').classList.add('hidden');
}

// ============================
// TABS
// ============================
function switchTab(module, tab, btn) {
  const prefix = module + '-';
  document.querySelectorAll('[id^="' + prefix + '"]').forEach(el => {
    if (el.classList.contains('tab-content')) el.classList.remove('active');
  });
  const target = document.getElementById(prefix + tab);
  if (target) target.classList.add('active');

  const parent = btn.closest('.tabs-bar');
  if (parent) parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  if (module === 'mkt') { setTimeout(renderMarketing, 50); }
}

// ============================
// MODALS
// ============================
function openModal(id) {
  const m = document.getElementById(id);
  if(!m) return;
  // Fechar todos os outros modais primeiro
  document.querySelectorAll('.modal-overlay.active').forEach(mo => {
    if(mo.id !== id) mo.classList.remove('active');
  });
  m.classList.add('active');
  m.style.pointerEvents = 'auto';
}

function closeModal(id) {
  const m = document.getElementById(id);
  if(m) {
    m.classList.remove('active');
    // Força remover pointer-events após transição
    setTimeout(() => {
      if(!m.classList.contains('active')) {
        m.style.pointerEvents = 'none';
      }
    }, 250);
  }
}

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => {
    if(e.target === m) {
      closeModal(m.id);
    }
  });
});

// ============================
// SAVE HANDLERS
// ============================
async function saveFinanceiro() {
  const tipo = val('finTipo'), desc = val('finDesc'), valor = parseFloat(val('finValor')), data = val('finData'), cat = val('finCategoria'), status = val('finStatus');
  if (!desc || !valor) return showToast('Preencha todos os campos', 'error');

  const transacao = { tipo, descricao: desc, categoria: cat, valor, data, status };
  const result = await apiRequest('POST', '/api/financeiro', transacao);
  if (result) {
    DB.financeiro.push({ id: result.id, tipo, desc, categoria:cat, valor, data, status });
    closeModal('modalFinanceiro');
    renderFinanceiro();
    showToast('Transação registrada!', 'success');
  }
}

async function saveProduto() {
  const nome=val('prodNome'), sku=val('prodSKU'), cat=val('prodCategoria'), forn=val('prodFornecedor');
  const qtd=parseInt(val('prodQtd')||0), qtdMin=parseInt(val('prodQtdMin')||10);
  const custo=parseFloat(val('prodCusto')||0), venda=parseFloat(val('prodVenda')||0);
  if (!nome) return showToast('Informe o nome do produto', 'error');

  const produto = {
    nome, sku, categoria: cat, fornecedor: forn, qtd, qtd_minima: qtdMin, custo, venda
  };

  const result = await apiRequest('POST', '/api/produtos', produto);
  if (result) {
    DB.produtos.push({ id: result.id, nome, sku, categoria:cat, fornecedor:forn, qtd, qtdMin, custo, venda });
    closeModal('modalProduto');
    renderEstoque();
    showToast('Produto cadastrado!', 'success');
  }
}

async function saveTarefa() {
  const titulo=val('tarTitulo'), desc=val('tarDesc'), resp=val('tarResp'), data=val('tarData'), prioridade=val('tarPrioridade'), status=val('tarStatus');
  const cl = val('tarChecklist').split('\n').filter(Boolean);
  if (!titulo) return showToast('Informe o título', 'error');

  const tarefa = {
    titulo,
    descricao: desc,
    responsavel: resp,
    data_limite: data,
    prioridade,
    status,
    checklist: JSON.stringify(cl),
    checkDone: JSON.stringify(cl.map(()=>false))
  };

  const result = await apiRequest('POST', '/api/tarefas', tarefa);
  console.log('📝 Resultado POST /api/tarefas:', result);

  if (result && result.id) {
    console.log('✅ Tarefa salva com sucesso! ID:', result.id);

    closeModal('modalTarefa');
    document.getElementById('tarForm')?.reset();
    showToast('Tarefa criada!', 'success');

    // Recarregar tarefas do servidor
    console.log('🔄 Recarregando tarefas do servidor...');
    await loadDB();
    console.log('✅ Tarefas recarregadas:', DB.tarefas.length);
    renderKanban();
  } else {
    showToast('Erro ao salvar tarefa', 'error');
  }
}

async function saveAviso() {
  const tipo=val('avisoTipo'), titulo=val('avisoTitulo'), msg=val('avisoMsg'), dest=val('avDest'), prioridade=val('avPrioridade');
  if (!titulo || !msg) return showToast('Preencha título e mensagem', 'error');

  const aviso = { tipo, titulo, mensagem: msg, destinatario: dest, prioridade, data: new Date().toISOString().slice(0,10) };
  const result = await apiRequest('POST', '/api/avisos', aviso);
  if (result) {
    DB.avisos.unshift({ id: result.id, tipo, titulo, msg, dest, prioridade, data: new Date().toISOString().slice(0,10) });
    closeModal('modalAviso');
    renderAvisos();
    showToast('Aviso publicado!', 'success');
    addNotif({ icon:'fa-bell', text:'Novo aviso: ' + titulo, time:'agora', color:'info' });
  }
}

async function saveMeta() {
  const tipo=val('metaTipo'), titulo=val('metaTitulo'), valor=parseFloat(val('metaValor')), atual=parseFloat(val('metaAtual')||0), prazo=val('metaPrazo'), resp=val('metaResp');
  if (!titulo || !valor) return showToast('Preencha todos os campos', 'error');

  const meta = { tipo, titulo, valor, valor_atual: atual, prazo, responsavel: resp };
  const result = await apiRequest('POST', '/api/metas', meta);
  if (result) {
    DB.metas.push({ id: result.id, tipo, titulo, valor, atual, prazo, resp });
    closeModal('modalMeta');
    renderMetas();
    showToast('Meta criada!', 'success');
  }
}

async function saveFuncionario() {
  const nome=val('funcNome'), cargo=val('funcCargo'), depto=val('funcDepto'), tel=val('funcTel'), email=val('funcEmail'), contratacao=val('funcData'), salario=parseFloat(val('funcSalario')||0), status=val('funcStatus');

  if (!nome) return showToast('Informe o nome', 'error');
  if (!email) return showToast('Informe o e-mail', 'error');

  // Gerar senha automaticamente se não existir
  let senha = val('funcSenha');
  if (!senha) {
    senha = gerarSenha(8);
    document.getElementById('funcSenha').value = senha;
  }

  // Coletar permissões
  const permissoes = {
    dashboard: document.getElementById('permDashboard')?.checked || false,
    vendas: document.getElementById('permVendas')?.checked || false,
    financeiro: document.getElementById('permFinanceiro')?.checked || false,
    estoque: document.getElementById('permEstoque')?.checked || false,
    compras: document.getElementById('permCompras')?.checked || false,
    funcionarios: document.getElementById('permFuncionarios')?.checked || false,
    tarefas: document.getElementById('permTarefas')?.checked || false,
    avisos: document.getElementById('permAvisos')?.checked || false,
    metas: document.getElementById('permMetas')?.checked || false,
    marketing: document.getElementById('permMarketing')?.checked || false,
    crm: document.getElementById('permCRM')?.checked || false,
    nuvemshop: document.getElementById('permNuvemshop')?.checked || false
  };

  console.log('📝 Salvando funcionário:', nome, email);
  console.log('🔑 Senha:', senha);
  console.log('📋 Permissões:', permissoes);

  const funcionario = {
    nome,
    cargo,
    departamento: depto,
    telefone: tel,
    email,
    data_contratacao: contratacao,
    salario,
    status,
    senha: btoa(senha),
    permissoes: JSON.stringify(permissoes)
  };

  const result = await apiRequest('POST', '/api/funcionarios', funcionario);
  console.log('✅ Resultado POST:', result);

  if (result && result.id) {
    console.log('✅ Funcionário salvo com ID:', result.id);
    DB.funcionarios.push({
      id: result.id,
      nome,
      cargo,
      depto,
      tel,
      email,
      contratacao,
      salario,
      status,
      permissoes,
      tarefas: 0,
      concluidas: 0
    });

    // Limpar formulário
    document.getElementById('funcNome').value = '';
    document.getElementById('funcCargo').value = '';
    document.getElementById('funcTel').value = '';
    document.getElementById('funcEmail').value = '';
    document.getElementById('funcSenha').value = '';
    document.getElementById('funcData').value = '';
    document.getElementById('funcSalario').value = '';

    // Resetar checkboxes
    document.querySelectorAll('#modalFuncionario input[type="checkbox"]').forEach(cb => {
      if (cb.id.startsWith('perm')) cb.checked = (cb.id === 'permDashboard' || cb.id === 'permVendas' || cb.id === 'permTarefas');
    });

    closeModal('modalFuncionario');
    renderFuncionarios();
    showToast(`✅ Funcionário criado!\n📧 Email: ${email}\n🔑 Senha: ${senha}`, 'success');
  } else {
    showToast('Erro ao salvar funcionário', 'error');
  }
}

function gerarSenha(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let senha = '';
  for (let i = 0; i < length; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

async function saveCampanha() {
  const canal=val('campCanal'), nome=val('campNome'), invest=parseFloat(val('campInvest')||0), cliques=parseInt(val('campCliques')||0), conv=parseInt(val('campConv')||0), receita=parseFloat(val('campReceita')||0), periodo=val('campPeriodo'), status=val('campStatus');
  if (!nome) return showToast('Informe o nome da campanha', 'error');

  const campanha = { canal, nome, investimento: invest, cliques, conversoes: conv, receita, periodo, status };
  const result = await apiRequest('POST', '/api/campanhas', campanha);
  if (result) {
    DB.campanhas.push({ id: result.id, canal, nome, invest, cliques, conv, receita, periodo, status });
    closeModal('modalCampanha');
    renderMarketing();
    showToast('Campanha registrada!', 'success');
  }
}

async function saveCliente() {
  const tipo=val('cliTipo'), nome=val('cliNome'), email=val('cliEmail'), tel=val('cliTel'), origem=val('cliOrigem'), estagio=val('cliEstagio'), obs=val('cliObs');
  if (!nome) return showToast('Informe o nome', 'error');

  const cliente = { tipo, nome, email, telefone: tel, origem, estagio, observacoes: obs };
  const result = await apiRequest('POST', '/api/clientes', cliente);
  if (result) {
    DB.clientes.push({ id: result.id, tipo, nome, email, tel, origem, estagio, obs, compras:0, totalGasto:0, ultimaCompra:'—' });
    closeModal('modalCliente');
    renderCRM();
    showToast('Contato adicionado!', 'success');
  }
}

async function saveCompra() {
  const forn=val('compForn'), data=val('compData'), prod=val('compProd'), total=parseFloat(val('compTotal')||0), status=val('compStatus'), entrega=val('compEntrega');
  if (!forn) return showToast('Informe o fornecedor', 'error');

  const compra = { fornecedor: forn, data, produtos: prod, total, status, data_entrega: entrega };
  const result = await apiRequest('POST', '/api/compras', compra);
  if (result) {
    DB.compras.push({ id: result.id, fornecedor:forn, data, produtos:prod, total, status, entrega });
    closeModal('modalCompra');
    renderCompras();
    showToast('Compra registrada!', 'success');
  }
}

async function saveFornecedor() {
  const nome=val('fornNome'), cnpj=val('fornCNPJ'), contato=val('fornContato'), tel=val('fornTel'), email=val('fornEmail'), prazo=val('fornPrazo');
  if (!nome) return showToast('Informe o nome', 'error');

  const fornecedor = { nome, cnpj, contato, telefone: tel, email, prazo };
  const result = await apiRequest('POST', '/api/fornecedores', fornecedor);
  if (result) {
    DB.fornecedores.push({ id: result.id, nome, cnpj, contato, tel, email, prazo });
    closeModal('modalFornecedor');
    renderCompras();
    showToast('Fornecedor cadastrado!', 'success');
  }
}

// ============================
// DELETE HANDLERS
// ============================
async function deleteProduto(id) { if(!confirm('Excluir produto?')) return; await apiRequest('DELETE', `/api/produtos/${id}`); DB.produtos = DB.produtos.filter(p=>p.id!==id); renderEstoque(); showToast('Produto removido','warning'); }
async function deleteFinanceiro(id) { await apiRequest('DELETE', `/api/financeiro/${id}`); DB.financeiro = DB.financeiro.filter(f=>f.id!==id); renderFinanceiro(); showToast('Transação removida','warning'); }
async function deleteTarefa(id) {
  console.log('🗑️ Deletando tarefa:', id);
  const result = await apiRequest('DELETE', `/api/tarefas/${id}`);
  console.log('✅ Resultado DELETE:', result);

  if (result && result.ok) {
    showToast('Tarefa removida!', 'warning');

    // Recarregar dados do servidor
    console.log('🔄 Recarregando tarefas...');
    await loadDB();
    console.log('✅ Tarefas recarregadas:', DB.tarefas.length);
    renderKanban();
  } else {
    showToast('Erro ao deletar tarefa', 'error');
  }
}

async function deleteFuncionario(id) {
  console.log('🗑️ Deletando funcionário:', id);
  const result = await apiRequest('DELETE', `/api/funcionarios/${id}`);

  if (result && result.ok) {
    showToast('Funcionário removido! Acesso revogado!', 'warning');
    await loadDB();
    renderFuncionarios();
  } else {
    showToast('Erro ao deletar funcionário', 'error');
  }
}

function abrirAlterarSenha(id, nome, email) {
  console.log('🔑 Abrindo alterar senha para:', nome);
  window.altSenhaFuncId = id;
  document.getElementById('altSenhaFuncNome').value = nome;
  document.getElementById('altSenhaFuncEmail').value = email;
  document.getElementById('altSenhaNova').value = '';
  openModal('modalAlterarSenha');
}

async function salvarNovasenha() {
  const novasenha = val('altSenhaNova').trim();
  const funcId = window.altSenhaFuncId;

  if (!funcId) return showToast('Erro: funcionário não identificado', 'error');

  // Gerar senha se não informada
  let senhaFinal = novasenha;
  if (!senhaFinal) {
    senhaFinal = gerarSenha(8);
  }

  console.log('🔄 Alterando senha para:', funcId);
  console.log('🔑 Nova senha:', senhaFinal);

  const result = await apiRequest('PUT', `/api/funcionarios/${funcId}`, {
    senha: btoa(senhaFinal)  // Criptografia básica
  });

  if (result) {
    closeModal('modalAlterarSenha');
    showToast(`✅ Senha alterada!\n🔑 Nova senha: ${senhaFinal}`, 'success');
    await loadDB();
    renderFuncionarios();
  } else {
    showToast('Erro ao alterar senha', 'error');
  }
}
async function deleteAviso(id) { await apiRequest('DELETE', `/api/avisos/${id}`); DB.avisos = DB.avisos.filter(a=>a.id!==id); renderAvisos(); showToast('Aviso removido','warning'); }
async function deleteMeta(id) { await apiRequest('DELETE', `/api/metas/${id}`); DB.metas = DB.metas.filter(m=>m.id!==id); renderMetas(); showToast('Meta removida','warning'); }
async function deleteCliente(id) { await apiRequest('DELETE', `/api/clientes/${id}`); DB.clientes = DB.clientes.filter(c=>c.id!==id); renderCRM(); showToast('Contato removido','warning'); }
async function deleteFornCRM(id) { await apiRequest('DELETE', `/api/fornecedores/${id}`); DB.fornecedores = DB.fornecedores.filter(f=>f.id!==id); renderCRM(); }
async function deleteFornecedor(id) { await apiRequest('DELETE', `/api/fornecedores/${id}`); DB.fornecedores = DB.fornecedores.filter(f=>f.id!==id); renderCompras(); }
async function deleteCompra(id) { await apiRequest('DELETE', `/api/compras/${id}`); DB.compras = DB.compras.filter(c=>c.id!==id); renderCompras(); }

// ============================
// RELATÓRIOS
// ============================
function gerarRelatorio(tipo) {
  const prev = document.getElementById('relatorioPreview');
  if (!prev) return;
  prev.classList.remove('hidden');

  const data = {
    financeiro: { titulo:'Relatório Financeiro', items: DB.financeiro },
    estoque: { titulo:'Relatório de Estoque', items: DB.produtos },
    marketing: { titulo:'Relatório de Marketing', items: DB.campanhas },
    funcionarios: { titulo:'Relatório de Funcionários', items: DB.funcionarios },
    vendas: { titulo:'Relatório de Vendas', items: [] },
  };

  const r = data[tipo];
  prev.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 style="font-size:18px;font-weight:700">${r.titulo} — Junho/2025</h3>
      <div style="display:flex;gap:8px">
        <button class="btn-primary btn-sm" onclick="exportPDF('${tipo}')"><i class="fas fa-file-pdf"></i> Exportar PDF</button>
        <button class="btn-outline btn-sm" onclick="exportExcel('${tipo}')"><i class="fas fa-file-excel"></i> Exportar Excel</button>
      </div>
    </div>
    <div style="background:var(--bg-2);border-radius:8px;padding:16px;font-size:13px;color:var(--text-2)">
      <p>✅ Relatório gerado com ${r.items.length} registros</p>
      <p style="margin-top:8px">📅 Período: 01/06/2025 — 30/06/2025 &nbsp;|&nbsp; Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
    </div>`;
  prev.scrollIntoView({ behavior:'smooth' });
}

function exportPDF(tipo) {
  showToast('Gerando PDF... (funcionalidade simulada)', 'info');
  setTimeout(() => showToast('PDF pronto para download!', 'success'), 1500);
}

function exportExcel(tipo) {
  showToast('Gerando Excel... (funcionalidade simulada)', 'info');
  setTimeout(() => showToast('Excel pronto para download!', 'success'), 1500);
}

// ============================
// IA — INTELLIGENCE PANEL
// ============================
const IA_ANSWERS = {
  'faturamento': () => {
    if (typeof VENDAS_DATA === 'undefined') return 'Dados de vendas não carregados';
    const mesAtual = 5; // Maio (índice 4, mas 1-based = 5)
    const faturamento2026 = (VENDAS_DATA.faturamento[2026] || [])[mesAtual-1] || 0;
    const faturamento2025 = (VENDAS_DATA.faturamento[2025] || [])[mesAtual-1] || 0;
    const crescimento = faturamento2025 > 0 ? ((faturamento2026 - faturamento2025) / faturamento2025 * 100).toFixed(1) : 0;

    return `💰 <strong>Faturamento de Maio/2026:</strong><br><br>
• Total: <strong>R$ ${faturamento2026.toLocaleString('pt-BR')}</strong><br>
• Comparativo: Maio/2025 foi R$ ${faturamento2025.toLocaleString('pt-BR')}<br>
• Crescimento: <strong>${crescimento > 0 ? '+' : ''}${crescimento}%</strong><br><br>
${crescimento > 0 ? '📈 Crescimento positivo! Excelente performance!' : '📉 Atenção: queda em relação ao período anterior.'}`;
  },
  'produto mais vendeu': () => {
    const topProdutos = [...DB.produtos].sort((a,b) => ((b.qtd || 0) * (b.venda || 0)) - ((a.qtd || 0) * (a.venda || 0))).slice(0, 3);
    if (!topProdutos.length) return '📦 Nenhum produto cadastrado ainda';
    const totalVendas = topProdutos.reduce((a,b) => a + ((b.qtd || 0) * (b.venda || 0)), 0);
    return `🏆 <strong>Top 3 Produtos Mais Rentáveis:</strong><br><br>` +
      topProdutos.map((p, i) => {
        const emblemas = ['🥇', '🥈', '🥉'];
        const receita = (p.qtd || 0) * (p.venda || 0);
        return `${emblemas[i]} <strong>${p.nome}</strong> — ${p.qtd || 0} un. (R$ ${receita.toLocaleString('pt-BR')})`;
      }).join('<br>') +
      `<br><br>💡 Esses produtos representam R$ ${totalVendas.toLocaleString('pt-BR')} em receita potencial.`;
  },
  'roi': () => {
    if (typeof VENDAS_DATA === 'undefined') return 'Dados de investimento não carregados';
    const invest2024 = (VENDAS_DATA.investimento[2024] || []).reduce((a,b)=>a+b, 0);
    const invest2025 = (VENDAS_DATA.investimento[2025] || []).reduce((a,b)=>a+b, 0);
    const invest2026 = (VENDAS_DATA.investimento[2026] || []).reduce((a,b)=>a+b, 0);
    const fatur2024 = (VENDAS_DATA.faturamento[2024] || []).reduce((a,b)=>a+b, 0);
    const fatur2025 = (VENDAS_DATA.faturamento[2025] || []).reduce((a,b)=>a+b, 0);
    const fatur2026 = (VENDAS_DATA.faturamento[2026] || []).reduce((a,b)=>a+b, 0);

    const roi2024 = invest2024 > 0 ? ((fatur2024 / invest2024 - 1) * 100).toFixed(0) : 0;
    const roi2025 = invest2025 > 0 ? ((fatur2025 / invest2025 - 1) * 100).toFixed(0) : 0;
    const roi2026 = invest2026 > 0 ? ((fatur2026 / invest2026 - 1) * 100).toFixed(0) : 0;

    const melhorAno = Math.max(roi2024, roi2025, roi2026);
    return `📊 <strong>ROI por Ano (Retorno sobre Investimento):</strong><br><br>
• 2024: <strong>${roi2024}%</strong> (R$ ${fatur2024.toLocaleString('pt-BR')} faturado)<br>
• 2025: <strong>${roi2025}%</strong> (R$ ${fatur2025.toLocaleString('pt-BR')} faturado)<br>
• 2026: <strong>${roi2026}%</strong> (R$ ${fatur2026.toLocaleString('pt-BR')} faturado)<br><br>
🏆 <strong>Melhor ROI: ${melhorAno}%</strong><br><br>
💡 Isso significa que a cada R$ 1 investido, você retorna ${(melhorAno/100 + 1).toFixed(2)}x em faturamento.`;
  },
  'tarefa': () => {
    const atrasadas = DB.tarefas.filter(t => t.data && new Date(t.data) < new Date() && t.status !== 'done');
    return `⏰ <strong>Tarefas Atrasadas (${atrasadas.length}):</strong><br><br>` +
      (atrasadas.length ? atrasadas.map(t => `• <strong>${t.titulo}</strong> — resp: ${t.resp} — venc: ${t.data}`).join('<br>') : 'Nenhuma tarefa atrasada!') +
      `<br><br>💡 ${atrasadas.length > 0 ? 'Recomendo priorizar essas tarefas urgentemente.' : 'Parabéns, equipe em dia!'}`;
  },
  'funcionario': () => {
    const top = [...DB.funcionarios].sort((a,b) => b.concluidas - a.concluidas)[0];
    return `👑 <strong>Funcionário Mais Produtivo:</strong><br><br>
🥇 <strong>${top.nome}</strong> — ${top.cargo}<br>
• Tarefas Concluídas: <strong>${top.concluidas}/${top.tarefas}</strong><br>
• Taxa de Conclusão: <strong>${Math.round(top.concluidas/top.tarefas*100)}%</strong><br>
• Departamento: ${top.depto}<br><br>
🏆 Ranking completo:<br>${DB.funcionarios.sort((a,b)=>b.concluidas-a.concluidas).map((f,i)=>`${i+1}. ${f.nome} — ${f.concluidas} tarefas`).join('<br>')}`;
  },
  'estoque': () => {
    const criticos = DB.produtos.filter(p => p.qtd <= p.qtdMin);
    const semEst = DB.produtos.filter(p => p.qtd === 0);
    return `📦 <strong>Situação do Estoque:</strong><br><br>
• Total de produtos: ${DB.produtos.length}<br>
• Estoque normal: ${DB.produtos.length - criticos.length} produtos<br>
• ⚠️ Estoque baixo: <strong>${criticos.length} produtos</strong><br>
• ❌ Sem estoque: <strong>${semEst.length} produtos</strong><br><br>
🚨 <strong>Atenção imediata:</strong><br>${criticos.map(p=>`• ${p.nome}: ${p.qtd} unidades`).join('<br>')}<br><br>
💡 Recomendo realizar pedido de compra para esses produtos urgentemente.`;
  },
  'canal': () => {
    const campanhas = DB.campanhas;
    if (!campanhas.length) return '📊 Nenhuma campanha cadastrada ainda';

    const totalPorCanal = {};
    campanhas.forEach(c => {
      if (!totalPorCanal[c.canal]) totalPorCanal[c.canal] = { receita: 0, investimento: 0, conversoes: 0 };
      totalPorCanal[c.canal].receita += c.receita || 0;
      totalPorCanal[c.canal].investimento += c.investimento || 0;
      totalPorCanal[c.canal].conversoes += c.conversoes || 0;
    });

    const canaisOrdenados = Object.entries(totalPorCanal)
      .sort((a,b) => b[1].receita - a[1].receita)
      .map(([canal, dados]) => ({
        canal,
        receita: dados.receita,
        investimento: dados.investimento,
        roi: dados.investimento > 0 ? ((dados.receita / dados.investimento - 1) * 100).toFixed(0) : 0,
        conversoes: dados.conversoes
      }));

    return `📈 <strong>Performance por Canal de Venda:</strong><br><br>` +
      canaisOrdenados.map((c, i) => `${'🥇🥈🥉'[i]} <strong>${c.canal}</strong> — R$ ${c.receita.toLocaleString('pt-BR')} | ${c.conversoes} vendas | ROI ${c.roi}%`).join('<br>') +
      `<br><br>💡 Canais ordenados por receita. O ROI pode ajudar a otimizar seus gastos em publicidade.`;
  },
  'fluxo': () => {
    const rec = DB.financeiro.filter(f=>f.tipo==='Receita').reduce((a,b)=>a+b.valor,0);
    const desp = DB.financeiro.filter(f=>f.tipo==='Despesa').reduce((a,b)=>a+b.valor,0);
    return `💵 <strong>Fluxo de Caixa — Maio/2025:</strong><br><br>
• Receitas totais: <strong>R$ ${rec.toLocaleString('pt-BR')}</strong><br>
• Despesas totais: <strong>R$ ${desp.toLocaleString('pt-BR')}</strong><br>
• Saldo Líquido: <strong style="color:#22c55e">R$ ${(rec-desp).toLocaleString('pt-BR')}</strong><br><br>
📅 Contas a pagar este mês: R$ 4.200 (SupraNutri) + R$ 3.100 (Simples Nacional)<br><br>
💡 Fluxo de caixa <strong>positivo e saudável</strong>. Margem operacional de ${Math.round((rec-desp)/rec*100)}%.`;
  },
};

function askIA(question) {
  document.getElementById('iaInput').value = question;
  sendIA();
}

function sendIA() {
  const input = document.getElementById('iaInput');
  const q = input.value.trim();
  if (!q) return;

  const messages = document.getElementById('iaMessages');

  // User message
  messages.innerHTML += `<div class="ia-msg user">
    <div class="ia-avatar"><i class="fas fa-user"></i></div>
    <div class="ia-bubble">${q}</div>
  </div>`;

  // Typing
  const typingId = 'typing-' + Date.now();
  messages.innerHTML += `<div class="ia-msg bot" id="${typingId}">
    <div class="ia-avatar"><i class="fas fa-brain"></i></div>
    <div class="ia-bubble"><div class="ia-typing"><span></span><span></span><span></span></div></div>
  </div>`;

  messages.scrollTop = messages.scrollHeight;
  input.value = '';

  setTimeout(() => {
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    // Find answer with intelligent matching
    const qLower = q.toLowerCase();
    let answer = '🤖 Analisando os dados da Power Ropes...<br><br>Não encontrei dados específicos para essa pergunta. Tente perguntar sobre: faturamento, produtos, ROI, tarefas, funcionários, estoque ou fluxo de caixa.';

    // Keyword aliases for better matching
    const keywordMap = {
      'faturamento': ['faturamento', 'receita', 'vendas', 'quanto', 'total'],
      'produto mais vendeu': ['produto', 'best seller', 'mais vendido', 'best', 'top', 'ranking'],
      'roi': ['roi', 'retorno', 'anúncio', 'investimento', 'return'],
      'tarefa': ['tarefa', 'tarefas', 'atrasada', 'atraso', 'deadline'],
      'funcionario': ['funcionário', 'funcionario', 'produtividade', 'melhor', 'top', 'ranking', 'equipe'],
      'estoque': ['estoque', 'inventário', 'produto', 'quantidade', 'crítico'],
      'canal': ['canal', 'mercado livre', 'shopee', 'site', 'performance', 'venda'],
      'fluxo': ['fluxo', 'caixa', 'receita', 'despesa', 'saldo']
    };

    for (const [key, keywords] of Object.entries(keywordMap)) {
      if (keywords.some(kw => qLower.includes(kw))) {
        if (IA_ANSWERS[key]) {
          answer = IA_ANSWERS[key]();
          break;
        }
      }
    }

    messages.innerHTML += `<div class="ia-msg bot">
      <div class="ia-avatar"><i class="fas fa-brain"></i></div>
      <div class="ia-bubble"><p>${answer}</p><p style="font-size:11px;color:var(--text-3);margin-top:10px"><i class="fas fa-clock"></i> ${new Date().toLocaleTimeString('pt-BR')}</p></div>
    </div>`;
    messages.scrollTop = messages.scrollHeight;
  }, 1200);
}

// ============================
// FILTERS
// ============================
function filterDashboard(period) {
  if (period === 'todo') {
    // Renderizar gráficos com dados consolidados de todos os anos
    renderDashboardCharts('todo');
    updateDashboardKPIsConsolidated();
    showToast('Mostrando: Todo período (2020-2026)', 'success');
  } else {
    // Para outros períodos, usar renderização padrão
    renderDashboardCharts(period);
    if (typeof updateDashboardKPIs === 'function') updateDashboardKPIs();
    const labels = { hoje: 'Hoje', semana: 'Esta semana', mes: 'Este mês', ano: 'Este ano' };
    showToast('Período: ' + (labels[period] || period), 'info');
  }
}

function updateDashboardKPIsConsolidated() {

  if (typeof VENDAS_DATA === 'undefined') return;

  // Calcular totais consolidados
  const anos = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const totalFaturamento = anos.reduce((sum, a) => sum + (VENDAS_DATA.totais[a] || 0), 0);
  const totalInvestimento = anos.reduce((sum, a) => sum + (VENDAS_DATA.investimentoTotal[a] || 0), 0);

  // Calcular ROI médio
  const roiMedio = (totalFaturamento > 0 && totalInvestimento > 0)
    ? (totalFaturamento / totalInvestimento).toFixed(2)
    : 0;

  // Encontrar melhor ano
  let melhorAno = 2020;
  let melhorVal = VENDAS_DATA.totais[2020] || 0;
  anos.forEach(a => {
    if ((VENDAS_DATA.totais[a] || 0) > melhorVal) {
      melhorVal = VENDAS_DATA.totais[a];
      melhorAno = a;
    }
  });

  // Atualizar KPIs no DOM
  setKPI('kpi-dia-label', 'Faturamento Total');
  setKPI('kpi-dia-val', 'R$ ' + totalFaturamento.toLocaleString('pt-BR'));
  setKPI('kpi-dia-trend', '<i class="fas fa-chart-line"></i> todos os anos');

  setKPI('kpi-mes-label', 'Investimento Total');
  setKPI('kpi-mes-val', 'R$ ' + totalInvestimento.toLocaleString('pt-BR'));
  const varInvest = ((totalFaturamento - totalInvestimento) / totalInvestimento * 100).toFixed(1);
  setKPI('kpi-mes-trend', '<i class="fas fa-arrow-up"></i> ' + varInvest + '% lucro');

  setKPI('kpi-anual-label', 'Período: 2020-2026');
  setKPI('kpi-anual-val', 'R$ ' + totalFaturamento.toLocaleString('pt-BR'));
  setKPI('kpi-anual-trend', '<i class="fas fa-calendar"></i> 7 anos completos');

  setKPI('kpi-invest-label', 'ROI Médio');
  setKPI('kpi-invest-val', roiMedio + 'x');
  setKPI('kpi-invest-trend', '<i class="fas fa-percent"></i> retorno total');

  setKPI('kpi-roi-label', 'Melhor Ano');
  setKPI('kpi-roi-val', String(melhorAno));
  setKPI('kpi-roi-trend', '<i class="fas fa-trophy"></i> R$ ' + melhorVal.toLocaleString('pt-BR'));

  setKPI('kpi-melhor-val', (anos.length) + ' anos');
  setKPI('kpi-melhor-trend', '<i class="fas fa-bar-chart"></i> analisados');
}
function filterFinanceiro(period) { showToast('Período: ' + period, 'info'); }
function filterByCategory(cat) { filterTable('tblEstoque', cat); }

function filterTable(tableId, q) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const rows = table.querySelectorAll('tbody tr');
  const ql = q.toLowerCase();
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(ql) ? '' : 'none';
  });
}

// ============================
// UTILS
// ============================
function el(id, val) { const e = document.getElementById(id); if(e) e.textContent = val; }
function val(id) { const e = document.getElementById(id); return e ? e.value : ''; }
function emptyRow(cols) { return `<tr><td colspan="${cols}" style="text-align:center;padding:32px;color:var(--text-3)"><i class="fas fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.3"></i>Nenhum registro encontrado</td></tr>`; }

function addNotif(n) {
  DB.notificacoes.unshift(n);
  const list = document.getElementById('notifList');
  if (list) list.insertAdjacentHTML('afterbegin', `<div class="notif-item"><i class="fas ${n.icon}"></i> ${n.text}<div class="notif-time">${n.time}</div></div>`);
  document.getElementById('notifDot').style.display = 'block';
}

// ============================
// TOAST
// ============================
function showToast(msg, type='info') {
  const icons = { success:'fa-check-circle', error:'fa-times-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type]}"></i> ${msg}`;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transform='translateX(120%)'; toast.style.transition='all 0.3s'; setTimeout(()=>toast.remove(),300); }, 3000);
}

// ============================
// OPEN TASK DETAIL
// ============================
function openTarefaDetail(id) {
  const t = DB.tarefas.find(t => t.id === id);
  if (!t) return;
  showToast(`Tarefa: ${t.titulo} (${t.prioridade})`, 'info');
}

// ============================
// EDIT PRODUTO
// ============================
function editProduto(id) {
  const p = DB.produtos.find(pr => pr.id === id);
  if (!p) return;
  document.getElementById('prodNome').value = p.nome;
  document.getElementById('prodSKU').value = p.sku;
  document.getElementById('prodQtd').value = p.qtd;
  document.getElementById('prodQtdMin').value = p.qtdMin;
  document.getElementById('prodCusto').value = p.custo;
  document.getElementById('prodVenda').value = p.venda;
  openModal('modalProduto');
}

// ============================
// SESSION RESTORATION ON PAGE LOAD
// ============================
document.addEventListener('DOMContentLoaded', function() {
  const roleNames = { admin:'Administrador', gestor:'Gestor', financeiro:'Financeiro', marketing:'Marketing', estoque:'Estoque', funcionario:'Funcionário' };
  const savedSession = sessionStorage.getItem('userSession');

  if (savedSession) {
    try {
      DB.user = JSON.parse(savedSession);
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';

      document.getElementById('sidebarUserName').textContent = roleNames[DB.user.role];
      document.getElementById('sidebarUserRole').textContent = DB.user.role;
      document.getElementById('topbarUser').textContent = roleNames[DB.user.role];

      applyPermissions(DB.user.role);
      seedData();
      initApp();
      console.log('✅ Sessão restaurada para:', DB.user.email);
    } catch (e) {
      console.error('Erro ao restaurar sessão:', e);
      sessionStorage.removeItem('userSession');
    }
  }
});
