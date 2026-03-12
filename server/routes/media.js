import crypto from 'crypto';
import { Router } from 'express';
import Busboy from 'busboy';
import { authGuard } from '../middleware/auth.js';
import { connectToDatabase, getDb } from '../lib/db.js';
import jwt from 'jsonwebtoken';

const router = Router();

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const MAX_BYTES = Number(process.env.MEDIA_MAX_BYTES || DEFAULT_MAX_BYTES);
const PRESIGN_TTL_MS = Number(process.env.MEDIA_PRESIGN_TTL_MS || 10 * 60 * 1000);

const PUBLIC_FOLDERS = new Set(
  String(process.env.MEDIA_PUBLIC_FOLDERS || 'avatars,mentor-blog')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

function generateUploadSignature({ fileName, folder, mimeType, nonce, timestamp }, secretKey) {
  const canonicalString =
    `fileName=${fileName}` +
    `&folder=${folder}` +
    `&mimeType=${mimeType}` +
    `&nonce=${nonce}` +
    `&timestamp=${timestamp}`;

  return crypto
    .createHmac('sha256', secretKey)
    .update(canonicalString)
    .digest('base64');
}

router.post('/presign', authGuard, (req, res) => {
  const { mimeType, folder } = req.body || {};
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return res.status(400).json({ error: 'Unsupported or missing mimeType.' });
  }

  const uploadSecret = process.env.MEDIA_UPLOAD_SECRET_KEY || process.env.OTP_SECRET_KEY;
  if (!uploadSecret) {
    return res.status(500).json({ error: 'MEDIA_UPLOAD_SECRET_KEY is not configured on the server.' });
  }

  const targetFolder = sanitizeFolder(folder);
  const fileName = buildFileName(targetFolder, mimeType);

  const nonce = crypto.randomUUID();
  const timestamp = Date.now();
  const signature = generateUploadSignature(
    { fileName, folder: targetFolder, mimeType, nonce, timestamp },
    uploadSecret
  );

  const origin = getRequestOrigin(req);
  const uploadUrl = `${origin}/api/media/upload`;

  res.json({
    uploadUrl,
    fileName,
    folder: targetFolder,
    mimeType,
    nonce,
    timestamp,
    signature,
    headers: {
      // Frontend can use this to send the request to the Apps Script endpoint
      'X-Requested-By': 'blanc',
    },
    instructions:
      'Send a POST multipart/form-data with fields "file" (binary), "fileName", "folder", "mimeType", "nonce", "timestamp", and "signature" to uploadUrl. The API will respond with {status:200,result:{id,url}}.',
  });
});

