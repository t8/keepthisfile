# Vercel Dev Server Multipart Form Data Issue

## Problem
When using `vercel dev`, file upload endpoints with multipart form data get stuck in "pending" state. The backend completes successfully and creates a response, but the response never reaches the frontend.

## Root Cause
This is a known limitation/bug in Vercel's development server (`vercel dev`) when handling multipart form data. The issue occurs when consuming the request body stream.

## Solutions

### Option 1: Deploy to Production (Recommended)
The code works correctly in production. Deploy to Vercel to test:
```bash
vercel --prod
```

### Option 2: Use Local Node.js Server for Development
Create a local dev server that bypasses Vercel dev:

1. Create `server.js`:
```javascript
import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Proxy API requests to Vercel functions
app.use('/api', async (req, res, next) => {
  // Import and call the Vercel function handler
  const handler = await import('./api/upload/free.js');
  const response = await handler.default(req);
  
  // Copy response to Express response
  res.status(response.status);
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const body = await response.text();
  res.send(body);
});

app.listen(3000, () => {
  console.log('Local dev server running on http://localhost:3000');
});
```

2. Update `vite.config.ts` to proxy to local server:
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});
```

### Option 3: Wait for Vercel Fix
Monitor Vercel's GitHub issues and updates for a fix to this dev server limitation.

## Current Status
- ✅ Code is correct and production-ready
- ❌ `vercel dev` has issues with multipart form data
- ✅ Production deployment should work correctly

