import { Router } from 'express';
import { verifyWebhook } from '@clerk/backend/webhooks';
import {
  markLocalUserInactiveForClerk,
  syncLocalUserFromClerkWebhook,
} from '../lib/clerkAuth.js';

const router = Router();

function toHeaders(req) {
  const headers = new Headers();
  for (const [key, rawValue] of Object.entries(req.headers || {})) {
    if (Array.isArray(rawValue)) {
      rawValue.forEach((value) => headers.append(key, String(value)));
    } else if (rawValue !== undefined) {
      headers.set(key, String(rawValue));
    }
  }
  return headers;
}

function toWebhookRequest(req) {
  const protocol = String(req.headers['x-forwarded-proto'] || req.protocol || 'http');
  const host = String(req.headers.host || 'localhost');
  const body =
    Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

  return new Request(`${protocol}://${host}${req.originalUrl}`, {
    method: req.method,
    headers: toHeaders(req),
    body,
  });
}

router.post('/', async (req, res) => {
  const signingSecret = String(process.env.CLERK_WEBHOOK_SIGNING_SECRET || '').trim();

  if (!signingSecret) {
    return res.status(503).json({ error: 'Clerk webhook signing secret is not configured.' });
  }

  try {
    const event = await verifyWebhook(toWebhookRequest(req), { signingSecret });

    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        await syncLocalUserFromClerkWebhook(event.data);
        break;
      case 'user.deleted':
        await markLocalUserInactiveForClerk(event.data?.id);
        break;
      default:
        break;
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('[clerk-webhook] Verification failed:', error?.message || error);
    return res.status(400).json({ error: 'Webhook verification failed.' });
  }
});

export default router;
