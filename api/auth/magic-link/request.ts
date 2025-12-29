import { sendMagicLink } from '../../lib/email.js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const requestSchema = z.object({
  email: z.string().email(),
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { email } = requestSchema.parse(body);

    // Generate a temporary token for the magic link (expires in 15 minutes)
    // This token only contains the email, not a user ID
    const tempToken = jwt.sign(
      { email, type: 'magic-link' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    // Send magic link email
    await sendMagicLink(email, tempToken);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Magic link sent to your email' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Magic link request error:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to send magic link' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

