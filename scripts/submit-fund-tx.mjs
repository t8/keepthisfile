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

const txId = process.argv[2] || 'cwMHq-yw6UcbvSiBERZYTrxiZIWCvxb1xdfnXCn65Vw';

const wallet = JSON.parse(process.env.ARWEAVE_KEY_JSON);
const signer = new ArweaveSigner(wallet);
const turbo = TurboFactory.authenticated({ signer });

console.log('Submitting fund transaction:', txId);

try {
  const result = await turbo.submitFundTransaction({ txId });
  console.log('Submit result:', JSON.stringify(result, null, 2));
} catch (e) {
  console.error('Submit error:', e.message);
}

// Check balance
try {
  const balance = await turbo.getBalance();
  console.log('Current balance:', JSON.stringify(balance, null, 2));
} catch (e) {
  console.log('Balance check error:', e.message);
}
