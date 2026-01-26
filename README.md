# KeepThisFile

A full-stack application for uploading files to Arweave permanently. Features magic link authentication, Stripe payments, and seamless integration with the Arweave permaweb.

## Features

- **Free Tier**: Upload files ≤100KB (login required)
- **Paid Tier**: Upload larger files with Stripe payment integration
- **Magic Link Authentication**: Passwordless email-based authentication
- **Arweave Integration**: Uploads via Ar.IO Turbo bundling service (ANS-104 compliant)
- **MongoDB Persistence**: User and file metadata storage
- **Vercel Ready**: Deploy as serverless functions

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js serverless functions (Vercel)
- **Database**: MongoDB
- **Authentication**: Magic link (JWT)
- **Payments**: Stripe
- **Storage**: Arweave

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- MongoDB Atlas account (or local MongoDB)
- Stripe account
- Arweave wallet (JSON key)
- SMTP email service (Gmail, SendGrid, etc.)

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Copy the environment example file:
```bash
cp env.example .env.local
```

3. Configure your environment variables in `.env.local`:
   - **MONGODB_URI**: Your MongoDB connection string
   - **JWT_SECRET**: Generate a strong random string (e.g., `openssl rand -base64 32`)
   - **STRIPE_SECRET_KEY**: Your Stripe secret key
   - **STRIPE_WEBHOOK_SECRET**: Stripe webhook secret (see Stripe setup below)
   - **ARWEAVE_KEY_JSON**: Your Arweave wallet JSON as a stringified JSON
   - **SMTP_*****: Your email service credentials

4. Generate an Arweave wallet (if you don't have one):
```bash
# Install Arweave CLI or use Arweave wallet generator
# Then stringify the JSON and add to ARWEAVE_KEY_JSON
```

5. Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Stripe Setup

### 1. Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Get your **Secret Key** from API keys section
3. Add it to `.env.local` as `STRIPE_SECRET_KEY`

### 2. Set Up Webhook (for Production)

1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL to: `https://your-domain.vercel.app/api/stripe/webhook`
4. Select event: `checkout.session.completed`
5. Copy the **Signing secret** and add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### 3. Test Mode

For local development, use Stripe's test mode and the Stripe CLI:

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:5173/api/stripe/webhook
```

This will give you a webhook secret starting with `whsec_` - use this for local development.

## MongoDB Setup

1. Create a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
2. Create a new cluster
3. Create a database user
4. Whitelist your IP address (or use `0.0.0.0/0` for development)
5. Get your connection string and add to `.env.local` as `MONGODB_URI`

## Arweave Wallet Setup

This app uses a **hybrid approach** for uploads:

- **Files ≤100KB**: Uses [Ar.IO's Turbo bundling service](https://docs.ar.io/build/upload/bundling-services) - **FREE**, no AR balance or credits needed
- **Files >100KB**: Uses direct Arweave upload - **requires AR balance** in your wallet

### 1. Generate Arweave Wallet

1. Generate an Arweave wallet using [Arweave Wallet Generator](https://www.arweave.app/) or:
```bash
npx permaweb/wallet > key.json
```

2. Export the wallet JSON and stringify it
3. Add to `.env.local` as `ARWEAVE_KEY_JSON`

### 2. Fund Your Wallet (for files >100KB)

For files larger than 100KB, you need AR tokens in your wallet:

1. Get AR tokens from an exchange (e.g., Binance, Coinbase, etc.)
2. Send AR to your wallet address
3. Check your balance on [viewblock.io](https://viewblock.io/arweave) or [arweave.net](https://arweave.net)

**Note:** Files under 100KB use Turbo's free tier, so you don't need AR balance or Turbo credits for those uploads.

### 3. How It Works

- **Small files (≤100KB)**: Automatically uses Turbo bundling service - completely free, no setup needed
- **Large files (>100KB)**: Uses direct Arweave transactions - charges your wallet's AR balance
- Automatic fallback: If Turbo fails for small files, it falls back to Arweave upload

This gives you the best of both worlds: free uploads for small files via Turbo, and direct control for larger files.

## API Endpoints

### Authentication
- `POST /api/auth/magic-link/request` - Request magic link
- `GET /api/auth/magic-link/verify` - Verify magic link token
- `GET /api/me` - Get current user

### Uploads
- `POST /api/upload/free` - Upload file ≤100KB (login required)
- `POST /api/payments/create-upload-session` - Create Stripe checkout session
- `POST /api/upload/paid` - Upload file after payment (login required)

### Files
- `GET /api/files` - Get user's uploaded files (auth required)

### Webhooks
- `POST /api/stripe/webhook` - Stripe webhook handler

## Deployment to Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add all environment variables in Vercel dashboard
4. Deploy!

### Vercel Environment Variables

Add all variables from `env.example` to your Vercel project settings.

### Stripe Webhook on Vercel

1. After deployment, get your Vercel URL
2. In Stripe Dashboard, add webhook endpoint: `https://your-app.vercel.app/api/stripe/webhook`
3. Update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables

## File Size Limits

- **Free Tier**: ≤100KB (login required, no payment)
- **Paid Tier**: >100KB up to 25MB (login + payment required)
- Configurable via `MAX_FILE_BYTES` environment variable

## Pricing

Default pricing (configurable via environment variables):
- `STRIPE_PRICE_PER_MB_USD`: $0.05 per MB
- `STRIPE_MIN_PRICE_USD`: $1.00 minimum

Price formula: `max(MIN_PRICE_USD, PRICE_PER_MB_USD * sizeMB)`

## Project Structure

```
├── api/                    # Serverless API routes
│   ├── auth/              # Authentication endpoints
│   ├── upload/            # Upload endpoints
│   ├── payments/          # Stripe payment endpoints
│   ├── files/             # File management
│   ├── stripe/            # Stripe webhook
│   └── lib/               # Shared utilities
├── src/
│   ├── components/        # React components
│   ├── lib/               # Frontend utilities
│   └── App.tsx           # Main app component
└── vercel.json            # Vercel configuration
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## License

This project is licensed under the GNU Affero General Public License v3.0 only (AGPL-3.0-only). See the [LICENSE](LICENSE) file for details.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.
