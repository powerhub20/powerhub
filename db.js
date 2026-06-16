// ════════════════════════════════════════════════
// SQLite Database — Power Hub
// ════════════════════════════════════════════════

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'powerhub.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Erro ao abrir banco:', err);
  else console.log('✅ Banco de dados SQLite aberto:', dbPath);
});

// ────────────────────────────────────────────────
// INIT TABLES
// ────────────────────────────────────────────────

function initDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS tarefas (
      id INTEGER PRIMARY KEY,
      titulo TEXT NOT NULL,
      descricao TEXT,
      responsavel TEXT,
      data_limite TEXT,
      prioridade TEXT,
      status TEXT,
      checklist TEXT,
      checkDone TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      sku TEXT,
      categoria TEXT,
      fornecedor TEXT,
      qtd INTEGER,
      qtd_minima INTEGER,
      custo REAL,
      venda REAL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS financeiro (
      id INTEGER PRIMARY KEY,
      tipo TEXT,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT,
      categoria TEXT,
      status TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS avisos (
      id INTEGER PRIMARY KEY,
      tipo TEXT,
      titulo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      destinatario TEXT,
      prioridade TEXT,
      data TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metas (
      id INTEGER PRIMARY KEY,
      tipo TEXT,
      titulo TEXT NOT NULL,
      valor REAL NOT NULL,
      valor_atual REAL,
      prazo TEXT,
      responsavel TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS funcionarios (
      id INTEGER PRIMARY KEY,
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
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campanhas (
      id INTEGER PRIMARY KEY,
      canal TEXT,
      nome TEXT NOT NULL,
      investimento REAL,
      cliques INTEGER,
      conversoes INTEGER,
      receita REAL,
      periodo TEXT,
      status TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY,
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
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fornecedores (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      cnpj TEXT,
      contato TEXT,
      telefone TEXT,
      email TEXT,
      prazo TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS compras (
      id INTEGER PRIMARY KEY,
      fornecedor TEXT NOT NULL,
      data TEXT,
      produtos TEXT,
      total REAL,
      status TEXT,
      data_entrega TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contatos_captacao (
      id INTEGER PRIMARY KEY,
      place_id TEXT,
      nome_loja TEXT NOT NULL,
      usuario_contato TEXT NOT NULL,
      whatsapp_numero TEXT,
      endereco TEXT,
      data_contato DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  schema.split(';').forEach(sql => {
    if (sql.trim()) {
      db.run(sql.trim(), (err) => {
        if (err) console.error('Erro ao criar tabela:', err);
      });
    }
  });
}

// ────────────────────────────────────────────────
// FUNÇÕES GENÉRICAS
// ────────────────────────────────────────────────

function getAll(table, callback) {
  db.all(`SELECT * FROM ${table}`, (err, rows) => {
    if (err) {
      console.error(`Erro ao buscar ${table}:`, err);
      callback([]);
    } else {
      callback(rows || []);
    }
  });
}

function getById(table, id, callback) {
  db.get(`SELECT * FROM ${table} WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.error(`Erro ao buscar ${table} id ${id}:`, err);
      callback(null);
    } else {
      callback(row || null);
    }
  });
}

function insert(table, data, callback) {
  const keys = Object.keys(data).join(',');
  const placeholders = Object.keys(data).map(() => '?').join(',');
  const values = Object.values(data);

  db.run(`INSERT INTO ${table} (${keys}) VALUES (${placeholders})`, values, function(err) {
    if (err) {
      console.error(`Erro ao inserir em ${table}:`, err);
      callback(null);
    } else {
      callback(this.lastID);
    }
  });
}

function update(table, id, data, callback) {
  const sets = Object.keys(data).map(k => `${k} = ?`).join(',');
  const values = [...Object.values(data), id];

  db.run(`UPDATE ${table} SET ${sets} WHERE id = ?`, values, function(err) {
    if (err) {
      console.error(`Erro ao atualizar ${table} id ${id}:`, err);
      callback(false);
    } else {
      callback(true);
    }
  });
}

function remove(table, id, callback) {
  db.run(`DELETE FROM ${table} WHERE id = ?`, [id], function(err) {
    if (err) {
      console.error(`Erro ao deletar ${table} id ${id}:`, err);
      callback(false);
    } else {
      callback(true);
    }
  });
}

// ────────────────────────────────────────────────
// EXPORT
// ────────────────────────────────────────────────

module.exports = {
  db,
  initDatabase,
  getAll,
  getById,
  insert,
  update,
  remove,
};
