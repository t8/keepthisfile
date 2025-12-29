import { loginOrCreateUser } from '../../lib/auth.js';
import jwt from 'jsonwebtoken';
import type { IncomingMessage } from 'http';

type VercelRequest = Request | IncomingMessage;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper to get frontend URL
function getFrontendUrl(): string {
  // In local development, always use localhost:5173 for frontend
  const isLocalDev = process.env.NODE_ENV === 'development' || 
                     (process.env.VERCEL_URL && process.env.VERCEL_URL.includes('localhost')) ||
                     (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.includes('localhost:3000'));
  
  if (isLocalDev) {
    return 'http://localhost:5173';
  }
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return 'http://localhost:5173';
}

export default async function handler(req: VercelRequest): Promise<Response> {
  const method = req instanceof Request ? req.method : (req as IncomingMessage).method;
  
  if (method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Construct full URL from request - handle both Request and IncomingMessage
    let url: URL;
    if (req instanceof Request) {
      url = new URL(req.url);
    } else {
      const host = (req as IncomingMessage).headers.host || 'localhost:3000';
      const protocol = (req as IncomingMessage).headers['x-forwarded-proto'] || 'http';
      const path = (req as IncomingMessage).url || '/';
      url = new URL(path, `${protocol}://${host}`);
    }
    
    const token = url.searchParams.get('token');
    if (!token) {
      const frontendUrl = getFrontendUrl();
      return Response.redirect(`${frontendUrl}?auth_error=Invalid verification link`, 302);
    }

    // Verify the magic link token
    let decoded: { email: string; type?: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { email: string; type?: string };
    } catch (error) {
      const frontendUrl = getFrontendUrl();
      return Response.redirect(`${frontendUrl}?auth_error=Link expired or invalid`, 302);
    }

    if (!decoded.email || decoded.type !== 'magic-link') {
      const frontendUrl = getFrontendUrl();
      return Response.redirect(`${frontendUrl}?auth_error=Invalid token`, 302);
    }

    // Create/login user and get auth token
    const { token: authToken } = await loginOrCreateUser(decoded.email);

    // Redirect to frontend with auth token
    const frontendUrl = getFrontendUrl();
    const redirectUrl = `${frontendUrl}?token=${authToken}`;
    
    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error('Magic link verify error:', error);
    const frontendUrl = getFrontendUrl();
    return new Response(null, {
      status: 302,
      headers: { 'Location': `${frontendUrl}?auth_error=Verification failed` },
    });
  }
}

