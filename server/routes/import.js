import { Router } from 'express';
import { getImportTypes, importContent } from '../lib/importHandlers.js';

const router = Router();

function apiKeyAuth(req, res, next) {
  const importKey = process.env.AI_IMPORT_API_KEY;
  if (!importKey) {
    return res.status(503).json({ error: 'AI import is not configured (AI_IMPORT_API_KEY missing)' });
  }

  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!provided || provided !== importKey) {
    console.warn(`[import] Unauthorized import attempt from ${req.ip}`);
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  return next();
}

router.post('/', apiKeyAuth, async (req, res, next) => {
  try {
    const { type, data } = req.body || {};
    const result = await importContent(type, data);

    console.log(`[import] Created ${type}: ${result.id} from ${req.ip}`);
    return res.status(201).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/types', apiKeyAuth, (_req, res) => {
  res.json({ types: getImportTypes() });
});

export default router;
