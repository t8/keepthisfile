import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';

let arweave: Arweave;
let wallet: JWKInterface | null = null;

export function initArweave() {
  if (!arweave) {
    arweave = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
    });
  }
  
  if (!wallet && process.env.ARWEAVE_KEY_JSON) {
    try {
      wallet = JSON.parse(process.env.ARWEAVE_KEY_JSON);
    } catch (error) {
      console.error('Failed to parse ARWEAVE_KEY_JSON:', error);
      throw new Error('Invalid ARWEAVE_KEY_JSON format');
    }
  }
  
  if (!wallet) {
    throw new Error('ARWEAVE_KEY_JSON environment variable is required');
  }
}

export async function uploadToArweave(
  data: Buffer,
  contentType: string,
  fileName: string
): Promise<{ txId: string; arweaveUrl: string }> {
  initArweave();
  
  if (!wallet) {
    throw new Error('Arweave wallet not initialized');
  }
  
  // Create transaction
  const transaction = await arweave.createTransaction(
    {
      data: data,
    },
    wallet
  );
  
  // Add tags
  transaction.addTag('Content-Type', contentType);
  transaction.addTag('App-Name', 'ArweaveVault');
  transaction.addTag('Original-Filename', fileName);
  
  // Sign transaction
  await arweave.transactions.sign(transaction, wallet);
  
  // Upload transaction
  const uploader = await arweave.transactions.getUploader(transaction);
  
  while (!uploader.isComplete) {
    await uploader.uploadChunk();
  }
  
  const txId = transaction.id;
  const arweaveUrl = `https://arweave.net/${txId}`;
  
  return { txId, arweaveUrl };
}

