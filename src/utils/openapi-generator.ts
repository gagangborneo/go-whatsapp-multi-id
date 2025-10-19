import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

/**
 * Generate complete OpenAPI documentation with Gateway/Device Management first
 */
function generateOpenAPIFromApp(app: any): any {
  // Tenta carregar openapi.yaml de caminhos conhecidos; cai para estrutura padrão se não achar
  const candidatePaths = [
    path.join(__dirname, '../../openapi.yaml'),      // openapi.yaml (Docker)
    path.join(__dirname, '../../../openapi.yaml'),   // raiz do projeto
    path.join(__dirname, '../../docs_2/openapi.yaml')  // docs/openapi.yaml
  ];

  let baseDoc: any;
  let loaded = false;

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const originalContent = fs.readFileSync(p, 'utf8');
        baseDoc = yaml.load(originalContent);
        loaded = true;
        break;
      }
    } catch (_) {
      // continua tentando próximos caminhos
    }
  }

  if (!loaded) {
    console.warn('Could not load original openapi.yaml from known locations, using fallback structure');
    baseDoc = createFallbackStructure();
  }

  // Update the base document with dynamic server URL
  baseDoc.servers = [
    { url: process.env.SERVER_URL || 'http://localhost:3000', description: 'Servidor de desenvolvimento' }
  ];

  // Reorganizar tags - Gateway e Device Management primeiro
  baseDoc.tags = [
    { name: 'Gateway', description: 'Autenticação e saúde do gateway' },
    { name: 'Device Management', description: 'Gerenciamento de dispositivos e containers' },
    { name: 'app', description: 'Initial Connection to Whatsapp server' },
    { name: 'user', description: 'Getting information' },
    { name: 'send', description: 'Send Message (Text/Image/File/Video).' },
    { name: 'message', description: 'Message manipulation (revoke/react/update).' },
    { name: 'chat', description: 'Chat conversations and messaging' },
    { name: 'group', description: 'Group setting' },
    { name: 'newsletter', description: 'newsletter setting' }
  ];

  // Alterar security global para basicAuth
  baseDoc.security = [{ basicAuth: [] }];

  // Add /api prefix to all WhatsApp API paths and add deviceHash parameter
  const whatsappPaths: Record<string, any> = {};
  Object.keys(baseDoc.paths).forEach(originalPath => {
    const newPath = `/api${originalPath}`;
    const pathObj = { ...baseDoc.paths[originalPath] };
    
    // Add deviceHash parameter to all WhatsApp API routes
    Object.keys(pathObj).forEach(method => {
      if (pathObj[method] && typeof pathObj[method] === 'object') {
        // Initialize parameters array if not exists
        if (!pathObj[method].parameters) {
          pathObj[method].parameters = [];
        }
        
        // Add deviceHash header parameter
        pathObj[method].parameters.unshift({
          name: 'deviceHash',
          in: 'header',
          required: true,
          description: 'O deviceHash da instância (ex: a1b2c3d4e5f67890)',
          schema: {
            type: 'string',
            example: 'a1b2c3d4e5f67890'
          }
        });

        // Add basicAuth security to WhatsApp API routes
        pathObj[method].security = [{ basicAuth: [] }];
      }
    });
    
    whatsappPaths[newPath] = pathObj;
  });

  // Add Gateway Management routes
  const gatewayPaths: Record<string, any> = {
    '/api/health': {
      get: {
        operationId: 'healthCheck',
        tags: ['Gateway'],
        summary: 'Verificação de saúde do sistema',
        description: 'Verifica o status de saúde da API e serviços conectados',
        security: [{ basicAuth: [] }],
        responses: {
          '200': {
            description: 'Sistema saudável',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' },
                    services: {
                      type: 'object',
                      properties: {
                        database: { type: 'string', example: 'healthy' },
                        docker: { type: 'string', example: 'healthy' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/devices': {
      get: {
        operationId: 'listDevices',
        tags: ['Device Management'],
        summary: 'Listar dispositivos registrados',
        description: 'Retorna lista de todos os dispositivos WhatsApp registrados',
        parameters: [
          {
            name: 'status',
            in: 'query',
            description: 'Filtrar por status',
            schema: { type: 'string', enum: ['active', 'registered', 'error', 'stopped'] }
          },
          {
            name: 'limit',
            in: 'query', 
            schema: { type: 'integer', default: 25, maximum: 100 }
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 }
          }
        ],
        security: [{ basicAuth: [] }],
        responses: {
          '200': {
            description: 'Lista de dispositivos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    devices: { 
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'number', example: 1 },
                          deviceHash: { type: 'string', example: 'a1b2c3d4e5f67890' },
                          status: { type: 'string', example: 'active' },
                          webhookUrl: { type: 'string', format: 'url', nullable: true },
                          webhookSecret: { type: 'string', nullable: true },
                          statusWebhookUrl: { type: 'string', format: 'url', nullable: true },
                          statusWebhookSecret: { type: 'string', nullable: true },
                          createdAt: { type: 'string', format: 'date-time' },
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        operationId: 'createDevice',
        tags: ['Device Management'],
        summary: 'Registrar novo dispositivo',
        security: [{ basicAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  webhookUrl: { type: 'string', format: 'url', nullable: true, example: 'https://meusite.com/webhook/messages' },
                  webhookSecret: { type: 'string', nullable: true, example: 'meu-secret-mensagens' },
                  statusWebhookUrl: { type: 'string', format: 'url', nullable: true, example: 'https://meusite.com/webhook/status' },
                  statusWebhookSecret: { type: 'string', nullable: true, example: 'meu-secret-status' },
                  autoStart: { type: 'boolean', default: true, example: true }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Dispositivo criado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    deviceHash: { type: 'string' },
                    name: { type: 'string' },
                    status: { type: 'string' },
                    webhookUrl: { type: 'string', format: 'url', nullable: true },
                    webhookSecret: { type: 'string', nullable: true },
                    statusWebhookUrl: { type: 'string', format: 'url', nullable: true },
                    statusWebhookSecret: { type: 'string', nullable: true }
                  }
                }
              }
            }
          }
        }
      },
      put: {
        operationId: 'updateDeviceInfo',
        tags: ['Device Management'],
        summary: 'Atualizar informações de um dispositivo',
        description: 'Atualiza o nome, webhooks de mensagens e webhooks de status de um dispositivo.',
        security: [{ basicAuth: [] }],
        parameters: [
          {
            name: 'deviceHash',
            in: 'header',
            required: true,
            description: 'O deviceHash da instância (ex: a1b2c3d4e5f67890)',
            schema: {
              type: 'string',
              example: 'a1b2c3d4e5f67890'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Novo Nome do Dispositivo' },
                  webhookUrl: { type: 'string', format: 'url', nullable: true, example: 'https://meusite.com/webhook/messages' },
                  webhookSecret: { type: 'string', nullable: true, example: 'novo-secret-mensagens' },
                  statusWebhookUrl: { type: 'string', format: 'url', nullable: true, example: 'https://meusite.com/webhook/status' },
                  statusWebhookSecret: { type: 'string', nullable: true, example: 'novo-secret-status' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Dispositivo atualizado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Dispositivo atualizado com sucesso' },
                    data: {
                      type: 'object',
                      properties: {
                        deviceHash: { type: 'string' },
                        name: { type: 'string' },
                        status: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Dispositivo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorBadRequest' }
              }
            }
          }
        }
      },
      delete: {
        operationId: 'deleteDevice',
        tags: ['Device Management'],
        summary: 'Remover um dispositivo',
        description: 'Remove um dispositivo e seu container Docker associado.',
        security: [{ basicAuth: [] }],
        parameters: [
          {
            name: 'deviceHash',
            in: 'header',
            required: true,
            description: 'O deviceHash da instância (ex: a1b2c3d4e5f67890)',
            schema: {
              type: 'string',
              example: 'a1b2c3d4e5f67890'
            }
          },
          {
            name: 'force',
            in: 'query',
            required: false,
            description: 'Forçar a remoção mesmo se o processo não puder ser parado.',
            schema: {
              type: 'boolean',
              default: false
            }
          }
        ],
        responses: {
          '200': {
            description: 'Dispositivo removido com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Dispositivo removido com sucesso' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Dispositivo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorBadRequest' }
              }
            }
          },
          '500': {
            description: 'Erro ao remover dispositivo',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorInternalServer' }
              }
            }
          }
        }
      }
    },
    '/api/devices/info': {
      get: {
        operationId: 'getDeviceInfo',
        tags: ['Device Management'],
        summary: 'Obter informações de um dispositivo específico',
        description: 'Retorna detalhes de um dispositivo WhatsApp, incluindo status e QR Code (se disponível).',
        security: [{ basicAuth: [] }],
        parameters: [
          {
            name: 'deviceHash',
            in: 'header',
            required: true,
            description: 'O deviceHash da instância (ex: a1b2c3d4e5f67890)',
            schema: {
              type: 'string',
              example: 'a1b2c3d4e5f67890'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Informações do dispositivo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'number', example: 1 },
                    deviceHash: { type: 'string', example: 'a1b2c3d4e5f67890' },
                    name: { type: 'string', example: 'Atendimento Principal' },
                    status: { type: 'string', example: 'connected' },
                    processStatus: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'running' },
                        containerId: { type: 'string', example: 'a1b2c3d4e5f6' }
                      }
                    },
                    lastSeen: { type: 'string', format: 'date-time' },
                    createdAt: { type: 'string', format: 'date-time' },
                    webhookUrl: { type: 'string', format: 'url', nullable: true },
                    webhookSecret: { type: 'string', nullable: true }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Dispositivo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorBadRequest' }
              }
            }
          }
        }
      }
    },
    '/api/devices/start': {
      post: {
        operationId: 'startDevice',
        tags: ['Device Management'],
        summary: 'Iniciar um dispositivo',
        description: 'Inicia o container Docker associado a um dispositivo.',
        security: [{ basicAuth: [] }],
        parameters: [
          {
            name: 'deviceHash',
            in: 'header',
            required: true,
            description: 'O deviceHash da instância (ex: a1b2c3d4e5f67890)',
            schema: {
              type: 'string',
              example: 'a1b2c3d4e5f67890'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Dispositivo iniciado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Processo iniciado com sucesso' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Dispositivo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorBadRequest' }
              }
            }
          },
          '500': {
            description: 'Erro ao iniciar dispositivo',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorInternalServer' }
              }
            }
          }
        }
      }
    },
    '/api/devices/stop': {
      post: {
        operationId: 'stopDevice',
        tags: ['Device Management'],
        summary: 'Parar um dispositivo',
        description: 'Para o container Docker associado a um dispositivo.',
        security: [{ basicAuth: [] }],
        parameters: [
          {
            name: 'deviceHash',
            in: 'header',
            required: true,
            description: 'O deviceHash da instância (ex: a1b2c3d4e5f67890)',
            schema: {
              type: 'string',
              example: 'a1b2c3d4e5f67890'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Dispositivo parado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Processo parado com sucesso' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Dispositivo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorBadRequest' }
              }
            }
          },
          '500': {
            description: 'Erro ao parar dispositivo',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorInternalServer' }
              }
            }
          }
        }
      }
    },
    '/api/devices/restart': {
      post: {
        operationId: 'restartDevice',
        tags: ['Device Management'],
        summary: 'Reiniciar um dispositivo',
        description: 'Reinicia o container Docker associado a um dispositivo.',
        security: [{ basicAuth: [] }],
        parameters: [
          {
            name: 'deviceHash',
            in: 'header',
            required: true,
            description: 'O deviceHash da instância (ex: a1b2c3d4e5f67890)',
            schema: {
              type: 'string',
              example: 'a1b2c3d4e5f67890'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Dispositivo reiniciado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Processo reiniciado com sucesso' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Dispositivo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorBadRequest' }
              }
            }
          },
          '500': {
            description: 'Erro ao reiniciar dispositivo',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorInternalServer' }
              }
            }
          }
        }
      }
    }
  };

  // Organizar paths na ordem correta: Gateway -> Device -> WhatsApp API
  const orderedPaths: Record<string, any> = {};

  // 1. Gateway paths primeiro
  const gatewayPathKeys = Object.keys(gatewayPaths).filter(p => 
    p.startsWith('/api/auth') || p.startsWith('/api/health')
  ).sort();

  // 2. Device Management paths
  const devicePathKeys = Object.keys(gatewayPaths).filter(p => 
    p.startsWith('/api/devices')
  ).sort();

  // 3. WhatsApp API paths por categoria
  const appPaths = Object.keys(whatsappPaths).filter(p => p.startsWith('/api/app')).sort();
  const userPaths = Object.keys(whatsappPaths).filter(p => p.startsWith('/api/user')).sort();
  const sendPaths = Object.keys(whatsappPaths).filter(p => p.startsWith('/api/send')).sort();
  const messagePaths = Object.keys(whatsappPaths).filter(p => p.startsWith('/api/message')).sort();
  const chatPaths = Object.keys(whatsappPaths).filter(p => 
    p.startsWith('/api/chat') && !p.startsWith('/api/chats')
  ).sort();
  const chatsPaths = Object.keys(whatsappPaths).filter(p => p.startsWith('/api/chats')).sort();
  const groupPaths = Object.keys(whatsappPaths).filter(p => p.startsWith('/api/group')).sort();
  const newsletterPaths = Object.keys(whatsappPaths).filter(p => p.startsWith('/api/newsletter')).sort();

  // Adicionar paths na ordem desejada
  [...gatewayPathKeys, ...devicePathKeys, ...appPaths, ...userPaths, 
   ...sendPaths, ...messagePaths, ...chatsPaths, ...chatPaths, 
   ...groupPaths, ...newsletterPaths].forEach(pathKey => {
    if (gatewayPaths[pathKey]) {
      console.log(`Adding gateway path: ${pathKey}`);
      orderedPaths[pathKey] = gatewayPaths[pathKey];
    } else if (whatsappPaths[pathKey]) {
      console.log(`Adding whatsapp path: ${pathKey}`);
      orderedPaths[pathKey] = whatsappPaths[pathKey];
    }
  });

  baseDoc.paths = orderedPaths;

  // Update security schemes to include only basic auth
  baseDoc.components.securitySchemes = {
    basicAuth: {
      type: 'http',
      scheme: 'basic'
    }
  };

  return baseDoc;
}

