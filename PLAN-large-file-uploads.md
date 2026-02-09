# Plan: Large File Upload Support via Direct Client-to-Arweave Uploads

## Problem

Files are currently sent as base64 JSON through Vercel serverless functions, which have a
4.5MB request body limit. After base64 overhead (+33%) and JSON envelope, the real max file
size is ~3MB. To support larger uploads, file data must bypass the serverless function entirely.

## Solution: Turbo Credit Sharing + Temporary Wallets

The Turbo SDK supports **credit sharing** — the server's master wallet shares a scoped,
time-limited amount of upload credits with a freshly generated disposable wallet. The client
receives the disposable wallet's JWK and uploads directly to Turbo, paying with the master
wallet's shared credits via the `paidBy` parameter.

File data never touches the serverless function. The server only handles auth, payment, and
metadata — all small JSON payloads.

## Architecture

```
Client                      Server                       Turbo/Arweave
  |                            |                              |
  |-- POST /upload/authorize ->|                              |
  |   { fileName, fileSize,   |-- generate temp JWK          |
  |     mimeType, sessionId } |-- shareCredits() ----------->|
  |                            |   (master -> temp wallet,    |
  |                            |    scoped amount, 10min TTL) |
  |<- { tempJwk, masterAddr } |                              |
  |                            |                              |
  |-- turbo.uploadFile() ----------------------------------->|
  |   (signed with temp JWK,                                  |
  |    paidBy: [masterAddr])                                  |
  |<- { id: arweaveTxId }                                     |
  |                            |                              |
  |-- POST /upload/confirm --->|                              |
  |   { arweaveTxId, fileSize, |-- verify tx exists on Arweave|
  |     fileName, sessionId }  |-- save File record to DB     |
  |                            |-- revokeCredits() ---------->|
  |                            |   (reclaim unused credits)   |
  |<- { success, arweaveUrl } |                              |
```

## New API Endpoints

### `POST /api/upload/authorize`
- **Auth:** Required
- **Input:** `{ fileName, fileSize, mimeType, sessionId }` (sessionId from Stripe payment)
- **Logic:**
  1. Verify payment via existing `uploadRequest` (status must be `paid`)
  2. Generate a temporary Arweave JWK: `await arweave.wallets.generate()`
  3. Calculate required Turbo credits for `fileSize` (query Turbo pricing + buffer)
  4. Call `masterTurbo.shareCredits({ approvedAddress: tempAddr, approvedWincAmount, expiresBySeconds: 600 })`
  5. Store `tempWalletAddress` on the `uploadRequest` document
  6. Return `{ tempJwk, masterAddress, expiresAt }`
- **Body size:** Small JSON (~2KB), well within Vercel limits

### `POST /api/upload/confirm`
- **Auth:** Required
- **Input:** `{ arweaveTxId, fileName, fileSize, mimeType, sessionId }`
- **Logic:**
  1. Verify the `uploadRequest` exists, belongs to user, status is `paid`
  2. Verify the Arweave transaction actually exists (query arweave.net or Turbo)
  3. Verify transaction tags match expectations (App-Name, Content-Type, size)
  4. Create `File` record in MongoDB
  5. Update `uploadRequest` status to `uploaded`, store `arweaveTxId`
  6. Attach Arweave tx to Stripe PaymentIntent metadata (existing `attachArweaveTxToPayment`)
  7. Revoke remaining shared credits: `masterTurbo.revokeCredits({ revokedAddress: tempAddr })`
  8. Return `{ success, arweaveUrl }`
- **Body size:** Small JSON, well within Vercel limits

## Model Changes

### `UploadRequest` — add fields:
```typescript
interface UploadRequest {
  // ... existing fields ...
  tempWalletAddress?: string;   // disposable wallet address for direct upload
  creditShareExpiry?: Date;     // when the shared credits expire
}
```

## Client-Side Changes

### Vite config — add polyfills:
```bash
npm install --save-dev vite-plugin-node-polyfills
```
```typescript
// vite.config.ts
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
});
```

