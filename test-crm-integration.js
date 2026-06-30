// Teste da integração Captação de Lojas → CRM
const fetch = require('node-fetch');

async function test() {
  console.log('🧪 Teste de Integração: Captação de Lojas → CRM\n');

  // 1. Limpar dados anteriores
  console.log('1️⃣ Limpando dados anteriores...');
  const clientesAntigos = await fetch('http://localhost:3000/api/clientes').then(r => r.json());
  for (const cliente of clientesAntigos) {
    await fetch(`http://localhost:3000/api/clientes/${cliente.id}`, { method: 'DELETE' });
  }
  console.log('✅ Dados limpos\n');

  // 2. Criar 3 contatos via API (simulando salvar lojas no CRM)
  console.log('2️⃣ Criando 3 contatos via Captação de Lojas...');
  const lojas = [
    { nome: 'Country Store SP', email: 'sp@country.com', telefone: '1133334444', origem: 'Captação Lojas', estagio: 'Contato' },
    { nome: 'Country Store RJ', email: 'rj@country.com', telefone: '2122223333', origem: 'Captação Lojas', estagio: 'Contato' },
    { nome: 'Country Store MG', email: 'mg@country.com', telefone: '3144445555', origem: 'Captação Lojas', estagio: 'Contato' },
  ];

  for (const loja of lojas) {
    const res = await fetch('http://localhost:3000/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'Lead', ...loja, observacoes: 'Salvo via Captação de Lojas' })
    }).then(r => r.json());
    console.log(`  ✓ ${loja.nome} criado (ID: ${res.id})`);
  }
  console.log('✅ Contatos criados\n');

  // 3. Verificar contadores
  console.log('3️⃣ Verificando contadores...');
  const todosClientes = await fetch('http://localhost:3000/api/clientes').then(r => r.json());
  console.log(`  Total de clientes: ${todosClientes.length}`);
  
  const contatoCount = todosClientes.filter(c => c.estagio === 'Contato').length;
  console.log(`  Contatos (Contato): ${contatoCount}`);
  
  if (contatoCount === 3) {
    console.log('✅ Contadores corretos!\n');
  } else {
    console.log(`❌ Esperado 3, obteve ${contatoCount}\n`);
  }

  // 4. Criar 1 Lead em estágio "Novo Lead"
  console.log('4️⃣ Criando 1 lead em Novo Lead...');
  await fetch('http://localhost:3000/api/clientes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      tipo: 'Lead',
      nome: 'Lead Novo SP',
      email: 'novo@lead.com',
      telefone: '1199999999',
      origem: 'Manual',
      estagio: 'Novo Lead',
      observacoes: 'Lead novo'
    })
  }).then(r => r.json());
  console.log('✅ Lead em Novo Lead criado\n');

  // 5. Verificar contadores finais
  console.log('5️⃣ Contadores finais:');
  const clientes = await fetch('http://localhost:3000/api/clientes').then(r => r.json());
  
  const novoLeadCount = clientes.filter(c => c.estagio === 'Novo Lead').length;
  const contatoFinalCount = clientes.filter(c => c.estagio === 'Contato').length;
  
  console.log(`  Novo Lead: ${novoLeadCount}`);
  console.log(`  Contato: ${contatoFinalCount}`);
  console.log(`  Total: ${clientes.length}`);
  
  if (novoLeadCount === 1 && contatoFinalCount === 3) {
    console.log('\n✅ TESTE PASSOU! Funil CRM funcionando corretamente!');
  } else {
    console.log('\n❌ TESTE FALHOU!');
  }

  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
