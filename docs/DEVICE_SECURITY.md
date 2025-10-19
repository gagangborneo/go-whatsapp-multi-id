# Segurança de Dispositivos

## Visão Geral

Sistema que utiliza deviceHash para identificação segura de dispositivos sem exposição de dados pessoais.

## Comportamento Automático

| Ambiente | Logs | APIs | Uso |
|----------|------|------|-----|
| `development` | deviceHash | deviceHash | Desenvolvimento local |
| `staging` | deviceHash | deviceHash | Testes |  
| `production` | deviceHash | deviceHash | Produção |

*Sistema sempre utiliza deviceHash gerado automaticamente*

## Configuração

### Variáveis de Ambiente
```bash
# Sistema utiliza deviceHash automaticamente
NODE_ENV=development  # deviceHash para desenvolvimento
NODE_ENV=production   # deviceHash para produção
```

### Exemplos de Uso
```bash
# Desenvolvimento
NODE_ENV=development npm start

# Produção
NODE_ENV=production npm start

# Staging
NODE_ENV=staging npm start
```

## Implementação

### Device Hash para Identificação
```javascript
// Sistema gera deviceHash automaticamente
// URLs utilizam deviceHash: /api/devices (via header deviceHash)

POST /api/devices
{
  "webhookUrl": "https://meusite.com/webhook",
  "statusWebhookUrl": "https://meusite.com/status"
}
// Retorna deviceHash gerado automaticamente
```

### Logs Seguros
```javascript
// Sistema sempre usa deviceHash
logger.info(`Device: ${deviceHash}`);

// Debug com deviceHash
logger.debug(`Debug device: ${deviceHash}`);
```

## Device Hash

### Padrões
- **Formato**: Hash hexadecimal de 16 caracteres (`a1b2c3d4e5f67890`)
- **Geração**: Automática via `crypto.randomBytes(8).toString('hex')`

### Identificação
- **Único**: Cada dispositivo tem um hash único
- **Seguro**: Não expõe dados pessoais

## Estrutura de Arquivos

```
src/utils/deviceUtils.js    # Utilitários de deviceHash
src/database/schema.sql     # device_hash único
src/repositories/           # Gerenciamento de deviceHash
src/routes/devices.js       # APIs com deviceHash
```

## Benefícios

✅ **Desenvolvimento**: deviceHash consistente  
✅ **Produção**: Segurança por design  
✅ **APIs Limpas**: Headers em vez de URLs  
✅ **Privacy**: Sem exposição de dados pessoais  
✅ **Escalável**: Identificação única e simples