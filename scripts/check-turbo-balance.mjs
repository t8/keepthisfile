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

const wallet = JSON.parse(process.env.ARWEAVE_KEY_JSON);
const signer = new ArweaveSigner(wallet);
const turbo = TurboFactory.authenticated({ signer });

// Check current Turbo balance
try {
  const balance = await turbo.getBalance();
  console.log('Current Turbo balance:', JSON.stringify(balance, null, 2));
} catch (e) {
  console.log('Balance check error:', e.message);
}

// Check cost for various sizes
const sizes = [100 * 1024, 1 * 1024 * 1024, 10 * 1024 * 1024, 100 * 1024 * 1024];
for (const size of sizes) {
  try {
    const [cost] = await turbo.getUploadCosts({ bytes: [size] });
    console.log(`Cost for ${(size / 1024 / 1024).toFixed(1)}MB: ${cost.winc} winc`);
  } catch (e) {
    console.log(`Cost check error for ${size}: ${e.message}`);
  }
}

// Check AR balance
const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' });
const addr = await arweave.wallets.jwkToAddress(wallet);
const arBalance = await arweave.wallets.getBalance(addr);
console.log('AR balance (winston):', arBalance);
console.log('AR balance:', (Number(arBalance) / 1e12).toFixed(6), 'AR');
console.log('Wallet address:', addr);
