import { requireAuth } from '../lib/auth.js';
import { createUploadRequest } from '../lib/models.js';
import { stripe, calculatePrice } from '../lib/stripe.js';
import { FREE_MAX_BYTES, MAX_FILE_BYTES } from '../lib/constants.js';
import { z } from 'zod';
import { readJsonBody } from '../lib/utils.js';

const requestSchema = z.object({
  sizeBytes: z.number().int().positive(),
});

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Require authentication
    const user = await requireAuth(req);

    const body = await readJsonBody(req);
    const { sizeBytes } = requestSchema.parse(body);

    // Validate file size
    if (sizeBytes <= FREE_MAX_BYTES) {
      return new Response(
        JSON.stringify({ 
          error: 'File is within free tier. Use /api/upload/free endpoint.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (sizeBytes > MAX_FILE_BYTES) {
      return new Response(
        JSON.stringify({ 
          error: `File too large. Maximum size is ${MAX_FILE_BYTES / (1024 * 1024)}MB` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate price
    const amount = calculatePrice(sizeBytes);

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Arweave File Upload',
              description: `Upload ${(sizeBytes / (1024 * 1024)).toFixed(2)}MB to Arweave`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/upload/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/upload/cancel`,
      metadata: {
        userId: user.userId,
        sizeBytes: sizeBytes.toString(),
      },
    });

    // Create upload request record
    await createUploadRequest({
      userId: user.userId,
      expectedSizeBytes: sizeBytes,
      stripeSessionId: session.id,
      status: 'pending',
    });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        url: session.url,
        amount: amount / 100, // Convert cents to dollars
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Create upload session error:', error);

  if (error instanceof Error && error.message === 'Unauthorized') {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({ error: 'Invalid request data' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

    return new Response(
      JSON.stringify({ error: 'Failed to create payment session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

