import { requireAuth } from '../lib/auth.js';
import { refundPaymentForFailedUpload, stripe } from '../lib/stripe.js';
import { getUploadRequestBySessionId, updateUploadRequestStatus } from '../lib/models.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[REFUND] Request received:', { method: req.method });
  
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
    console.log('[REFUND] User authenticated:', user.email);

    // Parse request body
    const body = req.body as { sessionId?: string };
    
    if (!body?.sessionId) {
      return res.status(400).json({ error: 'Missing sessionId in request body' });
    }

    const sessionId = body.sessionId;

    // Verify the upload request belongs to this user
    const uploadRequest = await getUploadRequestBySessionId(sessionId);
    
    if (!uploadRequest) {
      return res.status(404).json({ error: 'Upload request not found' });
    }

    if (uploadRequest.userId !== user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if payment was actually completed
    let stripeSession;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error('[REFUND] Failed to retrieve Stripe session:', error);
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const isPaid = stripeSession.payment_status === 'paid' && stripeSession.status === 'complete';
    
    if (!isPaid) {
      return res.status(400).json({ error: 'Payment not completed. No refund needed.' });
    }

    // Check if already refunded or uploaded
    if (uploadRequest.status === 'uploaded') {
      return res.status(400).json({ error: 'Upload already completed. Refund not available.' });
    }

    // Issue refund
    console.log('[REFUND] Issuing refund for session:', sessionId);
    const refund = await refundPaymentForFailedUpload(sessionId);
    
    if (refund) {
      console.log('[REFUND] Refund issued successfully:', refund.id);
      // Update status to failed
      await updateUploadRequestStatus(uploadRequest._id!, 'failed');
      
      return res.status(200).json({
        success: true,
        data: {
          refundId: refund.id,
          amount: refund.amount,
          status: refund.status,
        },
      });
    } else {
      console.error('[REFUND] Failed to issue refund. Manual intervention may be required.');
      return res.status(500).json({ 
        error: 'Failed to issue refund. Please contact support.',
      });
    }
  } catch (error) {
    console.error('[REFUND] Error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to process refund';
    return res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
    });
  }
}