router.post('/upload', authGuard, async (req, res) => {
  const uploadSecret = process.env.MEDIA_UPLOAD_SECRET_KEY || process.env.OTP_SECRET_KEY;
  if (!uploadSecret) {
    return res.status(500).json({ error: 'MEDIA_UPLOAD_SECRET_KEY is not configured on the server.' });
  }

  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return res.status(415).json({ error: 'Expected multipart/form-data' });
  }

  const fields = {};
  let fileBuffer = null;
  let fileMimeFromPart = '';
  let fileTruncated = false;

  const busboy = Busboy({
    headers: req.headers,
    limits: {
      files: 1,
      fileSize: Number.isFinite(MAX_BYTES) ? MAX_BYTES : DEFAULT_MAX_BYTES,
      fields: 20,
      fieldSize: 8 * 1024,
    },
  });

  busboy.on('field', (name, value) => {
    // Avoid prototype pollution
    if (!name || name === '__proto__' || name === 'constructor' || name === 'prototype') return;
    fields[name] = value;
  });

  busboy.on('file', (_name, file, info) => {
    fileMimeFromPart = info?.mimeType || '';
    const chunks = [];

    file.on('data', (data) => {
      chunks.push(data);
    });
    file.on('limit', () => {
      fileTruncated = true;
      file.resume();
    });
    file.on('end', () => {
      if (!fileTruncated) {
        fileBuffer = Buffer.concat(chunks);
      }
    });
  });

  busboy.on('error', (err) => {
    console.error('[media] upload parse error:', err);
  });

  busboy.on('finish', async () => {
    try {
      if (fileTruncated) {
        return res.status(413).json({ error: `File too large (max ${MAX_BYTES} bytes)` });
      }
      if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
        return res.status(400).json({ error: 'Missing file' });
      }

      const folderRaw = fields.folder;
      const fileNameRaw = fields.fileName;
      const mimeTypeRaw = fields.mimeType;
      const nonceRaw = fields.nonce;
      const timestampRaw = fields.timestamp;
      const signatureRaw = fields.signature;

      const folder = sanitizeFolder(folderRaw);
      const fileName = sanitizeFileName(fileNameRaw);
      const mimeType = String(mimeTypeRaw || '');
      const nonce = String(nonceRaw || '');
      const timestamp = Number(timestampRaw);
      const signature = String(signatureRaw || '');

      if (!fileName || !folder || !mimeType || !nonce || !Number.isFinite(timestamp) || !signature) {
        return res.status(400).json({ error: 'Missing required upload fields' });
      }

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return res.status(400).json({ error: 'Unsupported mimeType' });
      }

      if (fileMimeFromPart && fileMimeFromPart !== mimeType) {
        return res.status(400).json({ error: 'Mismatched mimeType' });
      }

      const ageMs = Math.abs(Date.now() - timestamp);
      if (ageMs > PRESIGN_TTL_MS) {
        return res.status(400).json({ error: 'Presign expired' });
      }

      const expected = generateUploadSignature(
        { fileName, folder, mimeType, nonce, timestamp },
        uploadSecret
      );
      if (!timingSafeBase64Equal(signature, expected)) {
        return res.status(403).json({ error: 'Invalid signature' });
      }

      await connectToDatabase();
      const pool = getDb();

      const id = crypto.randomUUID();
      const ownerId = String(req.user?.id || '');
      const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const isPublic = PUBLIC_FOLDERS.has(folder);

      await pool.query(
        `INSERT INTO media (id, owner_id, folder, file_name, mime_type, size_bytes, sha256, is_public, content)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, ownerId, folder, fileName, mimeType, fileBuffer.length, sha256, isPublic, fileBuffer]
      );

      const origin = getRequestOrigin(req);
      const url = `${origin}/api/media/${id}`;

      return res.json({
        status: 200,
        result: {
          id,
          url,
          fileName,
          folder,
          mimeType,
          sizeBytes: fileBuffer.length,
          sha256,
          isPublic,
        },
      });
    } catch (err) {
      console.error('[media] upload failed:', err);
      return res.status(500).json({ error: 'Upload failed' });
    }
  });

  req.pipe(busboy);
});

router.get('/:id', async (req, res) => {
  try {
    const id = sanitizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    await connectToDatabase();
    const pool = getDb();

    const { rows } = await pool.query(
      `SELECT id, owner_id, folder, file_name, mime_type, size_bytes, sha256, is_public, content
       FROM media WHERE id = $1`,
      [id]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Not found' });

    if (!row.is_public) {
      const user = tryGetUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const userId = String(user?.id || '');
      const role = String(user?.role || '');
      const isAdmin = role === 'admin' || role === 'super_admin';
      if (!isAdmin && userId !== String(row.owner_id || '')) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const etag = `"sha256:${row.sha256}"`;
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', String(row.size_bytes || 0));
    res.setHeader('Content-Disposition', `inline; filename="${encodeContentDispositionFilename(row.file_name)}"`);
    res.setHeader(
      'Cache-Control',
      row.is_public ? 'public, max-age=31536000, immutable' : 'private, no-store'
    );

    return res.status(200).send(row.content);
  } catch (err) {
    console.error('[media] download failed:', err);
    return res.status(500).json({ error: 'Failed to fetch media' });
  }
});

function buildFileName(folder, mimeType) {
  const extension = mimeType.split('/')[1] || 'bin';
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  const prefix = folder ? `${folder}_` : '';
  return `${prefix}CH-${timestamp}-${token}.${extension}`;
}

function sanitizeFolder(folder) {
  if (!folder) return 'media';
  return String(folder).replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
}

function sanitizeFileName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  // Avoid path traversal and control chars
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[\\/]/g, '-')
    .slice(0, 200);
  return cleaned;
}

function sanitizeId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  // Accept UUID-like IDs (we generate uuid v4) but keep this permissive.
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(raw)) return '';
  return raw;
}

function getRequestOrigin(req) {
  const forced = process.env.PUBLIC_API_ORIGIN || process.env.PUBLIC_BASE_URL;
  if (forced) return String(forced).replace(/\/+$/, '');

  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
  const protocol = proto ? String(proto).split(',')[0].trim() : req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const hostValue = Array.isArray(host) ? host[0] : host;
  return `${protocol}://${hostValue}`.replace(/\/+$/, '');
}

function timingSafeBase64Equal(a, b) {
  try {
    const left = Buffer.from(String(a || ''), 'base64');
    const right = Buffer.from(String(b || ''), 'base64');
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function parseCookies(cookieHeader = '') {
  const header = String(cookieHeader || '');
  if (!header) return {};
  return header.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey?.trim();
    if (!key) return acc;
    const value = rest.join('=').trim();
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function getAuthToken(req) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (bearer) return bearer;

  const cookieName = process.env.AUTH_COOKIE_NAME || 'auth_token';
  const cookies = parseCookies(req.headers.cookie);
  return cookies[cookieName] || null;
}

function tryGetUser(req) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  const token = getAuthToken(req);
  if (!token) return null;
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

function encodeContentDispositionFilename(value) {
  const raw = String(value || 'file').trim() || 'file';
  return raw.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export default router;
