import { getShareLinkByShareId } from '../lib/models.js';
import { handleCors, jsonResponse } from '../lib/utils.js';

export default async function handler(req: Request): Promise<Response> {
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // Extract shareId from URL path
    // For Vercel dynamic routes, the shareId is in the pathname
    const url = new URL(req.url);
    // Path will be like /api/share/abc123
    const pathMatch = url.pathname.match(/\/api\/share\/([^/]+)$/) || url.pathname.match(/\/share\/([^/]+)$/);
    const shareId = pathMatch ? pathMatch[1] : null;

    if (!shareId || shareId === '[shareId]') {
      return jsonResponse({ error: 'Missing shareId' }, 400);
    }

    // Get share link from database
    const shareLink = await getShareLinkByShareId(shareId);

    if (!shareLink) {
      return jsonResponse({ error: 'Share link not found' }, 404);
    }

    // Redirect to Arweave URL
    return new Response(null, {
      status: 302,
      headers: {
        'Location': shareLink.arweaveUrl,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Get share link error:', error);
    return jsonResponse({ error: 'Failed to get share link' }, 500);
  }
}

