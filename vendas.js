/* ============================
   POWER HUB — Módulo de Vendas
   Dados reais extraídos de VENDAS.xlsx
   Power Ropes
   ============================ */

// ============================
// DADOS REAIS DA PLANILHA — COLUNA LÍQUIDO
// Fonte: VENDAS.xlsx — coluna LIQUIDO de cada aba anual
// 2024/2025: FATURADO = LIQUIDO (sem dedução registrada)
// 2026: apenas coluna VENDAS disponível (sem líquido separado)
// ============================
const VENDAS_DATA = {
  meses: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],

  // LÍQUIDO mensal por ano — valores reais da coluna LIQUIDO da planilha
  faturamento: {
    //         Jan    Fev    Mar    Abr    Mai    Jun    Jul    Ago    Set    Out    Nov    Dez
    2020: [  0,     0,    848,   313,  1272,  2696,  2554,  6041,  7902,  6706, 13486, 12605],
    2021: [7556, 13288,  8473, 10367,  6251, 13383,  9176,  8125, 11379,  5276,  5898,  2536],
    2022: [2783,  1109,  1537,  4793,  3347,  5579,  5797,  6415,  5403,  6290,  6203,  3963],
    2023: [1943,     0,  1900,  7034,  7091,  4622,  5884, 11001,  7655,  5333, 10077,  9047],
    2024: [4984,  3530,  7412,  7740, 10084,  8433, 10320,  7273,  9984, 11558, 14567,  6941],
    2025: [8265,  2725, 15291,  6448, 12218,  6300,  9678,  8318, 15617, 16339, 14868,  6635],
    2026: [8938,  5885, 11524, 19228, 13973,  1100,     0,     0,     0,     0,     0,     0],
  },

  // Totais líquidos anuais (conforme totalizado nas abas da planilha)
  totais: {
    2020: 49294,   // aba 2020 → TOTAL LIQUIDO
    2021: 101708,  // aba 2021 → TOTAL LIQUIDO
    2022: 53219,   // aba 2022 → TOTAL LIQUIDO
    2023: 71587,   // aba 2023 → TOTAL LIQUIDO
    2024: 102826,  // aba 2024 → FATURADO = LIQUIDO
    2025: 122702,  // aba 2025 → FATURADO = LIQUIDO
    2026: 60648,   // aba 2026 → parcial Jan–Jun
  },

  // Investimento em anúncios por ano — valores reais da planilha (coluna ANUCIO)
  investimentoTotal: {
    2020: 37911,  // aba 2024 → linha "TOTAL VENDAS 2020"
    2021: 29000,  // aba 2024 → linha "TOTAL VENDAS 2021"
    2022: 10006,  // aba 2024 → linha "TOTAL VENDAS 2022"
    2023: 11850,  // aba 2024 → linha "TOTAL VENDAS 2023"
    2024: 17520,  // aba 2024 → TOTAL VENDAS col ANUCIO
    2025: 23562,  // aba 2025 → TOTAL VENDAS col ANUCIO
    2026: 16610,  // aba 2026 → TOTAL VENDAS col ANUNCIO (Jan–Jun)
  },

  // Investimento mensal 2024
  investimento2024: [963, 1243, 884, 2106, 1500, 892, 2019, 1200, 1283, 2000, 2080, 1350],

  // Facebook vs Google 2024 (das abas mensais JAN–NOV)
  facebook2024:  [299, 731, 0,    1700, 1200, 577, 1700, 1650, 903,  1700, 1580, 0   ],
  google2024:    [664, 500, 0,    406,  211,  315, 319,  0,    380,  300,  502,  0   ],

  // ROI mensal 2024 (x vezes) — col ROI das abas anuais
  roi2024: [5.18, 2.84, 8.38, 3.68, 6.72, 9.45, 5.11, 6.06, 7.78, 5.78, 7.00, 5.14],

  // ROI mensal 2025
  roi2025: [3.30, 17.03, 17.28, 6.08, 9.12, 4.82, 7.40, 3.64, 5.55, 4.42, 4.13, 2.55],

  // Investimento mensal 2025
  investimento2025: [2504, 160, 885, 1061, 1340, 1306, 1307, 2287, 2812, 3700, 3600, 2600],

  // ROI 2026
  roi2026: [3.08, 3.08, 3.03, 4.27, 4.11, 11, 0, 0, 0, 0, 0, 0],

  // Investimento mensal 2026
  investimento2026: [2900, 1910, 3800, 4500, 3400, 100, 0, 0, 0, 0, 0, 0],
};

// ============================
// REGISTRO DE CHARTS
// ============================
const VC = {}; // vendas charts registry

function vDestroyChart(id) {
  if (VC[id]) { VC[id].destroy(); delete VC[id]; }
}

// ============================
// UTILITÁRIOS
// ============================
const fmtBRL = v => v ? 'R$ ' + v.toLocaleString('pt-BR') : '—';
const fmtBRLShort = v => {
  if (!v) return 'R$ 0';
  if (v >= 1000) return 'R$ ' + (v/1000).toFixed(1) + 'k';
  return 'R$ ' + v;
};

