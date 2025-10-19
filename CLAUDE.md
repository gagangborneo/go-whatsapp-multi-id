# 🤖 CLAUDE.md

## 📋 Projeto: WhatsApp Multi-Platform API Gateway

### 🎯 Visão Geral
Sistema escalável para gerenciar múltiplos dispositivos WhatsApp através de uma API Gateway com processos isolados e identificação por deviceHash.

### 🏗️ Arquitetura Atual
- **API Gateway**: Node.js/Express rodando na porta 3000 (acesso direto)
- **Processos WhatsApp**: Binário `go-whatsapp-web-multidevice` em portas dinâmicas (8000+)
- **Identificação**: deviceHash hexadecimal de 16 caracteres (auto-gerado)
- **Banco de dados**: SQLite para persistência
- **Sessões**: Volumes persistentes por deviceHash
- **Deploy**: GitHub Actions com build multi-arquitetura para Docker Hub

### 🔑 Identificação de Dispositivos
- **Sistema**: Baseado em `deviceHash` (ex: `a1b2c3d4e5f67890`)
- **Geração**: `crypto.randomBytes(8).toString('hex')`
- **Headers**: `deviceHash` para identificar dispositivo nas APIs
- **Privacy**: Zero exposição de dados pessoais (phoneNumber removido)

### 📁 Estrutura de Código Principal

#### Core Services
- `src/services/newDeviceManager.js` - Gerenciamento de dispositivos
- `src/services/binaryManager.js` - Gerenciamento de processos WhatsApp
- `src/services/statusWebhookManager.js` - Sistema de webhooks
- `src/services/updateManager.js` - Verificações de atualização

#### Repositories & Database
- `src/repositories/DeviceRepository.js` - Acesso ao banco SQLite
- `src/database/database.js` - Conexão e schema SQLite

#### Routes & API (Consolidado)
- `src/routes/proxy.js` - **CONSOLIDADO** - Todos os 52 endpoints de proxy
- `src/routes/devices.js` - CRUD de dispositivos
- `src/routes/health.js` - Health checks
- `src/routes/docs.js` - Documentação

#### Middleware (Otimizado)
- `src/middleware/proxyToActiveDevice.js` - **ÚNICO** middleware para proxy (consolidado)
- `src/middleware/loginHandler.js` - Interceptação de QR codes
- `src/middleware/auth.js` - Autenticação básica

#### Utils
- `src/utils/deviceUtils.js` - Utilitários de deviceHash
- `src/utils/paths.js` - Gerenciamento de caminhos (Docker/Local)
- `src/utils/logger.js` - Sistema de logs

### 🔄 Convenções de Nomenclatura
- **Aplicação**: camelCase (`deviceHash`, `webhookUrl`)
- **Banco de dados**: snake_case (`device_hash`, `webhook_url`)
- **Conversão automática**: Repository layer faz mapeamento

### 🚀 APIs Principais

#### Registro de Dispositivo
```bash
POST /api/devices
{
  "webhookUrl": "https://meusite.com/webhook",
  "statusWebhookUrl": "https://meusite.com/status"
}
# Retorna: { deviceHash: "a1b2c3d4e5f67890", status: "registered" }
```

#### Operações de Dispositivo
```bash
# Todas usam header: deviceHash: a1b2c3d4e5f67890
GET /api/devices/info          # Informações do dispositivo
POST /api/devices/start        # Iniciar processo
POST /api/devices/stop         # Parar processo
DELETE /api/devices           # Remover dispositivo
GET /api/login                # Obter QR code
```

#### Envio de Mensagens
```bash
POST /api/send/message
deviceHash: a1b2c3d4e5f67890
{
  "phone": "+5511999999999@s.whatsapp.net",
  "message": "Hello World"
}
```

### 📦 Sistema de Processos

#### Iniciação
1. DeviceHash gerado automaticamente
2. Porta dinâmica alocada (8000+)
3. Processo WhatsApp iniciado
4. WebSocket conectado
5. Health monitoring ativado

