# API Documentation

## Overview

WhatsApp Multi-Platform API Gateway para gerenciar múltiplos dispositivos WhatsApp.

## Authentication

```bash
Authorization: Bearer <jwt_token>
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}
```

## Devices

### Register Device
```http
POST /api/devices
{
  "webhookUrl": "https://meusite.com/webhook",
  "statusWebhookUrl": "https://meusite.com/status"
}
```
**Returns:** Auto-generated `deviceHash` for future operations

### Device Operations (using deviceHash header)
```http
GET    /api/devices/info              # Get device info
POST   /api/devices/start             # Start container
POST   /api/devices/stop              # Stop container
GET    /api/login                     # Get QR code
DELETE /api/devices                   # Remove device

# All operations require:
deviceHash: a1b2c3d4e5f67890
```

## Messages

### Send Message
```http
POST /api/send/message
deviceHash: a1b2c3d4e5f67890
{
  "phone": "+5511888888888@s.whatsapp.net",
  "message": "Hello World"
}
```



## Environment Configuration

```bash
NODE_ENV=development  # Development environment
NODE_ENV=production   # Production environment
# System uses deviceHash for all identification
```

## OpenAPI Documentation

- **Swagger UI**: `/docs`

- **OpenAPI YAML**: `/docs/openapi.yaml`