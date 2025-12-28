# Setup Guide

## Local Development

For local development, you have two options:

### Option 1: Use Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Run Vercel dev (this will run both frontend and API):
```bash
vercel dev
```

This will start the app with API routes working locally.

### Option 2: Separate Dev Servers

1. For the frontend, run:
```bash
npm run dev
```

2. For the API (using Vercel CLI):
```bash
vercel dev --listen 3000
```

The Vite proxy is configured to forward `/api/*` requests to `http://localhost:3000`.

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

