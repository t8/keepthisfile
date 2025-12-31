import type { IncomingMessage } from 'http';

// Vercel request can be either Web API Request or Node.js IncomingMessage
type VercelRequest = Request | IncomingMessage;

export async function readJsonBody(req: VercelRequest): Promise<any> {
  if (req instanceof Request) {
    // Web API Request
    return await req.json();
  }
  
  // Node.js IncomingMessage - read from stream with timeout
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const incomingReq = req as IncomingMessage;
    let resolved = false;
    
    // Set a timeout to prevent hanging (10 seconds)
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Request body read timeout'));
      }
    }, 10000);
    
    const cleanup = () => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
      }
    };
    
    incomingReq.on('data', (chunk: Buffer) => {
      if (!resolved) {
        chunks.push(chunk);
      }
    });
    
    incomingReq.on('end', () => {
      if (!resolved) {
        try {
          const body = Buffer.concat(chunks).toString('utf-8');
          const parsed = JSON.parse(body);
          cleanup();
          resolve(parsed);
        } catch (error) {
          cleanup();
          reject(new Error('Invalid JSON in request body'));
        }
      }
    });
    
    incomingReq.on('error', (err) => {
      cleanup();
      if (!resolved) {
        reject(err);
      }
    });
  });
}

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

export function jsonResponse(data: any, status: number = 200, additionalHeaders: Record<string, string> = {}): Response {
  const body = JSON.stringify(data);
  console.log('jsonResponse: Creating response with body length:', body.length);
  const response = new Response(body, {
    status,
    headers: {
      ...corsHeaders(),
      ...additionalHeaders,
      'Content-Length': body.length.toString(),
    },
  });
  console.log('jsonResponse: Response created, status:', response.status);
  return response;
}

export async function handleCors(req: Request): Promise<Response | null> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }
  return null;
}

