/* ============================
   POWER HUB — Captação de Lojas Country
   Google Maps Places API Integration
   Power Ropes
   ============================ */

const CAP = {
  leads: [],
  filtro: 'todos',
  selectedIds: new Set(),
  currentLeadId: null,
};

// ============================
// CONFIGURAÇÃO
// ============================
function salvarConfigGMaps() {
  const key  = document.getElementById('gmapsApiKey')?.value?.trim();
  const modo = document.getElementById('capModo')?.value;
  if (!key && modo === 'places') return showToast('Insira a API Key', 'error');

  fetch('/api/captacao/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: key }),
  })
  .then(r => r.json())
  .then(() => {
    closeModal('modalGMapsConfig');
    showToast('Configuração salva!', 'success');
    localStorage.setItem('gmaps_key', key);
  })
  .catch(e => showToast(e.message, 'error'));
}

// ============================
// BUSCA RÁPIDA POR ESTADO
// ============================
function buscarEstado(estado) {
  document.getElementById('capCidade').value = estado;
  buscarLojas();
}

// ============================
// BUSCA PRINCIPAL
// ============================
async function buscarLojas() {
  const keyword = document.getElementById('capKeyword')?.value?.trim() || 'loja country';
  const cidade  = document.getElementById('capCidade')?.value?.trim();
  const raio    = document.getElementById('capRaio')?.value || '10000';
  const btnBuscar = document.getElementById('btnBuscar');

  if (!cidade) return showToast('Informe a cidade ou estado', 'error');

  // UI loading
  document.getElementById('capEmpty').style.display      = 'none';
  document.getElementById('capResultados').style.display = 'none';
  document.getElementById('capKPIs').style.display       = 'none';
  document.getElementById('capLoading').style.display    = 'block';
  document.getElementById('capLoadingMsg').textContent   = `Buscando "${keyword}" em ${cidade}...`;
  if (btnBuscar) { btnBuscar.disabled = true; btnBuscar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...'; }

  try {
    // 1. Geocodificar cidade
    document.getElementById('capLoadingMsg').textContent = 'Localizando ' + cidade + ' no mapa...';
    const geo = await fetch(`/api/captacao/geocode?cidade=${encodeURIComponent(cidade)}`).then(r => r.json());
    if (geo.error) throw new Error(geo.error);

    const { lat, lng } = geo;

    // 2. Buscar lojas (até 3 páginas = 60 resultados)
    document.getElementById('capLoadingMsg').textContent = `Buscando lojas em ${geo.formatted}...`;
    let todosResultados = [];
    let pagetoken = null;
    let pagina = 1;

    do {
      const params = new URLSearchParams({ keyword, lat, lng, raio });
      if (pagetoken) params.set('pagetoken', pagetoken);

      const resp = await fetch(`/api/captacao/buscar?${params}`).then(r => r.json());
      if (resp.error) throw new Error(resp.error);

      const results = resp.results || [];
      todosResultados = todosResultados.concat(results);
      pagetoken = resp.next_page_token || null;

      document.getElementById('capLoadingMsg').textContent =
        `Encontradas ${todosResultados.length} lojas... buscando mais${pagina < 3 && pagetoken ? ' (página ' + (pagina+1) + ')' : ''}`;

      pagina++;
      if (pagetoken && pagina <= 3) await delay(2000); // Places API exige 2s entre páginas

    } while (pagetoken && pagina <= 3);

    if (!todosResultados.length) {
      document.getElementById('capLoading').style.display = 'none';
      document.getElementById('capEmpty').style.display   = 'block';
      showToast('Nenhuma loja encontrada. Tente outro termo ou cidade.', 'warning');
      return;
    }

    // 3. Converter para leads
    document.getElementById('capLoadingMsg').textContent =
      `Processando ${todosResultados.length} lojas... buscando contatos (aguarde)`;

    CAP.leads = todosResultados.map((p, i) => ({
      id:        i,
      placeId:   p.place_id,
      nome:      p.name,
      endereco:  p.vicinity || p.formatted_address || '—',
      rating:    p.rating || null,
      totalRatings: p.user_ratings_total || 0,
      status:    p.business_status || 'OPERATIONAL',
      foto:      p.photos?.[0] ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=80&photo_reference=${p.photos[0].photo_reference}&key=${localStorage.getItem('gmaps_key')||''}` : null,
      telefone:  null,
      whatsapp:  null,
      email:     null,
      site:      null,
      googleUrl: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
      salvoNoCRM: false,
      detalhesCarregados: false,
    }));

    // 4. Verificar quais lojas já foram salvas no CRM
    const salvasNoLocalStorage = JSON.parse(localStorage.getItem('captacao_salvas_crm') || '[]');
    CAP.leads.forEach(lead => {
      if (salvasNoLocalStorage.includes(lead.placeId)) {
        lead.salvoNoCRM = true;
      }
    });

    // 5. Renderizar resultados iniciais
    renderizarLeads();
    document.getElementById('capLoading').style.display    = 'none';
    document.getElementById('capResultados').style.display = 'block';
    document.getElementById('capKPIs').style.display       = 'grid';
    atualizarKPIs();

    // 6. Buscar detalhes em background (telefone, site, WhatsApp, e-mail)
    buscarDetalhesBackground();

  } catch (e) {
    document.getElementById('capLoading').style.display = 'none';
    document.getElementById('capEmpty').style.display   = 'block';

    if (e.message.includes('API key') || e.message.includes('REQUEST_DENIED')) {
      showToast('Configure sua Google Maps API Key primeiro!', 'error');
      openModal('modalGMapsConfig');
    } else {
      showToast('Erro: ' + e.message, 'error');
    }
  } finally {
    if (btnBuscar) { btnBuscar.disabled = false; btnBuscar.innerHTML = '<i class="fas fa-search"></i> Buscar'; }
  }
}

// ============================
// BUSCAR DETALHES EM BACKGROUND
// Preenche telefone, site, WhatsApp e e-mail progressivamente
// ============================
async function buscarDetalhesBackground() {
  for (let i = 0; i < CAP.leads.length; i++) {
    const lead = CAP.leads[i];
    if (lead.detalhesCarregados) continue;

    try {
      // Buscar detalhes do Google Places
      const det = await fetch(`/api/captacao/detalhes/${lead.placeId}`).then(r => r.json());

      lead.telefone  = det.international_phone_number || det.formatted_phone_number || null;
      lead.site      = det.website || null;
      lead.googleUrl = det.url || lead.googleUrl;

      // Detectar WhatsApp a partir do telefone BR
      if (lead.telefone) {
        const num = lead.telefone.replace(/\D/g, '');
        lead.whatsapp = num.startsWith('55') ? num : '55' + num;
      }

      lead.detalhesCarregados = true;

      // Scraping do site para e-mail e WhatsApp adicionais
      if (lead.site) {
        try {
          const sc = await fetch(`/api/captacao/scrape?url=${encodeURIComponent(lead.site)}`).then(r => r.json());
          if (sc.emails?.length)    lead.email    = sc.emails[0];
          if (sc.whatsapps?.length) lead.whatsapp = sc.whatsapps[0];
          else if (sc.telefones?.length && !lead.whatsapp) {
            const t = sc.telefones[0];
            lead.whatsapp = t.startsWith('55') ? t : '55' + t;
          }
        } catch (_) {}
      }

      // Atualizar linha na tabela em tempo real
      atualizarLinhaLead(lead);
      atualizarKPIs();

    } catch (_) {}

    // Respeitar rate limit: máx 10 req/s no Places
    await delay(120);
  }
}

// ============================
// RENDERIZAR TABELA
// ============================
function renderizarLeads() {
  const tbody = document.getElementById('tbodyCaptacao');
  if (!tbody) return;

  let lista = CAP.leads;
  if (CAP.filtro === 'com_whats')  lista = lista.filter(l => l.whatsapp);
  if (CAP.filtro === 'com_email')  lista = lista.filter(l => l.email);
  if (CAP.filtro === 'salvos')     lista = lista.filter(l => l.salvoNoCRM);

  document.getElementById('capTotal').textContent = `${lista.length} loja(s)`;

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text-3)">Nenhuma loja encontrada com este filtro</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(l => rowLead(l)).join('');
}

function rowLead(l) {
  const waLink   = l.whatsapp ? `https://wa.me/${l.whatsapp.replace(/\D/g, '')}` : null;
  const stars    = l.rating ? '⭐'.repeat(Math.round(l.rating)) + ` <small style="color:var(--text-3)">(${l.totalRatings})</small>` : '—';
  const statusCl = l.status === 'OPERATIONAL' ? 'pago' : l.status === 'CLOSED_TEMPORARILY' ? 'pendente' : 'vencido';
  const statusTx = l.status === 'OPERATIONAL' ? 'Ativa' : l.status === 'CLOSED_TEMPORARILY' ? 'Temp. Fechada' : l.status === 'CLOSED_PERMANENTLY' ? 'Fechada' : l.status;
  const checked  = CAP.selectedIds.has(l.id) ? 'checked' : '';

  return `<tr id="lead-row-${l.id}" class="${l.salvoNoCRM ? 'lead-salvo' : ''}">
    <td><input type="checkbox" ${checked} onchange="toggleSelectLead(${l.id}, this)"></td>
    <td>
      <div style="display:flex;align-items:center;gap:10px">
        ${l.foto ? `<img src="${l.foto}" style="width:36px;height:36px;object-fit:cover;border-radius:6px" onerror="this.style.display='none'">` : `<div style="width:36px;height:36px;background:linear-gradient(135deg,var(--green),var(--gold));border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px">🤠</div>`}
        <div>
          <div style="font-weight:600;font-size:13px">${l.nome}</div>
          ${l.salvoNoCRM ? '<span style="font-size:10px;color:#22c55e"><i class="fas fa-check"></i> No CRM</span>' : ''}
        </div>
      </div>
    </td>
    <td style="font-size:12px;max-width:200px;color:var(--text-2)">${l.endereco}</td>
    <td>
      ${l.telefone
        ? `<a href="tel:${l.telefone}" style="color:var(--text);font-size:12px">${l.telefone}</a>`
        : `<span style="color:var(--text-3);font-size:12px"><i class="fas fa-spinner fa-spin" style="font-size:10px"></i> buscando...</span>`}
    </td>
    <td>
      ${l.whatsapp
        ? `<a href="javascript:void(0)" onclick="abrirWhatsAppERegistrar('${l.whatsapp}', '${l.nome.replace(/'/g, "\\'")}', '${l.placeId}', '${l.endereco.replace(/'/g, "\\'")}'); return false;" style="display:inline-flex;align-items:center;gap:5px;background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.3);color:#25D366;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:600;text-decoration:none;cursor:pointer">
             <i class="fab fa-whatsapp"></i> Abrir
           </a>`
        : (l.detalhesCarregados
            ? `<span style="color:var(--text-3);font-size:11px">—</span>`
            : `<span style="color:var(--text-3);font-size:11px"><i class="fas fa-spinner fa-spin" style="font-size:9px"></i></span>`)}
    </td>
    <td>
      ${l.email
        ? `<a href="mailto:${l.email}" style="color:#60a5fa;font-size:12px">${l.email}</a>`
        : (l.detalhesCarregados
            ? `<span style="color:var(--text-3);font-size:11px">—</span>`
            : `<span style="color:var(--text-3);font-size:11px"><i class="fas fa-spinner fa-spin" style="font-size:9px"></i></span>`)}
    </td>
    <td>
      ${l.site
        ? `<a href="${l.site}" target="_blank" style="color:#60a5fa;font-size:11px" title="${l.site}"><i class="fas fa-globe"></i> Site</a>`
        : (l.detalhesCarregados ? `<span style="color:var(--text-3);font-size:11px">—</span>` : '')}
    </td>
    <td style="font-size:12px">${stars}</td>
    <td><span class="status-badge ${statusCl}">${statusTx}</span></td>
    <td>
      <div class="actions-cell">
        <button class="btn-icon" onclick="verDetalhesLead(${l.id})" title="Ver detalhes"><i class="fas fa-eye"></i></button>
        <button class="btn-icon" onclick="salvarLeadCRMDireto(${l.id})" title="Salvar no CRM" ${l.salvoNoCRM ? 'style="color:#22c55e"' : ''}><i class="fas fa-${l.salvoNoCRM ? 'check' : 'user-plus'}"></i></button>
        <a href="${l.googleUrl}" target="_blank" class="btn-icon" title="Ver no Google Maps"><i class="fab fa-google"></i></a>
      </div>
    </td>
  </tr>`;
}

function atualizarLinhaLead(lead) {
  const row = document.getElementById('lead-row-' + lead.id);
  if (row) {
    const novo = document.createElement('tbody');
    novo.innerHTML = rowLead(lead);
    row.replaceWith(novo.firstElementChild);
  }
}

// ============================
// FILTROS
// ============================
function filtrarCapStatus(status, btn) {
  CAP.filtro = status;
  document.querySelectorAll('.cap-filtro-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderizarLeads();
}

// ============================
// KPIs
// ============================
function atualizarKPIs() {
  const total  = CAP.leads.length;
  const whats  = CAP.leads.filter(l => l.whatsapp).length;
  const emails = CAP.leads.filter(l => l.email).length;
  const crm    = CAP.leads.filter(l => l.salvoNoCRM).length;

  const el = id => document.getElementById(id);
  if (el('capKpiTotal'))  el('capKpiTotal').textContent  = total;
  if (el('capKpiWhats'))  el('capKpiWhats').textContent  = whats;
  if (el('capKpiEmail'))  el('capKpiEmail').textContent  = emails;
  if (el('capKpiCRM'))    el('capKpiCRM').textContent    = crm;
}

// ============================
// SELEÇÃO
// ============================
function toggleSelectLead(id, cb) {
  if (cb.checked) CAP.selectedIds.add(id);
  else            CAP.selectedIds.delete(id);
  atualizarBotoesSelecao();
}

function selectAllLeads(cb) {
  CAP.leads.forEach(l => {
    if (cb.checked) CAP.selectedIds.add(l.id);
    else            CAP.selectedIds.delete(l.id);
  });
  document.querySelectorAll('#tbodyCaptacao input[type=checkbox]').forEach(c => c.checked = cb.checked);
  atualizarBotoesSelecao();
}

function atualizarBotoesSelecao() {
  const n = CAP.selectedIds.size;
  const div = document.getElementById('capAcoesMassa');
  const span = document.getElementById('capSelecionados');
  if (div) div.style.display = n > 0 ? 'flex' : 'none';
  if (span) span.textContent = `${n} selecionado(s)`;
}

// ============================
// VER DETALHES
// ============================
function verDetalhesLead(id) {
  const l = CAP.leads.find(x => x.id === id);
  if (!l) return;
  CAP.currentLeadId = id;

  const el = id2 => document.getElementById(id2);
  if (el('leadDetalheNome')) el('leadDetalheNome').textContent = l.nome;
  if (el('leadDetalheBody')) el('leadDetalheBody').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <div class="field-group"><label>Nome</label><div style="padding:10px 12px;background:var(--bg-2);border-radius:7px;font-size:13px">${l.nome}</div></div>
        <div class="field-group"><label>Endereço</label><div style="padding:10px 12px;background:var(--bg-2);border-radius:7px;font-size:13px">${l.endereco}</div></div>
        <div class="field-group"><label>Telefone</label><div style="padding:10px 12px;background:var(--bg-2);border-radius:7px;font-size:13px">${l.telefone || '—'}</div></div>
        <div class="field-group"><label>Avaliação Google</label><div style="padding:10px 12px;background:var(--bg-2);border-radius:7px;font-size:13px">${l.rating ? '⭐ ' + l.rating + '/5 (' + l.totalRatings + ' avaliações)' : '—'}</div></div>
      </div>
      <div>
        ${l.whatsapp ? `<div class="field-group"><label>WhatsApp</label>
          <a href="https://wa.me/${l.whatsapp}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.25);border-radius:7px;color:#25D366;font-weight:600;font-size:13px;text-decoration:none">
            <i class="fab fa-whatsapp fa-lg"></i> Abrir conversa +${l.whatsapp}
          </a></div>` : ''}
        ${l.email ? `<div class="field-group"><label>E-mail</label>
          <a href="mailto:${l.email}" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:7px;color:#60a5fa;font-size:13px;text-decoration:none">
            <i class="fas fa-envelope"></i> ${l.email}
          </a></div>` : ''}
        ${l.site ? `<div class="field-group"><label>Site</label>
          <a href="${l.site}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg-2);border-radius:7px;color:#60a5fa;font-size:12px;text-decoration:none;word-break:break-all">
            <i class="fas fa-globe"></i> ${l.site}
          </a></div>` : ''}
        <div class="field-group"><label>Google Maps</label>
          <a href="${l.googleUrl}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg-2);border-radius:7px;color:#60a5fa;font-size:13px;text-decoration:none">
            <i class="fab fa-google"></i> Ver no Google Maps
          </a></div>
      </div>
    </div>`;

  openModal('modalLeadDetalhe');
}

// ============================
// SALVAR NO CRM
// ============================
function salvarLeadCRM() {
  if (CAP.currentLeadId !== null) salvarLeadCRMDireto(CAP.currentLeadId);
  closeModal('modalLeadDetalhe');
}

async function salvarLeadCRMDireto(id) {
  const l = CAP.leads.find(x => x.id === id);
  if (!l || !window.DB) return;

  const existe = DB.clientes.find(c => c.nome === l.nome);
  if (existe) {
    showToast(`"${l.nome}" já existe no CRM!`, 'warning');
    l.salvoNoCRM = true;
    atualizarLinhaLead(l);
    return;
  }

  const cliente = {
    tipo:         'Lead',
    nome:         l.nome,
    email:        l.email || '',
    telefone:     l.telefone || '',
    origem:       'Captação Lojas',
    estagio:      'Contato',
    observacoes:  `Endereço: ${l.endereco}${l.whatsapp ? ' | WhatsApp: +'+l.whatsapp : ''}${l.site ? ' | Site: '+l.site : ''}`,
    usuario_contato: DB.user?.nome
  };

  const result = await apiRequest('POST', '/api/clientes', cliente);
  if (result) {
    DB.clientes.push({
      id:           result.id,
      ...cliente,
      tel:          cliente.telefone,
      obs:          cliente.observacoes,
      usuario_contato: DB.user?.nome,
      compras:      0,
      totalGasto:   0,
      ultimaCompra: '—'
    });

    // Salvar no localStorage o placeId da loja salva (para persistir entre recarregamentos)
    const salvasNoLocalStorage = JSON.parse(localStorage.getItem('captacao_salvas_crm') || '[]');
    if (!salvasNoLocalStorage.includes(l.placeId)) {
      salvasNoLocalStorage.push(l.placeId);
      localStorage.setItem('captacao_salvas_crm', JSON.stringify(salvasNoLocalStorage));
    }

    l.salvoNoCRM = true;
    atualizarLinhaLead(l);
    atualizarKPIs();
    renderCRM();
    showToast(`"${l.nome}" salvo no CRM!`, 'success');
  }
}

async function salvarSelecionadosCRM() {
  const ids = Array.from(CAP.selectedIds);
  if (!ids.length) return showToast('Selecione ao menos uma loja', 'warning');

  let count = 0;
  for (const id of ids) {
    const l = CAP.leads.find(x => x.id === id);
    if (l && !l.salvoNoCRM) {
      await salvarLeadCRMDireto(id);
      count++;
      await delay(300);
    }
  }
  CAP.selectedIds.clear();
  document.querySelectorAll('#tbodyCaptacao input[type=checkbox]').forEach(c => c.checked = false);
  if (document.getElementById('capSelectAll')) document.getElementById('capSelectAll').checked = false;
  atualizarBotoesSelecao();
  if (count > 0) showToast(`${count} loja(s) salva(s) no CRM!`, 'success');
}

// ============================
// WHATSAPP EM MASSA
// ============================
function abrirWhatsAppMassa() {
  const leads = CAP.leads.filter(l => CAP.selectedIds.has(l.id) && l.whatsapp);
  if (!leads.length) return showToast('Nenhuma loja selecionada com WhatsApp', 'error');

  const msg = encodeURIComponent(
    `Olá! Tudo bem? Sou da *Power Ropes*, empresa especializada em cordas e acessórios country. Gostaria de apresentar nossos produtos para a sua loja. Podemos conversar?`
  );

  leads.forEach((l, i) => {
    setTimeout(() => {
      window.open(`https://wa.me/${l.whatsapp}?text=${msg}`, '_blank');
    }, i * 800);
  });

  showToast(`Abrindo WhatsApp de ${leads.length} lojas...`, 'info');
}

