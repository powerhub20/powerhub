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
  const schema = `
    CREATE TABLE IF NOT EXISTS tarefas (
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
    );

    CREATE TABLE IF NOT EXISTS produtos (
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
    );

    CREATE TABLE IF NOT EXISTS financeiro (
      id SERIAL PRIMARY KEY,
      tipo TEXT,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT,
      categoria TEXT,
      status TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS avisos (
      id SERIAL PRIMARY KEY,
      tipo TEXT,
      titulo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      destinatario TEXT,
      prioridade TEXT,
      data TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metas (
      id SERIAL PRIMARY KEY,
      tipo TEXT,
      titulo TEXT NOT NULL,
      valor REAL NOT NULL,
      valor_atual REAL,
      prazo TEXT,
      responsavel TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS funcionarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      cargo TEXT,
      departamento TEXT,
      telefone TEXT,
      email TEXT,
      data_contratacao TEXT,
      salario REAL,
      status TEXT,
      tarefas INTEGER DEFAULT 0,
      concluidas INTEGER DEFAULT 0,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campanhas (
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
    );

    CREATE TABLE IF NOT EXISTS clientes (
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
    );

    CREATE TABLE IF NOT EXISTS fornecedores (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      cnpj TEXT,
      contato TEXT,
      telefone TEXT,
      email TEXT,
      prazo TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS compras (
      id SERIAL PRIMARY KEY,
      fornecedor TEXT NOT NULL,
      data TEXT,
      produtos TEXT,
      total REAL,
      status TEXT,
      data_entrega TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    const statements = schema.split(';').filter(s => s.trim());
    for (const sql of statements) {
      await pool.query(sql.trim());
    }
    console.log('✅ Tabelas criadas/verificadas no PostgreSQL');
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
  }
}

// ────────────────────────────────────────────────
// FUNÇÕES GENÉRICAS (compatível com db.js)
// ────────────────────────────────────────────────

function getAll(table, callback) {
  pool.query(`SELECT * FROM ${table}`, (err, result) => {
    if (err) {
      console.error(`Erro ao buscar ${table}:`, err);
      callback([]);
    } else {
      callback(result.rows || []);
    }
  });
}

function getById(table, id, callback) {
  pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id], (err, result) => {
    if (err) {
      console.error(`Erro ao buscar ${table} id ${id}:`, err);
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

  pool.query(
    `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders}) RETURNING id`,
    values,
    (err, result) => {
      if (err) {
        console.error(`Erro ao inserir em ${table}:`, err);
        callback(null);
      } else {
        callback(result.rows[0].id);
      }
    }
  );
}

function update(table, id, data, callback) {
  const keys = Object.keys(data);
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(',');
  const values = [...Object.values(data), id];

  pool.query(
    `UPDATE ${table} SET ${sets} WHERE id = $${keys.length + 1}`,
    values,
    (err) => {
      if (err) {
        console.error(`Erro ao atualizar ${table} id ${id}:`, err);
        callback(false);
      } else {
        callback(true);
      }
    }
  );
}

function remove(table, id, callback) {
  pool.query(
    `DELETE FROM ${table} WHERE id = $1`,
    [id],
    (err) => {
      if (err) {
        console.error(`Erro ao deletar ${table} id ${id}:`, err);
        callback(false);
      } else {
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
};
