import { getCurrentUser } from './lib/auth.js';
import { getUserByEmail } from './lib/models.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[ME] Checking authentication...');
    console.log('[ME] Request headers:', {
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
    });
    
    const user = await getCurrentUser(req);
    console.log('[ME] getCurrentUser result:', user ? `user: ${user.email}` : 'null');
    
    if (!user) {
      return res.status(200).json({ authenticated: false, user: null });
    }

    const userDoc = await getUserByEmail(user.email);
    console.log('[ME] User doc found:', !!userDoc);
    
    return res.status(200).json({
      authenticated: true,
      user: {
        email: user.email,
        userId: user.userId,
        createdAt: userDoc?.createdAt,
        lastLoginAt: userDoc?.lastLoginAt,
      },
    });
  } catch (error) {
    console.error('[ME] Get me error:', error);
    return res.status(500).json({ error: 'Failed to get user info' });
  }
}

