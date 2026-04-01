import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { connectToDatabase, disconnectFromDatabase, getCollection, getDb } from '../lib/db.js';

const SEED_SOURCE = 'seed-large';
const DEFAULT_PASSWORD = 'Seed123!';

function parseBoolean(input, fallback = false) {
  if (input === undefined) return fallback;
  const raw = String(input).trim().toLowerCase();
  if (!raw) return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'y' || raw === 'on';
}

function parseInteger(input, fallback, { min = 0, max = 10_000 } = {}) {
  if (input === undefined) return fallback;
  const parsed = Number.parseInt(String(input), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function stableObjectId(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex').slice(0, 24);
}

function slugify(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seedStr) {
  const seedHex = crypto.createHash('sha256').update(String(seedStr)).digest('hex').slice(0, 8);
  const seed = Number.parseInt(seedHex, 16) || 1;
  const random = mulberry32(seed);
  const int = (min, max) => {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return lo + Math.floor(random() * (hi - lo + 1));
  };
  const pick = (arr) => arr[int(0, Math.max(0, arr.length - 1))];
  const shuffle = (arr) => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return { random, int, pick, shuffle };
}

function uniqueById(list) {
  const seen = new Set();
  const out = [];
  for (const item of list || []) {
    const id = item?._id?.toString?.() ?? '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function buildConfig(args) {
  return {
    students: parseInteger(args.students ?? process.env.SEED_LARGE_STUDENTS, 60, { min: 0, max: 1000 }),
    mentors: parseInteger(args.mentors ?? process.env.SEED_LARGE_MENTORS, 15, { min: 0, max: 500 }),
    contests: parseInteger(args.contests ?? process.env.SEED_LARGE_CONTESTS, 40, { min: 0, max: 500 }),
    courses: parseInteger(args.courses ?? process.env.SEED_LARGE_COURSES, 30, { min: 0, max: 500 }),
    news: parseInteger(args.news ?? process.env.SEED_LARGE_NEWS, 30, { min: 0, max: 500 }),
    teamPosts: parseInteger(args.teamPosts ?? args['team-posts'] ?? process.env.SEED_LARGE_TEAM_POSTS, 120, {
      min: 0,
      max: 5000,
    }),
    registrations: parseInteger(
      args.registrations ?? process.env.SEED_LARGE_REGISTRATIONS,
      120,
      { min: 0, max: 20_000 }
    ),
    enrollments: parseInteger(args.enrollments ?? process.env.SEED_LARGE_ENROLLMENTS, 120, { min: 0, max: 20_000 }),
    reviews: parseInteger(args.reviews ?? process.env.SEED_LARGE_REVIEWS, 200, { min: 0, max: 50_000 }),
    reports: parseInteger(args.reports ?? process.env.SEED_LARGE_REPORTS, 40, { min: 0, max: 5000 }),
    reset: Boolean(args.reset) || parseBoolean(process.env.SEED_LARGE_RESET, false),
    seed: args.seed ?? process.env.SEED_LARGE_SEED ?? 'contesthub-seed-large',
    password: args.password ?? process.env.SEED_LARGE_PASSWORD ?? DEFAULT_PASSWORD,
  };
}

function parseArgs(argv) {
  const args = {};
  for (const raw of argv || []) {
    if (raw === '--reset') {
      args.reset = true;
      continue;
    }
    if (raw === '--help' || raw === '-h') {
      args.help = true;
      continue;
    }
    const match = raw.match(/^--([a-zA-Z0-9_-]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      args[key] = value;
    }
  }
  return args;
}

async function cleanupSeedLarge() {
  const collections = [
    'report_feedback',
    'reports',
    'reviews',
    'registrations',
    'enrollments',
    'team_posts',
    'news',
    'contests',
    'courses',
    'users',
  ];

  for (const name of collections) {
    const col = getCollection(name);
    const before = await col.countDocuments({ seedSource: SEED_SOURCE });
    if (before === 0) continue;
    const result = await col.deleteMany({ seedSource: SEED_SOURCE });
    // eslint-disable-next-line no-console
    console.log(`🧹 ${name}: ${result.deletedCount || 0} deleted`);
  }
}

async function seedUsers({ studentsCount, mentorsCount, passwordHash, rng }) {
  const users = getCollection('users');

  const firstNames = ['Minh', 'Anh', 'Huy', 'Linh', 'Trang', 'Khanh', 'Phuong', 'Nam', 'Ha', 'Quan', 'Thao', 'Son'];
  const lastNames = ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Phan', 'Vu', 'Bui', 'Dang', 'Do'];
  const locations = ['Ha Noi', 'TP.HCM', 'Da Nang', 'Can Tho', 'Hai Phong'];
  const roles = [
    'Frontend Dev',
    'Backend Dev',
    'Fullstack Dev',
    'Mobile Dev',
    'UI/UX Designer',
    'Graphic Designer',
    'Business Analyst',
    'Product Manager',
    'Data Analyst',
    'DevOps',
    'QA/Tester',
    'Marketing',
  ];
  const skillPool = [
    'React',
    'TypeScript',
    'Node.js',
    'PostgreSQL',
    'Docker',
    'AWS',
    'Figma',
    'Python',
    'Data Analysis',
    'UI Design',
    'System Design',
    'Communication',
  ];
  const languagePool = ['Vietnamese', 'English', 'Japanese', 'Korean'];

  const now = new Date();
  const ops = [];

  for (let i = 1; i <= studentsCount; i++) {
    const email = `seed_student_${String(i).padStart(4, '0')}@contesthub.dev`;
    const name = `${lastNames[i % lastNames.length]} ${firstNames[(i * 7) % firstNames.length]}`;
    const primaryRole = roles[i % roles.length];
    const secondaryRoles = rng.shuffle(roles.filter((r) => r !== primaryRole)).slice(0, rng.int(0, 2));
    const skills = rng.shuffle(skillPool).slice(0, rng.int(4, 8));

    ops.push(
      users.updateOne(
        { email },
        {
          $set: {
            seedSource: SEED_SOURCE,
            email,
            name,
            role: 'student',
            password: passwordHash,
            avatar: '',
            status: 'active',
            balance: rng.int(0, 1_000_000),
            matchingProfile: {
              primaryRole,
              secondaryRoles,
              experienceLevel: rng.pick(['beginner', 'intermediate', 'advanced']),
              yearsExperience: rng.int(0, 6),
              location: rng.pick(locations),
              timeZone: 'Asia/Ho_Chi_Minh',
              languages: rng.shuffle(languagePool).slice(0, rng.int(1, 2)),
              skills,
              techStack: rng.shuffle(skillPool).slice(0, rng.int(3, 6)),
              remotePreference: rng.pick(['remote', 'hybrid', 'onsite']),
              availability: rng.pick(['10h/week', '15-20h/week', 'Full-time', 'Flexible']),
              collaborationStyle: rng.pick(['Proactive', 'Structured', 'Async-friendly', 'Collaborative']),
              communicationTools: rng.shuffle(['Discord', 'Slack', 'Zalo', 'Google Meet']).slice(0, rng.int(1, 3)),
              openToNewTeams: true,
              openToMentor: rng.random() < 0.2,
            },
            consents: {
              allowMatching: true,
              allowRecommendations: true,
              shareExtendedProfile: true,
            },
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
            membership: {
              tier: 'free',
              status: 'active',
              startedAt: now,
              expiresAt: null,
              updatedAt: now,
              source: SEED_SOURCE,
            },
          },
        },
        { upsert: true }
      )
    );
  }

  for (let i = 1; i <= mentorsCount; i++) {
    const email = `seed_mentor_${String(i).padStart(4, '0')}@contesthub.dev`;
    const name = `${firstNames[(i * 5) % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
    const primaryRole = rng.pick(roles);
    const skills = rng.shuffle(skillPool).slice(0, rng.int(6, 10));

    ops.push(
      users.updateOne(
        { email },
        {
          $set: {
            seedSource: SEED_SOURCE,
            email,
            name,
            role: 'mentor',
            password: passwordHash,
            avatar: '',
            status: 'active',
            balance: 0,
            bio: `Mentor ${primaryRole} - chia se kinh nghiem va huong dan team.`,
            mentorBlog: {
              bannerUrl: `https://picsum.photos/seed/${encodeURIComponent(`mentor-${i}`)}/1200/600`,
              body: `Xin chao! Minh la ${name}. Minh se ho tro ban ve ${primaryRole} va cac ky nang: ${skills.join(
                ', '
              )}.`,
              createdAt: now,
              updatedAt: now,
            },
            mentorBlogCompleted: true,
            matchingProfile: {
              primaryRole,
              secondaryRoles: rng.shuffle(roles.filter((r) => r !== primaryRole)).slice(0, rng.int(0, 2)),
              experienceLevel: 'advanced',
              yearsExperience: rng.int(4, 12),
              location: rng.pick(locations),
              timeZone: 'Asia/Ho_Chi_Minh',
              languages: ['Vietnamese', 'English'],
              skills,
              techStack: rng.shuffle(skillPool).slice(0, rng.int(4, 7)),
              remotePreference: rng.pick(['remote', 'hybrid', 'onsite']),
              availability: rng.pick(['2h/week', '4h/week', '6h/week', '10h/week']),
              collaborationStyle: rng.pick(['Hands-on', 'Feedback-focused', 'Structured', 'Async-friendly']),
              communicationTools: rng.shuffle(['Discord', 'Slack', 'Google Meet']).slice(0, rng.int(1, 2)),
              openToNewTeams: false,
              openToMentor: true,
            },
            consents: {
              allowMatching: false,
              allowRecommendations: false,
              shareExtendedProfile: true,
            },
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true }
      )
    );
  }

  await Promise.all(ops);

  const seeded = await users.find({ seedSource: SEED_SOURCE }, { projection: { _id: 1, email: 1, role: 1, name: 1, avatar: 1 } }).toArray();
  return {
    seededUsers: seeded,
    seededStudents: seeded.filter((u) => u.role === 'student'),
    seededMentors: seeded.filter((u) => u.role === 'mentor'),
  };
}

