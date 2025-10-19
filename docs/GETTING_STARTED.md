# 🚀 Getting Started Guide

Quick start guide for new users to get WhatsApp Multi-Platform API Gateway running in minutes.

## Prerequisites

- **Docker** 20.10+ and **Docker Compose** 2.0+
- **4GB RAM** minimum
- **10GB** disk space

## Step 1: Download and Setup

```bash
# Clone the repository
git clone https://github.com/LuizFelipeNeves/go-whatsapp-web-multidevice.git
cd go-whatsapp-web-multidevice

# Configure environment
cp .env.example .env
```

## Step 2: Configure Authentication

Edit the `.env` file with your preferred credentials:

```env
# Required: Change these values
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASS=your_secure_password_here

# Optional: Other settings
API_PORT=3000
```

## Step 3: Start the Platform

```bash
# Start all services
docker-compose up -d

# Check if everything is running
curl http://localhost:3000/api/health
```

You should see: `{"status": "healthy", "timestamp": "..."}`

## Step 4: Access the API

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'
```

Save the returned `token` for the next steps.

### Register Your First Device

```bash
curl -X POST http://localhost:3000/api/devices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://yoursite.com/webhook",
    "statusWebhookUrl": "https://yoursite.com/status"
  }'
```

You'll receive a response like:
```json
{
  "deviceHash": "a1b2c3d4e5f67890",
  "status": "registered"
}
```

Save the `deviceHash` - this is your device identifier.

### Get QR Code

```bash
curl -X GET http://localhost:3000/api/login \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "deviceHash: a1b2c3d4e5f67890"
```

You'll receive a base64 QR code. Scan it with WhatsApp on your phone.

## Step 5: Send Your First Message

Once connected, send a test message:

```bash
curl -X POST http://localhost:3000/api/send/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "deviceHash: a1b2c3d4e5f67890" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+5511999999999@s.whatsapp.net",
    "message": "Hello from WhatsApp API!"
  }'
```

## Next Steps

- 📚 Read the [API Documentation](API_DOCUMENTATION.md) for all available endpoints
- 🔐 Learn about [Security](DEVICE_SECURITY.md) and device management  
- 📡 Setup [Webhooks](WEBHOOK_STATUS.md) for real-time notifications
- 🐳 Check [Production Deployment](DOCKER_DEPLOY.md) guide

## Quick Links

- **API Documentation**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/api/health
- **OpenAPI Spec**: http://localhost:3000/docs/openapi.yaml

## Need Help?

- Check the [complete documentation](README.md)
- Review [common issues](ARCHITECTURE.md)
- Open an issue on GitHub

---

*You're now ready to build amazing WhatsApp integrations! 🎉*