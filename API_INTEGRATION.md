# Frontend-Backend Integration Guide

## API Base URL Configuration

The frontend uses `/api` as the base path for all API calls. This works in two scenarios:

### Production (Vercel)
- API routes are served from the same domain
- `/api/*` routes are handled by Vercel serverless functions
- No configuration needed

### Local Development
- Option 1: Use `vercel dev` - API routes work automatically
- Option 2: Use Vite proxy (configured in `vite.config.ts`)
  - Frontend runs on `http://localhost:5173`
  - API proxy forwards to `http://localhost:3000`
  - Run `vercel dev --listen 3000` for API server

## Frontend API Client

The API client is located in `src/lib/api.ts` and provides:

- **Authentication**: `requestMagicLink()`, `getCurrentUser()`
- **Uploads**: `uploadFree()`, `uploadPaid()`, `createUploadSession()`
- **Files**: `getUserFiles()`
- **Token Management**: `setAuthToken()`, `getAuthToken()`, `clearAuthToken()`

## Authentication Flow

1. User clicks "Sign In" → Opens `AuthModal`
2. User enters email → Calls `POST /api/auth/magic-link/request`
3. User receives email with magic link
4. User clicks link → Redirects to `/api/auth/magic-link/verify?token=...`
5. Backend verifies token, creates/logs in user, redirects with auth token
6. Frontend receives token in URL → Stores in localStorage
7. `AuthModal` detects token → Calls `onLogin()` callback
8. App updates auth state → User is logged in

## Upload Flow

### Free Upload (≤100KB)
1. User selects file
2. Checks authentication → If not authenticated, prompts to sign in
3. `UploadVault.handleFileSelect()` checks file size
4. If ≤100KB → Calls `uploadFree(file)` (login required)
5. Backend uploads to Arweave
6. Returns `{ txId, arweaveUrl }`
7. Frontend displays success with Arweave URL

### Paid Upload (>100KB)
1. User selects file
2. Checks authentication → If not authenticated, shows error
3. If authenticated → Calls `createUploadSession(fileSize)`
4. Backend creates Stripe checkout session
5. Returns `{ sessionId, url }`
6. Frontend redirects to Stripe checkout URL
7. User completes payment
8. Stripe redirects back with `session_id`
9. Frontend calls `uploadPaid(file, sessionId)`
10. Backend verifies payment, uploads to Arweave
11. Returns success with Arweave URL

## Error Handling

All API functions return:
```typescript
{
  success?: boolean;
  error?: string;
  data?: T;
}
```

Frontend components should check for `error` field and display appropriate messages.

## Token Storage

- Tokens are stored in `localStorage` as `auth-token`
- Sent in `Authorization: Bearer <token>` header
- Also checked in cookies (for server-side rendering compatibility)

## File Size Validation

- Frontend: `FREE_MAX_BYTES` constant (100KB)
- Backend: Enforced in API routes
- Both frontend and backend validate to prevent unnecessary API calls

## Component Integration Points

### App.tsx
- Manages global auth state
- Shows/hides `AuthModal`
- Updates auth state on login/logout

### UploadVault.tsx
- Handles file selection
- Routes to free/paid upload based on size
- Checks authentication before paid uploads
- Displays upload progress and results

### AuthModal.tsx
- Handles magic link request
- Detects token from URL (magic link redirect)
- Stores token and notifies parent

## Testing API Integration

1. **Free Upload Test**:
   - Sign in first (login required for all uploads)
   - Select file <100KB
   - Should upload without payment
   - Should show Arweave URL on success

2. **Paid Upload Test**:
   - Sign in first
   - Select file >100KB
   - Should redirect to Stripe
   - Complete payment
   - Should upload and show Arweave URL

3. **Authentication Test**:
   - Click "Sign In"
   - Enter email
   - Check email for magic link
   - Click link
   - Should be logged in

4. **Error Handling Test**:
   - Try uploading without auth (large file)
   - Should show error message
   - Try uploading invalid file
   - Should show appropriate error

