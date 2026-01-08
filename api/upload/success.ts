import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCurrentUser } from '../lib/auth.js';
import { getUploadRequestBySessionId, updateUploadRequestStatus } from '../lib/models.js';
import { stripe } from '../lib/stripe.js';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[UPLOAD-SUCCESS] Request received:', { method: req.method, query: req.query });
  
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionId = req.query.session_id as string;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session_id parameter' });
    }

    console.log('[UPLOAD-SUCCESS] Verifying session:', sessionId);
    
    // Check Stripe session status directly (more reliable than waiting for webhook)
    console.log('[UPLOAD-SUCCESS] Checking Stripe session status...');
    let stripeSession;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
      console.log('[UPLOAD-SUCCESS] Stripe session status:', stripeSession.payment_status, stripeSession.status);
    } catch (error) {
      console.error('[UPLOAD-SUCCESS] Failed to retrieve Stripe session:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[UPLOAD-SUCCESS] Stripe error details:', errorMessage);
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    // Get upload request
    let uploadRequest;
    try {
      uploadRequest = await getUploadRequestBySessionId(sessionId);
    } catch (error) {
      console.error('[UPLOAD-SUCCESS] Failed to get upload request:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[UPLOAD-SUCCESS] Database error details:', errorMessage);
      return res.status(500).json({ error: 'Failed to retrieve upload request' });
    }
    
    if (!uploadRequest) {
      console.error('[UPLOAD-SUCCESS] Upload request not found for session:', sessionId);
      return res.status(404).json({ error: 'Upload request not found' });
    }

    // Check authentication (optional - user might not be logged in yet)
    let user = null;
    try {
      user = await getCurrentUser(req);
    } catch (error) {
      console.log('[UPLOAD-SUCCESS] No authentication provided');
    }

    // Verify user matches (if authenticated)
    if (user && uploadRequest.userId !== user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Determine payment status from Stripe session
    const isPaid = stripeSession.payment_status === 'paid' && stripeSession.status === 'complete';
    
    // Update database if payment is confirmed but status is still pending
    if (isPaid && uploadRequest.status === 'pending') {
      console.log('[UPLOAD-SUCCESS] Payment confirmed, updating database status...');
      try {
        if (!uploadRequest._id) {
          console.error('[UPLOAD-SUCCESS] Upload request missing _id');
          return res.status(500).json({ error: 'Invalid upload request data' });
        }
        await updateUploadRequestStatus(uploadRequest._id, 'paid');
        uploadRequest.status = 'paid';
      } catch (error) {
        console.error('[UPLOAD-SUCCESS] Failed to update upload request status:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[UPLOAD-SUCCESS] Update error details:', errorMessage);
        // Don't fail the request if status update fails - payment is still confirmed
      }
    }

    // Return upload request info with actual payment status
    const responseData = {
      success: true,
      data: {
        sessionId: uploadRequest.stripeSessionId || sessionId,
        status: isPaid ? 'paid' : uploadRequest.status,
        expectedSizeBytes: uploadRequest.expectedSizeBytes,
        userId: uploadRequest.userId,
        paymentStatus: stripeSession.payment_status,
        stripeStatus: stripeSession.status,
      },
    };

    console.log('[UPLOAD-SUCCESS] Returning upload request info');
    
    // Return JSON response (frontend will handle redirect)
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('[UPLOAD-SUCCESS] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[UPLOAD-SUCCESS] Error message:', errorMessage);
    console.error('[UPLOAD-SUCCESS] Error stack:', errorStack);
    return res.status(500).json({ 
      error: 'Failed to verify upload session',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}

