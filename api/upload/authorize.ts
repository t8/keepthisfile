import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../lib/auth.js';
import { getUploadRequestBySessionId, updateUploadRequestTempWallet } from '../lib/models.js';
import {
  generateTempWallet,
  getMasterWalletAddress,
  shareCreditsWithTempWallet,
  getUploadCostInWinc,
} from '../lib/arweave.js';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[UPLOAD-AUTHORIZE] Request received:', { method: req.method });

  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require authentication
    const user = await requireAuth(req);
    console.log('[UPLOAD-AUTHORIZE] User authenticated:', user.email);

    const body = req.body as {
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      sessionId?: string;
    };

    if (!body?.fileName || !body?.fileSize || !body?.sessionId) {
      return res.status(400).json({ error: 'Missing fileName, fileSize, or sessionId' });
    }

    const { fileName, fileSize, mimeType, sessionId } = body;

    // Verify payment via uploadRequest
    console.log('[UPLOAD-AUTHORIZE] Verifying payment session:', sessionId);
    const uploadRequest = await getUploadRequestBySessionId(sessionId);

    if (!uploadRequest) {
      return res.status(404).json({ error: 'Upload request not found' });
    }

    if (uploadRequest.userId !== user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (uploadRequest.status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Verify file size roughly matches expected (allow some variance)
    const sizeVariance = Math.abs(fileSize - uploadRequest.expectedSizeBytes);
    if (sizeVariance > 1024) {
      return res.status(400).json({ error: 'File size does not match expected size' });
    }

    // Generate a temporary wallet
    console.log('[UPLOAD-AUTHORIZE] Generating temp wallet...');
    const { jwk: tempJwk, address: tempAddress } = await generateTempWallet();
    console.log('[UPLOAD-AUTHORIZE] Temp wallet generated:', tempAddress);

    // Calculate required Turbo credits
    console.log('[UPLOAD-AUTHORIZE] Calculating upload cost for', fileSize, 'bytes...');
    const approvedWincAmount = await getUploadCostInWinc(fileSize);
    console.log('[UPLOAD-AUTHORIZE] Approved winc amount:', approvedWincAmount);

    // Share credits from master wallet to temp wallet
    const CREDIT_SHARE_TTL_SECONDS = 600; // 10 minutes
    console.log('[UPLOAD-AUTHORIZE] Sharing credits with temp wallet...');
    await shareCreditsWithTempWallet(tempAddress, approvedWincAmount, CREDIT_SHARE_TTL_SECONDS);

    // Get master wallet address for paidBy param
    const masterAddress = await getMasterWalletAddress();

    // Store temp wallet info on the upload request
    const expiresAt = new Date(Date.now() + CREDIT_SHARE_TTL_SECONDS * 1000);
    await updateUploadRequestTempWallet(uploadRequest._id!, tempAddress, expiresAt);

    console.log('[UPLOAD-AUTHORIZE] Authorization complete, returning temp JWK');

    return res.status(200).json({
      success: true,
      data: {
        tempJwk,
        masterAddress,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[UPLOAD-AUTHORIZE] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    return res.status(500).json({ error: 'Failed to authorize upload' });
  }
}
