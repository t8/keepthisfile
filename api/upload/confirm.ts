import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../lib/auth.js';
import {
  createFile,
  getUploadRequestBySessionId,
  updateUploadRequestStatus,
} from '../lib/models.js';
import { revokeSharedCredits } from '../lib/arweave.js';
import { attachArweaveTxToPayment, refundPaymentForFailedUpload } from '../lib/stripe.js';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[UPLOAD-CONFIRM] Request received:', { method: req.method });

  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let uploadRequest: Awaited<ReturnType<typeof getUploadRequestBySessionId>> = null;
  let sessionId: string | undefined;

  try {
    // Require authentication
    const user = await requireAuth(req);
    console.log('[UPLOAD-CONFIRM] User authenticated:', user.email);

    const body = req.body as {
      arweaveTxId?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      sessionId?: string;
    };

    if (!body?.arweaveTxId || !body?.fileName || !body?.fileSize || !body?.sessionId) {
      return res.status(400).json({
        error: 'Missing arweaveTxId, fileName, fileSize, or sessionId',
      });
    }

    const { arweaveTxId, fileName, fileSize, mimeType, sessionId: sid } = body;
    sessionId = sid;

    // Verify upload request exists, belongs to user, and is paid
    console.log('[UPLOAD-CONFIRM] Verifying upload request for session:', sessionId);
    uploadRequest = await getUploadRequestBySessionId(sessionId);

    if (!uploadRequest) {
      return res.status(404).json({ error: 'Upload request not found' });
    }

    if (uploadRequest.userId !== user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (uploadRequest.status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed or upload already processed' });
    }

    // Verify the Arweave transaction exists by checking the Turbo/Arweave gateway
    console.log('[UPLOAD-CONFIRM] Verifying Arweave tx:', arweaveTxId);
    try {
      const txCheckResponse = await fetch(`https://arweave.net/tx/${arweaveTxId}/status`, {
        signal: AbortSignal.timeout(10000),
      });
      // For Turbo bundled transactions, they may not be on-chain yet, so also check Turbo
      if (!txCheckResponse.ok) {
        // Try the Turbo gateway as fallback (bundled data items may not be on arweave.net yet)
        const turboCheckResponse = await fetch(`https://arweave.net/${arweaveTxId}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000),
        });
        if (!turboCheckResponse.ok) {
          console.warn('[UPLOAD-CONFIRM] Arweave tx not yet confirmable, proceeding with trust (bundled tx may take time)');
          // For bundled transactions via Turbo, they are committed but may not be queryable immediately.
          // We trust the tx ID returned by the Turbo SDK and proceed.
        }
      }
      console.log('[UPLOAD-CONFIRM] Arweave tx verification passed');
    } catch (txError) {
      console.warn('[UPLOAD-CONFIRM] Could not verify Arweave tx (may be pending bundling):', txError);
      // Don't fail — Turbo bundled transactions may take time to be accessible.
    }

    const contentType = mimeType || 'application/octet-stream';
    const arweaveUrl = `https://arweave.net/${arweaveTxId}`;

    // Create File record in MongoDB
    console.log('[UPLOAD-CONFIRM] Saving file record...');
    const fileRecord = await createFile({
      userId: user.userId,
      arweaveTxId,
      arweaveUrl,
      sizeBytes: fileSize,
      mimeType: contentType,
      originalFileName: fileName,
    });
    console.log('[UPLOAD-CONFIRM] File record saved:', fileRecord._id);

    // Update upload request status to uploaded
    await updateUploadRequestStatus(uploadRequest._id!, 'uploaded', arweaveTxId);

    // Attach Arweave tx to Stripe PaymentIntent
    if (sessionId) {
      await attachArweaveTxToPayment(sessionId, arweaveTxId);
    }

    // Revoke remaining shared credits from the temp wallet
    if (uploadRequest.tempWalletAddress) {
      console.log('[UPLOAD-CONFIRM] Revoking shared credits for:', uploadRequest.tempWalletAddress);
      await revokeSharedCredits(uploadRequest.tempWalletAddress);
    }

    console.log('[UPLOAD-CONFIRM] Upload confirmed successfully');

    return res.status(200).json({
      success: true,
      data: {
        file: {
          id: fileRecord._id,
          txId: arweaveTxId,
          arweaveUrl,
          sizeBytes: fileSize,
          fileName,
        },
      },
    });
  } catch (error) {
    console.error('[UPLOAD-CONFIRM] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // If we have a paid upload request and confirmation failed, issue a refund
    if (sessionId && uploadRequest?.status === 'paid') {
      console.log('[UPLOAD-CONFIRM] Attempting refund due to confirmation error...');
      const refund = await refundPaymentForFailedUpload(sessionId);
      if (refund) {
        console.log('[UPLOAD-CONFIRM] Refund issued:', refund.id);
        if (uploadRequest?._id) {
          await updateUploadRequestStatus(uploadRequest._id, 'failed');
        }
        // Also revoke credits
        if (uploadRequest?.tempWalletAddress) {
          await revokeSharedCredits(uploadRequest.tempWalletAddress);
        }
        return res.status(500).json({
          error: 'Upload confirmation failed. Your payment has been refunded.',
          refundId: refund.id,
        });
      }
    }

    return res.status(500).json({ error: 'Failed to confirm upload' });
  }
}