function createFallbackStructure(): any {
  return {
    openapi: "3.0.0",
    info: {
      title: "WhatsApp API MultiDevice",
      version: "6.9.0",
      description: "API para envio de mensagens WhatsApp com suporte a múltiplos dispositivos e webhooks de status.\n\n## Webhooks de Status\n\nEste sistema suporta webhooks para notificações de status dos dispositivos:\n\n### Configuração\n- `statusWebhook`: URL para receber notificações de status\n- `statusWebhookSecret`: Chave secreta para assinatura HMAC-SHA256\n\n### Eventos Suportados\n- **login_success**: Dispositivo conectado com sucesso\n- **connected**: Dispositivo pronto para uso\n- **disconnected**: Dispositivo desconectado\n\n- **auth_failed**: Falha na autenticação\n- **container_event**: Outros eventos do container\n\n### Formato do Webhook\n```json\n{\n  \"device\": {\n    \"deviceHash\": \"a1b2c3d4e5f67890\",\n    \"status\": \"active\"\n  },\n  \"event\": {\n    \"type\": \"connected\",\n    \"code\": \"LIST_DEVICES\",\n    \"message\": \"Device connected and ready\"\n  },\n  \"timestamp\": \"2024-01-01T12:00:00.000Z\"\n}\n```\n\n### Verificação de Assinatura\nSe `statusWebhookSecret` foi configurado, o header `X-Webhook-Signature` conterá a assinatura HMAC-SHA256 do payload."
    },
    servers: [
      { url: "http://localhost:3000" }
    ],
    tags: [
      { name: "Gateway", description: "Autenticação e saúde do gateway" },
      { name: "Device Management", description: "Gerenciamento de dispositivos e containers" },
      { name: "app", description: "Initial Connection to Whatsapp server" },
      { name: "user", description: "Getting information" },
      { name: "send", description: "Send Message (Text/Image/File/Video)." },
      { name: "message", description: "Message manipulation (revoke/react/update)." },
      { name: "chat", description: "Chat conversations and messaging" },
      { name: "group", description: "Group setting" },
      { name: "newsletter", description: "newsletter setting" }
    ],
    security: [{ basicAuth: [] }],
    paths: {},
    components: {
      securitySchemes: {
        basicAuth: { type: "http", scheme: "basic" }
      },
      schemas: {
        LoginResponse: {
          type: "object",
          properties: {
            code: { type: "string", example: "SUCCESS" },
            message: { type: "string", example: "Success" },
            results: {
              type: "object",
              properties: {
                qr_duration: { type: "integer", example: 30 },
                qr_link: { type: "string", example: "http://localhost:3000/statics/images/qrcode/scan-qr-b0b7bb43-9a22-455a-814f-5a225c743310.png" }
              }
            }
          }
        },
        ErrorInternalServer: {
          type: "object",
          properties: {
            code: { type: "string", example: "INTERNAL_SERVER_ERROR" },
            message: { type: "string", example: "you are not loggin" },
            results: { type: "object", example: null }
          }
        },
        ErrorBadRequest: {
          type: "object",
          properties: {
            code: { type: "string", example: "400" },
            message: { type: "string", example: "field cannot be blank" },
            results: { type: "object", example: null }
          }
        },
        GenericResponse: {
          type: "object",
          properties: {
            code: { type: "string", example: "SUCCESS" },
            message: { type: "string", example: "Success" },
            results: { type: "string", example: null }
          }
        }
      }
    }
  };
}

export { generateOpenAPIFromApp };