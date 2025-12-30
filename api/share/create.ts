import { requireAuth } from '../lib/auth.js';
import { createShareLink, getFileById, getShareLinkByShareId } from '../lib/models.js';
import { readJsonBody, handleCors, jsonResponse } from '../lib/utils.js';

// Generate a short, URL-safe share ID
function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default async function handler(req: Request): Promise<Response> {
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // Require authentication
    const user = await requireAuth(req);

    const body = await readJsonBody(req) as {
      fileId?: string;
      arweaveUrl?: string;
    };

    if (!body.fileId && !body.arweaveUrl) {
      return jsonResponse({ error: 'Missing fileId or arweaveUrl in request body' }, 400);
    }

    // If fileId is provided, verify the file exists and belongs to the user
    let arweaveUrl: string;
    let fileId: string;

    if (body.fileId) {
      // Get file to verify ownership and get arweaveUrl
      console.log('[SHARE] Looking up file with ID:', body.fileId);
      const file = await getFileById(body.fileId);
      console.log('[SHARE] File lookup result:', file ? `found file: ${file.originalFileName}` : 'file not found');
      if (!file) {
        console.log('[SHARE] File not found for ID:', body.fileId);
        return jsonResponse({ error: 'File not found' }, 404);
      }
      if (file.userId !== user.userId) {
        console.log('[SHARE] File userId mismatch:', file.userId, 'vs', user.userId);
        return jsonResponse({ error: 'Unauthorized' }, 403);
      }
      arweaveUrl = file.arweaveUrl;
      fileId = body.fileId;
    } else {
      // If only arweaveUrl is provided, we need to find the file
      // For now, we'll allow creating share links for any arweaveUrl if user is authenticated
      // In the future, we might want to verify the file belongs to the user
      arweaveUrl = body.arweaveUrl!;
      fileId = 'external-' + Date.now(); // Temporary ID for external files
    }

    // Generate unique share ID
    let shareId: string;
    let attempts = 0;
    do {
      shareId = generateShareId();
      attempts++;
      if (attempts > 10) {
        return jsonResponse({ error: 'Failed to generate unique share ID' }, 500);
      }
    } while (await getShareLinkByShareId(shareId) !== null);

    // Create share link
    const shareLink = await createShareLink({
      userId: user.userId,
      fileId: fileId,
      shareId: shareId,
      arweaveUrl: arweaveUrl,
    });

    // Get base URL for share link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');

    const shareUrl = `${baseUrl}/api/share/${shareId}`;

    return jsonResponse({
      success: true,
      data: {
        shareId: shareLink.shareId,
        shareUrl: shareUrl,
        arweaveUrl: shareLink.arweaveUrl,
      },
    });
  } catch (error) {
    console.error('Create share link error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return jsonResponse({ error: 'Authentication required' }, 401);
    }

    return jsonResponse({ error: 'Failed to create share link' }, 500);
  }
}

