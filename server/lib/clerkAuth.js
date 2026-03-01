import { createClerkClient } from '@clerk/backend';
import { connectToDatabase, getCollection } from './db.js';

function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeEmail(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || '';
}

function resolveLocale(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('vi')) return 'vi';
  return 'vi';
}

function buildDisplayName({ firstName, lastName, username, email }) {
  const fullName = [String(firstName || '').trim(), String(lastName || '').trim()]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (fullName) return fullName;
  if (username) return String(username).trim();
  if (email) return String(email).split('@')[0];
  return 'ContestHub User';
}

function getPrimaryEmailFromClerkUser(user) {
  const emailAddresses = Array.isArray(user?.emailAddresses) ? user.emailAddresses : [];
  const primaryId = user?.primaryEmailAddressId || null;

  const primary =
    emailAddresses.find((item) => item?.id === primaryId)
    || emailAddresses.find((item) => item?.verification?.status === 'verified')
    || emailAddresses[0]
    || null;

  if (!primary) {
    return null;
  }

  const email = normalizeEmail(primary.emailAddress);
  return email
    ? {
      email,
      verified: primary?.verification?.status === 'verified',
    }
    : null;
}

function getPrimaryEmailFromWebhookPayload(data) {
  const emailAddresses = Array.isArray(data?.email_addresses) ? data.email_addresses : [];
  const primaryId = data?.primary_email_address_id || null;

  const primary =
    emailAddresses.find((item) => item?.id === primaryId)
    || emailAddresses.find((item) => item?.verification?.status === 'verified')
    || emailAddresses[0]
    || null;

  if (!primary) return null;

  const email = normalizeEmail(primary.email_address);
  if (!email) return null;

  return {
    email,
    verified: primary?.verification?.status === 'verified',
  };
}

function createDefaultMembership(now) {
  return {
    tier: 'free',
    status: 'active',
    startedAt: now,
    expiresAt: null,
    updatedAt: now,
    source: 'system',
  };
}

function createLocalUserFromClerk(user, emailInfo) {
  const now = new Date();
  const email = emailInfo?.email || '';

  return {
    name: buildDisplayName({
      firstName: user?.firstName,
      lastName: user?.lastName,
      username: user?.username,
      email,
    }),
    email,
    role: 'student',
    avatar: String(user?.imageUrl || '').trim(),
    locale: resolveLocale(user?.locale),
    status: 'active',
    emailVerified: emailInfo?.verified === true,
    emailVerifiedAt: emailInfo?.verified === true ? now : null,
    authProvider: 'clerk',
    clerkUserId: String(user?.id || '').trim(),
    clerkEmailVerified: emailInfo?.verified === true,
    lastClerkSyncAt: now,
    membership: createDefaultMembership(now),
    createdAt: now,
    updatedAt: now,
  };
}

function buildClerkProfileUpdateFromUser(user, emailInfo) {
  const email = emailInfo?.email || '';
  const update = {
    authProvider: 'clerk',
    clerkUserId: String(user?.id || '').trim(),
    clerkEmailVerified: emailInfo?.verified === true,
    lastClerkSyncAt: new Date(),
    updatedAt: new Date(),
  };

  if (email) {
    update.email = email;
  }

  const avatar = String(user?.imageUrl || '').trim();
  if (avatar) {
    update.avatar = avatar;
  }

  const name = buildDisplayName({
    firstName: user?.firstName,
    lastName: user?.lastName,
    username: user?.username,
    email,
  });
  if (name) {
    update.name = name;
  }

  return update;
}

function buildClerkProfileUpdateFromWebhook(data, emailInfo) {
  const email = emailInfo?.email || '';
  const update = {
    authProvider: 'clerk',
    clerkUserId: String(data?.id || '').trim(),
    clerkEmailVerified: emailInfo?.verified === true,
    lastClerkSyncAt: new Date(),
    updatedAt: new Date(),
  };

  if (email) {
    update.email = email;
  }

  const imageUrl = String(data?.image_url || '').trim();
  if (imageUrl) {
    update.avatar = imageUrl;
  }

  const name = buildDisplayName({
    firstName: data?.first_name,
    lastName: data?.last_name,
    username: data?.username,
    email,
  });
  if (name) {
    update.name = name;
  }

  return update;
}

function validateLinkTarget(existingUser, clerkUserId) {
  if (!existingUser?.clerkUserId) return;
  if (String(existingUser.clerkUserId) === String(clerkUserId)) return;
  throw createHttpError('This email is already linked to another Clerk account.', 409);
}

export function getClerkSecretKey() {
  return String(process.env.CLERK_SECRET_KEY || '').trim();
}

export function getClerkPublishableKey() {
  return String(
    process.env.CLERK_PUBLISHABLE_KEY
    || process.env.VITE_CLERK_PUBLISHABLE_KEY
    || ''
  ).trim();
}

