require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.query('SELECT * FROM avisos', (err, result) => {
  if (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }

  console.log(`\n📊 Total de avisos: ${result.rows.length}\n`);
  result.rows.forEach((aviso, idx) => {
    console.log(`${idx + 1}. ID: ${aviso.id}`);
    console.log(`   Tipo: ${aviso.tipo}`);
    console.log(`   Título: ${aviso.titulo}`);
    console.log(`   Mensagem: ${aviso.mensagem}`);
    console.log(`   Prioridade: ${aviso.prioridade}`);
    console.log(`   Data: ${aviso.data}\n`);
  });

  pool.end();
});
