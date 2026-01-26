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

## Directory Structure

```
├── api/                    # Vercel serverless API routes
│   ├── auth/magic-link/    # Magic link auth endpoints
│   ├── upload/             # File upload endpoints
│   ├── payments/           # Stripe payment endpoints
│   ├── files/              # File management endpoints
│   ├── stripe/webhook.ts   # Stripe webhook handler
│   ├── me.ts               # Current user endpoint
│   └── lib/                # Shared backend utilities
│       ├── db.ts           # MongoDB connection
│       ├── models.ts       # Database models/queries
│       ├── auth.ts         # JWT utilities
│       ├── arweave.ts      # Arweave upload logic
│       ├── stripe.ts       # Stripe utilities
│       └── email.ts        # Email sending
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── lib/api.ts          # API client
│   ├── utils/analytics.ts  # GA tracking
│   └── contexts/           # React contexts
├── vercel.json             # Vercel config with rewrites
└── package.json
```

## Key API Routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/auth/magic-link/request` | POST | Send magic link email | No |
| `/api/auth/magic-link/verify` | GET | Verify token, create session | No |
| `/api/me` | GET | Get current user | Yes |
| `/api/upload/free` | POST | Upload ≤100KB file | Yes |
| `/api/upload/paid` | POST | Upload after payment | Yes |
| `/api/upload/success` | GET | Verify payment status | Yes |
| `/api/payments/create-upload-session` | POST | Create Stripe checkout | Yes |
| `/api/payments/refund` | POST | Request refund | Yes |
| `/api/files` | GET | List user's files | Yes |
| `/api/files/link` | POST | Link anonymous uploads | Yes |
| `/api/stripe/webhook` | POST | Stripe events | No |

## Data Models

```typescript
// User - stored in 'users' collection
interface User {
  _id: ObjectId;
  email: string;
  authProvider: 'magic-link';
  createdAt: Date;
  lastLoginAt?: Date;
}

// File - stored in 'files' collection
interface File {
  _id: ObjectId;
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
  _id: ObjectId;
  userId: string;
  expectedSizeBytes: number;
  stripeSessionId?: string;
  paymentIntentId?: string;
  status: 'pending' | 'paid' | 'uploaded' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}
```

## Authentication Flow

1. User enters email → `POST /api/auth/magic-link/request`
2. Backend sends email with JWT token (15min expiry)
3. User clicks link → `GET /api/auth/magic-link/verify?token=...`
4. Backend creates/finds user, returns session JWT (7 day expiry)
5. Token stored in `localStorage['auth-token']` and cookie
6. All auth'd requests use `Authorization: Bearer <token>` header

## Upload Flow

**Free (≤100KB):**
1. `POST /api/upload/free` with base64 file
2. Upload via Ar.IO Turbo (free bundling service)
3. Save metadata to MongoDB

**Paid (>100KB):**
1. `POST /api/payments/create-upload-session` → Stripe checkout URL
2. User pays on Stripe
3. Webhook updates uploadRequest status to 'paid'
4. `GET /api/upload/success` verifies payment
5. `POST /api/upload/paid` uploads file
6. On failure → automatic refund via Stripe

## File Encoding

Files are sent as base64 JSON, not multipart:
```typescript
{
  file: "data:image/png;base64,iVBORw0KGgo...",
  fileName: "image.png"
}
```

## Environment Variables

```bash
# Required
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<random-string>
ARWEAVE_KEY_JSON={"kty":"RSA",...}  # Stringified wallet JSON

# SMTP (for magic links)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app-password
SMTP_FROM=email@gmail.com

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
MAX_FILE_BYTES=26214400  # 25MB
```

## Important Gotchas

1. **CORS**: Manually set on all responses (not using middleware)
2. **Vercel rewrites**: Must exclude `@`, `src/`, `node_modules/` for Vite dev
3. **Webhook timing**: Not guaranteed fast, so `/api/upload/success` queries Stripe directly
4. **Base64 overhead**: +33% payload size, memory pressure on large files
5. **No rate limiting**: Consider adding for production
6. **Turbo SDK**: Fresh instance per request to avoid connection issues
7. **MongoDB timeouts**: Aggressive 3-5s timeouts for serverless

## Key Components

| Component | Purpose |
|-----------|---------|
| `UploadVault.tsx` | Main upload UI, handles free/paid flows |
| `AuthModal.tsx` | Magic link login modal |
| `FileLibrary.tsx` | Display user's uploaded files |
| `AnalyticsTracker.tsx` | GA4 route change tracking |

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server (frontend only)
vercel dev           # Full dev with API routes
npm run build        # Production build
```

## Pricing

- Free tier: ≤100KB
- Paid tier: $0.05/MB (minimum $1.00)
- Max file: 25MB

## Logging Prefixes

Server logs use prefixes for filtering:
- `[AUTH]` - Authentication
- `[UPLOAD-FREE]` / `[UPLOAD-PAID]` - Uploads
- `[STRIPE-REFUND]` - Refunds
- `[WEBHOOK]` - Stripe webhooks

## Testing Locally

1. Copy `env.example` to `.env.local`
2. Set up MongoDB Atlas (free tier works)
3. Create Arweave wallet at arweave.app
4. Use Stripe test keys
5. Run `vercel dev` (not `npm run dev` for API routes)
