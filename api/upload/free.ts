import { uploadToArweave } from '../lib/arweave.js';
import { createFile } from '../lib/models.js';
import { FREE_MAX_BYTES, MAX_FILE_BYTES } from '../lib/constants.js';
import { parseMultipartFormData } from '../lib/multipart.js';
import { jsonResponse } from '../lib/utils.js';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('Parsing multipart form data...');
    const parseResult = await parseMultipartFormData(req);
    console.log('Multipart parsing complete, file:', parseResult.file ? 'present' : 'missing');
    const { file } = parseResult;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fileSize = file.size;
    const fileBuffer = file.buffer;

    // Enforce size limits
    if (fileSize > MAX_FILE_BYTES) {
      return new Response(
        JSON.stringify({ 
          error: `File too large. Maximum size is ${MAX_FILE_BYTES / (1024 * 1024)}MB` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (fileSize > FREE_MAX_BYTES) {
      return new Response(
        JSON.stringify({ 
          error: 'File exceeds free tier limit. Please use the paid upload endpoint.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Upload to Arweave
    console.log('Starting upload to Arweave...');
    const { txId, arweaveUrl } = await uploadToArweave(
      fileBuffer,
      file.mimetype,
      file.originalFilename
    );
    console.log('Upload completed:', { txId, arweaveUrl });

    // Prepare response body
    const responseBody = {
      success: true,
      data: {
        file: {
          id: 'temp-' + Date.now(),
          txId,
          arweaveUrl,
          sizeBytes: fileSize,
          fileName: file.originalFilename,
        },
      },
    };
    
    // Save to DB first (quick operation), then return response
    // This ensures everything is ready before sending response
    let fileRecordId = 'temp-' + Date.now();
    try {
      const fileRecord = await createFile({
        userId: null,
        arweaveTxId: txId,
        arweaveUrl,
        sizeBytes: fileSize,
        mimeType: file.mimetype,
        originalFileName: file.originalFilename,
      });
      fileRecordId = fileRecord._id || fileRecordId;
      console.log('File record saved:', fileRecordId);
    } catch (dbError: any) {
      console.error('Database save error (non-critical):', dbError?.message);
      // Continue with temp ID
    }

    // Update response with actual file ID
    responseBody.data.file.id = fileRecordId;
    
    console.log('Returning success response with file data');
    const response = jsonResponse(responseBody, 200);
    console.log('Response created, status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    return response;
  } catch (error: any) {
    console.error('Free upload error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Failed to upload file',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

