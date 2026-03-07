import { Router } from 'express';
import { ObjectId } from '../lib/objectId.js';
import { connectToDatabase, getCollection } from '../lib/db.js';
import { getCached, invalidate } from '../lib/cache.js';
import { sendSystemNotification } from '../lib/emailService.js';
import { getPlatformSettings } from '../lib/platformSettings.js';
import { authGuard } from '../middleware/auth.js';
import { normalizePagination } from '../lib/pagination.js';

const router = Router();
const collectionName = 'news';
const allowedStatuses = ['draft', 'published'];
const allowedTypes = ['announcement', 'minigame', 'update', 'event', 'tip'];
const allowedReleaseAudiences = ['all', 'students', 'mentors', 'admins'];
let indexesEnsured = false;

const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
};

const sanitizeString = (value, maxLength = 255) => {
  if (!value || typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

const sanitizeBody = (value, maxLength = 20000) => {
  if (!value || typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

const sanitizeUrl = (value, maxLength = 500) => {
  const url = sanitizeString(value, maxLength);
  if (!url) return '';
  if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) return url;
  return '';
};

const sanitizeTags = (tags, maxItems = 10) => {
  if (!Array.isArray(tags)) return [];
  const unique = new Set();
  const sanitized = [];
  for (const tag of tags) {
    const t = sanitizeString(tag, 50);
    if (t && !unique.has(t.toLowerCase())) {
      unique.add(t.toLowerCase());
      sanitized.push(t);
    }
    if (sanitized.length >= maxItems) break;
  }
  return sanitized;
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeStatus = (status) => (allowedStatuses.includes(status) ? status : 'draft');
const normalizeType = (type) => (allowedTypes.includes(type) ? type : 'announcement');
const normalizeAudience = (audience) => {
  const value = String(audience || '').trim().toLowerCase();
  return allowedReleaseAudiences.includes(value) ? value : 'all';
};

const normalizeDate = (input) => {
  if (!input) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sanitizeReleaseChanges = (changes, maxItems = 12) => {
  const raw = Array.isArray(changes)
    ? changes
    : typeof changes === 'string'
      ? changes.split('\n')
      : [];

  const unique = new Set();
  const sanitized = [];
  for (const entry of raw) {
    const item = sanitizeString(entry, 180);
    if (!item) continue;
    const key = item.toLowerCase();
    if (unique.has(key)) continue;
    unique.add(key);
    sanitized.push(item);
    if (sanitized.length >= maxItems) break;
  }
  return sanitized;
};

const sanitizeRelease = (input, existing = null) => {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (!input || typeof input !== 'object') return null;

  const version = sanitizeString(input.version, 40);
  const headline = sanitizeString(input.headline, 180);
  const changes = sanitizeReleaseChanges(input.changes);
  const audience = normalizeAudience(sanitizeString(input.audience, 20));
  const notifySubscribers = !!input.notifySubscribers;

  const hasContent = version || headline || changes.length > 0 || notifySubscribers || audience !== 'all';
  if (!hasContent) return null;

  return {
    version,
    headline,
    changes,
    audience,
    notifySubscribers,
    lastNotification: existing?.lastNotification || null,
  };
};

const slugify = (title) => {
  const base = sanitizeString(title || '', 200)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return base || 'news';
};

const generateUniqueSlug = async (base, excludeId) => {
  const collection = getCollection(collectionName);
  let slug = base || 'news';
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await collection.findOne({ slug });
    if (!existing) break;
    if (excludeId && existing._id?.toString() === excludeId.toString()) break;
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
};

const ensureIndexes = async () => {
  if (indexesEnsured) return;
  await connectToDatabase();
  const collection = getCollection(collectionName);
  await collection.createIndex({ slug: 1 }, { unique: true });
  await collection.createIndex({ status: 1, publishAt: -1 });
  await collection.createIndex({ status: 1, highlight: 1, publishAt: -1 });
  await collection.createIndex({ tags: 1 });
  indexesEnsured = true;
};

const formatDate = (value) => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const mapRelease = (release) => {
  if (!release || typeof release !== 'object') return null;

  return {
    version: release.version || '',
    headline: release.headline || '',
    changes: Array.isArray(release.changes) ? release.changes.filter(Boolean) : [],
    audience: normalizeAudience(release.audience),
    notifySubscribers: !!release.notifySubscribers,
    lastNotification: release.lastNotification
      ? {
          total: Number(release.lastNotification.total || 0),
          sent: Number(release.lastNotification.sent || 0),
          failed: Number(release.lastNotification.failed || 0),
          notifiedAt: formatDate(release.lastNotification.notifiedAt),
        }
      : null,
  };
};

const getFrontendOrigin = () => {
  const raw = String(process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173');
  const first = raw.split(',').map((value) => value.trim()).find(Boolean);
  return (first || 'http://localhost:5173').replace(/\/+$/, '');
};

const buildNewsPublicUrl = (doc) => {
  const slug = sanitizeString(doc?.slug, 200);
  return slug ? `${getFrontendOrigin()}/news?article=${encodeURIComponent(slug)}` : `${getFrontendOrigin()}/news`;
};

const buildReleaseEmailBody = (doc) => {
  const release = doc?.release || {};
  const changeItems = Array.isArray(release.changes)
    ? release.changes.filter(Boolean).map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '';
  const versionLabel = release.version ? `phiên bản <strong>${escapeHtml(release.version)}</strong>` : 'bản cập nhật mới';
  const intro = escapeHtml(release.headline || doc.summary || '');
  const link = buildNewsPublicUrl(doc);

  return [
    `<p>Blanc vừa phát hành ${versionLabel}.</p>`,
    intro ? `<p>${intro}</p>` : '',
    changeItems ? `<p><strong>Điểm mới trong bản này:</strong></p><ul>${changeItems}</ul>` : '',
    `<p><a href="${link}">Xem đầy đủ trên bản tin Blanc</a></p>`,
  ].filter(Boolean).join('');
};

const buildReleaseNotificationMessage = (doc) => {
  const release = doc?.release || {};
  const changes = Array.isArray(release.changes) ? release.changes.filter(Boolean) : [];
  const header = release.version ? `${doc.title} (${release.version})` : doc.title;
  const lines = [
    header,
    release.headline || doc.summary || '',
    ...changes.slice(0, 6).map((item) => `• ${item}`),
  ].filter(Boolean);
  return lines.join('\n');
};

const buildReleaseAudienceQuery = (audience) => {
  const query = {
    status: { $nin: ['banned', 'inactive', 'deleted'] },
  };

  switch (normalizeAudience(audience)) {
    case 'students':
      query.role = 'student';
      break;
    case 'mentors':
      query.role = 'mentor';
      break;
    case 'admins':
      query.role = { $in: ['admin', 'super_admin'] };
      break;
    default:
      break;
  }

  return query;
};

const shouldDispatchRelease = (previousDoc, nextDoc) => {
  if (!nextDoc || nextDoc.type !== 'update' || nextDoc.status !== 'published') return false;
  if (!nextDoc.release?.notifySubscribers) return false;
  if (!nextDoc.release?.version) return false;
  if (!Array.isArray(nextDoc.release?.changes) || nextDoc.release.changes.length === 0) return false;
  if (nextDoc.release?.lastNotification?.notifiedAt) return false;
  return previousDoc?.status !== 'published';
};

const dispatchReleaseUpdate = async (doc, actor) => {
  await connectToDatabase();

  const settings = await getPlatformSettings();
  const users = getCollection('users');
  const notificationLogs = getCollection('notification_logs');

  const audience = normalizeAudience(doc.release?.audience);
  const recipients = await users.find(
    buildReleaseAudienceQuery(audience),
    { projection: { email: 1, name: 1, notifications: 1 } }
  ).limit(1000).toArray();

  const eligibleUsers = recipients.filter((user) => {
    const email = sanitizeString(user?.email, 254);
    if (!email) return false;
    return user?.notifications?.email !== false;
  });

  const subject = doc.release?.version
    ? `${doc.title} · ${doc.release.version}`
    : doc.title;

  let sent = 0;
  let failed = 0;
  const emailEnabled = settings?.notifications?.emailNotifications !== false;

  if (emailEnabled) {
    for (let index = 0; index < eligibleUsers.length; index += 5) {
      const batch = eligibleUsers.slice(index, index + 5);
      const results = await Promise.allSettled(
        batch.map((user) => sendSystemNotification({
          to: user.email,
          title: subject,
          message: buildReleaseEmailBody(doc),
          severity: 'info',
          userName: user.name || '',
        }))
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          sent += 1;
        } else {
          failed += 1;
        }
      });

      if (index + 5 < eligibleUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
  }

  const notifiedAt = new Date();

  await notificationLogs.insertOne({
    type: 'announcement',
    category: 'release_update',
    title: subject,
    message: buildReleaseNotificationMessage(doc),
    severity: 'info',
    targetAudience: audience,
    totalUsers: eligibleUsers.length,
    sent,
    failed,
    newsId: doc._id?.toString?.() || null,
    newsSlug: doc.slug || null,
    createdAt: notifiedAt,
    createdBy: actor?.id || null,
  });

  return {
    total: eligibleUsers.length,
    sent,
    failed,
    notifiedAt,
  };
};

const maybeDispatchRelease = async ({ collection, query, previousDoc, nextDoc, actor }) => {
  if (!shouldDispatchRelease(previousDoc, nextDoc)) {
    return nextDoc;
  }

  try {
    const stats = await dispatchReleaseUpdate(nextDoc, actor);
    const release = {
      ...(nextDoc.release || {}),
      lastNotification: stats,
    };

    const result = await collection.findOneAndUpdate(
      query,
      { $set: { release, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );

    return result?.value ?? result ?? { ...nextDoc, release };
  } catch (error) {
    console.error('[news] Failed to dispatch release update:', error);
    return nextDoc;
  }
};

const mapNews = (doc, { includeBody = false } = {}) => ({
  id: doc._id?.toString(),
  slug: doc.slug,
  title: doc.title,
  summary: doc.summary || '',
  tags: doc.tags || [],
  coverImage: doc.coverImage || '',
  type: doc.type || 'announcement',
  highlight: !!doc.highlight,
  actionLabel: doc.actionLabel || '',
  actionLink: doc.actionLink || '',
  status: doc.status || 'draft',
  publishAt: formatDate(doc.publishAt),
  publishedAt: formatDate(doc.publishedAt),
  author: doc.author || {
    id: doc.authorId || null,
    name: doc.authorName || null,
    email: doc.authorEmail || null,
  },
  createdAt: formatDate(doc.createdAt),
  updatedAt: formatDate(doc.updatedAt),
  release: mapRelease(doc.release),
  ...(includeBody ? { body: doc.body || '' } : {}),
});

// -------------------- Admin endpoints --------------------

router.get('/admin', authGuard, requireAdmin, async (req, res, next) => {
  try {
    await ensureIndexes();
    const collection = getCollection(collectionName);

    const { page, limit, skip } = normalizePagination(req.query.page, req.query.limit ?? 20, 'USERS');

    const search = sanitizeString(req.query.search, 200);
    const status = normalizeStatus(req.query.status);
    const tag = sanitizeString(req.query.tag, 50);
    const from = normalizeDate(req.query.from);
    const to = normalizeDate(req.query.to);
    const highlightParam = sanitizeString(req.query.highlight, 10).toLowerCase();
    const sortBy = ['publishAt', 'createdAt', 'updatedAt', 'title'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'updatedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const query = {};
    if (req.query.status) query.status = status;
    if (highlightParam) {
      if (['1', 'true', 'yes'].includes(highlightParam)) query.highlight = true;
      if (['0', 'false', 'no'].includes(highlightParam)) query.highlight = false;
    }
    if (search) {
      const escaped = escapeRegex(search);
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { summary: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (tag) query.tags = tag;
    if (from || to) {
      query.publishAt = {};
      if (from) query.publishAt.$gte = from;
      if (to) query.publishAt.$lte = to;
    }

    const [total, items] = await Promise.all([
      collection.countDocuments(query),
      collection
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    res.json({ items: items.map((doc) => mapNews(doc)), page, limit, total });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/:id', authGuard, requireAdmin, async (req, res, next) => {
  try {
    await ensureIndexes();
    const { id } = req.params;
    const collection = getCollection(collectionName);

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { slug: id };
    const doc = await collection.findOne(query);
    if (!doc) return res.status(404).json({ error: 'News item not found' });

    return res.json({ item: mapNews(doc, { includeBody: true }) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', authGuard, requireAdmin, async (req, res, next) => {
  try {
    await ensureIndexes();
    const collection = getCollection(collectionName);

    const title = sanitizeString(req.body.title, 200);
    const summary = sanitizeString(req.body.summary, 500);
    const body = sanitizeBody(req.body.body);
    const coverImage = sanitizeString(req.body.coverImage, 500);
    const tags = sanitizeTags(req.body.tags);
    const type = normalizeType(req.body.type);
    const highlight = !!req.body.highlight;
    const actionLabel = sanitizeString(req.body.actionLabel, 80);
    const actionLink = sanitizeUrl(req.body.actionLink);
    const status = normalizeStatus(req.body.status);
    const publishAtInput = normalizeDate(req.body.publishAt);
    const publishAt = status === 'published' ? publishAtInput || new Date() : publishAtInput;
    const authorName = sanitizeString(req.body.authorName, 120);
    const release = sanitizeRelease(req.body.release);

    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!body) return res.status(400).json({ error: 'Body is required' });
    if (publishAtInput === null && req.body.publishAt) {
      return res.status(400).json({ error: 'Invalid publishAt' });
    }
    if (release && type !== 'update') {
      return res.status(400).json({ error: 'Release info is only supported for update news' });
    }
    if (release?.notifySubscribers && !release.version) {
      return res.status(400).json({ error: 'Version is required when sending release email' });
    }
    if (release?.notifySubscribers && release.changes.length === 0) {
      return res.status(400).json({ error: 'At least one release change is required when sending release email' });
    }

    const baseSlug = slugify(title);
    const slug = await generateUniqueSlug(baseSlug);
    const now = new Date();

    const doc = {
      title,
      summary,
      body,
      tags,
      coverImage,
      type,
      highlight,
      actionLabel,
      actionLink,
      status,
      slug,
      publishAt,
      publishedAt: status === 'published' ? (publishAt || now) : null,
      author: {
        id: req.user?.id || null,
        email: req.user?.email || null,
        name: authorName || null,
      },
      release,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(doc);
    const createdDoc = await maybeDispatchRelease({
      collection,
      query: { _id: result.insertedId },
      previousDoc: null,
      nextDoc: { ...doc, _id: result.insertedId },
      actor: req.user,
    });
    await invalidate('news:*');
    return res.status(201).json({ item: mapNews(createdDoc) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', authGuard, requireAdmin, async (req, res, next) => {
  try {
    await ensureIndexes();
    const collection = getCollection(collectionName);
    const { id } = req.params;
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { slug: id };
    const existing = await collection.findOne(query);

    if (!existing) return res.status(404).json({ error: 'News item not found' });

    const updates = {};
    const now = new Date();
    let targetType = existing.type || 'announcement';

    if (req.body.title !== undefined) {
      const title = sanitizeString(req.body.title, 200);
      if (!title) return res.status(400).json({ error: 'Title cannot be empty' });
      updates.title = title;
      if (req.body.slug) {
        const newSlugBase = slugify(req.body.slug);
        updates.slug = await generateUniqueSlug(newSlugBase, existing._id);
      }
    }

    if (req.body.summary !== undefined) {
      updates.summary = sanitizeString(req.body.summary, 500);
    }
    if (req.body.body !== undefined) {
      const body = sanitizeBody(req.body.body);
      if (!body) return res.status(400).json({ error: 'Body cannot be empty' });
      updates.body = body;
    }
    if (req.body.coverImage !== undefined) {
      updates.coverImage = sanitizeString(req.body.coverImage, 500);
    }
    if (req.body.tags !== undefined) {
      updates.tags = sanitizeTags(req.body.tags);
    }
    if (req.body.type !== undefined) {
      targetType = normalizeType(req.body.type);
      updates.type = targetType;
    }
    if (req.body.highlight !== undefined) {
      updates.highlight = !!req.body.highlight;
    }
    if (req.body.actionLabel !== undefined) {
      updates.actionLabel = sanitizeString(req.body.actionLabel, 80);
    }
    if (req.body.actionLink !== undefined) {
      updates.actionLink = sanitizeUrl(req.body.actionLink);
    }
    if (req.body.authorName !== undefined) {
      const authorName = sanitizeString(req.body.authorName, 120);
      updates.author = {
        ...(existing.author || {}),
        id: existing.author?.id || req.user?.id || null,
        email: existing.author?.email || req.user?.email || null,
        name: authorName || null,
      };
    }

    if (req.body.release !== undefined) {
      const release = sanitizeRelease(req.body.release, existing.release);
      if (release && targetType !== 'update') {
        return res.status(400).json({ error: 'Release info is only supported for update news' });
      }
      if (release?.notifySubscribers && !release.version) {
        return res.status(400).json({ error: 'Version is required when sending release email' });
      }
      if (release?.notifySubscribers && release.changes.length === 0) {
        return res.status(400).json({ error: 'At least one release change is required when sending release email' });
      }
      updates.release = release;
    } else if (targetType !== 'update' && existing.release) {
      updates.release = null;
    }

    let targetStatus = existing.status;
    if (req.body.status !== undefined) {
      const status = normalizeStatus(req.body.status);
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      targetStatus = status;
      updates.status = status;
    }

    let publishAt = existing.publishAt;
    if (req.body.publishAt !== undefined) {
      const parsed = normalizeDate(req.body.publishAt);
      if (parsed === null && req.body.publishAt) {
        return res.status(400).json({ error: 'Invalid publishAt' });
      }
      publishAt = parsed;
      updates.publishAt = parsed;
    }

    if (targetStatus === 'published') {
      const targetRelease = updates.release !== undefined ? updates.release : existing.release;
      if (
        targetType === 'update'
        && targetRelease?.notifySubscribers
        && (!targetRelease.version || !Array.isArray(targetRelease.changes) || targetRelease.changes.length === 0)
      ) {
        return res.status(400).json({ error: 'Release version and changes are required before publishing with email notifications' });
      }

      const publishDate = publishAt || existing.publishAt || new Date();
      updates.publishAt = publishDate;
      updates.publishedAt = existing.publishedAt || publishDate;
    } else if (targetStatus === 'draft') {
      updates.publishedAt = null;
    }

    updates.updatedAt = now;

    const result = await collection.findOneAndUpdate(
      query,
      { $set: updates },
      { returnDocument: 'after' },
    );

    let updatedDoc = result?.value ?? result;
    if (!updatedDoc) return res.status(404).json({ error: 'News item not found' });

    updatedDoc = await maybeDispatchRelease({
      collection,
      query,
      previousDoc: existing,
      nextDoc: updatedDoc,
      actor: req.user,
    });

    await invalidate('news:*');
    return res.json({ item: mapNews(updatedDoc, { includeBody: true }) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/status', authGuard, requireAdmin, async (req, res, next) => {
  try {
    await ensureIndexes();
    const collection = getCollection(collectionName);
    const { id } = req.params;
    const status = normalizeStatus(req.body.status);
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { slug: id };
    const existing = await collection.findOne(query);
    if (!existing) return res.status(404).json({ error: 'News item not found' });
    if (
      status === 'published'
      && existing.type === 'update'
      && existing.release?.notifySubscribers
      && (!existing.release?.version || !Array.isArray(existing.release?.changes) || existing.release.changes.length === 0)
    ) {
      return res.status(400).json({ error: 'Release version and changes are required before publishing with email notifications' });
    }

    const now = new Date();
    const publishDate = normalizeDate(req.body.publishAt) || existing.publishAt || now;

    const updates = {
      status,
      publishAt: status === 'published' ? publishDate : existing.publishAt || null,
      publishedAt: status === 'published' ? (existing.publishedAt || publishDate) : null,
      updatedAt: now,
    };

    const result = await collection.findOneAndUpdate(
      query,
      { $set: updates },
      { returnDocument: 'after' },
    );

    let updatedDoc = result?.value ?? result;
    if (!updatedDoc) return res.status(404).json({ error: 'News item not found' });

    updatedDoc = await maybeDispatchRelease({
      collection,
      query,
      previousDoc: existing,
      nextDoc: updatedDoc,
      actor: req.user,
    });

    await invalidate('news:*');
    return res.json({ item: mapNews(updatedDoc, { includeBody: true }) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', authGuard, requireAdmin, async (req, res, next) => {
  try {
    await ensureIndexes();
    const collection = getCollection(collectionName);
    const { id } = req.params;
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { slug: id };

    const result = await collection.deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'News item not found' });
    }

    await invalidate('news:*');
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

// -------------------- Public endpoints --------------------

router.get('/tags', async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=300');

    const payload = await getCached(
      'news:tags',
      async () => {
        await ensureIndexes();
        const collection = getCollection(collectionName);
        const tags = await collection
          .aggregate([
            { $match: { status: 'published' } },
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ])
          .toArray();

        return {
          tags: tags.map((t) => t._id),
          tagsWithCount: tags.map((t) => ({ tag: t._id, count: t.count })),
        };
      },
      600
    );

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = normalizePagination(req.query.page, req.query.limit ?? 10, 'ACTIVITIES');

    const search = sanitizeString(req.query.search, 200);
    const tag = sanitizeString(req.query.tag, 50);
    const from = normalizeDate(req.query.from);
    const to = normalizeDate(req.query.to);
    const highlightParam = sanitizeString(req.query.highlight, 10).toLowerCase();
    const highlightOnly = ['1', 'true', 'yes'].includes(highlightParam);
    const now = new Date();

    const query = {
      status: 'published',
      publishAt: { $lte: now },
    };
    if (highlightOnly) query.highlight = true;
    if (search) {
      const escaped = escapeRegex(search);
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { summary: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (tag) query.tags = tag;
    if (from || to) {
      query.publishAt = query.publishAt || {};
      if (from) query.publishAt.$gte = from;
      if (to) query.publishAt.$lte = to;
    }

    const cacheKey = `news:list:${encodeURIComponent(
      JSON.stringify({
        page,
        limit,
        search,
        tag,
        from: from ? from.toISOString() : '',
        to: to ? to.toISOString() : '',
        highlightOnly,
      })
    )}`;

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

    const payload = await getCached(
      cacheKey,
      async () => {
        await ensureIndexes();
        const collection = getCollection(collectionName);

        const [total, items] = await Promise.all([
          collection.countDocuments(query),
          collection
            .find(query, { projection: { body: 0 } })
            .sort({ publishAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
        ]);

        return { items: items.map((doc) => mapNews(doc)), page, limit, total };
      },
      60
    );

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/:slugOrId', async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const now = new Date();

    const query = ObjectId.isValid(slugOrId)
      ? { _id: new ObjectId(slugOrId) }
      : { slug: slugOrId };

    const cacheKey = `news:item:${encodeURIComponent(slugOrId)}`;
    const doc = await getCached(
      cacheKey,
      async () => {
        await ensureIndexes();
        const collection = getCollection(collectionName);
        return await collection.findOne({
          ...query,
          status: 'published',
          publishAt: { $lte: now },
        });
      },
      60
    );

    if (!doc) return res.status(404).json({ error: 'News item not found' });

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.json({ item: mapNews(doc, { includeBody: true }) });
  } catch (error) {
    return next(error);
  }
});

export default router;
