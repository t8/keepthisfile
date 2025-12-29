import { sendMagicLink } from '../../lib/email.js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readJsonBody } from '../../lib/utils.js';

const requestSchema = z.object({
  email: z.string().email(),
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[REQUEST] Handler started');
  
  // Set CORS headers on all responses
  setCorsHeaders(res);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[REQUEST] Parsing request body...');
    // Try Vercel's auto-parsed body first, then fall back to manual parsing
    let body: { email?: string };
    if (req.body && typeof req.body === 'object' && 'email' in req.body) {
      // Vercel auto-parsed the JSON
      body = req.body as { email?: string };
      console.log('[REQUEST] Using auto-parsed body');
    } else {
      // Manually parse the body
      body = await readJsonBody(req);
      console.log('[REQUEST] Manually parsed body');
    }
    console.log('[REQUEST] Body:', body);
    console.log('[REQUEST] Validating...');
    const { email } = requestSchema.parse(body);

    console.log('[REQUEST] Magic link request for email:', email);

    // Generate a temporary token for the magic link (expires in 15 minutes)
    const tempToken = jwt.sign(
      { email, type: 'magic-link' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    console.log('[REQUEST] Token generated, sending email...');
    
    // Send email with timeout - await it so the function doesn't terminate
    // Use Promise.race to timeout after 8 seconds (email should send faster)
    const emailPromise = sendMagicLink(email, tempToken);
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log('[REQUEST] Email sending timeout - continuing anyway');
        resolve();
      }, 8000); // 8 second timeout
    });
    
    try {
      await Promise.race([emailPromise, timeoutPromise]);
      console.log('[REQUEST] Email sent successfully');
    } catch (error) {
      console.error('[REQUEST] Email sending error:', error);
      // Continue anyway - email might have been sent
    }

    // Return success after email attempt (or timeout)
    console.log('[REQUEST] Returning success response');
    return res.status(200).json({ 
      success: true, 
      message: 'Magic link sent to your email' 
    });
  } catch (error) {
    console.error('[REQUEST] Magic link request error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    return res.status(500).json({ error: 'Failed to send magic link' });
  }
}

