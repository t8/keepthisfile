import { loginOrCreateUser } from '../../lib/auth.js';
import { getBaseUrlFromRequest } from '../../lib/email.js';
import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper to get frontend URL from request or environment
function getFrontendUrl(req?: VercelRequest): string {
  // If we have request headers, use them to determine the actual domain
  if (req?.headers) {
    const baseUrl = getBaseUrlFromRequest(req.headers);
    // For frontend URL, we want to remove /api if present and ensure it's the frontend
    // In production, the base URL should already be the frontend domain
    if (baseUrl.includes('localhost')) {
      return 'http://localhost:3000';
    }
    return baseUrl;
  }
  
  // Fallback logic for when request is not available
  const isLocalDev = process.env.NODE_ENV === 'development' || 
                     (process.env.VERCEL_URL && process.env.VERCEL_URL.includes('localhost')) ||
                     (process.env.NEXT_PUBLIC_BASE_URL && (
                       process.env.NEXT_PUBLIC_BASE_URL.includes('localhost:5173') ||
                       process.env.NEXT_PUBLIC_BASE_URL.includes('localhost:3000')
                     ));
  
  if (isLocalDev) {
    return 'http://localhost:3000';
  }
  
  // Prioritize NEXT_PUBLIC_BASE_URL (production domain) over VERCEL_URL (deployment URL)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL;
    // Check if it's localhost
    if (vercelUrl.includes('localhost')) {
      return vercelUrl.startsWith('http') ? vercelUrl : `http://${vercelUrl}`;
    } else {
      return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
    }
  }
  
  return 'http://localhost:3000';
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  console.log('[VERIFY] Handler started');
  
  if (req.method !== 'GET') {
    console.log('[VERIFY] Method not allowed, returning 405');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[VERIFY] Parsing URL...');
    // Construct full URL from request
    const host = req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const path = req.url || '/';
    const url = new URL(path, `${protocol}://${host}`);
    
    let token = url.searchParams.get('token');
    console.log('[VERIFY] Token extracted:', token ? `present (length: ${token.length})` : 'missing');
    
    if (!token) {
      const frontendUrl = getFrontendUrl(req);
      return res.redirect(`${frontendUrl}?auth_error=Invalid verification link`);
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
      const frontendUrl = getFrontendUrl(req);
      return res.redirect(`${frontendUrl}?auth_error=Link expired or invalid`);
    }

    if (!decoded.email || decoded.type !== 'magic-link') {
      console.log('[VERIFY] Invalid token type or missing email');
      const frontendUrl = getFrontendUrl(req);
      return res.redirect(`${frontendUrl}?auth_error=Invalid token`);
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Failed</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      min-height: 100vh; 
      margin: 0; 
      background: #F8F6F3;
      padding: 20px;
    }
    .container { 
      background: #FFFFFF; 
      padding: 40px 32px; 
      border-radius: 16px; 
      max-width: 500px; 
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.1);
    }
    h1 { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-weight: 600;
      font-size: 24px;
      color: #DC2626; 
      margin: 0 0 16px 0; 
    }
    p { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      color: #1A1A1A; 
      margin: 0 0 12px 0;
      line-height: 1.6;
    }
    .error-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">✕</div>
    <h1>Verification Failed</h1>
    <p>${errorMsg}</p>
    <p>Please try requesting a new magic link.</p>
  </div>
</body>
</html>`;
      
      console.log('[VERIFY] Returning error page');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(errorHtml);
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
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '  <title>Sign In Successful</title>\n' +
      '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\n' +
      '  <style>\n' +
      '    body { \n' +
      '      font-family: \'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; \n' +
      '      text-align: center; \n' +
      '      padding: 20px; \n' +
      '      background: #F8F6F3;\n' +
      '      margin: 0;\n' +
      '      display: flex;\n' +
      '      align-items: center;\n' +
      '      justify-content: center;\n' +
      '      min-height: 100vh;\n' +
      '    }\n' +
      '    .container { \n' +
      '      background: #FFFFFF; \n' +
      '      padding: 40px 32px; \n' +
      '      border-radius: 16px; \n' +
      '      max-width: 500px; \n' +
      '      width: 100%;\n' +
      '      margin: 0 auto;\n' +
      '      box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.1);\n' +
      '    }\n' +
      '    h1 { \n' +
      '      font-family: \'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif;\n' +
      '      font-weight: 600;\n' +
      '      font-size: 24px;\n' +
      '      color: #A855F7;\n' +
      '      margin: 0 0 16px 0;\n' +
      '    }\n' +
      '    p { \n' +
      '      font-family: \'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif;\n' +
      '      font-size: 16px;\n' +
      '      color: #1A1A1A;\n' +
      '      margin: 0 0 12px 0;\n' +
      '      line-height: 1.6;\n' +
      '    }\n' +
      '    strong {\n' +
      '      font-weight: 600;\n' +
      '      color: #A855F7;\n' +
      '    }\n' +
      '    .success-icon-wrapper {\n' +
      '      display: inline-flex;\n' +
      '      align-items: center;\n' +
      '      justify-content: center;\n' +
      '      padding: 16px;\n' +
      '      background: rgba(168, 85, 247, 0.1);\n' +
      '      border-radius: 12px;\n' +
      '      margin-bottom: 24px;\n' +
      '      animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);\n' +
      '    }\n' +
      '    .success-icon {\n' +
      '      font-size: 48px;\n' +
      '      color: #A855F7;\n' +
      '      line-height: 1;\n' +
      '    }\n' +
      '    @keyframes scaleIn {\n' +
      '      0% {\n' +
      '        transform: scale(0);\n' +
      '        opacity: 0;\n' +
      '      }\n' +
      '      100% {\n' +
      '        transform: scale(1);\n' +
      '        opacity: 1;\n' +
      '      }\n' +
      '    }\n' +
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
      '    <div class="success-icon-wrapper">\n' +
      '      <div class="success-icon">✓</div>\n' +
      '    </div>\n' +
      '    <h1>Sign In Successful!</h1>\n' +
      '    <p>You\'ve signed in as <strong>' + escapedEmail + '</strong></p>\n' +
      '    <p>You can close this window and return to the original browser tab.</p>\n' +
      '  </div>\n' +
      '</body>\n' +
      '</html>';
    
    const elapsed = Date.now() - startTime;
    console.log(`[VERIFY] Handler completed in ${elapsed}ms, returning HTML response (${successHtml.length} bytes)`);
    
    // Set headers and send HTML response using Node.js style
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Set-Cookie', cookie);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    console.log('[VERIFY] Sending HTML response...');
    return res.status(200).send(successHtml);
  } catch (error) {
    const errorElapsed = Date.now() - startTime;
    console.error(`[VERIFY] Error after ${errorElapsed}ms:`, error);
    const frontendUrl = getFrontendUrl(req);
    return res.redirect(`${frontendUrl}?auth_error=Verification failed`);
  }
}