### New client upload function (`src/lib/api.ts`):
```typescript
import { TurboFactory, ArweaveSigner } from '@ardrive/turbo-sdk/web';

export async function uploadDirect(
  file: File,
  sessionId: string,
  onProgress?: (pct: number) => void
) {
  // 1. Get temp wallet from server
  const authResp = await fetch('/api/upload/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType: file.type, sessionId }),
  });
  const { tempJwk, masterAddress } = await authResp.json();

  // 2. Upload directly to Turbo
  const signer = new ArweaveSigner(tempJwk);
  const turbo = TurboFactory.authenticated({ signer });

  const result = await turbo.uploadFile({
    fileStreamFactory: () => file.stream(),
    fileSizeFactory: () => file.size,
    paidBy: [masterAddress],
    dataItemOpts: {
      tags: [
        { name: 'Content-Type', value: file.type || 'application/octet-stream' },
        { name: 'App-Name', value: 'KeepThisFile' },
        { name: 'Original-Filename', value: file.name },
      ],
    },
  });

  // 3. Confirm upload with server
  const confirmResp = await fetch('/api/upload/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      arweaveTxId: result.id,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      sessionId,
    }),
  });

  return await confirmResp.json();
}
```

### `UploadVault.tsx` — update paid upload flow:
- Replace `uploadPaid()` call with `uploadDirect()` for paid uploads
- Wire Turbo SDK's `onProgress` callback to the progress bar instead of simulating
- Free uploads (<=100KB) continue using the existing server-side path unchanged

## Security Considerations

**What a leaked temp JWK gives an attacker:**
- A wallet with zero AR balance (freshly generated)
- Access to scoped, time-limited Turbo credits (enough for one file, expires in 10 min)
- Ability to upload data to Arweave at your expense (capped at shared credit amount)

**What it does NOT give:**
- Master wallet private key
- Ability to spend more credits than shared
- Ability to re-delegate credits to other wallets
- Access after expiration/revocation

**Mitigations:**
- Keep `expiresBySeconds` short (600s / 10 minutes)
- Share only enough credits for the specific file size + small buffer
- Revoke credits immediately after upload confirmation
- Rate-limit `/api/upload/authorize` (1-2 requests per user per minute)
- Verify reported `arweaveTxId` actually exists with expected tags/size before saving
- Tie authorization to the authenticated user session

## Max File Size After Migration

With direct uploads, the file never passes through Vercel. The new limits become:
- **Turbo:** No hard per-file limit documented; practically tested up to hundreds of MB
- **Browser memory:** `file.stream()` is used (not base64), so files are streamed without
  loading entirely into memory
- **Arweave wallet balance:** Must have enough AR/credits to cover the upload cost
- **Practical recommendation:** Set MAX_FILE_BYTES to 100MB-500MB depending on your wallet
  funding and pricing model

## Implementation Order

1. Install `vite-plugin-node-polyfills`, configure Vite
2. Verify `ArweaveSigner` works in the browser with polyfills (spike/prototype)
3. Ensure master wallet has Turbo credits (`topUpWithTokens` or fund via Turbo dashboard)
4. Build `POST /api/upload/authorize` endpoint
5. Build `POST /api/upload/confirm` endpoint
6. Build client-side `uploadDirect()` function
7. Update `UploadVault.tsx` to use `uploadDirect()` for paid uploads
8. Update `MAX_FILE_BYTES` to new limit (e.g. 100MB)
9. Update pricing logic if needed for larger files
10. Test end-to-end with files of various sizes
11. Remove old `POST /api/upload/paid` endpoint (or keep as fallback)

## References

- [Turbo SDK docs](https://docs.ar.io/sdks/turbo-sdk)
- [Turbo credit sharing](https://docs.ar.io/sdks/turbo-sdk/turbo-credit-sharing/)
- [Turbo in browser (Next.js)](https://docs.ar.io/build/guides/using-turbo-in-a-browser/nextjs)
- [Advanced uploading with Turbo](https://docs.ar.io/build/upload/advanced-uploading-with-turbo)
- [Vercel body size limit](https://vercel.com/docs/functions/limitations)
