import { TurboFactory, ArweaveSigner } from '@ardrive/turbo-sdk';
import Arweave from 'arweave';
import { readFileSync } from 'fs';

// Load .env.local manually
const envFile = readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
  if (line.startsWith('#') || !line.trim()) continue;
  const eq = line.indexOf('=');
  if (eq > 0) {
    const key = line.substring(0, eq);
    const value = line.substring(eq + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Top up amount: 0.1 AR (should provide plenty of Turbo credits for testing)
const TOP_UP_WINSTON = '100000000000'; // 0.1 AR

const wallet = JSON.parse(process.env.ARWEAVE_KEY_JSON);
const signer = new ArweaveSigner(wallet);
const turbo = TurboFactory.authenticated({ signer });

console.log('Topping up Turbo credits with 0.1 AR...');

try {
  const result = await turbo.topUpWithTokens({
    tokenAmount: TOP_UP_WINSTON,
  });
  console.log('Top-up result:', JSON.stringify(result, null, 2));
} catch (e) {
  console.error('Top-up error:', e.message);
  if (e.cause) console.error('Cause:', e.cause);
}

// Check balance after
try {
  const balance = await turbo.getBalance();
  console.log('Balance after top-up:', JSON.stringify(balance, null, 2));
} catch (e) {
  console.log('Post-top-up balance check error:', e.message);
}
