# CLAUDE.md - AI Agent Context File

This file provides context for AI agents working on this codebase.

## Project Overview

**KeepThisFile** - A full-stack app for permanent file storage on Arweave blockchain with magic link authentication and Stripe payments.

**Core Value Prop:** Upload files once, store them forever on decentralized storage. Free for small files (≤100KB), paid for larger files.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Backend | Vercel Serverless Functions (Node.js 20+) |
| Database | MongoDB (Atlas) |
| Storage | Arweave blockchain, Ar.IO Turbo SDK |
| Auth | JWT + Magic Links (passwordless) |
| Payments | Stripe Checkout + Webhooks |
| Icons | Lucide React |
| Validation | Zod |
| Routing | React Router DOM v7 |

## Directory Structure

```
├── api/                    # Vercel serverless API routes
│   ├── auth/magic-link/    # Magic link auth endpoints
│   │   ├── request.ts      # POST - send magic link email
│   │   └── verify.ts       # GET - verify token, create session
│   ├── upload/             # File upload endpoints
│   │   ├── free.ts         # POST - upload ≤100KB (60s timeout)
│   │   ├── paid.ts         # POST - upload after payment (60s timeout)
│   │   └── success.ts      # GET - verify payment status
│   ├── payments/           # Stripe payment endpoints
│   │   ├── create-upload-session.ts  # POST - create checkout (30s timeout)
│   │   └── refund.ts       # POST - request refund
│   ├── files/              # File management endpoints
│   │   ├── index.ts        # GET - list user files (paginated)
│   │   └── link.ts         # POST - link anonymous uploads to user
│   ├── stripe/webhook.ts   # Stripe webhook handler
│   ├── me.ts               # Current user endpoint
│   └── lib/                # Shared backend utilities
│       ├── db.ts           # MongoDB connection (3-5s timeouts)
│       ├── models.ts       # Database models/queries
│       ├── auth.ts         # JWT utilities
│       ├── arweave.ts      # Arweave upload logic (Turbo + direct)
│       ├── stripe.ts       # Stripe utilities + pricing
│       ├── email.ts        # Email sending (Nodemailer)
│       ├── constants.ts    # File size limits (FREE_MAX_BYTES, MAX_FILE_BYTES)
│       └── utils.ts        # Utility functions
├── src/                    # React frontend
│   ├── components/         # React components
│   │   ├── UploadVault.tsx      # Main upload orchestrator (IndexedDB persistence)
│   │   ├── UploadZone.tsx       # Drag-and-drop upload zone
│   │   ├── UploadProgress.tsx   # Upload progress bar
│   │   ├── FilePreview.tsx      # Preview file before upload
│   │   ├── AuthModal.tsx        # Magic link login modal
│   │   ├── FileLibrary.tsx      # User's uploaded files list
│   │   ├── FileCard.tsx         # Individual file display card
│   │   ├── ShareMenu.tsx        # File sharing menu
│   │   ├── ShareOptions.tsx     # Sharing UI (copy link, QR, etc.)
│   │   ├── FAQ.tsx              # FAQ section
│   │   ├── Footer.tsx           # Site footer
│   │   ├── GridBackground.tsx   # Animated background
│   │   ├── TermsOfService.tsx   # Terms modal
│   │   └── AnalyticsTracker.tsx # GA4 route change tracking
│   ├── lib/
│   │   ├── api.ts          # API client (all fetch calls)
│   │   └── constants.ts    # Frontend constants (file size limits)
│   ├── utils/analytics.ts  # GA4 event tracking
│   ├── contexts/ErrorContext.tsx  # Centralized error handling
│   ├── App.tsx             # Root component with routing
│   └── index.tsx           # Entry point
├── vercel.json             # Vercel production config
├── vercel-dev.json         # Vercel local dev config (used by dev:vercel)
└── package.json
```

## Key API Routes

| Route | Method | Purpose | Auth | Response Format |
|-------|--------|---------|------|----------------|
| `/api/auth/magic-link/request` | POST | Send magic link email | No | `{ success }` |
| `/api/auth/magic-link/verify` | GET | Verify token, create session | No | HTML page (sets localStorage) |
| `/api/me` | GET | Get current user | Yes | `{ authenticated, user }` |
| `/api/upload/free` | POST | Upload ≤100KB file | Yes | `{ success, arweaveUrl, arweaveTxId }` |
| `/api/upload/paid` | POST | Upload after payment | Yes | `{ success, arweaveUrl, arweaveTxId }` |
| `/api/upload/success` | GET | Verify payment status | Optional | `{ status, uploadRequest }` |
| `/api/payments/create-upload-session` | POST | Create Stripe checkout | Yes | `{ url, sessionId }` |
| `/api/payments/refund` | POST | Request refund | Yes | `{ success }` |
| `/api/files` | GET | List user's files (paginated) | Yes | `{ success, files, pagination }` |
| `/api/files/link` | POST | Link anonymous uploads | Yes | `{ success }` |
| `/api/stripe/webhook` | POST | Handle `checkout.session.completed` | No | `{ received }` |

## Data Models

