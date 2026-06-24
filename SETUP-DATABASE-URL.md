# 🔐 Como Obter a Database URL do Railway

## ⚠️ SITUAÇÃO CRÍTICA

Seu banco PostgreSQL no Railway **NÃO TEM BACKUP AUTOMÁTICO** ativo!
- Plano grátis não inclui backups
- Você está completamente desprotegido
- **Use o sistema de backup Node.js que foi criado!**

## 📍 Passo a Passo para obter DATABASE_URL

### Passo 1: Acessar Railway
1. Abra https://railway.app
2. Faça login
3. Clique no seu projeto **"powerhub"**

### Passo 2: Acessar PostgreSQL
1. Na esquerda, clique em **"Postgres"** (ou PostgreSQL)
2. Você verá várias abas no topo

### Passo 3: Encontrar Connection String
**Opção A - Aba "Configurações":**
1. Clique em **"Configurações"** ou **"Variables"**
2. Procure por um botão ou campo que diz:
   - "Database URL"
   - "Connection String"
   - "PostgreSQL URL"
3. Clique para copiar

**Opção B - Aba "Variáveis":**
1. Clique em **"Variáveis"** (Variables)
2. Procure a variável:
   ```
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

### Passo 4: Copiar a URL Completa
A URL deve parecer assim:
```
postgresql://postgres:xXxXxXxX@monorail.proxy.rlwy.net:5432/railway
```

**⚠️ IMPORTANTE:**
- Copie a URL INTEIRA
- Não perca os detalhes de autenticação
- Guarde num lugar seguro!

## 🔧 Usar a URL com o Backup

### Opção 1: Via Terminal (Recomendado)
```bash
# No seu PC, abra PowerShell ou CMD na pasta PowerHub

# Windows PowerShell
$env:DATABASE_URL="postgresql://postgres:password@host:5432/database"
node backup.js

# Ou Linux/Mac
export DATABASE_URL="postgresql://postgres:password@host:5432/database"
node backup.js
```

### Opção 2: Criar arquivo .env.backup
```bash
# Crie arquivo .env.backup na pasta PowerHub com:
DATABASE_URL=postgresql://postgres:password@host:5432/database

# Depois rodar:
node backup.js
```

### Opção 3: Editar arquivo .env (se existir)
```bash
# Abra .env e adicione/atualize:
DATABASE_URL=postgresql://postgres:password@host:5432/database
```

## ✅ Testar Conexão

```bash
# Verificar se consegue conectar
DATABASE_URL="sua-url-aqui" node << 'EOF'
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT version()', (err, res) => {
  if (err) {
    console.error('❌ Erro:', err.message);
  } else {
    console.log('✅ Conectado!');
    console.log('Versão:', res.rows[0].version.split(',')[0]);
  }
  pool.end();
});
EOF
```

## 📸 Referência Visual

```
Railway Dashboard
├─ Seu Projeto
│  ├─ PostgreSQL
│  │  ├─ Implantações (Deployments)
│  │  ├─ Banco de dados (Database)
│  │  ├─ Cópias de segurança ⚠️ (Backups - PRO only)
│  │  ├─ Variáveis ← DATABASE_URL está aqui
│  │  ├─ Métricas
│  │  ├─ Console
│  │  └─ Configurações ← Ou aqui
```

## 🚨 Se Tiver Problema

Se não conseguir encontrar, tente:
1. Clique em **"Connect"** (se houver botão)
2. Selecione **"Connection String"**
3. Escolha **"PostgreSQL"**
4. Copie a URL exibida

---

**Próximo passo:** Após obter a URL, execute:
```bash
node backup.js
```

**Depois configure GitHub Secrets para automação diária!**