function vGridColor() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'; }
function vTextColor() { return document.documentElement.getAttribute('data-theme') === 'light' ? '#555566' : '#aaaaaa'; }

function baseOpts({ prefix='', suffix='', yMax=null, stacked=false }={}) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ' ' + prefix + ctx.parsed.y.toLocaleString('pt-BR') + suffix
        }
      }
    },
    scales: {
      x: { stacked, grid: { color: vGridColor() }, ticks: { color: vTextColor(), font: { size: 11 } } },
      y: { stacked, grid: { color: vGridColor() }, ticks: { color: vTextColor(), font: { size: 11 }, callback: v => prefix + v.toLocaleString('pt-BR') + suffix }, max: yMax||undefined, beginAtZero: true }
    }
  };
}

function multiOpts({ stacked=false }={}) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, color: vTextColor(), font: { size: 11 } } } },
    scales: {
      x: { stacked, grid: { color: vGridColor() }, ticks: { color: vTextColor(), font: { size: 11 } } },
      y: { stacked, grid: { color: vGridColor() }, ticks: { color: vTextColor(), font: { size: 11 }, callback: v => 'R$ ' + v.toLocaleString('pt-BR') }, beginAtZero: true }
    }
  };
}

// Gradiente dinâmico para barras
function gradientGreen(ctx, area) {
  if (!ctx || !area) return '#1D5C3A';
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, '#2a7a4f');
  g.addColorStop(1, '#1D5C3A');
  return g;
}

function gradientGold(ctx, area) {
  if (!ctx || !area) return '#C9A227';
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, '#e0b83a');
  g.addColorStop(1, '#C9A227');
  return g;
}

// ============================
// RENDER PRINCIPAL
// ============================
function renderVendas() {
  renderVendasAno('2026');  // Padrão: mostrar 2026
  renderChart5Anos();
  renderChartAnual();
  renderChartROI2024();
  renderChartROI2025();
  renderChartInvest2024();
  renderChartFbGoogle();
  renderChart2026();
  renderTabelaAnual();
}

// ============================
// FILTRO POR ANO
// ============================
function renderVendasAno(ano) {
  renderVendasKPIs(ano);
  renderChartMesPrincipal(ano);
  renderVendasAnoDetalhe(ano);
}

// ============================
// KPIs REAIS
// ============================
function renderVendasKPIs(filtro) {
  const el = document.getElementById('vendasKPIs');
  if (!el) return;

  let fat, invest, roi, melhorMes, melhorVal, totalPedidos;
  const anos = [2021,2022,2023,2024,2025,2026];

  if (filtro === 'todos') {
    fat = Object.values(VENDAS_DATA.totais).reduce((a,b)=>a+b,0);
    invest = Object.values(VENDAS_DATA.investimentoTotal).reduce((a,b)=>a+b,0);
    roi = '5.9x';
    // melhor mês de todos
    let bVal=0, bLbl='';
    anos.forEach(a => {
      VENDAS_DATA.faturamento[a].forEach((v,i) => {
        if (v > bVal) { bVal=v; bLbl=VENDAS_DATA.meses[i]+'/'+a; }
      });
    });
    melhorMes = bLbl; melhorVal = bVal;
    totalPedidos = '—';
  } else {
    const a = parseInt(filtro);
    fat = VENDAS_DATA.totais[a] || 0;
    invest = VENDAS_DATA.investimentoTotal[a] || 0;
    const roiData = a===2024 ? VENDAS_DATA.roi2024 : a===2025 ? VENDAS_DATA.roi2025 : a===2026 ? VENDAS_DATA.roi2026 : null;
    const roiFiltered = roiData ? roiData.filter(v=>v>0) : [];
    roi = roiFiltered.length ? (roiFiltered.reduce((s,v)=>s+v,0)/roiFiltered.length).toFixed(2)+'x' : '—';
    const meses = VENDAS_DATA.faturamento[a] || Array(12).fill(0);
    melhorVal = Math.max(...meses);
    melhorMes = VENDAS_DATA.meses[meses.indexOf(melhorVal)];
    totalPedidos = meses.filter(v=>v>0).length + ' meses';
  }

  // crescimento YoY
  const anos2 = Object.keys(VENDAS_DATA.totais).map(Number).sort();
  const idx = anos2.indexOf(parseInt(filtro));
  let crescTxt = '—', crescClass = 'neutral';
  if (filtro !== 'todos' && idx > 0) {
    const prev = VENDAS_DATA.totais[anos2[idx-1]];
    const curr = VENDAS_DATA.totais[parseInt(filtro)];
    if (prev && prev > 0) {
      const pct = ((curr - prev) / prev * 100).toFixed(1);
      crescTxt = (pct >= 0 ? '+' : '') + pct + '% vs ' + anos2[idx-1];
      crescClass = pct >= 0 ? 'up' : 'down';
    }
  } else if (filtro === 'todos') {
    crescTxt = '+67% (2024 vs 2022)';
    crescClass = 'up';
  }

  el.innerHTML = `
    <div class="kpi-card green">
      <div class="kpi-icon"><i class="fas fa-coins"></i></div>
      <div class="kpi-info">
        <span class="kpi-label">Faturamento ${filtro==='todos'?'Total':''+filtro}</span>
        <span class="kpi-value">${fmtBRL(fat)}</span>
        <span class="kpi-trend ${crescClass}">
          <i class="fas fa-arrow-${crescClass==='up'?'up':crescClass==='down'?'down':'minus'}"></i> ${crescTxt}
        </span>
      </div>
    </div>
    <div class="kpi-card gold">
      <div class="kpi-icon"><i class="fas fa-bullhorn"></i></div>
      <div class="kpi-info">
        <span class="kpi-label">Investimento Anúncios</span>
        <span class="kpi-value">${fmtBRL(invest)}</span>
        <span class="kpi-trend neutral"><i class="fas fa-minus"></i> Facebook + Google</span>
      </div>
    </div>
    <div class="kpi-card blue">
      <div class="kpi-icon"><i class="fas fa-chart-bar"></i></div>
      <div class="kpi-info">
        <span class="kpi-label">ROI Médio</span>
        <span class="kpi-value">${roi}</span>
        <span class="kpi-trend up"><i class="fas fa-arrow-up"></i> retorno sobre invest.</span>
      </div>
    </div>
    <div class="kpi-card purple">
      <div class="kpi-icon"><i class="fas fa-trophy"></i></div>
      <div class="kpi-info">
        <span class="kpi-label">Melhor Mês</span>
        <span class="kpi-value">${melhorMes}</span>
        <span class="kpi-trend up"><i class="fas fa-coins"></i> ${fmtBRL(melhorVal)}</span>
      </div>
    </div>`;
}

