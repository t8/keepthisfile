import { sendMagicLink } from '../../lib/email.js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { readJsonBody, handleCors, jsonResponse } from '../../lib/utils.js';

const requestSchema = z.object({
  email: z.string().email(),
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Timeout wrapper for email sending
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Email sending timeout')), timeoutMs)
    ),
  ]);
}

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await readJsonBody(req);
    const { email } = requestSchema.parse(body);

    console.log('Magic link request for email:', email);

    // Generate a temporary token for the magic link (expires in 15 minutes)
    // This token only contains the email, not a user ID
    const tempToken = jwt.sign(
      { email, type: 'magic-link' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    console.log('Token generated, sending email...');
    
    // Send magic link email with 10 second timeout
    try {
      await withTimeout(sendMagicLink(email, tempToken), 10000);
      console.log('Email sent successfully');
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Still return success to user (email might have been sent)
      // In production, you might want to log this to a monitoring service
    }

    return jsonResponse({ 
      success: true, 
      message: 'Magic link sent to your email' 
    });
  } catch (error) {
    console.error('Magic link request error:', error);
    
    if (error instanceof z.ZodError) {
      return jsonResponse({ error: 'Invalid email address' }, 400);
    }

    if (error instanceof Error && error.message === 'Email sending timeout') {
      return jsonResponse({ error: 'Email service timeout. Please try again.' }, 504);
    }

    return jsonResponse({ error: 'Failed to send magic link' }, 500);
  }
}

