import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCurrentUser } from '../lib/auth.js';
import { linkFilesToUser } from '../lib/models.js';
import { z } from 'zod';

const linkFilesSchema = z.object({
  arweaveUrls: z.array(z.string().url()).min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[LINK FILES] Request received:', { method: req.method, url: req.url });
  
  if (req.method !== 'POST') {
    console.log('[LINK FILES] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[LINK FILES] Checking authentication...');
    const user = await getCurrentUser(req);
    console.log('[LINK FILES] getCurrentUser result:', user ? `user: ${user.email}` : 'null');
    
    if (!user) {
      console.log('[LINK FILES] Unauthorized - no user');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('[LINK FILES] User authenticated:', user.email, 'userId:', user.userId);

    // Parse and validate request body
    const body = req.body as { arweaveUrls?: string[] };
    const validated = linkFilesSchema.parse(body);
    console.log('[LINK FILES] Linking', validated.arweaveUrls.length, 'files to user');

    // Link files to user
    const linkedCount = await linkFilesToUser(validated.arweaveUrls, user.userId);
    console.log('[LINK FILES] Linked', linkedCount, 'files to user');

    return res.status(200).json({
      success: true,
      linkedCount,
    });
  } catch (error) {
    console.error('[LINK FILES] Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    return res.status(500).json({ error: 'Failed to link files' });
  }
}

