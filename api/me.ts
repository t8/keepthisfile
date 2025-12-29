import { getCurrentUser } from './lib/auth.js';
import { getUserByEmail } from './lib/models.js';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return new Response(
        JSON.stringify({ authenticated: false, user: null }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const userDoc = await getUserByEmail(user.email);
    
    return new Response(
      JSON.stringify({
        authenticated: true,
        user: {
          email: user.email,
          userId: user.userId,
          createdAt: userDoc?.createdAt,
          lastLoginAt: userDoc?.lastLoginAt,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Get me error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get user info' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