// ============================
// GRÁFICO MENSAL PRINCIPAL
// ============================
function renderChartMesPrincipal(filtro) {
  vDestroyChart('mesPrincipal');
  const canvas = document.getElementById('chartVendasMesPrincipal');
  if (!canvas) return;

  const titleEl = document.getElementById('chartVendasMesTitle');
  const badgeEl = document.getElementById('chartVendasMesBadge');

  if (filtro === 'todos') {
    // Mostrar todos os anos como linhas
    if (titleEl) titleEl.textContent = 'Faturamento Mensal — Comparativo por Ano';
    if (badgeEl) badgeEl.textContent = '2021–2026';

    const cores = {
      2021: '#8b5cf6', 2022: '#ef4444', 2023: '#f97316',
      2024: '#1D5C3A', 2025: '#C9A227', 2026: '#3b82f6'
    };
    const datasets = [2021,2022,2023,2024,2025,2026].map(a => ({
      label: String(a),
      data: VENDAS_DATA.faturamento[a],
      borderColor: cores[a],
      backgroundColor: cores[a] + '22',
      tension: 0.4,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: a===2025||a===2026 ? 2.5 : 1.5,
    }));

    VC['mesPrincipal'] = new Chart(canvas, {
      type: 'line',
      data: { labels: VENDAS_DATA.meses, datasets },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, color: vTextColor(), font:{size:11} } } },
        scales: {
          x: { grid: { color: vGridColor() }, ticks: { color: vTextColor(), font:{size:11} } },
          y: { grid: { color: vGridColor() }, ticks: { color: vTextColor(), font:{size:11}, callback: v => 'R$ '+v.toLocaleString('pt-BR') }, beginAtZero: true }
        }
      }
    });
  } else {
    // Um único ano: barras gradientes
    const a = parseInt(filtro);
    const dados = VENDAS_DATA.faturamento[a] || Array(12).fill(0);
    if (titleEl) titleEl.textContent = `Faturamento Mensal — ${a}`;
    if (badgeEl) badgeEl.textContent = String(a);

    VC['mesPrincipal'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: VENDAS_DATA.meses,
        datasets: [{
          label: 'Faturamento ' + a,
          data: dados,
          backgroundColor: ctx => {
            const chart = ctx.chart;
            const {ctx: c2, chartArea} = chart;
            if (!chartArea) return '#1D5C3A';
            const g = c2.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, '#2a7a4f');
            g.addColorStop(1, '#1D5C3A');
            return g;
          },
          borderRadius: 6,
          borderSkipped: false,
          hoverBackgroundColor: '#C9A227',
        }]
      },
      options: {
        ...baseOpts({ prefix: 'R$ ' }),
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ' R$ ' + ctx.parsed.y.toLocaleString('pt-BR') } }
        }
      }
    });
  }
}

