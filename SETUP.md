# Setup Guide

## Local Development

**Important:** Use `vercel dev` to run both frontend and API together. This is the recommended approach.

### Setup Steps

1. Install Vercel CLI (if not already installed):
```bash
npm i -g vercel
```

2. Run Vercel dev (this serves both frontend and API routes):
```bash
vercel dev
```

Vercel dev will:
- Serve your Vite frontend
- Handle all `/api/*` routes as serverless functions
- Provide hot reloading for both frontend and backend

**Note:** When using `vercel dev`, you don't need to run `npm run dev` separately. Vercel dev handles everything.

### Troubleshooting

If API requests are hanging:
1. Make sure you're using `vercel dev` (not `npm run dev`)
2. Check that your `.env.local` file has all required variables
3. Restart `vercel dev` if you've made changes to environment variables
4. Check the terminal for any error messages

## Environment Variables

Copy `env.example` to `.env.local` and fill in all required values:

```bash
cp env.example .env.local
```

### Required Variables

1. **MONGODB_URI**: MongoDB connection string
2. **JWT_SECRET**: Random secret for JWT tokens
3. **STRIPE_SECRET_KEY**: Stripe API secret key
4. **STRIPE_WEBHOOK_SECRET**: Stripe webhook signing secret
5. **ARWEAVE_KEY_JSON**: Stringified Arweave wallet JSON
6. **SMTP_***: Email service credentials

### Generating JWT Secret

```bash
openssl rand -base64 32
```

### Getting Stripe Webhook Secret (Local)

For local development, use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will output a webhook secret starting with `whsec_` - use this in your `.env.local`.

## Testing the Setup

1. Start the development server
2. Try uploading a small file (<100KB) - should work without auth
3. Try uploading a larger file - should prompt for authentication
4. Test magic link authentication
5. Test Stripe payment flow (use test cards from Stripe)

## Common Issues

### API routes return 404

- Make sure you're using `vercel dev` or have the API server running
- Check that your proxy configuration in `vite.config.ts` is correct

### Magic link emails not sending

- Verify SMTP credentials are correct
- Check spam folder
- For Gmail, use an App Password (not your regular password)

### Stripe webhook not working

- Verify webhook secret matches
- Check Stripe dashboard for webhook delivery logs
- For local dev, use Stripe CLI

### Arweave uploads failing

- Ensure wallet is funded with AR tokens
- Verify `ARWEAVE_KEY_JSON` is properly formatted (stringified JSON)
- Check Arweave network status

