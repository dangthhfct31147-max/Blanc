<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1GlTghfKTWF6q0HKfLY-gJh2dyM4-7DYA

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. (Optional) Set `GEMINI_API_KEY` in `.env` for Gemini (admin AI) features
3. Run the user app:
   `npm run dev` (http://localhost:3000)
4. Run the admin app:
   `npm run admin:dev` (http://localhost:3001)

## API server (PostgreSQL/CockroachDB + media upload)

1. Copy [.env.example](.env.example) to `.env` and set:
   - `DATABASE_URL` to your PostgreSQL/CockroachDB connection string
   - `JWT_SECRET` to a long random string
   - `OTP_SECRET_KEY` - (legacy) shared secret used for OTP + optional media HMAC fallback
   - `MEDIA_UPLOAD_SECRET_KEY` - HMAC secret for media upload signature verification
   - `MEDIA_MAX_BYTES` - max upload size in bytes (default: 25MB)
   - `MEDIA_PUBLIC_FOLDERS` - comma-separated folders that are publicly readable (default: `avatars,mentor-blog`)
   - Payments (SePay):
     - `PAYMENTS_ENABLED=true` (or `FEATURE_PAYMENTS_ENABLED=true`) to enable membership checkout
     - `PAYMENT_BANK_CODE`, `PAYMENT_ACCOUNT_NUMBER`, `PAYMENT_ACCOUNT_NAME` to generate VietQR (required when payments enabled)
     - `SEPAY_API_KEY` to protect `POST /api/payments/sepay/webhook` (required when payments enabled)
       - Optional (recommended): `SEPAY_API_KEYS` (comma-separated) to support API key rotation without downtime
       - Optional (recommended): `SEPAY_WEBHOOK_IP_ALLOWLIST` to restrict webhook callers by IP (comma-separated; IPv4 CIDR supported)
       - Optional: `SEPAY_WEBHOOK_STORE_RAW_PAYLOAD=false` to reduce stored PII (stores normalized fields only)
     - Optional: `PAYMENT_AMOUNT_TOLERANCE_VND` to allow small amount mismatches (VND)
     - Optional: `MEMBERSHIP_ORDER_PREFIX` (transfer content prefix, default `CHUB`)
     - Optional: `MEMBERSHIP_ORDER_TTL_MINUTES` (order expiry, default 30)
   - `OTP_EMAIL_URL` - deployed App Script URL for OTP emails (see `scripts/otpService.gs`)
   - `NOTIFICATION_EMAIL_URL` - deployed App Script URL for notification emails (see `scripts/notificationService.gs`)
   - `OPENROUTER_API_KEY` - API key from [OpenRouter](https://openrouter.ai) for AI Chat
   - `CHAT_MODELS` - (optional) comma-separated model priority list (fallback order), defaults to `qwen/qwen3-coder,qwen/qwen3-235b-a22b,tngtech/deepseek-r1t2-chimera,mistralai/devstral-2512,meta-llama/llama-3.3-70b-instruct`
   - `FRONTEND_ORIGIN` - allowed web origins (comma separated); local dev: `http://localhost:3000,http://localhost:3001`
   
2. **Deploy Google Apps Scripts:**
   
   **OTP Service (`scripts/otpService.gs`):**
   - Create new Google Apps Script project  
   - Copy content from `scripts/otpService.gs`
   - Set script property `OTP_SECRET_KEY` (same as `OTP_SECRET_KEY` on the backend)
   - Deploy as Web app, set "Execute as: Me", "Who has access: Anyone"
   - Copy deployment URL to `OTP_EMAIL_URL`
   
   **Notification Service (`scripts/notificationService.gs`):**
   - Create new Google Apps Script project
   - Copy content from `scripts/notificationService.gs`
   - Set script property `NOTIFICATION_SECRET_KEY` (same as `OTP_SECRET_KEY` on the backend)
   - Deploy as Web app, set "Execute as: Me", "Who has access: Anyone"
   - Copy deployment URL to `NOTIFICATION_EMAIL_URL`

3. Start the API:
   (Recommended once per DB) Initialize DB schema/indexes: `npm run db:init`
   `npm run server`

## SePay webhook setup

- Webhook URL: `https://<your-api-host>/api/payments/sepay/webhook`
- Auth header: `Authorization: ApiKey <SEPAY_API_KEY>` (or `x-api-key: <SEPAY_API_KEY>`)
- Ensure SePay monitors the same bank account as `PAYMENT_ACCOUNT_NUMBER` (the backend will flag mismatches as `needs_review`)

4. Key endpoints:
   - **Auth:** `POST /api/auth/register/initiate`, `POST /api/auth/register/verify`, `POST /api/auth/register/complete`, `POST /api/auth/login/initiate`, `POST /api/auth/login/verify-2fa`, `GET /api/auth/me`, `POST /api/auth/logout`
   - **OTP:** `POST /api/otp/request`, `POST /api/otp/verify`, `POST /api/otp/resend`
   - **Contests:** `GET /api/contests`, `GET /api/contests/:id`, `POST/PATCH /api/contests` (admin)
   - **Courses:** `GET /api/courses`, `POST /api/courses/:id/lessons`, `POST /api/courses/:id/materials`
   - **Notifications:** `POST /api/notifications/contest-reminder`, `POST /api/notifications/course-update`, `POST /api/notifications/announcement`
   - **Media:**
     - `POST /api/media/presign` -> returns `uploadUrl`, `fileName`, `folder`, `mimeType`, `nonce`, `timestamp`, `signature`
     - `POST /api/media/upload` (multipart/form-data) -> returns `{status:200,result:{id,url}}`
     - `GET /api/media/:id` -> streams content (public folders are readable without auth; others require owner/admin)
   - **Membership:** `GET /api/membership/plans`, `POST /api/membership/checkout`, `GET /api/membership/orders/:id`, `GET /api/membership/me`
   - **Payments (SePay webhook):** `POST /api/payments/sepay/webhook`
   - **User Settings:** `GET /api/users/me/settings`, `PATCH /api/users/me/profile`, `PATCH /api/users/me/notifications`
   - **AI Chat:** `POST /api/chat` (RAG-powered assistant), `GET /api/chat/suggestions`
   - **Matching:** `GET /api/matching/recommendations`, `GET /api/matching/score/:userId`, `POST /api/matching/refresh`

## Teammate Matching System

The platform includes an advanced teammate matching algorithm that helps users find diverse, compatible teammates for competitions.

### Features:
- **Comprehensive Scoring**: Uses ALL profile fields for matching (roles, skills, tech stack, availability, experience, location, communication tools, etc.)
- **Diversity Optimization**: Ensures 5 recommended teammates have different roles & skills to form a balanced team of 6
- **Two-Way Matching**: For Community page - both users must be interested in each other (mutual compatibility)
- **One-Way Matching**: For AI Agent - user-centric recommendations (faster)
- **6-Hour Caching**: Recommendations are cached for performance, auto-refreshes
- **Privacy-First**: Only users who consent to matching are shown

### Scoring Weights (Total: 100):
| Category | Weight | Description |
|----------|--------|-------------|
| Role Diversity | 25 | Different roles = higher score, penalizes duplicate roles in team |
| Skill Complementarity | 20 | Balance of shared skills (communication) & unique skills (coverage) |
| Availability | 15 | Schedule overlap detection |
| Experience Level | 10 | Similar experience = better collaboration |
| Location/Timezone | 10 | Same location bonus, timezone compatibility check |
| Communication Tools | 10 | Shared tools (Discord, Slack, etc.) |
| Contest Preferences | 5 | Similar contest interests |
| Collaboration Style | 5 | Compatible working styles |

### API Endpoints:
- `GET /api/matching/recommendations` - Get 5 diverse teammate recommendations
  - Query params: `contestId`, `twoWay` (default: true), `limit` (1-10)
- `GET /api/matching/score/:userId` - Get match score with specific user
- `POST /api/matching/refresh` - Force refresh recommendations (clears cache)
- `GET /api/matching/profile-completion` - Check profile completion for better matching

### How Diversity Works:
The algorithm uses a greedy selection strategy:
1. Calculate base scores for all eligible candidates
2. Select candidates one-by-one, adding diversity bonuses for:
   - New role categories not yet in team
   - Unique roles not duplicated
   - New skills not covered by team
3. Ensures a balanced team with different expertise areas

## AI Chat Assistant

The platform includes an AI-powered chat assistant that helps users:

- **Find suitable contests** based on their skills and interests
- **Discover potential teammates** with complementary skills
- **Get started** with step-by-step guidance

### Features:
- **RAG (Retrieval Augmented Generation)**: AI queries the database for relevant contests, users, and team posts before responding
- **Personalization**: Responses are tailored based on user's profile (skills, role, preferences)
- **Rate limiting**: Protects against abuse (10 messages/minute per IP, 50 messages/hour per user)
- **Conversation history**: Maintains context within a chat session

### Setup:
1. Get an API key from [OpenRouter](https://openrouter.ai)
2. Add `OPENROUTER_API_KEY` to your `.env` file
3. (Optional) Set `CHAT_MODELS` to override the fallback order

## Notification System

The app includes automatic email notifications:

- **Contest Reminders:** Automatically sent 24h and 1h before contest starts to registered users
- **Course Updates:** Sent when new lessons or materials are added to a course
- **Announcements:** Admin can send system-wide announcements

Users can control their notification preferences in Settings > Notifications:
- Email notifications (on/off)
- Contest reminders
- Course updates  
- Marketing emails

## Seed/Migrate data
1. Ensure `.env` has `DATABASE_URL` (example: `postgresql://user:pass@host:26257/ContestHub?sslmode=verify-full`).
2. Run migration to insert/update sample users, contests, and courses:
   `npm run seed`
   - Creates default admin `admin@contesthub.dev` (password `Admin123!`) and student `student@contesthub.dev` (password `Student123!`).
   - Upserts demo contests and courses with timestamps so the frontend can be wired to the API easily.
3. (Optional) Populate a larger demo dataset (users/contests/courses/team posts/registrations/enrollments/reviews/reports):
   - `npm run seed:large`
   - Reset + re-generate: `npm run seed:large:reset`