// ============================
// GRÁFICO 5 ANOS — LINHA TEMPORAL
// ============================
function renderChart5Anos() {
  vDestroyChart('5anos');
  const canvas = document.getElementById('chart5Anos');
  if (!canvas) return;

  // Dados mensais encadeados 2021→2026 — remove zeros finais sem data
  const labels = [];
  const dados  = [];
  const cores  = [];   // cor diferente para 2026 (em curso)

  [2021,2022,2023,2024,2025,2026].forEach(a => {
    VENDAS_DATA.meses.forEach((m, i) => {
      const v = VENDAS_DATA.faturamento[a][i] || 0;
      labels.push(m + '/' + String(a).slice(2));
      dados.push(v);
      cores.push(a === 2026 ? '#3b82f6' : '#C9A227');
    });
  });

  // Remover meses futuros sem dados (zero no final)
  while (dados.length && dados[dados.length - 1] === 0) {
    dados.pop(); labels.pop(); cores.pop();
  }

  // Badge dinâmico
  const badge = document.getElementById('chart5AnosBadge');
  if (badge) badge.textContent = '2021–2026';

  VC['5anos'] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Líquido (R$)',
          data: dados,
          borderColor: '#C9A227',
          backgroundColor: 'rgba(201,162,39,0.08)',
          tension: 0.3,
          fill: true,
          pointRadius: 2,
          pointBackgroundColor: '#C9A227',
          pointHoverRadius: 5,
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' R$ ' + ctx.parsed.y.toLocaleString('pt-BR'),
            title: ctx => {
              const lbl = ctx[0].label;
              return lbl.includes('/26') ? lbl + ' (2026 ✦)' : lbl;
            }
          }
        }
      },
      scales: {
        x: { grid: { color: vGridColor() }, ticks: { color: vTextColor(), font:{size:9}, maxTicksLimit: 24, maxRotation: 45 } },
        y: { grid: { color: vGridColor() }, ticks: { color: vTextColor(), font:{size:10}, callback: v => 'R$ '+v.toLocaleString('pt-BR') }, beginAtZero: true }
      }
    }
  });
}

// ============================
// GRÁFICO TOTAL ANUAL
// ============================
function renderChartAnual() {
  vDestroyChart('anual');
  const canvas = document.getElementById('chartAnual');
  if (!canvas) return;

  const anos = ['2020','2021','2022','2023','2024','2025','2026*'];
  const vals = [
    VENDAS_DATA.totais[2020],
    VENDAS_DATA.totais[2021],
    VENDAS_DATA.totais[2022],
    VENDAS_DATA.totais[2023],
    VENDAS_DATA.totais[2024],
    VENDAS_DATA.totais[2025],
    VENDAS_DATA.totais[2026],
  ];

  const cores = vals.map((v, i) => {
    if (i === 4) return '#1D5C3A';      // 2024 destaque
    if (i === 5) return '#C9A227';      // 2025 destaque
    if (i === 6) return '#3b82f6';      // 2026 parcial
    return 'rgba(29,92,58,0.45)';
  });

  VC['anual'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: anos,
      datasets: [{
        label: 'Total Anual',
        data: vals,
        backgroundColor: cores,
        borderRadius: 7,
        borderSkipped: false,
      }]
    },
    options: {
      ...baseOpts({ prefix: 'R$ ' }),
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' R$ '+ctx.parsed.y.toLocaleString('pt-BR') } },
        annotation: {}
      }
    }
  });
}

// ============================
// ROI MENSAL 2024
// ============================
function renderChartROI2024() {
  vDestroyChart('roi2024');
  const canvas = document.getElementById('chartROI2024');
  if (!canvas) return;

  VC['roi2024'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: VENDAS_DATA.meses,
      datasets: [{
        label: 'ROI 2024',
        data: VENDAS_DATA.roi2024,
        backgroundColor: VENDAS_DATA.roi2024.map(v => v >= 7 ? '#C9A227' : v >= 5 ? '#1D5C3A' : '#3b82f6'),
        borderRadius: 5,
        borderSkipped: false,
      }]
    },
    options: {
      ...baseOpts({ suffix: 'x' }),
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ROI: '+ctx.parsed.y.toFixed(2)+'x' } }
      }
    }
  });
}

// ============================
// ROI MENSAL 2025
// ============================
function renderChartROI2025() {
  vDestroyChart('roi2025');
  const canvas = document.getElementById('chartROI2025');
  if (!canvas) return;

  VC['roi2025'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: VENDAS_DATA.meses,
      datasets: [{
        label: 'ROI 2025',
        data: VENDAS_DATA.roi2025,
        backgroundColor: VENDAS_DATA.roi2025.map(v => v >= 10 ? '#C9A227' : v >= 5 ? '#1D5C3A' : '#8b5cf6'),
        borderRadius: 5,
        borderSkipped: false,
      }]
    },
    options: {
      ...baseOpts({ suffix: 'x' }),
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ROI: '+ctx.parsed.y.toFixed(2)+'x' } }
      }
    }
  });
}