```typescript
// User - stored in 'users' collection
interface User {
  _id?: string;
  email: string;
  authProvider: 'magic-link';
  createdAt: Date;
  lastLoginAt?: Date;
}

// File - stored in 'files' collection
interface File {
  _id?: string;
  userId: string | null;      // null = anonymous upload
  arweaveTxId: string;
  arweaveUrl: string;
  sizeBytes: number;
  mimeType: string;
  originalFileName: string;
  createdAt: Date;
}

// UploadRequest - stored in 'uploadRequests' collection
interface UploadRequest {
  _id?: string;
  userId: string;
  expectedSizeBytes: number;
  stripeSessionId?: string;
  paymentIntentId?: string;
  arweaveTxId?: string;
  status: 'pending' | 'paid' | 'uploaded' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}
```

## Authentication Flow

1. User enters email → `POST /api/auth/magic-link/request`
2. Backend validates email (Zod), generates JWT token (15min expiry)
3. Sends email with magic link via SMTP (8s timeout)
4. User clicks link → `GET /api/auth/magic-link/verify?token=...`
5. Backend creates/finds user, returns HTML page that sets session JWT (7 day expiry) in `localStorage['auth-token']` and cookie
6. All auth'd requests use `Authorization: Bearer <token>` header

## Upload Flow

**Free (≤100KB):**
1. `POST /api/upload/free` with base64 file
2. Upload via Ar.IO Turbo (free bundling service)
3. Save metadata to MongoDB

**Paid (>100KB, ≤3MB):**
1. `POST /api/payments/create-upload-session` → Stripe checkout URL
2. File stored in IndexedDB on client during payment flow
3. User pays on Stripe
4. Webhook updates uploadRequest status to 'paid'
5. `GET /api/upload/success` verifies payment (queries Stripe directly, not just webhook)
6. File retrieved from IndexedDB
7. `POST /api/upload/paid` uploads file
8. On upload failure → automatic refund via Stripe, status set to 'failed'

## File Encoding

Files are sent as base64 JSON, not multipart:
```typescript
{
  file: "data:image/png;base64,iVBORw0KGgo...",
  fileName: "image.png"
}
```

**Note:** Base64 adds ~33% overhead. Combined with Vercel's 4.5MB body limit, the effective max file size is ~3MB.

## Arweave Upload Strategy

- **Free uploads (≤100KB):** Uses Turbo SDK (free tier, instant bundling)
- **Paid uploads (>100KB):** Uses direct Arweave wallet upload
- Fresh Turbo SDK instance per request to avoid connection issues

## Environment Variables

```bash
# Required
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<random-string>
ARWEAVE_KEY_JSON={"kty":"RSA",...}  # Stringified wallet JSON
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SMTP (for magic links)
SMTP_HOST=smtp.gmail.com          # default
SMTP_PORT=587                      # default
SMTP_USER=email@gmail.com
SMTP_PASS=app-password
SMTP_FROM=email@gmail.com

# Stripe pricing (optional, with defaults)
STRIPE_PRICE_PER_MB_USD=0.05      # default
STRIPE_MIN_PRICE_USD=1.00         # default

# App
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
MAX_FILE_BYTES=3145728             # 3MB default (env var overrides)
```

## Important Gotchas

1. **CORS**: Manually set on all responses (not using middleware)
2. **Vercel rewrites**: Must exclude `@`, `src/`, `node_modules/` for Vite dev
3. **Vercel body limit**: 4.5MB request body limit; with base64 overhead, max file ~3MB
4. **Webhook timing**: Not guaranteed fast, so `/api/upload/success` queries Stripe directly
5. **Base64 overhead**: +33% payload size, memory pressure on large files
6. **No rate limiting**: Consider adding for production
7. **Turbo SDK**: Fresh instance per request to avoid connection issues
8. **MongoDB timeouts**: Aggressive 3-5s timeouts for serverless cold starts
9. **IndexedDB**: Used in UploadVault to persist file data during Stripe payment redirect
10. **Auto-refunds**: Failed paid uploads trigger automatic Stripe refunds
11. **Local dev config**: Uses `vercel-dev.json` (separate from production `vercel.json`)

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server (frontend only)
npm run dev:vercel   # Full dev with API routes (uses vercel-dev.json)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint
```

## Pricing

- Free tier: ≤100KB
- Paid tier: $0.05/MB (minimum $1.00), configurable via env vars
- Max file: 3MB (limited by Vercel body size + base64 overhead)

## Logging Prefixes

Server logs use prefixes for filtering:
- `[AUTH]` - Authentication
- `[UPLOAD-FREE]` / `[UPLOAD-PAID]` - Uploads
- `[STRIPE-REFUND]` - Refunds
- `[WEBHOOK]` - Stripe webhooks

## Planned: Large File Support

See `PLAN-large-file-uploads.md` for the full architecture plan. Summary:
- Direct client-to-Arweave uploads via Turbo credit sharing
- Bypasses Vercel body size limit entirely
- Two new endpoints: `/api/upload/authorize` and `/api/upload/confirm`
- Temporary wallet JWK generation + scoped credit sharing
- Would support 100MB+ files
- Status: **Not yet implemented**

## Testing Locally

1. Copy `env.example` to `.env.local`
2. Set up MongoDB Atlas (free tier works)
3. Create Arweave wallet at arweave.app
4. Use Stripe test keys
5. Run `npm run dev:vercel` (not `npm run dev` — that's frontend only)
