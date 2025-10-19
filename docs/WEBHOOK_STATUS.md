# 📡 Documentação do Webhook de Status

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Configuração](#configuração)
- [Eventos Suportados](#eventos-suportados)
- [Formato do Payload](#formato-do-payload)
- [Segurança](#segurança)
- [Exemplos Práticos](#exemplos-práticos)
- [Tratamento de Erros](#tratamento-de-erros)
- [Melhores Práticas](#melhores-práticas)

## 🔍 Visão Geral

O sistema de Webhook de Status permite que sua aplicação receba notificações em tempo real sobre mudanças de status dos dispositivos WhatsApp conectados. Isso inclui eventos de conexão, desconexão, autenticação e outros eventos importantes do ciclo de vida dos dispositivos e containers.

### Características Principais:
- **Tempo Real**: Notificações instantâneas sobre mudanças de status
- **Segurança**: Assinatura HMAC-SHA256 para verificação de autenticidade
- **Retry Logic**: Sistema de retry automático com backoff exponencial
- **Não-bloqueante**: Não interfere no funcionamento da API principal

## ⚙️ Configuração

### 1. Registro de Dispositivo
Configure o webhook de status durante o registro do dispositivo:

```bash
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic <token>" \
  -d '{
    "statusWebhookUrl": "https://meusite.com/webhook/status",
    "statusWebhookSecret": "meu-secret-super-seguro"
  }'
```

### 2. Atualização de Webhook
Atualize o webhook de um dispositivo existente:

```bash
curl -X PUT http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic <token>" \
  -H "deviceHash: a1b2c3d4e5f67890" \
  -d '{
    "statusWebhookUrl": "https://novosite.com/webhook/status",
    "statusWebhookSecret": "novo-secret"
  }'
```

## 📊 Eventos Suportados

| Evento | Código | Descrição | Quando Ocorre |
|--------|--------|-----------|---------------|
| `login_success` | `LOGIN_SUCCESS` | Dispositivo autenticado com sucesso | Após login via QR Code ou sessão existente |
| `connected` | `LIST_DEVICES` | Dispositivo conectado e pronto | Quando o dispositivo está online e operacional |
| `disconnected` | `LIST_DEVICES` | Dispositivo desconectado | Perda de conexão ou logout |
| `auth_failed` | `AUTH_FAILURE` | Falha na autenticação | Credenciais inválidas ou sessão expirada |
| `container_event` | `GENERIC` | Outros eventos do container | Eventos diversos do processo WhatsApp |

## 📦 Formato do Payload

### Estrutura Base
```json
{
  "device": {
    "deviceHash": "string",
    "status": "string"
  },
  "event": {
    "type": "string",
    "code": "string",
    "message": "string",
    "data": "object|null"
  },
  "timestamp": "string (ISO 8601)"
}
```

### Campos Detalhados

#### Device Object
- `deviceHash`: Hash único do dispositivo (formato: `a1b2c3d4e5f67890`)
- `status`: Status atual do dispositivo (ver tabela de status abaixo)

#### Status do Dispositivo
| Status | Descrição | Quando Ocorre | Contexto |
|--------|-----------|---------------|----------|
| `connected` | WhatsApp conectado | Dispositivo autenticado e funcional | Status WhatsApp |
| `disconnected` | WhatsApp desconectado | Perda de conexão com WhatsApp | Status WhatsApp |
| `active` | Dispositivo ativo | Container + WhatsApp funcionando | Status Dispositivo |
| `running` | Container rodando | Processo WhatsApp em execução | Status Container |
| `stopped` | Container parado | Processo WhatsApp finalizado | Status Container |
| `error` | Erro no sistema | Falha no container ou autenticação | Status Geral |

#### Event Object  
- `type`: Tipo do evento (ver tabela de eventos)
- `code`: Código interno do evento
- `message`: Descrição legível do evento
- `data`: Dados adicionais específicos do evento (opcional)

## 🔐 Segurança

### Verificação de Assinatura
Se você configurou um `statusWebhookSecret`, todas as requisições incluirão o header `X-Webhook-Signature`:

```
X-Webhook-Signature: a1b2c3d4e5f6...
```

### Validação (Node.js)
```javascript
const crypto = require('crypto');

function validateWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Uso
app.post('/webhook/status', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!validateWebhook(payload, signature, 'meu-secret')) {
    return res.status(401).send('Unauthorized');
  }
  
  // Processar webhook...
  res.status(200).send('OK');
});
```

### Validação (Python)
```python
import hmac
import hashlib

def validate_webhook(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)
```

## 💡 Exemplos Práticos

### 1. Login Bem-sucedido
```json
{
  "device": {
    "deviceHash": "a1b2c3d4e5f67890",
    "status": "connected"
  },
  "event": {
    "type": "login_success",
    "code": "LOGIN_SUCCESS",
    "message": "Successfully pair with WhatsApp device",
    "device_info": {
      "id": "device-12@s.whatsapp.net"
    }
  },
  "timestamp": "2025-08-12T15:30:45.123Z"
}
```

### 2. Dispositivo Conectado
```json
{
  "device": {
    "deviceHash": "a1b2c3d4e5f67890",
    "status": "connected"
  },
  "event": {
    "type": "connected",
    "code": "LIST_DEVICES", 
    "message": "Device connected and ready",
    "devices": [
      {
        "device": "device-12@s.whatsapp.net"
      }
    ]
  },
  "timestamp": "2025-08-12T15:30:50.456Z"
}
```

### 3. Dispositivo Desconectado
```json
{
  "device": {
    "deviceHash": "a1b2c3d4e5f67890",
    "status": "disconnected"
  },
  "event": {
    "type": "disconnected", 
    "code": "LIST_DEVICES",
    "message": "Device disconnected",
    "devices": []
  },
  "timestamp": "2025-08-12T16:45:12.345Z"
}
```

### 4. Falha de Autenticação
```json
{
  "device": {
    "deviceHash": "a1b2c3d4e5f67890",
    "status": "error"
  },
  "event": {
    "type": "auth_failed",
    "code": "AUTH_FAILURE", 
    "message": "Authentication failed - session expired",
    "error": {
      "reason": "session_expired",
      "details": "WhatsApp session has expired"
    }
  },
  "timestamp": "2025-08-12T14:20:15.678Z"
}
```

### 5. Container Iniciado
```json
{
  "device": {
    "deviceHash": "a1b2c3d4e5f67890",
    "status": "running"
  },
  "event": {
    "type": "container_event",
    "code": "CONTAINER_START",
    "message": "WhatsApp container started successfully",
    "data": {
      "container_id": "whatsapp-a1b2c3d4e5f67890",
      "port": 8000
    }
  },
  "timestamp": "2025-08-12T15:25:00.123Z"
}
```

### 6. Container Parado
```json
{
  "device": {
    "deviceHash": "a1b2c3d4e5f67890",
    "status": "stopped"
  },
  "event": {
    "type": "container_event",
    "code": "CONTAINER_STOP",
    "message": "WhatsApp container stopped",
    "data": {
      "reason": "manual_stop",
      "exit_code": 0
    }
  },
  "timestamp": "2025-08-12T16:30:45.456Z"
}
```

## 🚨 Tratamento de Erros

### Sistema de Retry
O sistema implementa retry automático com as seguintes características:

- **Tentativas**: 3 tentativas por webhook
- **Backoff**: Exponencial (1s, 2s, 4s)  
- **Timeout**: 10 segundos por tentativa
- **Status HTTP Aceitos**: 200-299

### Logs de Erro
Erros são logados automaticamente:
```
2025-08-12T15:30:45.123Z [WARN] Webhook falhou (tentativa 1/3), tentando novamente em 1000ms
2025-08-12T15:30:46.456Z [ERROR] Erro ao enviar webhook para a1b2c3d4e5f67890: timeout
```

### Endpoint de Depuração
Para depuração, você pode usar serviços como:
- [webhook.site](https://webhook.site)
- [ngrok](https://ngrok.com) para testes locais
- [requestbin.com](https://requestbin.com)

## ✅ Melhores Práticas

### 1. Implementação do Endpoint
```javascript
app.post('/webhook/status', express.raw({type: 'application/json'}), (req, res) => {
  try {
    // Sempre responda rapidamente
    res.status(200).send('OK');
    
    // Processe assincronamente
    processWebhook(req.body).catch(console.error);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

async function processWebhook(payload) {
  const event = JSON.parse(payload);
  
  switch (event.event.type) {
    case 'connected':
      await handleDeviceConnected(event);
      break;
    case 'disconnected':
      await handleDeviceDisconnected(event);
      break;
    case 'login_success':
      await handleLoginSuccess(event);
      break;
    case 'auth_failed':
      await handleAuthFailed(event);
      break;
    case 'container_event':
      await handleContainerEvent(event);
      break;
    // ... outros eventos
  }
  
  // Também processe por status do dispositivo
  switch (event.device.status) {
    case 'running':
      await handleContainerRunning(event);
      break;
    case 'stopped':
      await handleContainerStopped(event);
      break;
    case 'error':
      await handleDeviceError(event);
      break;
  }
}
```

### 2. Monitoramento
- **Latência**: Monitore o tempo de resposta do seu endpoint
- **Taxa de Erro**: Acompanhe webhooks com falha
- **Volume**: Monitore a quantidade de eventos recebidos

### 3. Idempotência
Implemente idempotência usando o timestamp:
```javascript
const processedEvents = new Set();

function processWebhook(event) {
  const eventId = `${event.device.deviceHash}-${event.timestamp}`;
  
  if (processedEvents.has(eventId)) {
    console.log('Event already processed, skipping');
    return;
  }
  
  processedEvents.add(eventId);
  // Processar evento...
}
```

### 4. Rate Limiting
Implemente rate limiting no seu endpoint para evitar sobrecarga:
```javascript
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests por minuto
  message: 'Too many webhook requests'
});

app.use('/webhook/status', webhookLimiter);
```

## 🔧 Solução de Problemas

### Webhook não recebido
1. Verifique se a URL está acessível externamente
2. Confirme que o endpoint responde com status 200-299
3. Verifique os logs da aplicação para erros

### Falha na verificação de assinatura
1. Confirme que está usando o secret correto
2. Verifique se está usando o payload raw (não parsed)
3. Implemente logs para debugging da assinatura

### Timeout nos webhooks
1. Otimize seu endpoint para responder rapidamente
2. Processe dados assincronamente após responder
3. Considere aumentar o timeout se necessário

---

## 📞 Suporte

Para dúvidas ou problemas:
- Verifique os logs da aplicação em `/logs/`
- Consulte a documentação da API em `/api/docs`
- Reporte issues no repositório do projeto