// ============================
// INVESTIMENTO 2024
// ============================
function renderChartInvest2024() {
  vDestroyChart('invest2024');
  const canvas = document.getElementById('chartInvest2024');
  if (!canvas) return;

  VC['invest2024'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: VENDAS_DATA.meses,
      datasets: [
        {
          label: 'Facebook Ads',
          data: VENDAS_DATA.facebook2024,
          backgroundColor: '#3b82f6',
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Google Ads',
          data: VENDAS_DATA.google2024,
          backgroundColor: '#C9A227',
          borderRadius: 4,
          borderSkipped: false,
        }
      ]
    },
    options: {
      ...multiOpts({ stacked: true }),
    }
  });
}

// ============================
// FACEBOOK VS GOOGLE 2024 (ROSCA)
// ============================
function renderChartFbGoogle() {
  vDestroyChart('fbGoogle');
  const canvas = document.getElementById('chartFbGoogle');
  if (!canvas) return;

  const totalFb = VENDAS_DATA.facebook2024.reduce((a,b)=>a+b,0);
  const totalGg = VENDAS_DATA.google2024.reduce((a,b)=>a+b,0);

  // Também fazer linha mes a mes para riqueza visual
  VC['fbGoogle'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: VENDAS_DATA.meses,
      datasets: [
        {
          label: `Facebook Ads (Total: R$ ${totalFb.toLocaleString('pt-BR')})`,
          data: VENDAS_DATA.facebook2024,
          backgroundColor: '#3b82f6',
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: `Google Ads (Total: R$ ${totalGg.toLocaleString('pt-BR')})`,
          data: VENDAS_DATA.google2024,
          backgroundColor: '#C9A227',
          borderRadius: 4,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, color: vTextColor(), font:{size:11} } },
        tooltip: { callbacks: { label: ctx => ' R$ '+ctx.parsed.y.toLocaleString('pt-BR') } }
      },
      scales: {
        x: { grid: { color: vGridColor() }, ticks: { color: vTextColor(), font:{size:11} } },
        y: { grid: { color: vGridColor() }, ticks: { color: vTextColor(), font:{size:11}, callback: v => 'R$ '+v.toLocaleString('pt-BR') }, beginAtZero: true }
      }
    }
  });
}

// ============================
// 2026 — PARCIAL
// ============================
function renderChart2026() {
  vDestroyChart('2026chart');
  const canvas = document.getElementById('chart2026');
  if (!canvas) return;

  const meses2026 = VENDAS_DATA.meses.slice(0,5);
  const fat2026   = VENDAS_DATA.faturamento[2026].slice(0,5);
  const fat2025m  = VENDAS_DATA.faturamento[2025].slice(0,5);

  VC['2026chart'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: meses2026,
      datasets: [
        {
          label: '2026',
          data: fat2026,
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: '2025 (mesmo período)',
          data: fat2025m,
          backgroundColor: 'rgba(201,162,39,0.5)',
          borderRadius: 6,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, color: vTextColor(), font:{size:11} } },
        tooltip: { callbacks: { label: ctx => ' R$ '+ctx.parsed.y.toLocaleString('pt-BR') } }
      },
      scales: {
        x: { grid: { color: vGridColor() }, ticks: { color: vTextColor(), font:{size:11} } },
        y: { grid: { color: vGridColor() }, ticks: { color: vTextColor(), font:{size:11}, callback: v => 'R$ '+v.toLocaleString('pt-BR') }, beginAtZero: true }
      }
    }
  });
}

// ============================
// TABELA HISTÓRICA ANUAL
// ============================
function renderTabelaAnual() {
  const tbody = document.getElementById('tbodyVendasAnual');
  if (!tbody) return;

  const anosOrdem = [2020,2021,2022,2023,2024,2025,2026];
  const corAno = { 2024:'rgba(29,92,58,0.15)', 2025:'rgba(201,162,39,0.12)', 2026:'rgba(59,130,246,0.12)' };

  tbody.innerHTML = anosOrdem.map((a, idx) => {
    const meses  = VENDAS_DATA.faturamento[a];
    const total  = VENDAS_DATA.totais[a];
    const maxVal = Math.max(...meses);
    const maxMes = VENDAS_DATA.meses[meses.indexOf(maxVal)];

    const prev   = idx > 0 ? VENDAS_DATA.totais[anosOrdem[idx-1]] : null;
    let vsAnt = '—', vsClass = '';
    if (prev && prev > 0) {
      const pct = ((total - prev) / prev * 100).toFixed(1);
      vsAnt = (pct >= 0 ? '+' : '') + pct + '%';
      vsClass = pct >= 0 ? 'text-green' : 'text-red';
    }

    const celulas = meses.map((v, mi) => {
      const isMelhor = v === maxVal && v > 0;
      return `<td style="${isMelhor?'background:rgba(201,162,39,0.15);font-weight:700;':''}${!v?'color:var(--text-3);':''}">${v ? fmtBRLShort(v) : '—'}</td>`;
    }).join('');

    const bg = corAno[a] ? `style="background:${corAno[a]}"` : '';

    return `<tr ${bg}>
      <td><strong>${a}${a===2026?' *':''}</strong></td>
      ${celulas}
      <td><strong>R$ ${total.toLocaleString('pt-BR')}</strong></td>
      <td><span style="color:var(--gold);font-weight:700">${maxMes}</span> <small class="text-muted">(${fmtBRLShort(maxVal)})</small></td>
      <td><span class="${vsClass} fw-700">${vsAnt}</span></td>
    </tr>`;
  }).join('');

  // Linha de totais
  const totaisPorMes = VENDAS_DATA.meses.map((_, mi) =>
    anosOrdem.reduce((s, a) => s + (VENDAS_DATA.faturamento[a][mi] || 0), 0)
  );
  const grandTotal = Object.values(VENDAS_DATA.totais).reduce((a,b)=>a+b,0);
  tbody.innerHTML += `<tr style="border-top:2px solid var(--border-2);font-weight:700">
    <td><strong>TOTAL</strong></td>
    ${totaisPorMes.map(v=>`<td><strong>${fmtBRLShort(v)}</strong></td>`).join('')}
    <td><strong>R$ ${grandTotal.toLocaleString('pt-BR')}</strong></td>
    <td colspan="2"></td>
  </tr>`;
}

