import { Router } from 'express';
import { ObjectId } from '../lib/objectId.js';
import { connectToDatabase, getCollection } from '../lib/db.js';
import { getCached } from '../lib/cache.js';
import { normalizePagination } from '../lib/pagination.js';

const router = Router();
const collectionName = 'hall_of_fame';
let indexesEnsured = false;

const allowedFields = new Set([
  'it',
  'data',
  'cyber',
  'robotics',
  'design',
  'business',
  'startup',
  'marketing',
  'finance',
  'health',
  'education',
  'sustainability',
  'gaming',
  'research',
  'other',
]);

const allowedResourceTypes = new Set(['project', 'slides', 'video']);
const allowedSortFields = new Set(['year', 'title', 'createdAt']);

const projection = {
  projection: {
    slug: 1,
    title: 1,
    teamName: 1,
    contestName: 1,
    year: 1,
    award: 1,
    field: 1,
    summary: 1,
    problem: 1,
    solution: 1,
    impact: 1,
    whyItWon: 1,
    thumbnail: 1,
    featured: 1,
    isPublic: 1,
    tags: 1,
    hasProject: 1,
    hasSlides: 1,
    hasVideo: 1,
    resources: 1,
    structure: 1,
    takeaways: 1,
    createdAt: 1,
    updatedAt: 1,
  },
};

function sanitizeString(value, maxLength = 255) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function sanitizeBoolean(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatDate(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function mapResource(resource, index) {
  return {
    id: sanitizeString(resource?.id, 80) || `resource-${index + 1}`,
    type: allowedResourceTypes.has(String(resource?.type || '').trim()) ? resource.type : 'project',
    title: sanitizeString(resource?.title, 160),
    url: sanitizeString(resource?.url, 500),
    format: sanitizeString(resource?.format, 120),
    description: sanitizeString(resource?.description, 400),
  };
}

function mapStructureSegment(segment, index) {
  return {
    id: sanitizeString(segment?.id, 80) || `segment-${index + 1}`,
    order: Number(segment?.order) || index + 1,
    label: sanitizeString(segment?.label, 80),
    title: sanitizeString(segment?.title, 160),
    description: sanitizeString(segment?.description, 500),
    objective: sanitizeString(segment?.objective, 240),
  };
}

function mapEntry(doc) {
  const resources = Array.isArray(doc?.resources)
    ? doc.resources.map((resource, index) => mapResource(resource, index))
    : [];
  const structure = Array.isArray(doc?.structure)
    ? doc.structure
      .map((segment, index) => mapStructureSegment(segment, index))
      .sort((a, b) => a.order - b.order)
    : [];
  const takeaways = Array.isArray(doc?.takeaways)
    ? doc.takeaways.map((item) => sanitizeString(item, 220)).filter(Boolean)
    : [];

  return {
    id: doc?._id?.toString(),
    slug: sanitizeString(doc?.slug, 160),
    title: sanitizeString(doc?.title, 200),
    teamName: sanitizeString(doc?.teamName, 160),
    contestName: sanitizeString(doc?.contestName, 200),
    year: Number(doc?.year) || 0,
    award: sanitizeString(doc?.award, 120),
    field: sanitizeString(doc?.field, 80),
    summary: sanitizeString(doc?.summary, 600),
    problem: sanitizeString(doc?.problem, 600),
    solution: sanitizeString(doc?.solution, 600),
    impact: sanitizeString(doc?.impact, 600),
    whyItWon: sanitizeString(doc?.whyItWon, 600),
    thumbnail: sanitizeString(doc?.thumbnail, 500),
    featured: doc?.featured === true,
    isPublic: doc?.isPublic !== false,
    tags: Array.isArray(doc?.tags)
      ? doc.tags.map((tag) => sanitizeString(tag, 50)).filter(Boolean)
      : [],
    hasProject: doc?.hasProject === true,
    hasSlides: doc?.hasSlides === true,
    hasVideo: doc?.hasVideo === true,
    resources,
    structure,
    takeaways,
    createdAt: formatDate(doc?.createdAt),
    updatedAt: formatDate(doc?.updatedAt),
  };
}

async function ensureIndexes() {
  if (indexesEnsured) return;
  await connectToDatabase();
  const collection = getCollection(collectionName);
  await collection.createIndex({ slug: 1 }, { unique: true });
  await collection.createIndex({ isPublic: 1, featured: -1, year: -1 });
  await collection.createIndex({ field: 1, year: -1 });
  indexesEnsured = true;
}

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = normalizePagination(req.query.page, req.query.limit ?? 12, 'CONTESTS');
    const search = sanitizeString(req.query.search, 200);
    const field = sanitizeString(req.query.field, 80);
    const resourceType = sanitizeString(req.query.resourceType, 40);
    const sortBy = sanitizeString(req.query.sortBy, 40);
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const featured = sanitizeBoolean(req.query.featured);

    const yearParam = sanitizeString(req.query.year, 12);
    const parsedYear = yearParam ? Number.parseInt(yearParam, 10) : undefined;
    const year = Number.isFinite(parsedYear) ? parsedYear : undefined;

    const query = { isPublic: true };

    if (featured !== undefined) query.featured = featured;
    if (field && allowedFields.has(field)) query.field = field;
    if (typeof year === 'number') query.year = year;

    if (search) {
      query.searchText = {
        $regex: escapeRegex(search),
        $options: 'i',
      };
    }

    if (resourceType && allowedResourceTypes.has(resourceType)) {
      if (resourceType === 'project') query.hasProject = true;
      if (resourceType === 'slides') query.hasSlides = true;
      if (resourceType === 'video') query.hasVideo = true;
    }

    const sortField = allowedSortFields.has(sortBy) ? sortBy : 'year';
    const sort = { featured: -1, [sortField]: sortOrder, _id: -1 };

    const cacheKey = `hall-of-fame:list:${encodeURIComponent(JSON.stringify({
      page,
      limit,
      search,
      field,
      year: year || '',
      resourceType,
      featured,
      sortField,
      sortOrder,
    }))}`;

    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');

    const payload = await getCached(
      cacheKey,
      async () => {
        await ensureIndexes();
        const collection = getCollection(collectionName);
        const [total, items] = await Promise.all([
          collection.countDocuments(query),
          collection.find(query, projection).sort(sort).skip(skip).limit(limit).toArray(),
        ]);

        return {
          items: items.map(mapEntry),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      },
      120,
    );

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

router.get('/:slugOrId', async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const cacheKey = `hall-of-fame:item:${encodeURIComponent(slugOrId)}`;
    const baseQuery = ObjectId.isValid(slugOrId)
      ? { _id: new ObjectId(slugOrId) }
      : { slug: slugOrId };

    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');

    const doc = await getCached(
      cacheKey,
      async () => {
        await ensureIndexes();
        return getCollection(collectionName).findOne({ ...baseQuery, isPublic: true }, projection);
      },
      120,
    );

    if (!doc) {
      return res.status(404).json({ error: 'Hall of Fame entry not found' });
    }

    return res.json({ item: mapEntry(doc) });
  } catch (error) {
    return next(error);
  }
});

export default router;
