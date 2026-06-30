#!/usr/bin/env node

// Simples reset de senha para admin
const adminEmail = 'admin@powerropes.com';
const adminPassword = 'admin123';
const encodedPassword = Buffer.from(adminPassword).toString('base64');

console.log('🔑 Resetting admin password...');
console.log(`📧 Email: ${adminEmail}`);
console.log(`🔑 Senha: ${adminPassword}`);
console.log('');

// Tenta com PostgreSQL primeiro
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  pool.query(
    `UPDATE funcionarios SET senha = $1 WHERE email = $2 RETURNING id, nome, email`,
    [encodedPassword, adminEmail],
    (err, result) => {
      if (err) {
        console.error('❌ Erro PostgreSQL:', err.message);
        console.log('\n💡 Tente definir DATABASE_URL via:');
        console.log('   set DATABASE_URL=your_database_url');
        console.log('   node reset-admin-simple.js');
        pool.end();
        process.exit(1);
      }

      if (result.rows.length > 0) {
        console.log('✅ Senha resetada com sucesso!');
        console.log(`   Nome: ${result.rows[0].nome}`);
        console.log(`   Email: ${result.rows[0].email}`);
      } else {
        console.log('⚠️  Admin não encontrado, criando novo...');
        pool.query(
          `INSERT INTO funcionarios (nome, cargo, email, senha, status)
           VALUES ('Admin System', 'Administrador', $1, $2, 'Ativo')
           RETURNING id, nome, email`,
          [adminEmail, encodedPassword],
          (err, result) => {
            if (err) {
              console.error('❌ Erro ao criar admin:', err.message);
            } else {
              console.log('✅ Admin criado com sucesso!');
              console.log(`   Nome: ${result.rows[0].nome}`);
              console.log(`   Email: ${result.rows[0].email}`);
            }
            pool.end();
            process.exit(0);
          }
        );
      }
    }
  );
} else {
  // Fallback para SQLite
  console.log('ℹ️  Usando SQLite (local)...');
  const sqlite3 = require('sqlite3');
  const path = require('path');
  const db = new sqlite3.Database(path.join(__dirname, 'powerhub.db'));

  db.run(
    `UPDATE funcionarios SET senha = ? WHERE email = ?`,
    [encodedPassword, adminEmail],
    function(err) {
      if (err) {
        console.error('❌ Erro:', err.message);
      } else {
        console.log('✅ Senha resetada!');
      }
      db.close();
      process.exit(0);
    }
  );
}
