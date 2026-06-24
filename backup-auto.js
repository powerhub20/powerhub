#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// URL de produção Railway (pegando do servidor em produção)
const DATABASE_URL = 'postgresql://postgres:UPLgMHxBccYPOeBjAcJZYOQoFvtuSYvT@acela.proxy.rlwy.net:47748/railway';

const BACKUP_DIR = path.join(__dirname, 'backups');
const TIMESTAMP = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
const BACKUP_FILE = `backup-${TIMESTAMP}.sql`;
const BACKUP_PATH = path.join(BACKUP_DIR, BACKUP_FILE);

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║  🔄 BACKUP AUTOMÁTICO - Power Hub                    ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

console.log(`📅 Data: ${TIMESTAMP}`);
console.log(`💾 Destino: backups/${BACKUP_FILE}\n`);

(async () => {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🔌 Conectando ao PostgreSQL Railway...');
    const result = await pool.query("SELECT version()");
    console.log(`✅ Conectado com sucesso!\n`);

    // Obter lista de tabelas
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);

    console.log(`📋 ${tables.rows.length} tabelas encontradas\n`);

    let backupContent = '-- Power Hub Database Backup\n';
    backupContent += `-- Created: ${new Date().toISOString()}\n`;
    backupContent += `-- Railway PostgreSQL Backup\n\n`;

    let totalRecords = 0;

    // Fazer backup de cada tabela
    for (const row of tables.rows) {
      const tableName = row.table_name;
      const tableData = await pool.query(`SELECT * FROM ${tableName}`);
      const count = tableData.rows.length;
      totalRecords += count;

      console.log(`  📊 ${tableName}: ${count} registros`);

      backupContent += `\n-- Tabela: ${tableName} (${count} registros)\n`;
      backupContent += `DELETE FROM ${tableName};\n`;

      if (count > 0) {
        const columns = Object.keys(tableData.rows[0]).join(', ');

        tableData.rows.forEach(row => {
          const values = Object.values(row).map(v => {
            if (v === null) return 'NULL';
            if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
            if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
            return v;
          }).join(', ');

          backupContent += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
        });
      }
    }

    // Salvar arquivo
    fs.writeFileSync(BACKUP_PATH, backupContent);
    const stats = fs.statSync(BACKUP_PATH);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`\n✅ BACKUP CONCLUÍDO COM SUCESSO!\n`);
    console.log(`📊 Total de registros: ${totalRecords}`);
    console.log(`📦 Tamanho: ${sizeMB} MB`);
    console.log(`💾 Arquivo: ${BACKUP_FILE}\n`);

    // Limpar backups antigos
    console.log('🧹 Limpando backups com mais de 30 dias...');
    const files = fs.readdirSync(BACKUP_DIR).sort().reverse();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let deleted = 0;
    files.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const fileStats = fs.statSync(filePath);
      if (fileStats.birthtime < thirtyDaysAgo) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    });

    if (deleted > 0) console.log(`   ✅ ${deleted} backups antigos removidos`);
    else console.log(`   ✅ Nenhum backup antigo para remover`);

    // Listar últimos 5 backups
    console.log(`\n📋 Últimos 5 backups disponíveis:`);
    fs.readdirSync(BACKUP_DIR)
      .sort()
      .reverse()
      .slice(0, 5)
      .forEach((file, idx) => {
        const filePath = path.join(BACKUP_DIR, file);
        const s = fs.statSync(filePath);
        const size = (s.size / 1024 / 1024).toFixed(2);
        const date = s.birthtime.toLocaleString('pt-BR');
        console.log(`   ${idx + 1}. ${file} (${size} MB) - ${date}`);
      });

    console.log('\n✅ Seu banco está PROTEGIDO! 🔐\n');

    await pool.end();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERRO ao fazer backup:');
    console.error(err.message);
    console.log('\n💡 Se o erro for de conexão:');
    console.log('   1. Verifique se o Railway PostgreSQL está online');
    console.log('   2. Copie a URL correta de: Railway → PostgreSQL → Variáveis');
    console.log('   3. Edit backup-auto.js e atualize a DATABASE_URL\n');
    await pool.end();
    process.exit(1);
  }
})();