export function isClerkConfigured() {
  return Boolean(getClerkSecretKey() && getClerkPublishableKey());
}

let cachedClerkClient = null;
let cachedClerkClientConfig = '';

function getClerkClient() {
  const secretKey = getClerkSecretKey();
  const publishableKey = getClerkPublishableKey();
  const configKey = `${secretKey}:${publishableKey}`;

  if (!cachedClerkClient || cachedClerkClientConfig !== configKey) {
    cachedClerkClient = createClerkClient({ secretKey, publishableKey });
    cachedClerkClientConfig = configKey;
  }

  return cachedClerkClient;
}

export function buildRequestUser(localUser, clerkUserId) {
  return {
    id: String(localUser?._id || ''),
    role: localUser?.role || 'student',
    email: normalizeEmail(localUser?.email),
    clerkUserId: clerkUserId ? String(clerkUserId) : undefined,
  };
}

export async function resolveLocalUserFromClerkUserId(clerkUserId) {
  const normalizedClerkUserId = String(clerkUserId || '').trim();
  if (!normalizedClerkUserId) {
    throw createHttpError('Unauthorized', 401);
  }

  if (!isClerkConfigured()) {
    throw createHttpError('Clerk is not configured on the server.', 503);
  }

  await connectToDatabase();
  const users = getCollection('users');

  const linkedUser = await users.findOne({ clerkUserId: normalizedClerkUserId });
  if (linkedUser) {
    return linkedUser;
  }

  const remoteUser = await getClerkClient().users.getUser(normalizedClerkUserId);
  const emailInfo = getPrimaryEmailFromClerkUser(remoteUser);

  if (!emailInfo?.email) {
    throw createHttpError('A primary email is required for this account.', 403);
  }

  const existingUser = await users.findOne({ email: emailInfo.email });
  if (existingUser) {
    validateLinkTarget(existingUser, normalizedClerkUserId);

    const update = buildClerkProfileUpdateFromUser(remoteUser, emailInfo);
    await users.updateOne({ _id: existingUser._id }, { $set: update });
    const linkedExistingUser = await users.findOne({ _id: existingUser._id });

    console.log(`[clerk] Linked existing local user ${existingUser._id} to Clerk user ${normalizedClerkUserId}`);

    return linkedExistingUser || { ...existingUser, ...update };
  }

  const newUser = createLocalUserFromClerk(remoteUser, emailInfo);
  const result = await users.insertOne(newUser);

  console.log(`[clerk] Created local user ${result.insertedId} for Clerk user ${normalizedClerkUserId}`);

  return {
    ...newUser,
    _id: result.insertedId,
  };
}

export async function syncLocalUserFromClerkWebhook(data) {
  const clerkUserId = String(data?.id || '').trim();
  if (!clerkUserId) {
    throw createHttpError('Missing Clerk user id.', 400);
  }

  await connectToDatabase();
  const users = getCollection('users');
  const emailInfo = getPrimaryEmailFromWebhookPayload(data);
  let localUser = await users.findOne({ clerkUserId });

  if (!localUser && emailInfo?.verified && emailInfo.email) {
    const existingUser = await users.findOne({ email: emailInfo.email });
    if (existingUser) {
      validateLinkTarget(existingUser, clerkUserId);
      localUser = existingUser;
    }
  }

  if (localUser) {
    const update = buildClerkProfileUpdateFromWebhook(data, emailInfo);
    await users.updateOne({ _id: localUser._id }, { $set: update });
    return users.findOne({ _id: localUser._id });
  }

  if (!emailInfo?.verified || !emailInfo.email) {
    console.warn(`[clerk] Skipping webhook sync for ${clerkUserId}: no verified primary email`);
    return null;
  }

  const newUser = createLocalUserFromClerk({
    id: clerkUserId,
    firstName: data?.first_name,
    lastName: data?.last_name,
    username: data?.username,
    imageUrl: data?.image_url,
    locale: data?.locale,
  }, emailInfo);

  const result = await users.insertOne(newUser);
  return {
    ...newUser,
    _id: result.insertedId,
  };
}

export async function markLocalUserInactiveForClerk(clerkUserId) {
  const normalizedClerkUserId = String(clerkUserId || '').trim();
  if (!normalizedClerkUserId) {
    throw createHttpError('Missing Clerk user id.', 400);
  }

  await connectToDatabase();
  const users = getCollection('users');
  const existingUser = await users.findOne({ clerkUserId: normalizedClerkUserId });

  if (!existingUser) {
    return null;
  }

  const update = {
    status: 'inactive',
    lastClerkSyncAt: new Date(),
    clerkDeletedAt: new Date(),
    updatedAt: new Date(),
  };

  await users.updateOne({ _id: existingUser._id }, { $set: update });
  return users.findOne({ _id: existingUser._id });
}
