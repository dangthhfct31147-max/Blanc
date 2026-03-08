import crypto from 'node:crypto';
import { Router } from 'express';
import { connectToDatabase, getCollection } from '../lib/db.js';
import { authGuard } from '../middleware/auth.js';

const router = Router();

const DAILY_REVIEW_LIMIT = Math.max(1, Number(process.env.PEER_REVIEW_DAILY_LIMIT || 3));
const MAX_REVIEWS_PER_SUBMISSION = Math.max(1, Number(process.env.PEER_REVIEW_MAX_REVIEWS_PER_SUBMISSION || 3));
const REVIEW_WINDOW_HOURS = Math.max(12, Number(process.env.PEER_REVIEW_WINDOW_HOURS || 72));
const SCORE_CRITERIA = ['clarity', 'creativity', 'design', 'depth', 'impact'];
const MAX_SCORE_PER_CRITERION = 10;
const MAX_TOTAL_SCORE = SCORE_CRITERIA.length * MAX_SCORE_PER_CRITERION;
const MIN_COMMENT_LENGTH = 24;
const MAX_COMMENT_LENGTH = 2000;
const SUPPORTED_TYPES = new Set(['slide', 'report']);
const SUPPORTED_FILE_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

let indexesEnsured = false;

function sanitizeString(value, maxLength = 160) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}

function sanitizeSubmissionType(value) {
  const normalized = sanitizeString(value, 16).toLowerCase();
  return SUPPORTED_TYPES.has(normalized) ? normalized : null;
}