async function seedContests({ count, rng }) {
  const contests = getCollection('contests');
  const categories = [
    'IT & Tech',
    'Data & Analytics',
    'Design / UI-UX',
    'Startup & Innovation',
    'Marketing & Growth',
    'Robotics & IoT',
    'Business & Strategy',
  ];
  const tagPool = [
    'Hackathon',
    'AI',
    'ML',
    'UI/UX',
    'Startup',
    'Innovation',
    'Data',
    'Web',
    'Mobile',
    'Security',
    'Product',
    'Marketing',
  ];
  const organizers = ['ContestHub', 'TechHub', 'UniLab', 'DataLab', 'CreativeHub', 'MakerSpace', 'Innovation Office'];

  const now = Date.now();
  const ops = [];

  for (let i = 1; i <= count; i++) {
    const code = `SEED-CNT-${String(i).padStart(4, '0')}`;
    const category = rng.pick(categories);
    const title = `Contest ${i}: ${category}`;
    const daysOffset = rng.int(-120, 120);
    const start = new Date(now + daysOffset * 24 * 60 * 60 * 1000);
    const deadline = new Date(start.getTime() + rng.int(7, 45) * 24 * 60 * 60 * 1000);
    const status = deadline.getTime() < now ? 'CLOSED' : rng.random() < 0.15 ? 'FULL' : 'OPEN';
    const tags = rng.shuffle(tagPool).slice(0, rng.int(3, 6));

    ops.push(
      contests.updateOne(
        { code },
        {
          $set: {
            seedSource: SEED_SOURCE,
            code,
            title,
            organizer: rng.pick(organizers),
            dateStart: start.toISOString(),
            deadline: deadline.toISOString(),
            status,
            fee: rng.random() < 0.6 ? 0 : rng.int(50_000, 300_000),
            tags,
            image: `https://picsum.photos/seed/${encodeURIComponent(code)}/600/400`,
            description: `Demo contest (${category}) - du lieu mau de test UI va API.`,
            category,
            locationType: rng.pick(['online', 'offline', 'hybrid']),
            location: rng.pick(['Ha Noi', 'TP.HCM', 'Da Nang', 'Online']),
            maxParticipants: rng.int(50, 1000),
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      )
    );
  }

  await Promise.all(ops);
}

async function seedCourses({ count, rng }) {
  const courses = getCollection('courses');
  const instructors = ['Nguyen Van A', 'Tran Thi B', 'Le Hoang C', 'Pham D', 'Minh Tran', 'Anh Le', 'Khanh Do'];
  const levels = ['Beginner', 'Intermediate', 'Advanced'];
  const topics = [
    'React',
    'TypeScript',
    'Node.js',
    'Data Analysis',
    'UI/UX',
    'System Design',
    'DevOps',
    'Marketing',
    'Product',
  ];

  const now = Date.now();
  const ops = [];

  for (let i = 1; i <= count; i++) {
    const code = `SEED-CRS-${String(i).padStart(4, '0')}`;
    const topic = rng.pick(topics);
    const title = `${topic} Course ${i}`;
    const start = new Date(now - rng.int(0, 90) * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + rng.int(14, 90) * 24 * 60 * 60 * 1000);

    ops.push(
      courses.updateOne(
        { code },
        {
          $set: {
            seedSource: SEED_SOURCE,
            code,
            title,
            instructor: rng.pick(instructors),
            price: rng.int(0, 1_200_000),
            rating: Math.round((3.5 + rng.random() * 1.5) * 10) / 10,
            reviewsCount: rng.int(0, 300),
            level: rng.pick(levels),
            image: `https://picsum.photos/seed/${encodeURIComponent(code)}/400/250`,
            description: `Khoa hoc mau ve ${topic}.`,
            duration: `${rng.int(2, 10)} tuan`,
            hoursPerWeek: rng.int(2, 10),
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            contactType: 'link',
            contactInfo: 'https://example.com',
            isPublic: true,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      )
    );
  }

  await Promise.all(ops);
}

async function seedNews({ count, rng, author }) {
  const news = getCollection('news');
  const types = ['announcement', 'minigame', 'update', 'event', 'tip'];
  const tagsPool = ['Update', 'Event', 'Tips', 'Community', 'Contest', 'Course', 'Reward', 'Security', 'Performance'];

  const ops = [];
  const now = new Date();

  for (let i = 1; i <= count; i++) {
    const type = rng.pick(types);
    const title = `Seed news ${i} (${type})`;
    const slug = `seed-${SEED_SOURCE}-${slugify(title)}-${String(i).padStart(4, '0')}`;
    const publishAt = new Date(Date.now() - rng.int(0, 30) * 24 * 60 * 60 * 1000);
    const tags = rng.shuffle(tagsPool).slice(0, rng.int(2, 5));

    ops.push(
      news.updateOne(
        { slug },
        {
          $set: {
            seedSource: SEED_SOURCE,
            slug,
            title,
            summary: 'Du lieu mau de test trang News.',
            body: `Noi dung mau #${i}. Ban co the thay doi hoac xoa bang --reset.`,
            tags,
            type,
            highlight: rng.random() < 0.15,
            actionLabel: rng.random() < 0.3 ? 'Xem them' : undefined,
            actionLink: rng.random() < 0.3 ? '/' : undefined,
            coverImage: `https://picsum.photos/seed/${encodeURIComponent(slug)}/1200/600`,
            status: 'published',
            publishAt: publishAt.toISOString(),
            publishedAt: publishAt.toISOString(),
            author: author
              ? { id: author._id.toString(), email: author.email, name: author.name }
              : { id: null, email: null, name: 'Admin' },
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true }
      )
    );
  }

  await Promise.all(ops);
}

function buildTeamPostDescription(rng, contestTitle) {
  const openings = [
    'Chao moi nguoi! Team minh dang can them thanh vien.',
    'Team dang tim nguoi dong hanh de kip deadline.',
    'Minh muon lap team onl/offl de tham gia contest.',
  ];
  const asks = [
    'Uu tien co portfolio va tinh than teamwork.',
    'Co the commit 10-15h/week.',
    'Biet giao tiep va nhan feedback.',
    'Lam viec nhanh, co ky luat.',
  ];
  const closing = ['Inbox minh nhe!', 'Comment/nhan tin de minh lien he.', 'Cam on moi nguoi!'];

  const parts = [
    rng.pick(openings),
    contestTitle ? `Contest: ${contestTitle}` : '',
    rng.pick(asks),
    rng.pick(asks),
    rng.pick(closing),
  ].filter(Boolean);

  return parts.join('\n\n');
}

async function seedTeamPosts({ count, rng, students, contests }) {
  const teamPosts = getCollection('team_posts');
  if (!students.length || !contests.length || count <= 0) return;

  const rolePool = [
    'Frontend Dev',
    'Backend Dev',
    'Fullstack Dev',
    'Mobile Dev',
    'UI/UX Designer',
    'Graphic Designer',
    'Business Analyst',
    'Product Manager',
    'Data Analyst',
    'DevOps',
    'QA/Tester',
    'Marketing',
    'Content Writer',
  ];
  const contactMethods = ['message', 'email', 'both'];

  const now = Date.now();
  const docs = [];

  for (let i = 1; i <= count; i++) {
    const creator = students[(i - 1) % students.length];
    const contest = contests[(i * 3) % contests.length];
    const rolesNeeded = rng.shuffle(rolePool).slice(0, rng.int(2, 4));
    const maxMembers = rng.int(3, 8);

    const createdAt = new Date(now - rng.int(0, 14) * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(now + rng.int(7, 30) * 24 * 60 * 60 * 1000);
    const status = rng.random() < 0.1 ? 'full' : rng.random() < 0.25 ? 'closed' : 'open';

    const otherStudents = rng.shuffle(students.filter((u) => u._id.toString() !== creator._id.toString()));
    const currentMembers = rng.int(2, Math.min(maxMembers, 5));
    const members = [
      {
        id: creator._id.toString(),
        name: creator.name,
        avatar: creator.avatar || '',
        role: 'Leader',
        joinedAt: createdAt.toISOString(),
      },
      ...otherStudents.slice(0, Math.max(0, currentMembers - 1)).map((u, idx) => ({
        id: u._id.toString(),
        name: u.name,
        avatar: u.avatar || '',
        role: rolesNeeded[idx] || 'Member',
        joinedAt: new Date(createdAt.getTime() + rng.int(1, 72) * 60 * 60 * 1000).toISOString(),
      })),
    ];

    docs.push({
      _id: stableObjectId(`seed-large:team-post:${i}`),
      seedSource: SEED_SOURCE,
      title: `Tim team #${i}: ${rolesNeeded[0]}`,
      description: buildTeamPostDescription(rng, contest?.title || ''),
      contestId: contest?._id?.toString() || null,
      contestTitle: contest?.title || null,
      rolesNeeded,
      currentMembers: members.length,
      maxMembers,
      requirements: rng.random() < 0.4 ? 'Co kinh nghiem co ban va tinh than hop tac.' : '',
      skills: rng.shuffle(['React', 'Node.js', 'Figma', 'Python', 'SQL', 'Docker', 'AWS', 'Communication']).slice(0, rng.int(3, 6)),
      contactMethod: rng.pick(contactMethods),
      status,
      createdBy: {
        id: creator._id.toString(),
        name: creator.name,
        avatar: creator.avatar || '',
        email: creator.email || '',
      },
      members,
      createdAt,
      updatedAt: createdAt,
      expiresAt,
    });
  }

  await teamPosts.insertMany(docs);
}

async function seedRegistrations({ count, rng, users, contests }) {
  const registrations = getCollection('registrations');
  if (!users.length || !contests.length || count <= 0) return [];

  const pairs = [];
  for (let u = 0; u < users.length; u++) {
    for (let c = 0; c < contests.length; c++) {
      pairs.push([u, c]);
    }
  }

  const shuffled = rng.shuffle(pairs);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  const now = Date.now();
  const docs = selected.map(([uIdx, cIdx], i) => {
    const user = users[uIdx];
    const contest = contests[cIdx];
    const registeredAt = new Date(now - rng.int(0, 120) * 24 * 60 * 60 * 1000);
    const status = rng.random() < 0.8 ? 'active' : 'completed';

    return {
      _id: stableObjectId(`seed-large:registration:${user._id.toString()}:${contest._id.toString()}`),
      seedSource: SEED_SOURCE,
      userId: user._id.toString(),
      contestId: contest._id.toString(),
      registeredAt,
      status,
      createdAt: registeredAt,
      updatedAt: registeredAt,
      source: 'seed',
      note: `seed-large #${i + 1}`,
    };
  });

  await registrations.insertMany(docs);
  return docs;
}

async function seedEnrollments({ count, rng, users, courses }) {
  const enrollments = getCollection('enrollments');
  if (!users.length || !courses.length || count <= 0) return [];

  const pairs = [];
  for (let u = 0; u < users.length; u++) {
    for (let c = 0; c < courses.length; c++) {
      pairs.push([u, c]);
    }
  }

  const shuffled = rng.shuffle(pairs);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  const now = Date.now();
  const docs = selected.map(([uIdx, cIdx], i) => {
    const user = users[uIdx];
    const course = courses[cIdx];
    const enrolledAt = new Date(now - rng.int(0, 120) * 24 * 60 * 60 * 1000);
    const isCompleted = rng.random() < 0.25;
    const progress = isCompleted ? 100 : rng.int(0, 95);
    const status = isCompleted ? 'completed' : 'active';

    return {
      _id: stableObjectId(`seed-large:enrollment:${user._id.toString()}:${course._id.toString()}`),
      seedSource: SEED_SOURCE,
      userId: user._id.toString(),
      courseId: course._id.toString(),
      enrolledAt,
      status,
      progress,
      completedLessons: progress === 100 ? ['lesson-1', 'lesson-2', 'lesson-3'] : [],
      lastAccessedAt: new Date(enrolledAt.getTime() + rng.int(1, 72) * 60 * 60 * 1000),
      createdAt: enrolledAt,
      updatedAt: enrolledAt,
      source: 'seed',
      note: `seed-large #${i + 1}`,
    };
  });

  await enrollments.insertMany(docs);
  return docs;
}

async function seedReviews({ count, rng, registrationDocs, enrollmentDocs, usersById }) {
  const reviews = getCollection('reviews');
  if (count <= 0) return;

  const reviewTemplates = [
    'Rat huu ich va de theo doi.',
    'Noi dung ro rang, minh hoc duoc nhieu.',
    'Giao dien dep, nhung can toi uu them.',
    'Minh se gioi thieu cho ban be.',
    'Tot cho nguoi moi bat dau.',
  ];

  const contestTargets = registrationDocs
    .map((r) => ({ targetType: 'contest', targetId: r.contestId, userId: r.userId }))
    .filter((t) => t.targetId && t.userId);

  const courseTargets = enrollmentDocs
    .map((e) => ({ targetType: 'course', targetId: e.courseId, userId: e.userId }))
    .filter((t) => t.targetId && t.userId);

  const targets = rng.shuffle([...contestTargets, ...courseTargets]);
  if (targets.length === 0) return;

  const now = Date.now();
  const docs = [];

  for (let i = 0; i < Math.min(count, targets.length); i++) {
    const t = targets[i];
    const user = usersById.get(String(t.userId));
    const createdAt = new Date(now - rng.int(0, 120) * 24 * 60 * 60 * 1000);
    const rating = rng.random() < 0.7 ? rng.int(4, 5) : rng.int(2, 4);

    docs.push({
      _id: stableObjectId(`seed-large:review:${t.targetType}:${t.targetId}:${t.userId}`),
      seedSource: SEED_SOURCE,
      targetType: t.targetType,
      targetId: String(t.targetId),
      userId: String(t.userId),
      userName: user?.name || 'Seed User',
      userAvatar: user?.avatar || null,
      rating,
      comment: `${rng.pick(reviewTemplates)} (#${i + 1})`,
      isVerified: true,
      helpfulCount: rng.int(0, 25),
      createdAt,
      updatedAt: createdAt,
    });
  }

  await reviews.insertMany(docs);
}

async function seedReports({ count, rng, users, contests, courses }) {
  const reports = getCollection('reports');
  if (!users.length || count <= 0) return;

  const templateIds = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const now = Date.now();
  const docs = [];

  for (let i = 1; i <= count; i++) {
    const owner = users[(i - 1) % users.length];
    const template = rng.pick(templateIds);
    const updatedAt = new Date(now - rng.int(0, 60) * 24 * 60 * 60 * 1000);
    const status = rng.pick(['Draft', 'Ready', 'Sent']);
    const reviewStatus = rng.random() < 0.3 ? 'submitted' : rng.random() < 0.1 ? 'approved' : 'draft';

    let relatedType = null;
    let relatedId = null;
    if (rng.random() < 0.6 && (contests.length || courses.length)) {
      relatedType = rng.random() < 0.5 ? 'contest' : 'course';
      if (relatedType === 'contest' && contests.length) {
        relatedId = rng.pick(contests)._id.toString();
      } else if (relatedType === 'course' && courses.length) {
        relatedId = rng.pick(courses)._id.toString();
      } else {
        relatedType = null;
        relatedId = null;
      }
    }

    const submittedAt = reviewStatus === 'submitted' ? new Date(updatedAt.getTime() - rng.int(1, 48) * 60 * 60 * 1000) : null;
    const reviewedAt = reviewStatus === 'approved' ? new Date(updatedAt.getTime() - rng.int(1, 48) * 60 * 60 * 1000) : null;

    docs.push({
      _id: stableObjectId(`seed-large:report:${i}`),
      seedSource: SEED_SOURCE,
      userId: owner._id.toString(),
      title: `Bao cao mau #${i}`,
      template,
      status,
      reviewStatus,
      submittedAt,
      reviewedAt,
      relatedType,
      relatedId,
      activities: rng.random() < 0.7
        ? [
          {
            id: stableObjectId(`seed-large:report:${i}:activity:1`),
            title: 'Hoan thanh nhiem vu 1',
            description: 'Mo ta ngan ve cong viec da lam.',
            occurredAt: updatedAt.toISOString(),
          },
          {
            id: stableObjectId(`seed-large:report:${i}:activity:2`),
            title: 'Hoan thanh nhiem vu 2',
            description: 'Cap nhat tien do va rut kinh nghiem.',
            occurredAt: updatedAt.toISOString(),
          },
        ]
        : [],
      evidence: [],
      content: `# Bao cao mau ${i}\n\nNoi dung demo de test Report UI.\n`,
      createdAt: updatedAt,
      updatedAt,
    });
  }

  await reports.insertMany(docs);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    // eslint-disable-next-line no-console
    console.log(`Usage: node server/scripts/seed-large.js [--reset] [--students=60] [--mentors=15] ...`);
    process.exit(0);
  }

  const config = buildConfig(args);

  if (process.env.NODE_ENV === 'production' && !parseBoolean(process.env.ALLOW_SEED_LARGE_IN_PROD, false)) {
    throw new Error('Refusing to seed large data in production. Set ALLOW_SEED_LARGE_IN_PROD=true to override.');
  }

  const rng = createRng(config.seed);
  const passwordHash = bcrypt.hashSync(config.password, 12);

  try {
    await connectToDatabase();

    if (config.reset) {
      await cleanupSeedLarge();
    }

    const usersCollection = getCollection('users');
    const adminUser = await usersCollection.findOne({ email: 'admin@contesthub.dev' });

    const { seededStudents } = await seedUsers({
      studentsCount: config.students,
      mentorsCount: config.mentors,
      passwordHash,
      rng,
    });

    await seedContests({ count: config.contests, rng });
    await seedCourses({ count: config.courses, rng });
    await seedNews({ count: config.news, rng, author: adminUser });

    const contests = await getCollection('contests').find({}).toArray();
    const courses = await getCollection('courses').find({}).toArray();

    const specialUsers = await usersCollection
      .find({ email: { $in: ['admin@contesthub.dev', 'student@contesthub.dev'] } })
      .toArray();
    const actionUsers = uniqueById([...seededStudents, ...specialUsers]).filter((u) =>
      ['student', 'admin', 'super_admin'].includes(u.role)
    );

    await seedTeamPosts({ count: config.teamPosts, rng, students: seededStudents, contests });

    const registrationDocs = await seedRegistrations({ count: config.registrations, rng, users: actionUsers, contests });
    const enrollmentDocs = await seedEnrollments({ count: config.enrollments, rng, users: actionUsers, courses });

    const usersById = new Map(actionUsers.map((u) => [u._id.toString(), u]));
    await seedReviews({ count: config.reviews, rng, registrationDocs, enrollmentDocs, usersById });

    await seedReports({ count: config.reports, rng, users: actionUsers, contests, courses });
    const db = getDb();
    const { rows } = await db.query(
      'SELECT collection, COUNT(*)::int AS count FROM documents GROUP BY collection ORDER BY count DESC'
    );
    // eslint-disable-next-line no-console
    console.table(rows);
    // eslint-disable-next-line no-console
    console.log(`✅ Seed large done (${SEED_SOURCE})`);
  } finally {
    await disconnectFromDatabase();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ seed-large failed:', err?.message || err);
  process.exitCode = 1;
});
