import { requireAuth } from '../lib/auth.js';
import { createUploadRequest } from '../lib/models.js';
import { stripe, calculatePrice } from '../lib/stripe.js';
import { getBaseUrlFromRequest } from '../lib/email.js';
import { FREE_MAX_BYTES, MAX_FILE_BYTES } from '../lib/constants.js';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const requestSchema = z.object({
  sizeBytes: z.number().int().positive(),
});

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[CREATE-UPLOAD-SESSION] Request received:', { method: req.method });
  
  // Set CORS headers on all responses
  setCorsHeaders(res);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[CREATE-UPLOAD-SESSION] Starting authentication...');
    // Require authentication
    const user = await requireAuth(req);
    console.log('[CREATE-UPLOAD-SESSION] User authenticated:', user.email);

    // Parse request body - Vercel automatically parses JSON bodies
    const body = req.body as { sizeBytes?: number };
    console.log('[CREATE-UPLOAD-SESSION] Body received, sizeBytes:', body?.sizeBytes);
    
    const { sizeBytes } = requestSchema.parse(body);
    console.log('[CREATE-UPLOAD-SESSION] Validated sizeBytes:', sizeBytes);

    // Validate file size
    if (sizeBytes <= FREE_MAX_BYTES) {
      return res.status(400).json({ 
        error: 'File is within free tier. Use /api/upload/free endpoint.' 
      });
    }

    if (sizeBytes > MAX_FILE_BYTES) {
      return res.status(400).json({ 
        error: `File too large. Maximum size is ${MAX_FILE_BYTES / (1024 * 1024)}MB` 
      });
    }

    // Calculate price
    console.log('[CREATE-UPLOAD-SESSION] Calculating price...');
    const amount = calculatePrice(sizeBytes);
    console.log('[CREATE-UPLOAD-SESSION] Price calculated:', amount, 'cents');

    // Get base URL for redirects - detect from request headers to ensure localhost stays localhost
    let baseUrl = getBaseUrlFromRequest(req.headers);
    
    // If we're on localhost, always use port 3000 (Vercel dev server port) for redirects
    // This ensures the redirect goes to the frontend dev server, not the API proxy port
    if (baseUrl.includes('localhost')) {
      // Normalize to localhost:3000 for local development (Vercel dev)
      baseUrl = 'http://localhost:3000';
    }
    
    console.log('[CREATE-UPLOAD-SESSION] Base URL (final):', baseUrl);
    console.log('[CREATE-UPLOAD-SESSION] Request headers:', {
      host: req.headers.host,
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-host': req.headers['x-forwarded-host'],
    });

    // Create Stripe Checkout Session
    console.log('[CREATE-UPLOAD-SESSION] Creating Stripe checkout session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'KeepThisFile Upload',
              description: `Upload ${(sizeBytes / (1024 * 1024)).toFixed(2)}MB to Arweave`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?payment_cancelled=true`,
      metadata: {
        userId: user.userId,
        sizeBytes: sizeBytes.toString(),
      },
    });
    console.log('[CREATE-UPLOAD-SESSION] Stripe session created:', session.id);

    // Create upload request record
    console.log('[CREATE-UPLOAD-SESSION] Creating upload request record...');
    await createUploadRequest({
      userId: user.userId,
      expectedSizeBytes: sizeBytes,
      stripeSessionId: session.id,
      status: 'pending',
    });
    console.log('[CREATE-UPLOAD-SESSION] Upload request record created');

    console.log('[CREATE-UPLOAD-SESSION] Returning success response');
    const responseData = {
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
        amount: amount / 100, // Convert cents to dollars
      },
    };
    console.log('[CREATE-UPLOAD-SESSION] Response data:', JSON.stringify(responseData));
    
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('[CREATE-UPLOAD-SESSION] Error:', error);
    console.error('[CREATE-UPLOAD-SESSION] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (error instanceof z.ZodError) {
      console.error('[CREATE-UPLOAD-SESSION] Validation error:', error.errors);
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create payment session';
    return res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
    });
  }
}
