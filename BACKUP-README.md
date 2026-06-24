# 💾 Sistema de Backup - Power Hub

## 📋 Overview

Sistema automático de backup diário do banco PostgreSQL com possibilidade de restauração em caso de emergência.

## 🔄 Como Funciona

### Backup Automático
- ⏰ Roda **diariamente às 3AM** (UTC) via GitHub Actions
- 💾 Salva em `/backups/` do repositório Git
- 🗑️ Mantém últimos 30 dias automaticamente
- 📧 Commit automático após cada backup

### Backup Manual
```bash
node backup.js
```

## 🚨 Restauração em Emergência

### Cenário: Railway caiu e perdi tudo

**Passo 1:** Colocar novo servidor no ar
```bash
# Criar novo banco PostgreSQL (ex: Heroku, AWS RDS, ou local)
# Obter nova DATABASE_URL
```

**Passo 2:** Clonar repositório com backups
```bash
git clone https://github.com/powerhub20/powerhub.git
cd powerhub
```

**Passo 3:** Restaurar banco
```bash
export DATABASE_URL="postgresql://user:pass@host/newdb"
node restore.js
```

**Passo 4:** Selecionar backup desejado
```
📋 Backups disponíveis:

  [0] backup-2026-06-24-a1b2c3d4.sql (45.23 MB) - 24/06/2026 03:00:15
  [1] backup-2026-06-23-b2c3d4e5.sql (45.10 MB) - 23/06/2026 03:00:22
  [2] backup-2026-06-22-c3d4e5f6.sql (44.95 MB) - 22/06/2026 03:00:18

🔢 Digite o número do backup para restaurar (ou "sair"): 0

⚠️  Tem certeza que quer restaurar backup-2026-06-24-a1b2c3d4.sql? (sim/não): sim
```

**Passo 5:** Banco restaurado! ✅

## 🛠️ Instalação

### Requisitos
- Node.js 18+
- PostgreSQL (para pg_dump/psql)
- Git

### Instalar dependências
```bash
npm install uuid
```

## 📊 Tamanho e Histórico

### Limpar backups manualmente
```bash
rm backups/backup-*.sql
```

### Ver tamanho total
```bash
du -sh backups/
```

### Fazer backup imediatamente (sem aguardar 3AM)
```bash
node backup.js
```

## 🔐 Segurança

⚠️ **IMPORTANTE:**
- Backups estão no repositório Git (acesso restrito)
- DATABASE_URL é sensível (não commitar em .env)
- Usar secrets do GitHub para DATABASE_URL em CI/CD

## 📋 Checklist de Segurança

- [x] Script de backup automático criado
- [x] GitHub Actions configurado
- [x] Script de restauração pronto
- [ ] **Testar restauração com backup de teste** ← FAZER ISSO AGORA!
- [ ] Configurar GitHub Secrets (DATABASE_URL)

## 🧪 Testar Restauração (IMPORTANTE!)

Isso vai restaurar em **novo banco local** para teste:

```bash
# 1. Criar banco de teste local
createdb powerhub_test

# 2. Restaurar backup nele
DATABASE_URL="postgresql://localhost/powerhub_test" node restore.js

# 3. Verificar se dados estão lá
psql powerhub_test -c "SELECT COUNT(*) FROM clientes;"

# 4. Se OK, deletar banco de teste
dropdb powerhub_test
```

## 📞 Suporte

Se perdeu dados e precisa restaurar:
1. Entre em contato com suporte técnico
2. Use `node restore.js`
3. Selecione o backup mais recente que você confia

---

**Último backup:** 🔄 Automático diariamente às 3AM UTC
**Próximo teste:** [Agendar em suas notas]
