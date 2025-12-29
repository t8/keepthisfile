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
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #8B5CF6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Sign in to KeepThisFile</h1>
            <p>Click the button below to sign in to your account:</p>
            <a href="${magicLink}" class="button">Sign In</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${magicLink}</p>
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

