import { requireAuth } from '../lib/auth.js';
import { uploadToArweave } from '../lib/arweave.js';
import { createFile, getUploadRequestBySessionId, updateUploadRequestStatus } from '../lib/models.js';
import { MAX_FILE_BYTES } from '../lib/constants.js';
import { readJsonBody } from '../lib/utils.js';

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

    // Parse JSON body with base64 file data
    const body = await readJsonBody(req) as {
      fileData?: string;
      fileName?: string;
      mimeType?: string;
      sessionId?: string;
    };
    
    if (!body.fileData || !body.fileName || !body.sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing fileData, fileName, or sessionId in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sessionId = body.sessionId;

    // Decode base64 to buffer
    let fileBuffer: Buffer;
    try {
      // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
      const base64Data = body.fileData.includes(',') 
        ? body.fileData.split(',')[1] 
        : body.fileData;
      fileBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      console.error('Failed to decode base64:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid base64 file data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fileSize = fileBuffer.length;
    const mimeType = body.mimeType || 'application/octet-stream';
    const fileName = body.fileName;

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
      mimeType,
      fileName
    );

    // Save file record
    const fileRecord = await createFile({
      userId: user.userId,
      arweaveTxId: txId,
      arweaveUrl,
      sizeBytes: fileSize,
      mimeType: mimeType,
      originalFileName: fileName,
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
            fileName: fileName,
          },
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
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