// ============================
// DETALHE DO ANO SELECIONADO
// ============================
function renderVendasAnoDetalhe(filtro) {
  const div = document.getElementById('vendasAnoDetalhe');
  if (!div) return;

  if (filtro === 'todos') { div.innerHTML = ''; return; }

  const a = parseInt(filtro);
  const meses = VENDAS_DATA.faturamento[a] || Array(12).fill(0);
  const total  = VENDAS_DATA.totais[a] || 0;
  const maxVal = Math.max(...meses.filter(v=>v>0));
  const minVal = Math.min(...meses.filter(v=>v>0));
  const media  = Math.round(meses.filter(v=>v>0).reduce((s,v)=>s+v,0) / meses.filter(v=>v>0).length);

  const totalInv = VENDAS_DATA.investimentoTotal[a] || 0;

  const roiData = a===2024 ? VENDAS_DATA.roi2024 : a===2025 ? VENDAS_DATA.roi2025 : a===2026 ? VENDAS_DATA.roi2026 : null;
  const roiMed  = roiData ? (roiData.filter(v=>v>0).reduce((s,v)=>s+v,0)/roiData.filter(v=>v>0).length).toFixed(2) : '—';

  div.innerHTML = `
    <div class="chart-card">
      <div class="chart-header">
        <h3>📊 Análise Detalhada — ${a}</h3>
        <span class="chart-badge">${a}</span>
      </div>
      <div class="kpi-grid kpi-4" style="margin-top:12px;margin-bottom:0">
        <div class="kpi-card green" style="padding:14px">
          <div class="kpi-icon" style="width:40px;height:40px;font-size:16px"><i class="fas fa-arrow-up"></i></div>
          <div class="kpi-info">
            <span class="kpi-label">Maior mês</span>
            <span class="kpi-value" style="font-size:17px">${fmtBRL(maxVal)}</span>
            <span class="kpi-trend neutral">${VENDAS_DATA.meses[meses.indexOf(maxVal)]}</span>
          </div>
        </div>
        <div class="kpi-card red" style="padding:14px">
          <div class="kpi-icon" style="width:40px;height:40px;font-size:16px"><i class="fas fa-arrow-down"></i></div>
          <div class="kpi-info">
            <span class="kpi-label">Menor mês</span>
            <span class="kpi-value" style="font-size:17px">${fmtBRL(minVal)}</span>
            <span class="kpi-trend neutral">${VENDAS_DATA.meses[meses.indexOf(minVal)]}</span>
          </div>
        </div>
        <div class="kpi-card blue" style="padding:14px">
          <div class="kpi-icon" style="width:40px;height:40px;font-size:16px"><i class="fas fa-chart-line"></i></div>
          <div class="kpi-info">
            <span class="kpi-label">Média mensal</span>
            <span class="kpi-value" style="font-size:17px">${fmtBRL(media)}</span>
            <span class="kpi-trend neutral">meses ativos</span>
          </div>
        </div>
        <div class="kpi-card gold" style="padding:14px">
          <div class="kpi-icon" style="width:40px;height:40px;font-size:16px"><i class="fas fa-chart-bar"></i></div>
          <div class="kpi-info">
            <span class="kpi-label">ROI médio</span>
            <span class="kpi-value" style="font-size:17px">${roiMed !== '—' ? roiMed+'x' : '—'}</span>
            <span class="kpi-trend neutral">Invest: ${fmtBRL(totalInv)}</span>
          </div>
        </div>
      </div>
    </div>`;
}

