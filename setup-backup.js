#!/usr/bin/env node

const readline = require('readline');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     🔐 CONFIGURAÇÃO DE BACKUP - Power Hub                    ║
║     Protetor contra perda de dados em Railway                 ║
╚═══════════════════════════════════════════════════════════════╝
\n`);

  console.log('⚠️  SITUAÇÃO CRÍTICA:');
  console.log('   Railway não faz backup automático no plano grátis!');
  console.log('   Seu banco de dados está DESPROTEGIDO!\n');

  const databaseUrl = await prompt('🔑 Cole a DATABASE_URL do Railway:\n   > ');

  if (!databaseUrl || !databaseUrl.includes('postgresql')) {
    console.log('\n❌ URL inválida!');
    rl.close();
    process.exit(1);
  }

  console.log('\n🔄 Testando conexão...');

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const result = await pool.query('SELECT version()');
    const version = result.rows[0].version.split(',')[0];
    console.log(`✅ Conectado com sucesso!`);
    console.log(`📊 ${version}\n`);

    // Contar tabelas
    const tables = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    console.log(`📋 ${tables.rows[0].count} tabelas encontradas\n`);

    // Perguntar se quer salvar
    const save = await prompt('💾 Salvar DATABASE_URL em .env.backup? (sim/não)\n   > ');

    if (save.toLowerCase() === 'sim') {
      const envPath = path.join(__dirname, '.env.backup');
      fs.writeFileSync(envPath, `DATABASE_URL=${databaseUrl}\n`);
      console.log(`\n✅ Salvo em: ${envPath}`);
      console.log('📝 Nota: Adicione .env.backup ao .gitignore!\n');
    }

    // Fazer backup
    const doBackup = await prompt('🔄 Fazer backup agora? (sim/não)\n   > ');

    if (doBackup.toLowerCase() === 'sim') {
      console.log('\n📊 Iniciando backup...\n');
      process.env.DATABASE_URL = databaseUrl;

      // Executar backup
      require('./backup.js');
      return;
    }

    console.log('\n✅ Configuração concluída!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. node backup.js              (fazer backup manual)');
    console.log('   2. Configure GitHub Secrets    (automação)');
    console.log('   3. Leia BACKUP-README.md       (documentação)\n');

  } catch (err) {
    console.error('\n❌ ERRO ao conectar:');
    console.error(err.message);
    console.log('\n💡 Verifique:');
    console.log('   1. URL está correta?');
    console.log('   2. Copiou tudo (com senha)?');
    console.log('   3. Railway PostgreSQL está online?');
  }

  await pool.end();
  rl.close();
}

main();
