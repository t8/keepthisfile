import { requireAuth } from '../lib/auth.js';
import { uploadToArweave } from '../lib/arweave.js';
import { createFile, getUploadRequestBySessionId, updateUploadRequestStatus } from '../lib/models.js';
import { refundPaymentForFailedUpload, attachArweaveTxToPayment } from '../lib/stripe.js';
import { MAX_FILE_BYTES } from '../lib/constants.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[UPLOAD-PAID] Request received:', { method: req.method });
  
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
    console.log('[UPLOAD-PAID] User authenticated:', user.email);

    // Parse JSON body - Vercel automatically parses JSON bodies
    const body = req.body as {
      fileData?: string;
      fileName?: string;
      mimeType?: string;
      sessionId?: string;
    };
    
    console.log('[UPLOAD-PAID] Body received, has fileData:', !!body?.fileData);
    
    if (!body?.fileData || !body?.fileName || !body?.sessionId) {
      return res.status(400).json({ error: 'Missing fileData, fileName, or sessionId in request body' });
    }

    sessionId = body.sessionId;

    // Decode base64 to buffer
    let fileBuffer: Buffer;
    try {
      // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
      const base64Data = body.fileData.includes(',') 
        ? body.fileData.split(',')[1] 
        : body.fileData;
      fileBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      console.error('[UPLOAD-PAID] Failed to decode base64:', error);
      return res.status(400).json({ error: 'Invalid base64 file data' });
    }

    const fileSize = fileBuffer.length;
    const mimeType = body.mimeType || 'application/octet-stream';
    const fileName = body.fileName;

    // Validate file size
    if (fileSize > MAX_FILE_BYTES) {
      return res.status(400).json({ 
        error: `File too large. Maximum size is ${MAX_FILE_BYTES / (1024 * 1024)}MB` 
      });
    }

    // Verify payment was completed
    console.log('[UPLOAD-PAID] Verifying payment session:', sessionId);
    uploadRequest = await getUploadRequestBySessionId(sessionId);
    
    if (!uploadRequest) {
      return res.status(404).json({ error: 'Upload request not found' });
    }

    if (uploadRequest.userId !== user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (uploadRequest.status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Verify file size matches expected size (allow small variance)
    const sizeVariance = Math.abs(fileSize - uploadRequest.expectedSizeBytes);
    if (sizeVariance > 1024) { // Allow 1KB variance
      return res.status(400).json({ error: 'File size does not match expected size' });
    }

    // Upload to Arweave (will use wallet for files > 100KB)
    console.log('[UPLOAD-PAID] Uploading to Arweave...');
    let txId: string;
    let arweaveUrl: string;
    let fileRecord;
    
    try {
      const uploadResult = await uploadToArweave(
        fileBuffer,
        mimeType,
        fileName
      );
      txId = uploadResult.txId;
      arweaveUrl = uploadResult.arweaveUrl;
      console.log('[UPLOAD-PAID] Upload completed:', { txId, arweaveUrl });

      // Save file record
      console.log('[UPLOAD-PAID] Saving file record...');
      fileRecord = await createFile({
        userId: user.userId,
        arweaveTxId: txId,
        arweaveUrl,
        sizeBytes: fileSize,
        mimeType: mimeType,
        originalFileName: fileName,
      });
      console.log('[UPLOAD-PAID] File record saved:', fileRecord._id);

      // Update upload request status to uploaded with Arweave tx ID
      await updateUploadRequestStatus(uploadRequest._id!, 'uploaded', txId);

      // Attach Arweave tx ID to the Stripe PaymentIntent metadata
      if (sessionId) {
        await attachArweaveTxToPayment(sessionId, txId);
      }

      return res.status(200).json({
        success: true,
        data: {
          file: {
            id: fileRecord._id,
            txId,
            arweaveUrl,
            sizeBytes: fileSize,
            fileName: fileName,
          },
        },
      });
    } catch (uploadError) {
      console.error('[UPLOAD-PAID] Upload failed:', uploadError);
      
      // Payment was completed but upload failed - issue refund
      console.log('[UPLOAD-PAID] Payment was completed but upload failed. Issuing refund...');
      const refund = await refundPaymentForFailedUpload(sessionId);
      
      if (refund) {
        console.log('[UPLOAD-PAID] Refund issued successfully:', refund.id);
        // Update status to failed
        if (uploadRequest?._id) {
          await updateUploadRequestStatus(uploadRequest._id, 'failed');
        }
        
        return res.status(500).json({ 
          error: 'Upload failed. Your payment has been refunded. Please try again.',
          refundId: refund.id,
        });
      } else {
        console.error('[UPLOAD-PAID] Failed to issue refund. Manual intervention may be required.');
        // Update status to failed even if refund didn't work
        if (uploadRequest?._id) {
          await updateUploadRequestStatus(uploadRequest._id, 'failed');
        }
        
        return res.status(500).json({ 
          error: 'Upload failed. Please contact support for a refund. Your payment will be refunded.',
        });
      }
    }
  } catch (error) {
    console.error('[UPLOAD-PAID] Error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // If we have a sessionId and payment was completed, try to refund
    if (sessionId && uploadRequest?.status === 'paid') {
      console.log('[UPLOAD-PAID] Attempting refund due to error...');
      const refund = await refundPaymentForFailedUpload(sessionId);
      if (refund) {
        console.log('[UPLOAD-PAID] Refund issued due to error:', refund.id);
        if (uploadRequest?._id) {
          await updateUploadRequestStatus(uploadRequest._id, 'failed');
        }
        return res.status(500).json({ 
          error: 'Upload failed. Your payment has been refunded. Please try again.',
          refundId: refund.id,
        });
      }
    }

    return res.status(500).json({ error: 'Failed to upload file' });
  }
}
