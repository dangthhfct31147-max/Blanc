import { api, authToken } from '../lib/api';

export type PeerReviewSubmissionStatus = 'pending' | 'in_review' | 'reviewed';
export type PeerReviewSubmissionType = 'slide' | 'report';

export interface PeerReviewFile {
  id: string | null;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ReviewerProfileSummary {
  reviewerId?: string;
  alias: string;
  reviewsDone: number;
  avgHelpfulness: number | null;
  helpfulRatingsCount: number;
  reputationScore: number;
  trustWeight: number;
  points: number;
  rank?: number;
  isCurrentUser?: boolean;
}

export interface ReceivedPeerReview {
  id: string;
  reviewerAlias: string;
  submittedAt: string;
  totalScore: number;
  maxTotalScore: number;
  comment: string;
  scores: Record<string, number>;
  helpfulnessRating: number | null;
  canRateHelpfulness: boolean;
  reviewerProfile: {
    reputationScore: number;
    trustWeight: number;
    qualityScore: number;
  };
}

export interface PeerReviewSubmissionSummary {
  id: string;
  title: string;
  contestName: string;
  type: PeerReviewSubmissionType;
  status: PeerReviewSubmissionStatus;
  submittedAt: string;
  reviewCount: number;
  averageScore: number | null;
  weightedAverageScore: number | null;
  anonymousId: string;
  reviewDeadline: string | null;
  file: PeerReviewFile;
  receivedReviews: ReceivedPeerReview[];
}

export interface PeerReviewTask {
  id: string;
  anonymousId: string;
  contestName: string;
  type: PeerReviewSubmissionType;
  reviewDeadline: string | null;
  currentReviewCount: number;
  reviewsNeeded: number;
  pointsReward: number;
  file: PeerReviewFile;
}

export interface PeerReviewDashboardResponse {
  config: {
    dailyReviewLimit: number;
    maxReviewsPerSubmission: number;
    maxTotalScore: number;
    reviewWindowHours: number;
  };
  userState: {
    dailyReviewLimit: number;
    reviewsSubmittedToday: number;
    reviewsRemainingToday: number;
    reviewerProfile: ReviewerProfileSummary;
  };
  stats: {
    totalReviewsGiven: number;
    submissionsReceived: number;
    avgTurnaroundHours: number | null;
  };
  submissions: PeerReviewSubmissionSummary[];
  availableTasks: PeerReviewTask[];
  leaderboard: ReviewerProfileSummary[];
}

interface MediaPresignResponse {
  uploadUrl: string;
  fileName: string;
  folder: string;
  mimeType: string;
  nonce: string;
  timestamp: number;
  signature: string;
}

interface MediaUploadResponse {
  status: number;
  result?: {
    id?: string;
    url?: string;
    error?: string;
  };
}

export interface CreatePeerReviewSubmissionInput {
  title: string;
  contestName: string;
  type: PeerReviewSubmissionType;
  file: File;
  accessToken?: string | null;
}

export interface SubmitPeerReviewInput {
  submissionId: string;
  scores: Record<string, number>;
  comment: string;
}

async function uploadPeerReviewFile(file: File, accessToken?: string | null): Promise<PeerReviewFile> {
  const presign = await api.post<MediaPresignResponse>('/media/presign', {
    mimeType: file.type,
    folder: 'peer-review',
  });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', presign.fileName);
  formData.append('folder', presign.folder);
  formData.append('mimeType', presign.mimeType);
  formData.append('nonce', presign.nonce);
  formData.append('timestamp', String(presign.timestamp));
  formData.append('signature', presign.signature);

  const bearerToken = accessToken || authToken.get();
  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
  });

  const uploadResult = await uploadResponse.json().catch(() => null) as MediaUploadResponse | null;
  const fileId = uploadResult?.result?.id ? String(uploadResult.result.id) : '';
  const fileUrl = uploadResult?.result?.url ? String(uploadResult.result.url) : '';
  if (!uploadResponse.ok || uploadResult?.status !== 200 || !fileId || !fileUrl) {
    throw new Error(uploadResult?.result?.error || 'Upload failed');
  }

  return {
    id: fileId,
    url: fileUrl,
    name: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

export const peerReviewService = {
  getDashboard: async (): Promise<PeerReviewDashboardResponse> => {
    return api.get<PeerReviewDashboardResponse>('/peer-review/dashboard');
  },

  createSubmission: async (input: CreatePeerReviewSubmissionInput): Promise<PeerReviewSubmissionSummary> => {
    const uploadedFile = await uploadPeerReviewFile(input.file, input.accessToken);
    const response = await api.post<{ submission: PeerReviewSubmissionSummary }>('/peer-review/submissions', {
      title: input.title,
      contestName: input.contestName,
      type: input.type,
      fileId: uploadedFile.id,
      fileUrl: uploadedFile.url,
      fileName: uploadedFile.name,
      fileMimeType: uploadedFile.mimeType,
      fileSizeBytes: uploadedFile.sizeBytes,
    });
    return response.submission;
  },

  submitReview: async (input: SubmitPeerReviewInput) => {
    return api.post<{
      ok: boolean;
      review: ReceivedPeerReview & { submissionId: string };
      reviewsRemainingToday: number;
    }>('/peer-review/reviews', input);
  },

  rateHelpfulness: async (reviewId: string, rating: number) => {
    return api.patch<{ ok: boolean; reviewId: string; helpfulnessRating: number }>(
      `/peer-review/reviews/${reviewId}/helpfulness`,
      { rating },
    );
  },
};

export default peerReviewService;
