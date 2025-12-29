import { uploadToArweave } from '../lib/arweave.js';
import { createFile } from '../lib/models.js';
import { FREE_MAX_BYTES, MAX_FILE_BYTES } from '../lib/constants.js';
import { readJsonBody } from '../lib/utils.js';

export default async function handler(req: Request): Promise<Response> {
  console.log('Handler called, method:', req.method);
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse JSON body with base64 file data
    const body = await readJsonBody(req) as {
      fileData?: string;
      fileName?: string;
      mimeType?: string;
    };
    console.log('Request body received, has fileData:', !!body.fileData);
    
    if (!body.fileData || !body.fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing fileData or fileName in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

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
      mimeType,
      fileName
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
          fileName: fileName,
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
        mimeType: mimeType,
        originalFileName: fileName,
      });
      fileRecordId = fileRecord._id || fileRecordId;
      console.log('File record saved:', fileRecordId);
    } catch (dbError: any) {
      console.error('Database save error (non-critical):', dbError?.message);
      // Continue with temp ID
    }

    // Update response with actual file ID
    responseBody.data.file.id = fileRecordId;
    
    console.log('Preparing response body:', JSON.stringify(responseBody));
    const responseBodyString = JSON.stringify(responseBody);
    console.log('Response body stringified, length:', responseBodyString.length);
    
    // Create response directly (simpler, might work better)
    const response = new Response(responseBodyString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': responseBodyString.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
    
    console.log('Response created directly, status:', response.status);
    console.log('Response OK:', response.ok);
    console.log('Response bodyUsed:', response.bodyUsed);
    
    // Return immediately
    console.log('Returning response now - all operations complete');
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