#### Gerenciamento
- **Isolamento**: Cada deviceHash = processo separado
- **Sessões**: Persistidas em `sessions/{deviceHash}/`
- **Volumes**: SQLite individual por processo
- **Auto-restart**: Sessões existentes são retomadas

### 🔐 Webhooks de Status

#### Configuração
```json
{
  "device": {
    "deviceHash": "a1b2c3d4e5f67890",
    "status": "connected"
  },
  "event": {
    "type": "login_success",
    "code": "LOGIN_SUCCESS",
    "message": "Device connected successfully"
  },
  "timestamp": "2025-08-12T15:30:45.123Z"
}
```

#### Eventos
- `login_success` - Login realizado
- `connected` - Dispositivo conectado
- `disconnected` - Dispositivo desconectado
- `auth_failed` - Falha de autenticação
- `container_event` - Eventos do processo

### 🛠️ Desenvolvimento

#### Comandos Úteis
```bash
# Iniciar servidor
npm start

# Desenvolvimento com hot-reload
npm run dev

# Testes
npm test

# Lint e format
npm run lint
npm run format

# Limpeza completa do sistema
./scripts/maintenance/cleanup.sh
```

#### Debugging
- **Logs**: Console + arquivo (winston)
- **Health**: GET /api/health
- **Diagnostics**: GET /api/health/detailed

### 🔧 Configuração

#### Variáveis de Ambiente
```bash
# API Gateway
API_PORT=3000
NODE_ENV=production
API_RATE_LIMIT=100
API_AUTH_ENABLED=true

# Autenticação
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASS=admin

# Docker
DOCKER_SOCKET=/var/run/docker.sock

# Logging
LOG_LEVEL=info
LOGS_PATH=./logs

# Update Manager
UPDATE_CHECK_CRON='0 2 * * *'
AUTO_UPDATE_ENABLED=true

# Health & Monitoring
HEALTH_CHECK_INTERVAL=30000
MASK_PHONE_NUMBERS=true

# Paths (opcional)
APP_BASE_DIR=/custom/path
```

#### Estrutura de Arquivos
```
/
├── api-gateway/
│   ├── src/
│   │   ├── services/      # Core business logic
│   │   ├── routes/        # API endpoints
│   │   ├── middleware/    # Express middleware
│   │   ├── repositories/  # Data access
│   │   ├── database/      # SQLite setup
│   │   └── utils/         # Utilities
│   └── server.js          # Entry point
├── docs/                  # Documentação centralizada
│   ├── README.md          # Índice da documentação
│   ├── ENVIRONMENT_VARIABLES.md  # Variáveis completas
│   └── *.md              # Outras documentações
├── scripts/
│   └── maintenance/       # Scripts de manutenção
│       └── cleanup.sh     # Limpeza completa do sistema
├── .github/
│   └── workflows/         # GitHub Actions
│       ├── docker-build-push.yml  # Deploy Docker Hub
│       └── release.yml    # Releases automáticos
├── sessions/              # Device sessions (gitignored)
├── volumes/              # SQLite databases (gitignored)
├── whatsapp              # WhatsApp binary
└── README.md             # Documentação principal
```

### 📊 Schema do Banco

```sql
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_hash VARCHAR(16) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'registered',
  container_id VARCHAR(100),
  container_port INTEGER,
  webhook_url TEXT,
  webhook_secret TEXT,
  status_webhook_url TEXT,
  status_webhook_secret TEXT,
  last_seen DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 🚨 Problemas Conhecidos e Soluções

#### Server não inicia
- **Sintoma**: Processo morre após logs de inicialização
- **Causa**: Ordem de inicialização incorreta
- **Solução**: Database deve ser inicializado antes dos managers

#### QR codes não aparecem fora do Docker
- **Problema**: Path hardcoded para `/app/sessions`
- **Solução**: Usar `SESSIONS_DIR` do `paths.js`
- **Status**: ✅ Corrigido

#### Referências antigas a phoneNumber
- **Problema**: Vestígios de phoneNumber em código/docs
- **Solução**: Refatoração completa para deviceHash
- **Status**: ✅ Concluído

### 🔄 Refatoração Recente (Concluída)

#### Principais Mudanças
1. **Remoção completa de phoneNumber/name**
2. **Introdução de deviceHash auto-gerado**
3. **APIs usando headers deviceHash**
4. **Convenções camelCase/snake_case**
5. **Limpeza de métodos duplicados**
6. **Documentação atualizada**

#### Antes vs Depois
```bash
# ANTES
POST /api/devices { "phoneNumber": "5511999999999", "name": "Device" }
GET /api/devices/5511999999999/qr

