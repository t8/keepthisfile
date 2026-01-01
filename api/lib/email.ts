import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 5000, // 5 seconds to establish connection
  socketTimeout: 10000, // 10 seconds for socket operations
  greetingTimeout: 5000, // 5 seconds for SMTP greeting
});

export async function sendMagicLink(email: string, token: string): Promise<void> {
  // In production, API routes are on the same domain as the frontend
  // Use VERCEL_URL if available (includes protocol), otherwise use NEXT_PUBLIC_BASE_URL
  let baseUrl: string;
  
  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL;
    // Check if it's localhost (local dev) - should use http, not https
    if (vercelUrl.includes('localhost')) {
      baseUrl = vercelUrl.startsWith('http') ? vercelUrl : `http://${vercelUrl}`;
    } else {
      // Production Vercel URL - use https
      baseUrl = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
    }
  } else if (process.env.NEXT_PUBLIC_BASE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  } else {
    // Local development fallback
    baseUrl = 'http://localhost:5173';
  }
  
  // Ensure no double slashes in URL
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const magicLink = `${cleanBaseUrl}/api/auth/magic-link/verify?token=${token}`;
  
  console.log('Magic link email details:', {
    to: email,
    baseUrl,
    cleanBaseUrl,
    magicLink,
    VERCEL_URL: process.env.VERCEL_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
  
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Sign in to KeepThisFile',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
          <style>
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
              line-height: 1.6; 
              color: #1A1A1A; 
              background-color: #F8F6F3;
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 40px 20px;
              background-color: #FFFFFF;
            }
            h1 {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-weight: 600;
              font-size: 24px;
              color: #1A1A1A;
              margin: 0 0 16px 0;
            }
            p {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
              color: #1A1A1A;
              margin: 0 0 16px 0;
            }
            .button { 
              display: inline-block; 
              padding: 12px 32px; 
              background-color: #A855F7; 
              color: #FFFFFF !important; 
              text-decoration: none; 
              border-radius: 8px; 
              margin: 24px 0;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-weight: 500;
              font-size: 16px;
              text-align: center;
            }
            .button:hover {
              background-color: #9333EA;
            }
            .link-text {
              word-break: break-all; 
              color: #666666;
              font-size: 14px;
              font-family: 'JetBrains Mono', 'Courier New', monospace;
            }
            .footer { 
              margin-top: 40px; 
              font-size: 14px; 
              color: #666666;
              border-top: 1px solid #E9D5FF;
              padding-top: 24px;
            }
            .footer p {
              font-size: 14px;
              color: #666666;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Sign in to KeepThisFile</h1>
            <p>Click the button below to sign in to your account:</p>
            <div style="text-align: center;">
              <a href="${magicLink}" class="button" style="color: #FFFFFF !important; text-decoration: none;">Sign In</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p class="link-text">${magicLink}</p>
            <p>This link will expire in 15 minutes.</p>
            <div class="footer">
              <p>If you didn't request this email, you can safely ignore it.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Sign in to KeepThisFile: ${magicLink}`,
  };
  
  await transporter.sendMail(mailOptions);
}

