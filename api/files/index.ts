import { requireAuth } from '../lib/auth';
import { getFilesByUserId } from '../lib/models';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Require authentication
    const user = await requireAuth(req);

    // Get user's files
    const files = await getFilesByUserId(user.userId);

    return new Response(
      JSON.stringify({
        success: true,
        files: files.map(file => ({
          id: file._id,
          arweaveTxId: file.arweaveTxId,
          arweaveUrl: file.arweaveUrl,
          sizeBytes: file.sizeBytes,
          mimeType: file.mimeType,
          originalFileName: file.originalFileName,
          createdAt: file.createdAt,
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Get files error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to get files' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