# DEPOIS  
POST /api/devices { "webhookUrl": "https://..." }
GET /api/login + header deviceHash: a1b2c3d4e5f67890
```

### 📝 Tasks Executadas

#### 🔄 Refatoração Principal (Concluída)
1. ✅ Auto-geração de deviceHash
2. ✅ Remoção de phoneNumber/name da API
3. ✅ Headers deviceHash implementados
4. ✅ Convenções de nomenclatura padronizadas
5. ✅ Limpeza de código duplicado
6. ✅ QR code path corrigido para ambientes não-Docker

#### 📚 Organização da Documentação (Recente)
1. ✅ Documentação centralizada na pasta `docs/`
2. ✅ Criação do `docs/README.md` como índice
3. ✅ Documentação completa de variáveis de ambiente
4. ✅ Correção de inconsistências no `.env.example`
5. ✅ Atualização do README principal

#### 🏗️ Simplificação da Arquitetura (Recente)
1. ✅ Remoção do nginx (arquitetura simplificada)
2. ✅ Acesso direto na porta 3000
3. ✅ Consolidação de scripts de limpeza
4. ✅ Atualização do docker-compose.yml

#### 🚀 Deploy e CI/CD (Recente)
1. ✅ GitHub Actions para build Docker
2. ✅ Deploy automático para Docker Hub
3. ✅ Build multi-arquitetura (amd64/arm64)
4. ✅ Workflow de releases automático
5. ✅ Documentação completa de deploy

#### 🗂️ Consolidação Radical de Rotas (Atual)
1. ✅ Consolidação de 8 arquivos de rota em 1
2. ✅ Redução de 3 middlewares para 1 otimizado
3. ✅ 52 endpoints consolidados em proxy.js
4. ✅ Middleware unificado proxyToActiveDevice
5. ✅ Simplificação de 75% no código de rotas
6. ✅ Performance e manutenibilidade melhoradas

### 🎯 Próximos Passos Sugeridos
1. **Implementar rate limiting** por deviceHash
2. **Adicionar métricas** de uso por dispositivo
3. **Sistema de backup** automático das sessões
4. **Dashboard web** para monitoramento
5. **Testes automatizados** completos
6. **Monitoramento avançado** com métricas personalizadas
7. **Load balancing** para múltiplas instâncias

### 🔗 Links Úteis
- **API Docs**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/api/health
- **OpenAPI**: http://localhost:3000/docs/openapi.yaml
- **Documentação**: [docs/README.md](docs/README.md)
- **Variáveis de Ambiente**: [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md)
- **Deploy Docker**: [docs/DOCKER_DEPLOY.md](docs/DOCKER_DEPLOY.md)

---

*Última atualização: Agosto 2025*

**Estado atual do projeto**: Altamente otimizado e pronto para lançamento ✅
- 🏗️ Arquitetura simplificada (sem nginx)  
- 📚 Documentação centralizada e focada em novos usuários
- 🚀 Deploy automático configurado com GitHub Actions
- 🧹 Sistema de limpeza consolidado
- 🔧 Variáveis de ambiente documentadas
- 🗂️ **NOVO:** Rotas consolidadas (8→1 arquivo, 75% menos código)
- 📦 **NOVO:** Middleware unificado para melhor performance

*Este documento é mantido atualizado automaticamente pelo Claude*