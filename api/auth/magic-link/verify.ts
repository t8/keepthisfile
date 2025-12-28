import { loginOrCreateUser } from '../../lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
      return Response.redirect(`${frontendUrl}?auth_error=Invalid verification link`);
    }

    // Verify the magic link token
    let decoded: { email: string; type?: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { email: string; type?: string };
    } catch (error) {
      const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
      return Response.redirect(`${frontendUrl}?auth_error=Link expired or invalid`);
    }

    if (!decoded.email || decoded.type !== 'magic-link') {
      const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
      return Response.redirect(`${frontendUrl}?auth_error=Invalid token`);
    }

    // Create/login user and get auth token
    const { token: authToken } = await loginOrCreateUser(decoded.email);

    // Redirect to frontend with auth token
    const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
    
    const redirectUrl = `${frontendUrl}?token=${authToken}`;
    
    return Response.redirect(redirectUrl);
  } catch (error) {
    console.error('Magic link verify error:', error);
    const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
    return Response.redirect(`${frontendUrl}?auth_error=Verification failed`);
  }
}

