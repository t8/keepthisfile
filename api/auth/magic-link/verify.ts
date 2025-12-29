import { loginOrCreateUser } from '../../lib/auth.js';
import jwt from 'jsonwebtoken';
import type { IncomingMessage } from 'http';

type VercelRequest = Request | IncomingMessage;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper to get frontend URL
function getFrontendUrl(): string {
  // In local development, always use localhost:5173 for frontend
  const isLocalDev = process.env.NODE_ENV === 'development' || 
                     (process.env.VERCEL_URL && process.env.VERCEL_URL.includes('localhost')) ||
                     (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.includes('localhost:3000'));
  
  if (isLocalDev) {
    return 'http://localhost:5173';
  }
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return 'http://localhost:5173';
}


export default async function handler(req: VercelRequest): Promise<Response> {
  const startTime = Date.now();
  console.log('[VERIFY] Handler started, request type:', req instanceof Request ? 'Request' : 'IncomingMessage');
  
  const method = req instanceof Request ? req.method : (req as IncomingMessage).method;
  console.log('[VERIFY] Method:', method);
  
  if (method !== 'GET') {
    console.log('[VERIFY] Method not allowed, returning 405');
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('[VERIFY] Parsing URL...');
    // Construct full URL from request - handle both Request and IncomingMessage
    let url: URL;
    if (req instanceof Request) {
      url = new URL(req.url);
    } else {
      const host = (req as IncomingMessage).headers.host || 'localhost:3000';
      const protocol = (req as IncomingMessage).headers['x-forwarded-proto'] || 'http';
      const path = (req as IncomingMessage).url || '/';
      url = new URL(path, `${protocol}://${host}`);
    }
    
    let token = url.searchParams.get('token');
    console.log('[VERIFY] Token extracted:', token ? `present (length: ${token.length})` : 'missing');
    
    if (!token) {
      const frontendUrl = getFrontendUrl();
      return Response.redirect(`${frontendUrl}?auth_error=Invalid verification link`, 302);
    }

    // Decode the token in case it's URL-encoded
    try {
      token = decodeURIComponent(token);
      console.log('[VERIFY] Token decoded, length:', token.length);
    } catch (e) {
      console.log('[VERIFY] Token was not URL-encoded, using as-is');
    }

    console.log('[VERIFY] Verifying JWT token...');
    console.log('[VERIFY] Token preview:', token.substring(0, 50) + '...');
    
    // Verify the magic link token
    let decoded: { email: string; type?: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { email: string; type?: string };
      console.log('[VERIFY] Token verified, email:', decoded.email);
    } catch (error) {
      console.error('[VERIFY] Token verification failed:', error);
      console.error('[VERIFY] Token value:', token);
      const frontendUrl = getFrontendUrl();
      return Response.redirect(`${frontendUrl}?auth_error=Link expired or invalid`, 302);
    }

    if (!decoded.email || decoded.type !== 'magic-link') {
      console.log('[VERIFY] Invalid token type or missing email');
      const frontendUrl = getFrontendUrl();
      return Response.redirect(`${frontendUrl}?auth_error=Invalid token`, 302);
    }

    console.log('[VERIFY] Creating/logging in user...');
    // Create/login user and get auth token with very aggressive timeout
    let authToken: string;
    let userEmail: string;
    
    const dbStartTime = Date.now();
    try {
      // Wrap the entire database operation in a timeout
      const loginPromise = loginOrCreateUser(decoded.email);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database operation timeout')), 3000);
      });
      
      const result = await Promise.race([loginPromise, timeoutPromise]);
      const dbElapsed = Date.now() - dbStartTime;
      console.log(`[VERIFY] Database operation completed in ${dbElapsed}ms`);
      authToken = result.token;
      userEmail = result.user.email;
      console.log('[VERIFY] User logged in, auth token generated');
    } catch (error) {
      const dbElapsed = Date.now() - dbStartTime;
      console.error(`[VERIFY] Failed to login/create user after ${dbElapsed}ms:`, error);
      const errorMsg = error instanceof Error && error.message === 'Database operation timeout'
        ? 'Service timeout. Please try again.'
        : 'Failed to create user session';
      
      // Return simple error page immediately
      const errorHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Verification Failed</title>
  <style>
    body { font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f3f4f6; }
    .container { background: white; padding: 2rem; border-radius: 8px; max-width: 500px; text-align: center; }
    h1 { color: #dc2626; margin-top: 0; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Verification Failed</h1>
    <p>${errorMsg}</p>
    <p>Please try requesting a new magic link.</p>
  </div>
</body>
</html>`;
      
      console.log('[VERIFY] Returning error page');
      return new Response(errorHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Store token in a cookie so the original window can detect it
    const cookie = `auth-token=${authToken}; Path=/; Max-Age=604800; SameSite=Lax`;
    
    // Return simple success page - minimize HTML to ensure fast response
    const escapedEmail = userEmail.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const escapedToken = authToken.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    
    // Create minimal HTML - ensure all dynamic content is properly escaped
    const successHtml = '<!DOCTYPE html>\n' +
      '<html>\n' +
      '<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <title>Sign In Successful</title>\n' +
      '  <style>\n' +
      '    body { font-family: system-ui; text-align: center; padding: 2rem; background: #f3f4f6; }\n' +
      '    .container { background: white; padding: 2rem; border-radius: 8px; max-width: 500px; margin: 0 auto; }\n' +
      '    h1 { color: #10b981; }\n' +
      '  </style>\n' +
      '  <script>\n' +
      '    (function() {\n' +
      '      try {\n' +
      '        var token = "' + escapedToken + '";\n' +
      '        localStorage.setItem("auth-token", token);\n' +
      '        window.dispatchEvent(new StorageEvent("storage", {\n' +
      '          key: "auth-token",\n' +
      '          newValue: token,\n' +
      '          storageArea: localStorage\n' +
      '        }));\n' +
      '        console.log("Token stored in localStorage");\n' +
      '      } catch (e) {\n' +
      '        console.error("Failed to store token:", e);\n' +
      '      }\n' +
      '    })();\n' +
      '  </script>\n' +
      '</head>\n' +
      '<body>\n' +
      '  <div class="container">\n' +
      '    <h1>✓ Sign In Successful!</h1>\n' +
      '    <p>You\'ve signed in as <strong>' + escapedEmail + '</strong></p>\n' +
      '    <p><strong>You can close this window and return to the original browser tab.</strong></p>\n' +
      '  </div>\n' +
      '</body>\n' +
      '</html>';
    
    const elapsed = Date.now() - startTime;
    console.log(`[VERIFY] Handler completed in ${elapsed}ms, returning HTML response (${successHtml.length} bytes)`);
    
    // Return response with explicit string body - Vercel should handle this correctly
    const responseHeaders = new Headers({
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': cookie,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    
    console.log('[VERIFY] Creating response with Headers object...');
    const response = new Response(successHtml, {
      status: 200,
      headers: responseHeaders,
    });
    
    console.log('[VERIFY] Response created, status:', response.status);
    console.log('[VERIFY] Response ok:', response.ok);
    console.log('[VERIFY] Response bodyUsed:', response.bodyUsed);
    
    // Ensure response is sent
    return response;
  } catch (error) {
    const errorElapsed = Date.now() - startTime;
    console.error(`[VERIFY] Error after ${errorElapsed}ms:`, error);
    const frontendUrl = getFrontendUrl();
    return new Response(null, {
      status: 302,
      headers: { 'Location': `${frontendUrl}?auth_error=Verification failed` },
    });
  }
}