// ============================
// DASHBOARD — KPIs COM DADOS REAIS
// ============================
function updateDashboardKPIs() {
  const hoje   = new Date();
  const anoAtual = hoje.getFullYear();           // 2026
  const mesAtual = hoje.getMonth();              // 0-based: junho = 5

  const dadosAno  = VENDAS_DATA.faturamento[anoAtual] || Array(12).fill(0);
  const dadosAnoAnt = VENDAS_DATA.faturamento[anoAtual - 1] || Array(12).fill(0);

  // Último mês com dados (pode ser o atual ou anterior se atual = 0)
  let mesRef = mesAtual;
  while (mesRef > 0 && !dadosAno[mesRef]) mesRef--;
  const fatMesRef   = dadosAno[mesRef]  || 0;
  const fatMesAnt   = mesRef > 0 ? (dadosAno[mesRef - 1] || 0) : (dadosAnoAnt[11] || 0);
  const nomeMes     = VENDAS_DATA.meses[mesRef];
  const nomesMeses  = VENDAS_DATA.meses;

  // Faturamento anual acumulado (soma dos meses com dados)
  const fatAnoAtual = dadosAno.reduce((s, v) => s + v, 0);
  const fatAnoAnt   = VENDAS_DATA.totais[anoAtual - 1] || 0;

  // Investimento do ano atual
  const investAno   = VENDAS_DATA.investimentoTotal[anoAtual] || 0;
  const investAnoAnt = VENDAS_DATA.investimentoTotal[anoAtual - 1] || 0;

  // ROI do mês de referência
  const roiData     = anoAtual === 2026 ? VENDAS_DATA.roi2026 :
                      anoAtual === 2025 ? VENDAS_DATA.roi2025 :
                      anoAtual === 2024 ? VENDAS_DATA.roi2024 : null;
  const roiMes      = roiData ? roiData[mesRef] : 0;

  // Melhor mês do ano
  const maxVal = Math.max(...dadosAno.filter(v => v > 0));
  const maxMes = nomesMeses[dadosAno.indexOf(maxVal)];

  // Variações percentuais
  const varMes  = fatMesAnt > 0 ? ((fatMesRef - fatMesAnt) / fatMesAnt * 100).toFixed(1) : 0;
  const varAno  = fatAnoAnt > 0 ? ((fatAnoAtual - fatAnoAnt) / fatAnoAnt * 100).toFixed(1) : 0;
  const varInvest = investAnoAnt > 0 ? ((investAno - investAnoAnt) / investAnoAnt * 100).toFixed(1) : 0;

  // Label dinâmico com mês real
  const isMesAtualComDados = dadosAno[mesAtual] > 0;
  const labelMes = isMesAtualComDados
    ? `Faturamento de ${nomesMeses[mesAtual]}/${anoAtual}`
    : `Último mês completo (${nomeMes}/${anoAtual})`;

  // Preencher DOM
  setKPI('kpi-dia-label', `Faturamento do Dia — ${nomeMes}/${anoAtual}`);
  setKPI('kpi-dia-val',   `R$ —`);
  setKPI('kpi-dia-trend', `<i class="fas fa-table"></i> sem dado diário na planilha`);

  setKPI('kpi-mes-label', labelMes);
  setKPI('kpi-mes-val',   `R$ ${fatMesRef.toLocaleString('pt-BR')}`);
  setKPI('kpi-mes-trend',
    `<i class="fas fa-arrow-${varMes >= 0 ? 'up' : 'down'}"></i> `+
    `${varMes >= 0 ? '+' : ''}${varMes}% vs ${mesRef > 0 ? nomesMeses[mesRef-1] : 'dez ant.'}`
  );

  setKPI('kpi-anual-label', `Faturamento ${anoAtual} (acumulado)`);
  setKPI('kpi-anual-val',   `R$ ${fatAnoAtual.toLocaleString('pt-BR')}`);
  setKPI('kpi-anual-trend',
    `<i class="fas fa-arrow-${varAno >= 0 ? 'up' : 'down'}"></i> `+
    `${varAno >= 0 ? '+' : ''}${varAno}% vs ${anoAtual - 1} (R$ ${fatAnoAnt.toLocaleString('pt-BR')})`
  );

  setKPI('kpi-invest-label', `Invest. Anúncios ${anoAtual}`);
  setKPI('kpi-invest-val',   `R$ ${investAno.toLocaleString('pt-BR')}`);
  setKPI('kpi-invest-trend',
    `<i class="fas fa-arrow-${varInvest >= 0 ? 'up' : 'down'}"></i> `+
    `${varInvest >= 0 ? '+' : ''}${varInvest}% vs ${anoAtual - 1}`
  );

  setKPI('kpi-roi-label', `ROI — ${nomeMes}/${anoAtual}`);
  setKPI('kpi-roi-val',   roiMes > 0 ? `${roiMes.toFixed(2)}x` : '—');
  setKPI('kpi-roi-trend',
    roiMes > 0
      ? `<i class="fas fa-chart-bar"></i> ${(roiMes * 100 - 100).toFixed(0)}% retorno`
      : `<i class="fas fa-minus"></i> sem dados do mês`
  );

  setKPI('kpi-melhor-val',   maxVal > 0 ? `${maxMes}/${anoAtual}` : '—');
  setKPI('kpi-melhor-trend', maxVal > 0
    ? `<i class="fas fa-coins"></i> R$ ${maxVal.toLocaleString('pt-BR')}`
    : `<i class="fas fa-minus"></i> sem dados`
  );

  // Atualizar gráfico "Vendas por Mês" do dashboard com dados reais do ano atual
  updateDashChartVendasMes(anoAtual, dadosAno, dadosAnoAnt);
}

