const fetch = require('node-fetch');

async function migrate() {
  try {
    console.log('🔄 Buscando clientes...');
    const clientes = await fetch('https://powerhub-production-3dc2.up.railway.app/api/clientes')
      .then(r => r.json());

    console.log(`📋 ${clientes.length} clientes encontrados\n`);

    let atualizados = 0;
    for (const c of clientes) {
      if (c.endereco) continue; // Já tem endereço
      
      let endereco = '';
      if (c.observacoes && c.observacoes.includes('Endereço:')) {
        const match = c.observacoes.match(/Endereço:\s*([^|]+)/);
        if (match) {
          endereco = match[1].trim();
        }
      }

      if (endereco) {
        const result = await fetch(`https://powerhub-production-3dc2.up.railway.app/api/clientes/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endereco })
        }).then(r => r.json());

        console.log(`✅ ${c.nome}`);
        console.log(`   📍 ${endereco}\n`);
        atualizados++;
      }
    }

    console.log(`\n✅ Migração concluída! ${atualizados} clientes atualizados.`);
  } catch (e) {
    console.error('❌ Erro:', e.message);
  }
  process.exit(0);
}

migrate();
