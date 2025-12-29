import { requireAuth } from '../lib/auth.js';
import { uploadToArweave } from '../lib/arweave.js';
import { createFile, getUploadRequestBySessionId, updateUploadRequestStatus } from '../lib/models.js';
import { MAX_FILE_BYTES } from '../lib/constants.js';
import { parseMultipartFormData } from '../lib/multipart.js';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Require authentication
    const user = await requireAuth(req);

    const { file, fields } = await parseMultipartFormData(req);
    const sessionId = fields.sessionId;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fileSize = file.size;
    const fileBuffer = file.buffer;

    // Validate file size
    if (fileSize > MAX_FILE_BYTES) {
      return new Response(
        JSON.stringify({ 
          error: `File too large. Maximum size is ${MAX_FILE_BYTES / (1024 * 1024)}MB` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment was completed
    const uploadRequest = await getUploadRequestBySessionId(sessionId);
    
    if (!uploadRequest) {
      return new Response(
        JSON.stringify({ error: 'Upload request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (uploadRequest.userId !== user.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (uploadRequest.status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Payment not completed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify file size matches expected size (allow small variance)
    const sizeVariance = Math.abs(fileSize - uploadRequest.expectedSizeBytes);
    if (sizeVariance > 1024) { // Allow 1KB variance
      return new Response(
        JSON.stringify({ error: 'File size does not match expected size' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Upload to Arweave
    const { txId, arweaveUrl } = await uploadToArweave(
      fileBuffer,
      file.mimetype,
      file.originalFilename
    );

    // Save file record
    const fileRecord = await createFile({
      userId: user.userId,
      arweaveTxId: txId,
      arweaveUrl,
      sizeBytes: fileSize,
      mimeType: file.mimetype,
      originalFileName: file.originalFilename,
    });

    // Update upload request status
    await updateUploadRequestStatus(uploadRequest._id!, 'uploaded');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          file: {
            id: fileRecord._id,
            txId,
            arweaveUrl,
            sizeBytes: fileSize,
            fileName: file.originalFilename,
          },
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Paid upload error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to upload file' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