function sanitizeUrl(value) {
  const url = sanitizeString(value, 1000);
  if (!url) return '';
  return /^(https?:\/\/|\/)/i.test(url) ? url : '';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value, digits = 1) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getUtcDayBounds(base = new Date()) {
  const start = new Date(base);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function buildAnonymousSubmissionId() {
  return `Team-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function buildReviewerAlias(userId) {
  const normalized = String(userId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(-4)
    .padStart(4, 'X');
  return `Reviewer-${normalized}`;
}

function sanitizeScores(input) {
  const safeInput = input && typeof input === 'object' ? input : {};
  return Object.fromEntries(
    SCORE_CRITERIA.map((criterionId) => {
      const rawValue = Number(safeInput[criterionId]);
      const safeValue = Number.isFinite(rawValue)
        ? clamp(Math.round(rawValue), 0, MAX_SCORE_PER_CRITERION)
        : 0;
      return [criterionId, safeValue];
    }),
  );
}

function sumScores(scores) {
  return SCORE_CRITERIA.reduce((total, criterionId) => total + Number(scores?.[criterionId] || 0), 0);
}

function calculateQualityScore(scores, comment) {
  const coverageRatio =
    SCORE_CRITERIA.filter((criterionId) => Number(scores?.[criterionId] || 0) > 0).length / SCORE_CRITERIA.length;
  const commentRatio = Math.min(String(comment || '').trim().length / 280, 1);
  return roundTo((coverageRatio * 0.55) + (commentRatio * 0.45), 2);
}

function calculateReviewerProfile(reviews, reviewerId) {
  const ownReviews = Array.isArray(reviews) ? reviews : [];
  const reviewCount = ownReviews.length;
  if (reviewCount === 0) {
    return {
      reviewerId,
      alias: buildReviewerAlias(reviewerId),
      reviewsDone: 0,
      avgHelpfulness: null,
      helpfulRatingsCount: 0,
      reputationScore: 0,
      trustWeight: 0.85,
      points: 0,
    };
  }

  const helpfulRatings = ownReviews
    .map((review) => Number(review.helpfulnessRating))
    .filter((rating) => Number.isFinite(rating) && rating > 0);
  const avgHelpfulness = helpfulRatings.length
    ? roundTo(helpfulRatings.reduce((sum, rating) => sum + rating, 0) / helpfulRatings.length, 1)
    : null;
  const qualityAverage = ownReviews.reduce((sum, review) => sum + Number(review.qualityScore || 0), 0) / reviewCount;
  const helpfulnessComponent = helpfulRatings.length ? ((avgHelpfulness || 0) / 5) * 60 : 22;
  const qualityComponent = qualityAverage * 25;
  const consistencyComponent = (Math.min(reviewCount, 25) / 25) * 15;
  const reputationScore = clamp(Math.round(helpfulnessComponent + qualityComponent + consistencyComponent), 0, 100);
  const trustWeight = roundTo(0.85 + (reputationScore / 250), 2);
  const points = Math.round((reviewCount * 20) + (reputationScore * 2) + (helpfulRatings.length * 6));

  return {
    reviewerId,
    alias: ownReviews[0]?.reviewerAlias || buildReviewerAlias(reviewerId),
    reviewsDone: reviewCount,
    avgHelpfulness,
    helpfulRatingsCount: helpfulRatings.length,
    reputationScore,
    trustWeight,
    points,
  };
}

function calculateSubmissionScores(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return {
      reviewCount: 0,
      averageScore: null,
      weightedAverageScore: null,
      status: 'pending',
    };
  }

  const totalScore = reviews.reduce((sum, review) => sum + Number(review.totalScore || 0), 0);
  const rawAverage = roundTo(totalScore / reviews.length, 1);
  const totalWeight = reviews.reduce((sum, review) => sum + Number(review.trustWeight || 1), 0);
  const weightedAverage = totalWeight > 0
    ? roundTo(
      reviews.reduce((sum, review) => sum + (Number(review.totalScore || 0) * Number(review.trustWeight || 1)), 0) / totalWeight,
      1,
    )
    : rawAverage;

  return {
    reviewCount: reviews.length,
    averageScore: rawAverage,
    weightedAverageScore: weightedAverage,
    status: reviews.length >= MAX_REVIEWS_PER_SUBMISSION ? 'reviewed' : 'in_review',
  };
}

function mapReceivedReview(review, currentUserId) {
  return {
    id: String(review._id),
    reviewerAlias: review.reviewerAlias || buildReviewerAlias(review.reviewerId),
    submittedAt: review.submittedAt,
    totalScore: Number(review.totalScore || 0),
    maxTotalScore: MAX_TOTAL_SCORE,
    comment: review.comment || '',
    scores: SCORE_CRITERIA.reduce((acc, criterionId) => {
      acc[criterionId] = Number(review.scores?.[criterionId] || 0);
      return acc;
    }, {}),
    helpfulnessRating: Number.isFinite(Number(review.helpfulnessRating)) ? Number(review.helpfulnessRating) : null,
    canRateHelpfulness: review.reviewerId !== currentUserId,
    reviewerProfile: {
      reputationScore: Number(review.reviewerReputationSnapshot || 0),
      trustWeight: Number(review.trustWeight || 0.85),
      qualityScore: Number(review.qualityScore || 0),
    },
  };
}

function mapSubmissionSummary(submission, relatedReviews, currentUserId) {
  const summary = calculateSubmissionScores(relatedReviews);

  return {
    id: String(submission._id),
    title: submission.title || '',
    contestName: submission.contestName || '',
    type: submission.type || 'slide',
    status: submission.status || summary.status,
    submittedAt: submission.submittedAt,
    reviewCount: Number(submission.reviewCount ?? summary.reviewCount ?? 0),
    averageScore: submission.averageScore ?? summary.averageScore,
    weightedAverageScore: submission.weightedAverageScore ?? summary.weightedAverageScore,
    anonymousId: submission.anonymousId || buildAnonymousSubmissionId(),
    reviewDeadline: submission.reviewDeadline || null,
    file: {
      id: submission.fileId || null,
      name: submission.fileName || '',
      url: submission.fileUrl || '',
      mimeType: submission.fileMimeType || '',
      sizeBytes: Number(submission.fileSizeBytes || 0),
    },
    receivedReviews: relatedReviews.map((review) => mapReceivedReview(review, currentUserId)),
  };
}

function mapTask(submission) {
  const reviewsNeeded = Math.max(0, MAX_REVIEWS_PER_SUBMISSION - Number(submission.reviewCount || 0));
  return {
    id: String(submission._id),
    anonymousId: submission.anonymousId || buildAnonymousSubmissionId(),
    contestName: submission.contestName || '',
    type: submission.type || 'slide',
    reviewDeadline: submission.reviewDeadline || null,
    currentReviewCount: Number(submission.reviewCount || 0),
    reviewsNeeded,
    pointsReward: 12 + (reviewsNeeded * 3),
    file: {
      id: submission.fileId || null,
      name: submission.fileName || '',
      url: submission.fileUrl || '',
      mimeType: submission.fileMimeType || '',
      sizeBytes: Number(submission.fileSizeBytes || 0),
    },
  };
}

async function ensureIndexes() {
  if (indexesEnsured) return;
  indexesEnsured = true;

  try {
    await connectToDatabase();
    const submissions = getCollection('peer_review_submissions');
    const reviews = getCollection('peer_review_reviews');

    await Promise.all([
      submissions.createIndex({ ownerId: 1, submittedAt: -1 }),
      submissions.createIndex({ status: 1, submittedAt: -1 }),
      reviews.createIndex({ submissionId: 1, submittedAt: -1 }),
      reviews.createIndex({ reviewerId: 1, submittedAt: -1 }),
    ]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[peer-review] Failed to ensure indexes (continuing without them).', error);
  }
}

async function refreshSubmissionAggregate(submissionId) {
  const submissions = getCollection('peer_review_submissions');
  const reviews = getCollection('peer_review_reviews');
  const submissionReviews = await reviews.find({ submissionId }).sort({ submittedAt: -1 }).toArray();
  const summary = calculateSubmissionScores(submissionReviews);

  await submissions.updateOne(
    { _id: submissionId },
    {
      $set: {
        reviewCount: summary.reviewCount,
        averageScore: summary.averageScore,
        weightedAverageScore: summary.weightedAverageScore,
        status: summary.status,
        updatedAt: new Date(),
      },
    },
  );
}

async function buildDashboard(userId) {
  await ensureIndexes();

  const submissions = getCollection('peer_review_submissions');
  const reviews = getCollection('peer_review_reviews');

  const [userSubmissions, allReviews, userReviews, candidateSubmissions] = await Promise.all([
    submissions.find({ ownerId: userId }).sort({ submittedAt: -1 }).toArray(),
    reviews.find({}).sort({ submittedAt: -1 }).toArray(),
    reviews.find({ reviewerId: userId }).sort({ submittedAt: -1 }).toArray(),
    submissions.find({ ownerId: { $ne: userId } }).sort({ submittedAt: -1 }).limit(40).toArray(),
  ]);

  const reviewsBySubmissionId = new Map();
  for (const review of allReviews) {
    const submissionId = String(review.submissionId || '');
    if (!reviewsBySubmissionId.has(submissionId)) {
      reviewsBySubmissionId.set(submissionId, []);
    }
    reviewsBySubmissionId.get(submissionId).push(review);
  }

  const reviewsByReviewerId = new Map();
  for (const review of allReviews) {
    const reviewerId = String(review.reviewerId || '');
    if (!reviewsByReviewerId.has(reviewerId)) {
      reviewsByReviewerId.set(reviewerId, []);
    }
    reviewsByReviewerId.get(reviewerId).push(review);
  }

  const leaderboard = Array.from(reviewsByReviewerId.entries())
    .map(([reviewerId, ownReviews]) => calculateReviewerProfile(ownReviews, reviewerId))
    .sort((left, right) => {
      if (right.points !== left.points) return right.points - left.points;
      if (right.reputationScore !== left.reputationScore) return right.reputationScore - left.reputationScore;
      return right.reviewsDone - left.reviewsDone;
    })
    .map((profile, index) => ({
      ...profile,
      rank: index + 1,
      isCurrentUser: profile.reviewerId === userId,
    }));

  const currentReviewerProfile = leaderboard.find((entry) => entry.reviewerId === userId)
    || calculateReviewerProfile(userReviews, userId);

  const myReviewedSubmissionIds = new Set(userReviews.map((review) => String(review.submissionId || '')));
  const availableTasks = candidateSubmissions
    .filter((submission) => {
      const submissionId = String(submission._id);
      return !myReviewedSubmissionIds.has(submissionId) && Number(submission.reviewCount || 0) < MAX_REVIEWS_PER_SUBMISSION;
    })
    .map((submission) => mapTask(submission))
    .slice(0, 12);

  const submissionsReceived = userSubmissions.reduce((sum, submission) => sum + Number(submission.reviewCount || 0), 0);
  const submissionById = new Map(userSubmissions.map((submission) => [String(submission._id), submission]));
  const turnaroundSamples = userReviews
    .map((review) => {
      const submission = submissionById.get(String(review.submissionId || ''));
      if (!submission?.submittedAt || !review.submittedAt) return null;
      const submittedAt = new Date(submission.submittedAt).getTime();
      const reviewedAt = new Date(review.submittedAt).getTime();
      if (!Number.isFinite(submittedAt) || !Number.isFinite(reviewedAt) || reviewedAt < submittedAt) return null;
      return (reviewedAt - submittedAt) / (1000 * 60 * 60);
    })
    .filter((value) => Number.isFinite(value));

  const { start, end } = getUtcDayBounds();
  const reviewsSubmittedToday = userReviews.filter((review) => {
    const submittedAt = new Date(review.submittedAt);
    return submittedAt >= start && submittedAt < end;
  }).length;

  return {
    config: {
      dailyReviewLimit: DAILY_REVIEW_LIMIT,
      maxReviewsPerSubmission: MAX_REVIEWS_PER_SUBMISSION,
      maxTotalScore: MAX_TOTAL_SCORE,
      reviewWindowHours: REVIEW_WINDOW_HOURS,
    },
    userState: {
      dailyReviewLimit: DAILY_REVIEW_LIMIT,
      reviewsSubmittedToday,
      reviewsRemainingToday: Math.max(0, DAILY_REVIEW_LIMIT - reviewsSubmittedToday),
      reviewerProfile: currentReviewerProfile,
    },
    stats: {
      totalReviewsGiven: userReviews.length,
      submissionsReceived,
      avgTurnaroundHours: turnaroundSamples.length
        ? roundTo(turnaroundSamples.reduce((sum, value) => sum + value, 0) / turnaroundSamples.length, 1)
        : null,
    },
    submissions: userSubmissions.map((submission) =>
      mapSubmissionSummary(
        submission,
        (reviewsBySubmissionId.get(String(submission._id)) || []).sort(
          (left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
        ),
        userId,
      )),
    availableTasks,
    leaderboard: leaderboard.slice(0, 10),
  };
}

router.get('/dashboard', authGuard, async (req, res, next) => {
  try {
    await connectToDatabase();
    const payload = await buildDashboard(String(req.user.id));
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/submissions', authGuard, async (req, res, next) => {
  try {
    await connectToDatabase();
    await ensureIndexes();

    const title = sanitizeString(req.body?.title, 160);
    const contestName = sanitizeString(req.body?.contestName, 160);
    const type = sanitizeSubmissionType(req.body?.type);
    const fileId = sanitizeString(req.body?.fileId, 80) || null;
    const fileUrl = sanitizeUrl(req.body?.fileUrl);
    const fileName = sanitizeString(req.body?.fileName, 180);
    const fileMimeType = sanitizeString(req.body?.fileMimeType, 120);
    const fileSizeBytes = clamp(Number(req.body?.fileSizeBytes) || 0, 0, 25 * 1024 * 1024);

    if (!title || !contestName || !type) {
      return res.status(400).json({ error: 'Title, contest name, and submission type are required.' });
    }

    if (!fileUrl || !fileName || !SUPPORTED_FILE_TYPES.has(fileMimeType)) {
      return res.status(400).json({ error: 'A PDF, PPTX, or DOCX file is required for peer review.' });
    }

    const submissions = getCollection('peer_review_submissions');
    const now = new Date();
    const reviewDeadline = new Date(now.getTime() + (REVIEW_WINDOW_HOURS * 60 * 60 * 1000));

    const doc = {
      ownerId: String(req.user.id),
      ownerRole: String(req.user.role || 'student'),
      title,
      contestName,
      type,
      anonymousId: buildAnonymousSubmissionId(),
      fileId,
      fileUrl,
      fileName,
      fileMimeType,
      fileSizeBytes,
      reviewCount: 0,
      averageScore: null,
      weightedAverageScore: null,
      status: 'pending',
      reviewDeadline,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const result = await submissions.insertOne(doc);
    const created = { ...doc, _id: result.insertedId };

    res.status(201).json({
      submission: mapSubmissionSummary(created, [], String(req.user.id)),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reviews', authGuard, async (req, res, next) => {
  try {
    await connectToDatabase();
    await ensureIndexes();

    const userId = String(req.user.id);
    const submissionId = sanitizeString(req.body?.submissionId, 80);
    const comment = sanitizeString(req.body?.comment, MAX_COMMENT_LENGTH);
    const scores = sanitizeScores(req.body?.scores);
    const totalScore = sumScores(scores);

    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId is required.' });
    }

    if (comment.length < MIN_COMMENT_LENGTH) {
      return res.status(400).json({ error: `Feedback must be at least ${MIN_COMMENT_LENGTH} characters.` });
    }

    if (totalScore <= 0) {
      return res.status(400).json({ error: 'Please score at least one rubric criterion.' });
    }

    const submissions = getCollection('peer_review_submissions');
    const reviews = getCollection('peer_review_reviews');

    const [submission, existingReview, reviewerHistory] = await Promise.all([
      submissions.findOne({ _id: submissionId }),
      reviews.findOne({ submissionId, reviewerId: userId }),
      reviews.find({ reviewerId: userId }).sort({ submittedAt: -1 }).toArray(),
    ]);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    if (String(submission.ownerId) === userId) {
      return res.status(400).json({ error: 'You cannot review your own submission.' });
    }

    if (existingReview) {
      return res.status(409).json({ error: 'You have already reviewed this submission.' });
    }

    if (Number(submission.reviewCount || 0) >= MAX_REVIEWS_PER_SUBMISSION) {
      return res.status(409).json({ error: 'This submission already has enough reviews.' });
    }

    const { start, end } = getUtcDayBounds();
    const reviewsToday = reviewerHistory.filter((review) => {
      const submittedAt = new Date(review.submittedAt);
      return submittedAt >= start && submittedAt < end;
    }).length;

    if (reviewsToday >= DAILY_REVIEW_LIMIT) {
      return res.status(429).json({
        error: 'You reached your review quota for today.',
        code: 'DAILY_REVIEW_LIMIT_REACHED',
        dailyReviewLimit: DAILY_REVIEW_LIMIT,
        reviewsSubmittedToday: reviewsToday,
      });
    }

    const reviewerProfile = calculateReviewerProfile(reviewerHistory, userId);
    const now = new Date();
    const reviewDoc = {
      submissionId,
      submissionOwnerId: String(submission.ownerId),
      reviewerId: userId,
      reviewerAlias: buildReviewerAlias(userId),
      scores,
      totalScore,
      comment,
      qualityScore: calculateQualityScore(scores, comment),
      reviewerReputationSnapshot: reviewerProfile.reputationScore,
      trustWeight: reviewerProfile.trustWeight,
      helpfulnessRating: null,
      helpfulnessRatedAt: null,
      helpfulnessRatedBy: null,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const result = await reviews.insertOne(reviewDoc);
    await refreshSubmissionAggregate(submissionId);

    res.status(201).json({
      ok: true,
      review: {
        ...mapReceivedReview({ ...reviewDoc, _id: result.insertedId }, userId),
        submissionId,
      },
      reviewsRemainingToday: Math.max(0, DAILY_REVIEW_LIMIT - (reviewsToday + 1)),
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/reviews/:reviewId/helpfulness', authGuard, async (req, res, next) => {
  try {
    await connectToDatabase();
    await ensureIndexes();

    const userId = String(req.user.id);
    const reviewId = sanitizeString(req.params.reviewId, 80);
    const rating = clamp(Math.round(Number(req.body?.rating) || 0), 1, 5);

    if (!reviewId) {
      return res.status(400).json({ error: 'reviewId is required.' });
    }

    const reviews = getCollection('peer_review_reviews');
    const submissions = getCollection('peer_review_submissions');

    const review = await reviews.findOne({ _id: reviewId });
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    if (String(review.reviewerId) === userId) {
      return res.status(400).json({ error: 'You cannot rate your own review.' });
    }

    const submission = await submissions.findOne({ _id: String(review.submissionId) });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    if (String(submission.ownerId) !== userId) {
      return res.status(403).json({ error: 'Only the submission owner can rate this review.' });
    }

    await reviews.updateOne(
      { _id: reviewId },
      {
        $set: {
          helpfulnessRating: rating,
          helpfulnessRatedAt: new Date(),
          helpfulnessRatedBy: userId,
          updatedAt: new Date(),
        },
      },
    );

    res.json({
      ok: true,
      reviewId,
      helpfulnessRating: rating,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
