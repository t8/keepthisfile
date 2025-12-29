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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
  
  const magicLink = `${baseUrl}/api/auth/magic-link/verify?token=${token}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Sign in to Arweave Vault',
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
            <h1>Sign in to Arweave Vault</h1>
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
    text: `Sign in to Arweave Vault: ${magicLink}`,
  };
  
  await transporter.sendMail(mailOptions);
}

