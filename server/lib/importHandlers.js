import { connectToDatabase, getCollection } from './db.js';
import { invalidate } from './cache.js';

const CATEGORY_MAP = {
  'it': 'IT & Tech', 'it & tech': 'IT & Tech', 'hackathon': 'IT & Tech',
  'coding': 'IT & Tech', 'ai': 'IT & Tech', 'ml': 'IT & Tech',
  'data': 'Data & Analytics', 'data science': 'Data & Analytics',
  'cyber': 'Cybersecurity', 'cybersecurity': 'Cybersecurity', 'security': 'Cybersecurity',
  'robotics': 'Robotics & IoT', 'iot': 'Robotics & IoT',
  'design': 'Design / UI-UX', 'ui/ux': 'Design / UI-UX',
  'business': 'Business & Strategy', 'case study': 'Business & Strategy',
  'startup': 'Startup & Innovation', 'innovation': 'Startup & Innovation',
  'marketing': 'Marketing & Growth', 'branding': 'Marketing & Growth',
  'finance': 'Finance & Fintech', 'fintech': 'Finance & Fintech',
  'health': 'Health & Biotech', 'biotech': 'Health & Biotech',
  'education': 'Education & EdTech', 'edtech': 'Education & EdTech',
  'sustainability': 'Sustainability & Environment', 'environment': 'Sustainability & Environment',
  'gaming': 'Gaming & Esports', 'esports': 'Gaming & Esports',
  'research': 'Research & Science', 'science': 'Research & Science',
  'other': 'Other',
};

function normalizeCategory(category = '') {
  const key = String(category).toLowerCase().trim();
  if (!key) return '';
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  const hit = Object.entries(CATEGORY_MAP).find(([k]) => key.includes(k));
  return hit ? hit[1] : category;
}

const DOCUMENT_CATEGORIES = new Set(['Tutorial', 'Reference', 'Guide', 'Research']);
const NEWS_TYPES = new Set(['announcement', 'minigame', 'update', 'event', 'tip']);
const NEWS_STATUSES = new Set(['draft', 'published']);
const NEWS_AUDIENCES = new Set(['all', 'students', 'mentors', 'admins']);
const COURSE_LEVELS = new Set(['Beginner', 'Intermediate', 'Advanced']);

function sanitizeString(value, fallback = '') {
  return value === undefined || value === null ? fallback : String(value).trim();
}

function normalizeDateOrEmpty(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function normalizeOptionalUrl(value) {
  const url = sanitizeString(value);
  if (!url) return '';
  if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) return url;
  return '';
}

function normalizeStringArray(value, maxItems = 20) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  const seen = new Set();
  const items = [];
  for (const item of raw) {
    const text = sanitizeString(item);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(text);
    if (items.length >= maxItems) break;
  }
  return items;
}

function normalizeDocumentCategory(value) {
  const category = sanitizeString(value);
  return DOCUMENT_CATEGORIES.has(category) ? category : '';
}

function normalizeNewsType(value) {
  const type = sanitizeString(value).toLowerCase();
  return NEWS_TYPES.has(type) ? type : 'announcement';
}

function normalizeNewsStatus(value) {
  const status = sanitizeString(value).toLowerCase();
  return NEWS_STATUSES.has(status) ? status : 'published';
}

function normalizeNewsAudience(value) {
  const audience = sanitizeString(value).toLowerCase();
  return NEWS_AUDIENCES.has(audience) ? audience : 'all';
}

function normalizeCourseLevel(value) {
  const level = sanitizeString(value);
  return COURSE_LEVELS.has(level) ? level : 'Beginner';
}

function slugify(title) {
  const base = sanitizeString(title, 'imported-news')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return base || 'imported-news';
}

