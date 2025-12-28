import { uploadToArweave } from '../lib/arweave';
import { createFile } from '../lib/models';
import { FREE_MAX_BYTES, MAX_FILE_BYTES } from '../lib/constants';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fileSize = file.size;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

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
    const { txId, arweaveUrl } = await uploadToArweave(
      fileBuffer,
      file.type || 'application/octet-stream',
      file.name
    );

    // Save file record (anonymous, no userId)
    const fileRecord = await createFile({
      userId: null,
      arweaveTxId: txId,
      arweaveUrl,
      sizeBytes: fileSize,
      mimeType: file.type || 'application/octet-stream',
      originalFileName: file.name,
    });

    return new Response(
      JSON.stringify({
        success: true,
        file: {
          id: fileRecord._id,
          txId,
          arweaveUrl,
          sizeBytes: fileSize,
          fileName: file.name,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Free upload error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to upload file' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

