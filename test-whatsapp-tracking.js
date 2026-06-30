const fetch = require('node-fetch');

async function test() {
  console.log('🧪 Teste: Rastreamento de Contatos WhatsApp\n');

  // 1. Limpar dados anteriores
  console.log('1️⃣ Limpando contatos anteriores...');
  try {
    const contatosAntigos = await fetch('http://localhost:3000/api/contatos_captacao').then(r => r.json());
    for (const c of contatosAntigos) {
      await fetch(`http://localhost:3000/api/contatos_captacao/${c.id}`, { method: 'DELETE' });
    }
  } catch (_) {}
  console.log('✅ Limpo\n');

  // 2. Registrar contatos de 3 usuários
  console.log('2️⃣ Registrando contatos de usuários...');
  const lojas = [
    { nome: 'Country Store SP', whatsapp: '1133334444', endereco: 'Av Paulista 1000' },
    { nome: 'Country Store RJ', whatsapp: '2122223333', endereco: 'Av Atlântica 500' },
    { nome: 'Country Store MG', whatsapp: '3144445555', endereco: 'Av Getúlio 2000' },
  ];

  // João faz 3 contatos
  for (const loja of lojas) {
    await fetch('http://localhost:3000/api/contatos_captacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome_loja: loja.nome,
        usuario_contato: 'João Silva',
        whatsapp_numero: loja.whatsapp,
        endereco: loja.endereco,
        place_id: 'test_' + Math.random()
      })
    }).then(r => r.json());
  }
  console.log(`  ✓ João Silva: 3 contatos`);

  // Maria faz 2 contatos
  for (const loja of lojas.slice(0, 2)) {
    await fetch('http://localhost:3000/api/contatos_captacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome_loja: loja.nome,
        usuario_contato: 'Maria Santos',
        whatsapp_numero: loja.whatsapp,
        endereco: loja.endereco,
        place_id: 'test_' + Math.random()
      })
    }).then(r => r.json());
  }
  console.log(`  ✓ Maria Santos: 2 contatos`);

  // Carlos faz 1 contato
  await fetch('http://localhost:3000/api/contatos_captacao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome_loja: lojas[0].nome,
      usuario_contato: 'Carlos Oliveira',
      whatsapp_numero: lojas[0].whatsapp,
      endereco: lojas[0].endereco,
      place_id: 'test_' + Math.random()
    })
  }).then(r => r.json());
  console.log(`  ✓ Carlos Oliveira: 1 contato\n`);

  // 3. Verificar resultado
  console.log('3️⃣ Verificando contatos registrados...');
  const contatos = await fetch('http://localhost:3000/api/contatos_captacao').then(r => r.json());
  console.log(`\nTotal de contatos: ${contatos.length}`);
  
  const porUsuario = {};
  contatos.forEach(c => {
    if (!porUsuario[c.usuario_contato]) porUsuario[c.usuario_contato] = 0;
    porUsuario[c.usuario_contato]++;
  });

  console.log('\n📊 Contatos por Usuário:');
  Object.entries(porUsuario).sort((a, b) => b[1] - a[1]).forEach(([usuario, count]) => {
    console.log(`  ${usuario}: ${count} contato(s)`);
  });

  if (contatos.length === 6 && porUsuario['João Silva'] === 3 && porUsuario['Maria Santos'] === 2 && porUsuario['Carlos Oliveira'] === 1) {
    console.log('\n✅ TESTE PASSOU! Rastreamento funcionando corretamente!');
  } else {
    console.log('\n❌ TESTE FALHOU!');
  }

  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
