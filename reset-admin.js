const { pool } = require('./db-postgres');

async function resetAdmin() {
  try {
    const newPassword = 'admin123';
    const encodedPassword = Buffer.from(newPassword).toString('base64');

    const result = await pool.query(
      `UPDATE funcionarios SET senha = $1 WHERE email LIKE $2 RETURNING *`,
      [encodedPassword, '%admin%']
    );

    if (result.rows.length > 0) {
      console.log('✅ Senha resetada com sucesso!');
      console.log(`📧 Email: ${result.rows[0].email}`);
      console.log(`🔑 Senha: ${newPassword}`);
    } else {
      console.log('❌ Nenhum admin encontrado, criando...');
      
      // Criar novo admin se não existir
      await pool.query(
        `INSERT INTO funcionarios (nome, cargo, email, senha, status) 
         VALUES ($1, $2, $3, $4, $5)`,
        ['Admin', 'Administrador', 'admin@powerropes.com', encodedPassword, 'Ativo']
      );
      
      console.log('✅ Admin criado com sucesso!');
      console.log('📧 Email: admin@powerropes.com');
      console.log('🔑 Senha: admin123');
    }

    process.exit(0);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
}

resetAdmin();
