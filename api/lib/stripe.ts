import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export function calculatePrice(sizeBytes: number): number {
  const PRICE_PER_MB_USD = parseFloat(process.env.STRIPE_PRICE_PER_MB_USD || '0.10');
  const MIN_PRICE_USD = parseFloat(process.env.STRIPE_MIN_PRICE_USD || '1.00');
  
  const sizeMB = sizeBytes / (1024 * 1024);
  const priceUSD = Math.max(MIN_PRICE_USD, PRICE_PER_MB_USD * sizeMB);
  
  // Convert to cents
  return Math.round(priceUSD * 100);
}

