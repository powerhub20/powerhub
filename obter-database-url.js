#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  📍 EXTRATOR DE DATABASE URL - Railway                        ║
╚═══════════════════════════════════════════════════════════════╝

🔑 INSTRUÇÕES:
1. Abra: https://railway.app
2. Clique no seu projeto "powerhub"
3. Clique em "PostgreSQL"
4. Clique na aba "Variáveis"
5. Procure por "URL_DO_BANCO_DE_DADOS" ou "DATABASE_URL"
6. Clique no ícone de OLHO para revelar
7. COPIE TUDO (do "postgresql://" até o final)
8. COLE AQUI ABAIXO:

`);

rl.question('Cole a DATABASE_URL completa:\n> ', (url) => {
  if (!url || !url.includes('postgresql://')) {
    console.log('\n❌ URL inválida!');
    rl.close();
    process.exit(1);
  }

  console.log(`\n✅ URL capturada!\n`);
  console.log('📝 Cole isto no arquivo backup-auto.js:\n');
  console.log(`const DATABASE_URL = '${url}';\n`);

  console.log('📋 PASSO A PASSO:');
  console.log('1. Abra o arquivo: backup-auto.js');
  console.log('2. Procure pela linha: const DATABASE_URL = ...');
  console.log('3. SUBSTITUA a URL inteira');
  console.log('4. Salve o arquivo (Ctrl+S)');
  console.log('5. Execute: node backup-auto.js\n');

  rl.close();
});
