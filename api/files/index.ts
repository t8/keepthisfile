import { getFilesByUserId } from '../lib/models.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCurrentUser } from '../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[FILES] Request received:', { method: req.method, url: req.url });
  
  if (req.method !== 'GET') {
    console.log('[FILES] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[FILES] Checking authentication...');
    console.log('[FILES] Request headers:', {
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
    });
    
    // Require authentication - use getCurrentUser to match me.ts pattern
    const user = await getCurrentUser(req);
    console.log('[FILES] getCurrentUser result:', user ? `user: ${user.email}` : 'null');
    
    if (!user) {
      console.log('[FILES] Unauthorized - no user');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('[FILES] User authenticated:', user.email, 'userId:', user.userId);

    // Get user's files
    console.log('[FILES] Fetching files for userId:', user.userId);
    const files = await getFilesByUserId(user.userId);
    console.log('[FILES] Found files:', files.length);

    const responseData = {
      success: true,
      files: files.map(file => ({
        id: file._id?.toString() || file._id, // Ensure ID is a string
        arweaveTxId: file.arweaveTxId,
        arweaveUrl: file.arweaveUrl,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType,
        originalFileName: file.originalFileName,
        createdAt: file.createdAt,
      })),
    };

    console.log('[FILES] Returning response with', responseData.files.length, 'files');
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('[FILES] Get files error:', error);
    console.error('[FILES] Error details:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      console.log('[FILES] Unauthorized access');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('[FILES] Returning 500 error response');
    return res.status(500).json({ error: 'Failed to get files' });
  }
}

