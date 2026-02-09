import { TurboFactory, ArweaveSigner } from '@ardrive/turbo-sdk';
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

// 50 AR in winston
const TOP_UP_WINSTON = '50000000000000';

const wallet = JSON.parse(process.env.ARWEAVE_KEY_JSON);
const signer = new ArweaveSigner(wallet);
const turbo = TurboFactory.authenticated({ signer });

console.log('Topping up Turbo credits with 50 AR...');

try {
  const result = await turbo.topUpWithTokens({
    tokenAmount: TOP_UP_WINSTON,
  });
  console.log('Top-up result:', JSON.stringify(result, null, 2));
} catch (e) {
  console.error('Top-up error:', e.message);
  // Extract pending tx ID if present
  const match = e.message.match(/Save this Transaction ID.*?: (\w{43})/);
  if (match) {
    console.log('Pending tx ID:', match[1]);
    console.log('Credits will appear after the Arweave transaction is mined (~20-50 confirmations).');
  }
}