// ============================
// EXPORTAR CSV
// ============================
function exportarLeads() {
  const lista = CAP.leads.length ? CAP.leads : [];
  if (!lista.length) return showToast('Nenhum resultado para exportar', 'error');
  gerarCSV(lista);
}

function exportarSelecionados() {
  const lista = CAP.leads.filter(l => CAP.selectedIds.has(l.id));
  if (!lista.length) return showToast('Selecione ao menos uma loja', 'error');
  gerarCSV(lista);
}

function gerarCSV(lista) {
  const header = ['Nome','Endereço','Telefone','WhatsApp','E-mail','Site','Avaliação','Total Avaliações','Google Maps'];
  const rows = lista.map(l => [
    `"${l.nome}"`,
    `"${l.endereco}"`,
    l.telefone || '',
    l.whatsapp ? '+' + l.whatsapp : '',
    l.email || '',
    l.site || '',
    l.rating || '',
    l.totalRatings || '',
    l.googleUrl,
  ]);
  const csv = [header.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `lojas_country_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
  a.click();
  showToast(`${lista.length} lojas exportadas!`, 'success');
}

// ============================
// LIMPAR
// ============================
function limparResultados() {
  CAP.leads = [];
  CAP.selectedIds.clear();
  document.getElementById('capResultados').style.display = 'none';
  document.getElementById('capKPIs').style.display       = 'none';
  document.getElementById('capEmpty').style.display      = 'block';
  document.getElementById('capCidade').value = '';
}

// ============================
// REGISTRAR CONTATO VIA WHATSAPP
// ============================
async function abrirWhatsAppERegistrar(whatsapp, nomeLoja, placeId, endereco) {
  if (!window.DB?.user?.nome) {
    showToast('Erro: usuário não identificado', 'error');
    return;
  }

  const contato = {
    place_id: placeId,
    nome_loja: nomeLoja,
    usuario_contato: DB.user.nome,
    whatsapp_numero: whatsapp,
    endereco: endereco
  };

  // 1. Registrar na tabela contatos_captacao
  const resultContato = await apiRequest('POST', '/api/contatos_captacao', contato);

  // 2. Criar/Atualizar cliente no CRM
  const clienteExistente = DB.clientes?.find(c => c.nome === nomeLoja);
  if (clienteExistente) {
    // Atualizar com usuário que contatou
    await apiRequest('PUT', `/api/clientes/${clienteExistente.id}`, {
      usuario_contato: DB.user.nome
    });
    clienteExistente.usuario_contato = DB.user.nome;
    renderCRM();
  } else {
    // CRIAR novo cliente se não existir
    const l = CAP.leads.find(x => x.nome === nomeLoja);
    if (l) {
      await salvarLeadCRMDireto(l.id);
    }
  }

  if (resultContato) {
    showToast(`Contato registrado para ${DB.user.nome}!`, 'info');
  }

  // Abrir WhatsApp
  window.open(`https://wa.me/${whatsapp}`, '_blank');
}

// ============================
// UTILS
// ============================
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================
// RELATÓRIO COMPLETO DE CONTATOS (ADMIN)
// ============================
async function renderRelatorioContatos() {
  const container = document.getElementById('capRelatorioContatos');
  if (!container) return;

  try {
    const contatos = await fetch('/api/contatos_captacao').then(r => r.json());

    if (!contatos || contatos.length === 0) {
      document.getElementById('tbodyRelatorioContatos').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-3)">Nenhum contato registrado</td></tr>';
      return;
    }

    // Preencher filtro de usuários
    const usuariosUnicos = [...new Set(contatos.map(c => c.usuario_contato))];
    const selectUsuario = document.getElementById('capRelatorioFiltroUsuario');
    const usuariosExistentes = Array.from(selectUsuario.querySelectorAll('option')).map(o => o.value).filter(v => v !== '');

    usuariosUnicos.forEach(usuario => {
      if (!usuariosExistentes.includes(usuario)) {
        const option = document.createElement('option');
        option.value = usuario;
        option.textContent = usuario;
        selectUsuario.appendChild(option);
      }
    });

    // Filtrar por usuário se selecionado
    const usuarioFiltro = selectUsuario.value;
    let contatosFiltrados = contatos;
    if (usuarioFiltro) {
      contatosFiltrados = contatos.filter(c => c.usuario_contato === usuarioFiltro);
    }

    // Renderizar tabela
    const tbody = document.getElementById('tbodyRelatorioContatos');
    tbody.innerHTML = contatosFiltrados.map(c => {
      const dataFormatada = c.data_contato ? new Date(c.data_contato).toLocaleString('pt-BR') : '—';
      const waLink = c.whatsapp_numero ? `https://wa.me/${c.whatsapp_numero.replace(/\D/g, '')}` : null;
      return `<tr>
        <td style="font-weight:500">${c.nome_loja}</td>
        <td style="color:var(--gold)">${c.usuario_contato}</td>
        <td>${c.whatsapp_numero ? `<a href="${waLink}" target="_blank" style="color:#25D366"><i class="fab fa-whatsapp"></i> ${c.whatsapp_numero}</a>` : '—'}</td>
        <td style="font-size:11px;max-width:200px">${c.endereco || '—'}</td>
        <td style="font-size:11px;color:var(--text-2)">${dataFormatada}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon" onclick="navigator.clipboard.writeText('${c.whatsapp_numero || ''}')" title="Copiar WhatsApp"><i class="fas fa-copy"></i></button>
            <button class="btn-icon del" onclick="deleteContatoCaptacao(${c.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');

    container.style.display = 'block';
  } catch (e) {
    console.error('Erro ao carregar relatório:', e);
  }
}

async function deleteContatoCaptacao(id) {
  if (!confirm('Remover este contato?')) return;
  const result = await apiRequest('DELETE', `/api/contatos_captacao/${id}`);
  if (result) {
    showToast('Contato removido', 'warning');
    renderRelatorioContatos();
  }
}

function exportarRelatorioContatos() {
  const contatos = [];
  document.querySelectorAll('#tbodyRelatorioContatos tr').forEach(row => {
    const tds = row.querySelectorAll('td');
    if (tds.length >= 5) {
      contatos.push([
        tds[0].textContent.trim(),
        tds[1].textContent.trim(),
        tds[2].textContent.trim(),
        tds[3].textContent.trim(),
        tds[4].textContent.trim(),
      ]);
    }
  });

  if (!contatos.length) return showToast('Nenhum contato para exportar', 'warning');

  const header = ['Loja', 'Usuário', 'WhatsApp', 'Endereço', 'Data/Hora'];
  const csv = [header.join(';'), ...contatos.map(r => r.map(cell => `"${cell}"`).join(';'))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio_contatos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
  a.click();
  showToast('Relatório exportado!', 'success');
}

// ============================
// RESUMO DE CONTATOS POR USUÁRIO
// ============================
async function renderResumoContatosPorUsuario() {
  const container = document.getElementById('capResumoContatosUsuarios');
  if (!container) return;

  try {
    const contatos = await fetch('/api/contatos_captacao').then(r => r.json());

    // Agrupar por usuário
    const porUsuario = {};
    contatos.forEach(c => {
      if (!porUsuario[c.usuario_contato]) {
        porUsuario[c.usuario_contato] = 0;
      }
      porUsuario[c.usuario_contato]++;
    });

    if (Object.keys(porUsuario).length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-3)">Nenhum contato registrado ainda</div>';
      return;
    }

    const usuarios = Object.entries(porUsuario)
      .sort((a, b) => b[1] - a[1])
      .map(([usuario, count]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-2);border-radius:6px;margin-bottom:8px">
          <span style="font-weight:500">${usuario}</span>
          <span style="background:var(--green);color:white;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600">${count}</span>
        </div>
      `).join('');

    container.innerHTML = `
      <div style="padding:16px;background:var(--bg-1);border-radius:8px;border:1px solid var(--border)">
        <div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--text)">📊 Contatos por Usuário</div>
        ${usuarios}
      </div>
    `;
  } catch (e) {
    console.error('Erro ao carregar resumo:', e);
  }
}

// ============================
// HOOK DE MÓDULO
// ============================
const _origShowModuleCap = window.showModule;
window.showModule = function(name, el) {
  _origShowModuleCap(name, el);
  if (name === 'captacao') {
    initCaptacao();
    setTimeout(() => {
      renderResumoContatosPorUsuario();
      renderRelatorioContatos();
    }, 100);
  }
};

async function initCaptacao() {
  // Usar chave do .env (já carregada no servidor) ou localStorage
  const key = localStorage.getItem('gmaps_key') || 'AIzaSyAiS1F7gX9JFJ51d_FjI8ul5iI6ggYsxRc';
  localStorage.setItem('gmaps_key', key);
  if (key) {
    fetch('/api/captacao/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key }),
    }).catch(() => {});
  }
  // Verificar status
  try {
    const s = await fetch('/api/captacao/status').then(r => r.json());
    if (!s.hasKey) {
      // Mostrar dica de configuração discretamente
      const empty = document.getElementById('capEmpty');
      if (empty && !document.getElementById('capApiDica')) {
        empty.insertAdjacentHTML('beforeend', `
          <div id="capApiDica" style="margin-top:20px;padding:14px 18px;background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.2);border-radius:8px;font-size:13px;color:#eab308;max-width:480px;margin-left:auto;margin-right:auto">
            <i class="fas fa-triangle-exclamation"></i>
            <strong>Google Maps API Key não configurada.</strong><br>
            <span style="color:var(--text-2)">Configure para buscar lojas automaticamente.</span>
            <br><button class="btn-primary btn-sm" style="margin-top:10px" onclick="openModal('modalGMapsConfig')"><i class="fas fa-key"></i> Configurar Agora</button>
          </div>`);
      }
    }
  } catch (_) {}
}
