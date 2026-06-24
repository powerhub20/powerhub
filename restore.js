const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const BACKUP_DIR = path.join(__dirname, 'backups');
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost/powerhub';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('❌ Nenhum backup encontrado!');
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR).sort().reverse();
  if (files.length === 0) {
    console.log('❌ Nenhum backup encontrado!');
    return [];
  }

  console.log('\n📋 Backups disponíveis:\n');
  files.forEach((file, idx) => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024 / 1024).toFixed(2);
    const date = stats.birthtime.toLocaleString('pt-BR');
    console.log(`  [${idx}] ${file} (${size} MB) - ${date}`);
  });

  return files;
}

async function restore() {
  console.log('🔴 ⚠️  RESTAURAÇÃO DE BANCO DE DADOS ⚠️\n');
  console.log('⚠️  AVISO: Isso vai SUBSTITUIR todos os dados atuais!');
  console.log('⚠️  Certifique-se de que quer fazer isso!\n');

  const backups = listBackups();
  if (backups.length === 0) {
    rl.close();
    process.exit(1);
  }

  rl.question('\n🔢 Digite o número do backup para restaurar (ou "sair"): ', async (answer) => {
    if (answer.toLowerCase() === 'sair') {
      console.log('❌ Cancelado');
      rl.close();
      process.exit(0);
    }

    const idx = parseInt(answer);
    if (isNaN(idx) || idx < 0 || idx >= backups.length) {
      console.log('❌ Opção inválida');
      rl.close();
      process.exit(1);
    }

    const backupFile = backups[idx];
    const backupPath = path.join(BACKUP_DIR, backupFile);

    rl.question(`\n⚠️  Tem certeza que quer restaurar ${backupFile}? (sim/não): `, (confirm) => {
      if (confirm.toLowerCase() !== 'sim') {
        console.log('❌ Cancelado');
        rl.close();
        process.exit(0);
      }

      console.log(`\n🔄 Restaurando ${backupFile}...`);
      console.log('💾 Conectando ao banco de dados...\n');

      try {
        const command = `psql "${DATABASE_URL}" < "${backupPath}"`;
        execSync(command, { stdio: 'inherit' });

        console.log('\n✅ Banco restaurado com sucesso!');
        console.log(`📅 Backup restaurado: ${backupFile}`);
        console.log('🚀 Sistema pronto para uso!');

      } catch (err) {
        console.error('\n❌ ERRO ao restaurar:');
        console.error(err.message);
        console.log('\n💡 Verifique se:');
        console.log('  1. DATABASE_URL está correto');
        console.log('  2. PostgreSQL está instalado (psql)');
        console.log('  3. Você tem acesso ao banco de dados');
      }

      rl.close();
      process.exit(err ? 1 : 0);
    });
  });
}

restore();
