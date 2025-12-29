import type { VercelRequest, VercelResponse } from '@vercel/node';
import { uploadToArweave } from '../lib/arweave.js';
import { createFile } from '../lib/models.js';
import { FREE_MAX_BYTES, MAX_FILE_BYTES } from '../lib/constants.js';

// Force Node.js runtime since we use Node.js APIs like Buffer
export const config = {
  maxDuration: 60,
};

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Handler called, method:', req.method);
  
  // Set CORS headers on all responses
  setCorsHeaders(res);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse JSON body - Vercel automatically parses JSON bodies
    const body = req.body as {
      fileData?: string;
      fileName?: string;
      mimeType?: string;
    };
    console.log('Request body received, has fileData:', !!body?.fileData);
    
    if (!body?.fileData || !body?.fileName) {
      return res.status(400).json({ error: 'Missing fileData or fileName in request body' });
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
      return res.status(400).json({ error: 'Invalid base64 file data' });
    }

    const fileSize = fileBuffer.length;
    const mimeType = body.mimeType || 'application/octet-stream';
    const fileName = body.fileName;

    // Enforce size limits
    if (fileSize > MAX_FILE_BYTES) {
      return res.status(400).json({ 
        error: `File too large. Maximum size is ${MAX_FILE_BYTES / (1024 * 1024)}MB` 
      });
    }

    if (fileSize > FREE_MAX_BYTES) {
      return res.status(400).json({ 
        error: 'File exceeds free tier limit. Please use the paid upload endpoint.' 
      });
    }

    // Upload to Arweave
    console.log('Starting upload to Arweave...');
    const { txId, arweaveUrl } = await uploadToArweave(
      fileBuffer,
      mimeType,
      fileName
    );
    console.log('Upload completed:', { txId, arweaveUrl });

    // Save to DB (non-blocking, but we await it)
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

    // Prepare and send response
    const responseBody = {
      success: true,
      data: {
        file: {
          id: fileRecordId,
          txId,
          arweaveUrl,
          sizeBytes: fileSize,
          fileName: fileName,
        },
      },
    };
    
    console.log('Sending response:', JSON.stringify(responseBody));
    
    // Use res.json() which properly ends the response
    return res.status(200).json(responseBody);
  } catch (error: any) {
    console.error('Free upload error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return res.status(500).json({ 
      error: error?.message || 'Failed to upload file',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}
