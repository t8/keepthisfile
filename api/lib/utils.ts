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