function setKPI(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function updateDashChartVendasMes(anoAtual, dadosAno, dadosAnoAnt) {
  if (!window.charts) return;
  if (charts['vendas']) { charts['vendas'].destroy(); delete charts['vendas']; }
  const ctx = document.getElementById('chartVendasMes');
  if (!ctx) return;

  charts['vendas'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: VENDAS_DATA.meses,
      datasets: [
        {
          label: String(anoAtual),
          data: dadosAno,
          backgroundColor: ctx2 => {
            const c = ctx2.chart; const {ctx: c2, chartArea} = c;
            if (!chartArea) return '#1D5C3A';
            const g = c2.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, '#2a7a4f'); g.addColorStop(1, '#1D5C3A');
            return g;
          },
          borderRadius: 6, borderSkipped: false,
        },
        {
          label: String(anoAtual - 1) + ' (líquido)',
          data: dadosAnoAnt,
          backgroundColor: 'rgba(201,162,39,0.25)',
          borderColor: 'rgba(201,162,39,0.6)',
          borderWidth: 1,
          borderRadius: 4, borderSkipped: false,
          type: 'bar',
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, color: vTextColor(), font:{size:11} } },
        tooltip: { callbacks: { label: ctx2 => ' R$ ' + ctx2.parsed.y.toLocaleString('pt-BR') } }
      },
      scales: {
        x: { grid: { color: vGridColor() }, ticks: { color: vTextColor(), font:{size:11} } },
        y: { grid: { color: vGridColor() }, ticks: { color: vTextColor(), font:{size:11}, callback: v => 'R$ '+v.toLocaleString('pt-BR') }, beginAtZero: true }
      }
    }
  });
}

// ============================
// HOOK NO MÓDULO (override do app.js)
// ============================
const _origShowModule = window.showModule;
window.showModule = function(name, el) {
  _origShowModule(name, el);
  if (name === 'vendas') renderVendas();
  if (name === 'dashboard') updateDashboardKPIs();
};

// ============================
// CARREGAR DADOS DO EXCEL
// ============================
async function loadVendasFromExcel() {
  try {
    const response = await fetch('/api/vendas/load');
    if (!response.ok) throw new Error('Erro ao carregar VENDAS.xlsx');

    const data = await response.json();

    // Atualizar VENDAS_DATA com dados do Excel
    if (data.faturamento) Object.assign(VENDAS_DATA.faturamento, data.faturamento);
    if (data.totais) Object.assign(VENDAS_DATA.totais, data.totais);
    if (data.investimentoTotal) Object.assign(VENDAS_DATA.investimentoTotal, data.investimentoTotal);
    if (data.investimento2024) VENDAS_DATA.investimento2024 = data.investimento2024;
    if (data.investimento2025) VENDAS_DATA.investimento2025 = data.investimento2025;
    if (data.investimento2026) VENDAS_DATA.investimento2026 = data.investimento2026;
    if (data.facebook2024) VENDAS_DATA.facebook2024 = data.facebook2024;
    if (data.google2024) VENDAS_DATA.google2024 = data.google2024;
    if (data.roi2024) VENDAS_DATA.roi2024 = data.roi2024;
    if (data.roi2025) VENDAS_DATA.roi2025 = data.roi2025;
    if (data.roi2026) VENDAS_DATA.roi2026 = data.roi2026;

    console.log('✅ Dados do Excel carregados com sucesso!', VENDAS_DATA);

    // Atualizar gráficos se módulos estão abertos
    if (document.getElementById('mod-dashboard').style.display !== 'none') {
      renderDashboardCharts();
    }
    if (document.getElementById('mod-vendas') && document.getElementById('mod-vendas').style.display !== 'none') {
      renderVendas();
    }
  } catch (e) {
    console.warn('⚠️ Não foi possível carregar dados do Excel:', e.message);
  }
}

// Disparar na carga inicial
document.addEventListener('DOMContentLoaded', () => {
  // Aguarda app.js inicializar (login) antes de tentar atualizar
  const tryUpdate = setInterval(() => {
    if (document.getElementById('app') && document.getElementById('app').style.display !== 'none') {
      loadVendasFromExcel();
      updateDashboardKPIs();
      clearInterval(tryUpdate);

      // Fazer polling a cada 2 minutos para atualizar dados do Excel
      setInterval(loadVendasFromExcel, 120000);
    }
  }, 300);
});

// Também registrar no moduleNames
if (window.moduleNames) window.moduleNames['vendas'] = 'Vendas — Dados Reais';
