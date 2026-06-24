const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, 'backups');
const DATABASE_URL = process.env.DATABASE_URL;
const TIMESTAMP = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
const BACKUP_FILE = `backup-${TIMESTAMP}.sql`;
const BACKUP_PATH = path.join(BACKUP_DIR, BACKUP_FILE);

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida!');
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

console.log('🔄 Iniciando backup do banco de dados...');
console.log(`📅 Data: ${TIMESTAMP}`);
console.log(`💾 Destino: ${BACKUP_PATH}`);

(async () => {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('\n📊 Consultando informações do banco...');
    const result = await pool.query("SELECT version()");
    console.log(`✅ Conectado: ${result.rows[0].version.split(',')[0]}`);

    // Obter lista de tabelas
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    console.log(`\n📋 ${tables.rows.length} tabelas encontradas`);

    let backupContent = '-- Power Hub Database Backup\n';
    backupContent += `-- Created: ${new Date().toISOString()}\n\n`;

    // Fazer backup de cada tabela
    for (const row of tables.rows) {
      const tableName = row.table_name;
      const tableData = await pool.query(`SELECT * FROM ${tableName}`);

      backupContent += `\n-- Tabela: ${tableName} (${tableData.rows.length} registros)\n`;
      backupContent += `DELETE FROM ${tableName};\n`;

      if (tableData.rows.length > 0) {
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

    console.log(`\n✅ Backup concluído!`);
    console.log(`📦 Tamanho: ${sizeMB} MB`);
    console.log(`💾 Arquivo: ${BACKUP_FILE}`);

    // Limpar backups antigos
    console.log('\n🧹 Limpando backups antigos...');
    const files = fs.readdirSync(BACKUP_DIR).sort().reverse();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let deleted = 0;
    files.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const fileStats = fs.statSync(filePath);
      if (fileStats.birthtime < thirtyDaysAgo) {
        fs.unlinkSync(filePath);
        console.log(`  🗑️  Removido: ${file}`);
        deleted++;
      }
    });
    console.log(`✅ ${deleted} backups antigos removidos\n`);

    // Listar backups
    console.log('📋 Últimos 5 backups:');
    fs.readdirSync(BACKUP_DIR).sort().reverse().slice(0, 5).forEach((file, idx) => {
      const filePath = path.join(BACKUP_DIR, file);
      const s = fs.statSync(filePath);
      const size = (s.size / 1024 / 1024).toFixed(2);
      const date = s.birthtime.toLocaleString('pt-BR');
      console.log(`  ${idx + 1}. ${file} (${size} MB) - ${date}`);
    });

    console.log('\n✅ Backup realizado com sucesso!\n');
    await pool.end();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERRO ao fazer backup:');
    console.error(err.message);
    await pool.end();
    process.exit(1);
  }
})();
