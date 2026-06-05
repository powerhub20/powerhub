// ════════════════════════════════════════════════
// PostgreSQL Database — Power Hub
// Compatível com interface do db.js (SQLite)
// ════════════════════════════════════════════════

const { Pool } = require('pg');

// Conectar ao PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/powerhub'
});

pool.on('error', (err) => {
  console.error('Pool error:', err);
});

pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL');
});

// ────────────────────────────────────────────────
// INIT TABLES
// ────────────────────────────────────────────────

async function initDatabase() {
  console.log('🔌 Inicializando PostgreSQL...');

  const tables = [
    `CREATE TABLE IF NOT EXISTS tarefas (
      id SERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      descricao TEXT,
      responsavel TEXT,
      data_limite TEXT,
      prioridade TEXT,
      status TEXT,
      checklist TEXT,
      checkDone TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      sku TEXT,
      categoria TEXT,
      fornecedor TEXT,
      qtd INTEGER,
      qtd_minima INTEGER,
      custo REAL,
      venda REAL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS financeiro (
      id SERIAL PRIMARY KEY,
      tipo TEXT,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT,
      categoria TEXT,
      status TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS avisos (
      id SERIAL PRIMARY KEY,
      tipo TEXT,
      titulo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      destinatario TEXT,
      prioridade TEXT,
      data TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS metas (
      id SERIAL PRIMARY KEY,
      tipo TEXT,
      titulo TEXT NOT NULL,
      valor REAL NOT NULL,
      valor_atual REAL,
      prazo TEXT,
      responsavel TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS funcionarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      cargo TEXT,
      departamento TEXT,
      telefone TEXT,
      email TEXT,
      data_contratacao TEXT,
      salario REAL,
      status TEXT,
      senha TEXT,
      permissoes TEXT,
      tarefas INTEGER DEFAULT 0,
      concluidas INTEGER DEFAULT 0,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS campanhas (
      id SERIAL PRIMARY KEY,
      canal TEXT,
      nome TEXT NOT NULL,
      investimento REAL,
      cliques INTEGER,
      conversoes INTEGER,
      receita REAL,
      periodo TEXT,
      status TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      tipo TEXT,
      nome TEXT NOT NULL,
      email TEXT,
      telefone TEXT,
      origem TEXT,
      estagio TEXT,
      observacoes TEXT,
      compras INTEGER DEFAULT 0,
      total_gasto REAL DEFAULT 0,
      ultima_compra TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS fornecedores (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      cnpj TEXT,
      contato TEXT,
      telefone TEXT,
      email TEXT,
      prazo TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS compras (
      id SERIAL PRIMARY KEY,
      fornecedor TEXT NOT NULL,
      data TEXT,
      produtos TEXT,
      total REAL,
      status TEXT,
      data_entrega TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  try {
    for (const sql of tables) {
      try {
        await pool.query(sql);
      } catch (err) {
        console.log(`⚠️  Tabela já existe ou erro menor:`, err.message.substring(0, 50));
      }
    }
    console.log('✅ PostgreSQL iniciado com sucesso!');
    return true;
  } catch (err) {
    console.error('❌ Erro crítico ao inicializar PostgreSQL:', err.message);
    throw err;
  }
}

// ────────────────────────────────────────────────
// FUNÇÕES GENÉRICAS (compatível com db.js - callbacks)
// ────────────────────────────────────────────────

function getAll(table, callback) {
  pool.query(`SELECT * FROM ${table}`, (err, result) => {
    if (err) {
      console.error(`❌ Erro ao buscar ${table}:`, err.message);
      callback([]);
    } else {
      callback(result.rows || []);
    }
  });
}

function getById(table, id, callback) {
  pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id], (err, result) => {
    if (err) {
      console.error(`❌ Erro ao buscar ${table} id ${id}:`, err.message);
      callback(null);
    } else {
      callback(result.rows[0] || null);
    }
  });
}

function insert(table, data, callback) {
  const keys = Object.keys(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
  const values = Object.values(data);

  const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders}) RETURNING id`;
  console.log(`📝 INSERT ${table}:`, sql.substring(0, 80) + '...');

  pool.query(sql, values, (err, result) => {
    if (err) {
      console.error(`❌ Erro ao inserir em ${table}:`, err.message);
      callback({ error: err.message });
    } else {
      const id = result.rows[0].id;
      console.log(`✅ Inserido em ${table} com id:`, id);
      callback({ id });
    }
  });
}

function update(table, id, data, callback) {
  const keys = Object.keys(data);
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(',');
  const values = [...Object.values(data), id];

  const sql = `UPDATE ${table} SET ${sets} WHERE id = $${keys.length + 1}`;
  console.log(`🔄 UPDATE ${table} id ${id}:`, sql.substring(0, 80) + '...');

  pool.query(sql, values, (err) => {
    if (err) {
      console.error(`❌ Erro ao atualizar ${table} id ${id}:`, err.message);
      callback(false);
    } else {
      console.log(`✅ Atualizado ${table} id ${id}`);
      callback(true);
    }
  });
}

function remove(table, id, callback) {
  const sql = `DELETE FROM ${table} WHERE id = $1`;
  console.log(`🗑️ DELETE ${table} id ${id}`);

  pool.query(sql, [id], (err) => {
    if (err) {
      console.error(`❌ Erro ao deletar ${table} id ${id}:`, err.message);
      callback(false);
    } else {
      console.log(`✅ Deletado ${table} id ${id}`);
      callback(true);
    }
  });
}

// ────────────────────────────────────────────────
// CONFIGURAÇÕES (para credenciais Nuvemshop, etc)
// ────────────────────────────────────────────────

function getConfig(chave, callback) {
  pool.query('SELECT valor FROM configuracoes WHERE chave = $1', [chave], (err, result) => {
    if (err) {
      console.error(`❌ Erro ao buscar config ${chave}:`, err.message);
      callback(null);
    } else {
      callback(result.rows[0]?.valor || null);
    }
  });
}

function setConfig(chave, valor, callback) {
  pool.query(
    'INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor=$2, atualizado_em=CURRENT_TIMESTAMP',
    [chave, valor],
    (err) => {
      if (err) {
        console.error(`❌ Erro ao salvar config ${chave}:`, err.message);
        callback(false);
      } else {
        console.log(`✅ Config ${chave} salva`);
        callback(true);
      }
    }
  );
}

// ────────────────────────────────────────────────
// EXPORT
// ────────────────────────────────────────────────

module.exports = {
  pool,
  initDatabase,
  getAll,
  getById,
  insert,
  update,
  remove,
  getConfig,
  setConfig,
};