async function generateUniqueNewsSlug(title) {
  const collection = getCollection('news');
  const base = slugify(title);
  let slug = base;
  let counter = 2;
  while (await collection.findOne({ slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

function normalizeContestPrizes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((prize, index) => {
      if (!prize || typeof prize !== 'object') return null;
      const title = sanitizeString(prize.title);
      const valueText = sanitizeString(prize.value);
      const description = sanitizeString(prize.description);
      if (!title && !valueText && !description) return null;
      return {
        rank: Number(prize.rank) || index + 1,
        title,
        value: valueText,
        description,
      };
    })
    .filter(Boolean);
}

function normalizeContestSchedule(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const title = sanitizeString(item.title);
      const date = normalizeDateOrEmpty(item.date);
      const description = sanitizeString(item.description);
      if (!title && !date && !description) return null;
      return { date, title, description };
    })
    .filter(Boolean);
}

function normalizeCourseSections(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((section) => {
      if (!section || typeof section !== 'object') return null;
      const title = sanitizeString(section.title);
      const description = sanitizeString(section.description);
      const duration = sanitizeString(section.duration);
      const lessons = Number(section.lessons) || 0;
      if (!title && !description && !duration && !lessons) return null;
      return { title, lessons, duration, description };
    })
    .filter(Boolean);
}

async function handleContest(data) {
  const required = ['title', 'organizer', 'dateStart', 'deadline'];
  const missing = required.filter((f) => !data[f]);
  if (missing.length) throw Object.assign(new Error(`Missing fields: ${missing.join(', ')}`), { status: 400 });

  const payload = {
    title: sanitizeString(data.title),
    organizer: sanitizeString(data.organizer),
    dateStart: new Date(data.dateStart).toISOString(),
    ...(normalizeDateOrEmpty(data.endDate) ? { endDate: normalizeDateOrEmpty(data.endDate) } : {}),
    deadline: new Date(data.deadline).toISOString(),
    status: data.status || 'OPEN',
    fee: Number(data.fee) || 0,
    tags: normalizeStringArray(data.tags),
    image: normalizeOptionalUrl(data.image),
    description: sanitizeString(data.description),
    location: sanitizeString(data.location),
    locationType: data.locationType || 'online',
    category: normalizeCategory(data.category || ''),
    rules: sanitizeString(data.rules),
    schedule: normalizeContestSchedule(data.schedule),
    prizes: normalizeContestPrizes(data.prizes),
    objectives: sanitizeString(data.objectives),
    eligibility: sanitizeString(data.eligibility),
    organizerDetails: data.organizerDetails && typeof data.organizerDetails === 'object'
      ? {
        name: sanitizeString(data.organizerDetails.name || data.organizer),
        school: sanitizeString(data.organizerDetails.school),
        logo: normalizeOptionalUrl(data.organizerDetails.logo),
        description: sanitizeString(data.organizerDetails.description),
        contact: sanitizeString(data.organizerDetails.contact),
        website: normalizeOptionalUrl(data.organizerDetails.website),
      }
      : { name: sanitizeString(data.organizer) },
    maxParticipants: Number(data.maxParticipants) || 0,
    registrationCount: 0,
    sourceUrl: normalizeOptionalUrl(data.source_url),
    importedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'ai-import',
  };

  const result = await getCollection('contests').insertOne(payload);
  await invalidate('contests:*');
  return { id: result.insertedId.toString(), url: `/contests/${result.insertedId}` };
}

async function handleScholarship(data) {
  const required = ['title', 'organizer', 'deadline'];
  const missing = required.filter((f) => !data[f]);
  if (missing.length) throw Object.assign(new Error(`Missing fields: ${missing.join(', ')}`), { status: 400 });

  const payload = {
    title: String(data.title),
    organizer: String(data.organizer),
    deadline: new Date(data.deadline).toISOString(),
    value: data.value || '',
    currency: data.currency || 'VND',
    description: data.description || '',
    eligibility: data.eligibility || '',
    requirements: data.requirements || '',
    benefits: Array.isArray(data.benefits) ? data.benefits : [],
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    image: data.image || '',
    sourceUrl: data.source_url || '',
    status: data.status || 'OPEN',
    location: data.location || '',
    level: data.level || '',
    importedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'ai-import',
  };

  const result = await getCollection('scholarships').insertOne(payload);
  await invalidate('scholarships:*');
  return { id: result.insertedId.toString(), url: `/scholarships/${result.insertedId}` };
}

async function handleDocument(data) {
  const link = normalizeOptionalUrl(data.link || data.source_url);
  const category = normalizeDocumentCategory(data.category);
  const required = ['title', 'author', 'category', 'link'];
  const normalized = {
    title: sanitizeString(data.title),
    author: sanitizeString(data.author),
    category,
    link,
  };
  const missing = required.filter((f) => !normalized[f]);
  if (missing.length) throw Object.assign(new Error(`Missing fields: ${missing.join(', ')}`), { status: 400 });

  const payload = {
    title: normalized.title,
    author: normalized.author,
    category: normalized.category,
    link: normalized.link,
    description: sanitizeString(data.description || data.summary || data.content),
    isPublic: data.isPublic !== false,
    thumbnail: normalizeOptionalUrl(data.thumbnail || data.image),
    downloads: 0,
    sourceUrl: normalizeOptionalUrl(data.source_url),
    importedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'ai-import',
  };

  const result = await getCollection('documents').insertOne(payload);
  return { id: result.insertedId.toString(), url: `/documents/${result.insertedId}` };
}

async function handleNews(data) {
  const body = sanitizeString(data.body || data.content);
  const required = ['title', 'body'];
  const normalized = {
    title: sanitizeString(data.title),
    body,
  };
  const missing = required.filter((f) => !normalized[f]);
  if (missing.length) throw Object.assign(new Error(`Missing fields: ${missing.join(', ')}`), { status: 400 });

  const status = normalizeNewsStatus(data.status);
  const publishAtDate = data.publishAt ? new Date(data.publishAt) : new Date();
  const publishAt = Number.isNaN(publishAtDate.getTime()) ? new Date() : publishAtDate;
  const type = normalizeNewsType(data.type);
  const release = data.release && typeof data.release === 'object' && type === 'update'
    ? {
      version: sanitizeString(data.release.version),
      headline: sanitizeString(data.release.headline),
      changes: normalizeStringArray(data.release.changes, 12),
      audience: normalizeNewsAudience(data.release.audience),
      notifySubscribers: false,
      lastNotification: null,
    }
    : null;

  const payload = {
    slug: await generateUniqueNewsSlug(normalized.title),
    title: normalized.title,
    summary: sanitizeString(data.summary),
    body: normalized.body,
    type,
    status,
    tags: normalizeStringArray(data.tags, 10),
    coverImage: normalizeOptionalUrl(data.coverImage || data.image),
    highlight: data.highlight === true,
    actionLabel: sanitizeString(data.actionLabel),
    actionLink: normalizeOptionalUrl(data.actionLink),
    publishAt: status === 'published' ? publishAt : null,
    publishedAt: status === 'published' ? publishAt : null,
    authorName: 'AI import',
    release,
    sourceUrl: normalizeOptionalUrl(data.source_url),
    importedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'ai-import',
  };

  const result = await getCollection('news').insertOne(payload);
  await invalidate('news:*');
  return { id: result.insertedId.toString(), url: `/news?article=${encodeURIComponent(payload.slug)}` };
}

async function handleCourse(data) {
  const required = ['title', 'instructor', 'price'];
  const normalized = {
    title: sanitizeString(data.title),
    instructor: sanitizeString(data.instructor),
    price: data.price,
  };
  const missing = required.filter((f) => normalized[f] === undefined || normalized[f] === null || normalized[f] === '');
  if (missing.length) throw Object.assign(new Error(`Missing fields: ${missing.join(', ')}`), { status: 400 });

  const sections = normalizeCourseSections(data.sections);
  const payload = {
    code: `AI-${Date.now()}`,
    title: normalized.title,
    instructor: normalized.instructor,
    price: Number(data.price) || 0,
    rating: 0,
    reviewsCount: 0,
    level: normalizeCourseLevel(data.level),
    image: normalizeOptionalUrl(data.image),
    description: sanitizeString(data.description || data.syllabus),
    duration: sanitizeString(data.duration),
    hoursPerWeek: Number(data.hoursPerWeek) || 0,
    startDate: normalizeDateOrEmpty(data.startDate) || null,
    endDate: normalizeDateOrEmpty(data.endDate) || null,
    contactInfo: sanitizeString(data.contactInfo || data.contact),
    contactType: data.contactType === 'link' ? 'link' : 'phone',
    isPublic: data.isPublic !== false,
    benefits: normalizeStringArray(data.benefits),
    sections,
    lessonsCount: sections.reduce((sum, section) => sum + (Number(section.lessons) || 0), 0),
    sourceUrl: normalizeOptionalUrl(data.source_url),
    importedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'ai-import',
  };

  const result = await getCollection('courses').insertOne(payload);
  await invalidate('courses:*');
  return { id: result.insertedId.toString(), url: `/courses/${result.insertedId}` };
}

const TYPE_HANDLERS = {
  contest: handleContest,
  scholarship: handleScholarship,
  document: handleDocument,
  news: handleNews,
  course: handleCourse,
};

export const VALID_IMPORT_TYPES = Object.freeze(Object.keys(TYPE_HANDLERS));

export function getImportTypes() {
  return {
    contest: {
      required: ['title', 'organizer', 'dateStart', 'deadline'],
      optional: ['endDate', 'status', 'fee', 'tags', 'image', 'description', 'location', 'locationType',
        'category', 'rules', 'schedule', 'prizes', 'objectives', 'eligibility',
        'organizerDetails', 'maxParticipants', 'source_url'],
    },
    scholarship: {
      required: ['title', 'organizer', 'deadline'],
      optional: ['value', 'currency', 'description', 'eligibility', 'requirements',
        'benefits', 'tags', 'image', 'source_url', 'status', 'location', 'level'],
    },
    document: {
      required: ['title', 'author', 'category', 'link'],
      optional: ['description', 'thumbnail', 'isPublic', 'summary', 'tags', 'image', 'content', 'source_url'],
    },
    news: {
      required: ['title', 'body'],
      optional: ['summary', 'type', 'tags', 'coverImage', 'highlight', 'actionLabel',
        'actionLink', 'status', 'publishAt', 'release', 'content', 'image', 'audience', 'source_url'],
    },
    course: {
      required: ['title', 'instructor', 'price'],
      optional: ['contactInfo', 'contactType', 'level', 'image', 'description', 'duration',
        'hoursPerWeek', 'startDate', 'endDate', 'benefits', 'sections', 'isPublic', 'source_url'],
    },
  };
}

export async function importContent(type, data) {
  if (!type || !VALID_IMPORT_TYPES.includes(type)) {
    throw Object.assign(
      new Error(`Invalid or missing type. Must be one of: ${VALID_IMPORT_TYPES.join(', ')}`),
      { status: 400 }
    );
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw Object.assign(new Error('Missing or invalid data object'), { status: 400 });
  }

  await connectToDatabase();

  const handler = TYPE_HANDLERS[type];
  const result = await handler(data);
  return { type, ...result };
}
