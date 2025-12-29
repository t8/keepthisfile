import busboy from 'busboy';
import { Readable } from 'stream';
import type { IncomingMessage } from 'http';

export interface ParsedFile {
  buffer: Buffer;
  mimetype: string;
  originalFilename: string;
  size: number;
}

// Vercel request can be either Web API Request or Node.js IncomingMessage
type VercelRequest = Request | IncomingMessage;

function getContentType(req: VercelRequest): string {
  if (req instanceof Request) {
    return req.headers.get('content-type') || '';
  }
  // Node.js IncomingMessage
  return (req.headers['content-type'] as string) || '';
}

async function getBodyAsBuffer(req: VercelRequest): Promise<Buffer> {
  if (req instanceof Request) {
    // For Web API Request, read the body directly
    // Note: This consumes the request body, but that's fine since we're parsing it
    try {
      const arrayBuffer = await req.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error reading Request body:', error);
      throw error;
    }
  }
  // Node.js IncomingMessage - read from stream
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const incomingReq = req as IncomingMessage;
    incomingReq.on('data', (chunk: Buffer) => chunks.push(chunk));
    incomingReq.on('end', () => resolve(Buffer.concat(chunks)));
    incomingReq.on('error', reject);
  });
}

export async function parseMultipartFormData(
  req: VercelRequest
): Promise<{ file?: ParsedFile; fields: Record<string, string> }> {
  const contentType = getContentType(req);
  if (!contentType.includes('multipart/form-data')) {
    throw new Error('Request is not multipart/form-data');
  }

  console.log('Using busboy for multipart parsing');
  
  // For Node.js IncomingMessage, use the stream directly
  if (!(req instanceof Request)) {
    return new Promise((resolve, reject) => {
      const fields: Record<string, string> = {};
      let file: ParsedFile | undefined;
      let fileInfo: { mimetype: string; filename: string } | null = null;

      const bb = busboy({ headers: { 'content-type': contentType } });

      bb.on('file', (name: string, fileStream: any, info: { mimeType: string; filename: string }) => {
        if (name === 'file') {
          console.log('File stream started:', info.filename, info.mimeType);
          fileInfo = { mimetype: info.mimeType, filename: info.filename };
          const fileChunks: Buffer[] = [];
          fileStream.on('data', (chunk: Buffer) => fileChunks.push(chunk));
          fileStream.on('end', () => {
            console.log('File stream ended, total size:', fileChunks.reduce((sum, chunk) => sum + chunk.length, 0));
            file = {
              buffer: Buffer.concat(fileChunks),
              mimetype: fileInfo!.mimetype || 'application/octet-stream',
              originalFilename: fileInfo!.filename || 'unknown',
              size: Buffer.concat(fileChunks).length,
            };
          });
        }
      });

      bb.on('field', (name: string, value: string) => {
        fields[name] = value;
      });

      bb.on('finish', () => {
        console.log('Busboy finished parsing, file:', file ? 'present' : 'missing');
        resolve({ file, fields });
      });

      bb.on('error', (err) => {
        console.error('Busboy error:', err);
        reject(err);
      });

      (req as IncomingMessage).pipe(bb);
    });
  }

  // For Web API Request, convert to stream
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    let file: ParsedFile | undefined;
    let fileInfo: { mimetype: string; filename: string } | null = null;

    // Convert Request body to Node.js stream
    getBodyAsBuffer(req)
      .then((buffer) => {
        console.log('Request body read, size:', buffer.length);
        const stream = Readable.from(buffer);
        const bb = busboy({ headers: { 'content-type': contentType } });

        bb.on('file', (name: string, fileStream: any, info: { mimeType: string; filename: string }) => {
          if (name === 'file') {
            console.log('File stream started:', info.filename, info.mimeType);
            fileInfo = { mimetype: info.mimeType, filename: info.filename };
            const fileChunks: Buffer[] = [];
            fileStream.on('data', (chunk: Buffer) => fileChunks.push(chunk));
            fileStream.on('end', () => {
              console.log('File stream ended, total size:', fileChunks.reduce((sum, chunk) => sum + chunk.length, 0));
              file = {
                buffer: Buffer.concat(fileChunks),
                mimetype: fileInfo!.mimetype || 'application/octet-stream',
                originalFilename: fileInfo!.filename || 'unknown',
                size: Buffer.concat(fileChunks).length,
              };
            });
          }
        });

        bb.on('field', (name: string, value: string) => {
          fields[name] = value;
        });

        bb.on('finish', () => {
          console.log('Busboy finished parsing, file:', file ? 'present' : 'missing');
          resolve({ file, fields });
        });

        bb.on('error', (err) => {
          console.error('Busboy error:', err);
          reject(err);
        });
        
        stream.pipe(bb);
      })
      .catch((err) => {
        console.error('Error reading request body:', err);
        reject(err);
      });
  });
}

