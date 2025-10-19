
import express from 'express';
import proxyToActiveDevice from '../middleware/proxyToActiveDevice';
import loginHandler from '../middleware/loginHandler';

const router = express.Router();

/**
 * Generic proxy handler for all WhatsApp API endpoints
 * Handles all routes that don't need special processing
 * 
 * Supported patterns from openapi.yaml:
 * - /send/* (all send endpoints)
 * - /user/* (all user endpoints) 
 * - /group/* (all group endpoints)
 * - /message/* (all message endpoints)
 * - /chat/* (all chat endpoints)
 * - /newsletter/* (all newsletter endpoints)
 * - /app/* (most app endpoints, except /app/login which needs special handling)
 */

// ==============================================
// SEND ROUTES (all are direct proxies)
// ==============================================

// Send text message
router.post('/send/message', proxyToActiveDevice);

// Send media files
router.post('/send/image', proxyToActiveDevice);
router.post('/send/audio', proxyToActiveDevice);
router.post('/send/file', proxyToActiveDevice);
router.post('/send/video', proxyToActiveDevice);
router.post('/send/sticker', proxyToActiveDevice);

// Send other content types
router.post('/send/contact', proxyToActiveDevice);
router.post('/send/link', proxyToActiveDevice);
router.post('/send/location', proxyToActiveDevice);
router.post('/send/poll', proxyToActiveDevice);

// Send presence/status
router.post('/send/presence', proxyToActiveDevice);
router.post('/send/chat-presence', proxyToActiveDevice);

// ==============================================
// USER ROUTES (all are direct proxies)
// ==============================================

// User information
router.get('/user/info', proxyToActiveDevice);
router.get('/user/avatar', proxyToActiveDevice);
router.post('/user/avatar', proxyToActiveDevice);
router.post('/user/pushname', proxyToActiveDevice);
router.get('/user/check', proxyToActiveDevice);
router.get('/user/business-profile', proxyToActiveDevice);

// User data access
router.get('/user/my/privacy', proxyToActiveDevice);
router.get('/user/my/groups', proxyToActiveDevice);
router.get('/user/my/newsletters', proxyToActiveDevice);
router.get('/user/my/contacts', proxyToActiveDevice);

// ==============================================
// GROUP ROUTES (all are direct proxies)
// ==============================================

// Group information
router.get('/group/info', proxyToActiveDevice);
router.get('/group/info-from-link', proxyToActiveDevice);

// Group creation and management
router.post('/group', proxyToActiveDevice);
router.post('/group/join-with-link', proxyToActiveDevice);
router.post('/group/leave', proxyToActiveDevice);

// Group participants management
router.post('/group/participants', proxyToActiveDevice);
router.post('/group/participants/export', proxyToActiveDevice);
router.post('/group/participants/remove', proxyToActiveDevice);
router.post('/group/participants/promote', proxyToActiveDevice);
router.post('/group/participants/demote', proxyToActiveDevice);

// Group participant requests
router.get('/group/participant-requests', proxyToActiveDevice);
router.post('/group/participant-requests/approve', proxyToActiveDevice);
router.post('/group/participant-requests/reject', proxyToActiveDevice);

// Group settings
router.post('/group/photo', proxyToActiveDevice);
router.post('/group/name', proxyToActiveDevice);
router.post('/group/locked', proxyToActiveDevice);
router.post('/group/announce', proxyToActiveDevice);
router.post('/group/topic', proxyToActiveDevice);
router.post('/group/invite-link', proxyToActiveDevice);

// ==============================================
// MESSAGE ROUTES (all are direct proxies)
// ==============================================

// Message manipulation
router.post('/message/:message_id/revoke', proxyToActiveDevice);
router.post('/message/:message_id/delete', proxyToActiveDevice);
router.post('/message/:message_id/reaction', proxyToActiveDevice);
router.post('/message/:message_id/update', proxyToActiveDevice);
router.post('/message/:message_id/read', proxyToActiveDevice);
router.post('/message/:message_id/star', proxyToActiveDevice);
router.post('/message/:message_id/unstar', proxyToActiveDevice);

// ==============================================
// CHAT ROUTES (all are direct proxies)
// ==============================================

// Chat list and messages
router.get('/chats', proxyToActiveDevice);
router.get('/chat/:chat_jid/messages', proxyToActiveDevice);

// Chat management
router.post('/chat/:chat_jid/label', proxyToActiveDevice);
router.post('/chat/:chat_jid/pin', proxyToActiveDevice);

// ==============================================
// NEWSLETTER ROUTES (all are direct proxies)
// ==============================================

// Newsletter management
router.post('/newsletter/unfollow', proxyToActiveDevice);

// ==============================================
// APP ROUTES (mixed - some need special handling)
// ==============================================

// Special route with loginHandler middleware for QR code interception
router.get('/app/login', proxyToActiveDevice, loginHandler);

// Direct proxy routes
router.get('/app/login-with-code', proxyToActiveDevice);
router.get('/app/logout', proxyToActiveDevice);
router.get('/app/reconnect', proxyToActiveDevice);
router.get('/app/devices', proxyToActiveDevice);

export default router;