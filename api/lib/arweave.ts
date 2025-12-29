import { TurboFactory, ArweaveSigner } from '@ardrive/turbo-sdk';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import { FREE_MAX_BYTES } from './constants.js';

// Cache only the wallet (static data) - NOT the SDK instances
// SDK instances maintain HTTP connections that can keep serverless functions alive
let cachedWallet: JWKInterface | null = null;

function getWallet(): JWKInterface {
  if (!cachedWallet && process.env.ARWEAVE_KEY_JSON) {
    try {
      cachedWallet = JSON.parse(process.env.ARWEAVE_KEY_JSON);
    } catch (error) {
      console.error('Failed to parse ARWEAVE_KEY_JSON:', error);
      throw new Error('Invalid ARWEAVE_KEY_JSON format');
    }
  }
  
  if (!cachedWallet) {
    throw new Error('ARWEAVE_KEY_JSON environment variable is required');
  }
  
  return cachedWallet;
}

// Create fresh Turbo instance each request to avoid connection pooling issues
function createTurboInstance() {
  const wallet = getWallet();
  const signer = new ArweaveSigner(wallet);
  console.log('ArweaveSigner created successfully');
  
  const turbo = TurboFactory.authenticated({ signer });
  console.log('Turbo initialized successfully');
  
  return turbo;
}

// Create fresh Arweave instance each request
function createArweaveInstance() {
  return Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
  });
}

async function uploadViaTurbo(
  data: Buffer,
  contentType: string,
  fileName: string
): Promise<{ txId: string; arweaveUrl: string }> {
  // Create fresh Turbo instance each request to avoid connection pooling
  let turbo: ReturnType<typeof TurboFactory.authenticated>;
  try {
    turbo = createTurboInstance();
  } catch (error: any) {
    console.error('Turbo initialization error:', error);
    throw new Error(`Turbo initialization failed: ${error.message}`);
  }
  
  // Add timeout to prevent hanging - but make sure to clear it!
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  try {
    console.log('Starting Turbo upload...', {
      dataSize: data.length,
      contentType,
      fileName,
    });
    
    const uploadPromise = turbo.upload({
      data: data,
      dataItemOpts: {
        tags: [
          { name: 'Content-Type', value: contentType },
          { name: 'App-Name', value: 'ArweaveVault' },
          { name: 'Original-Filename', value: fileName },
        ],
      },
    });
    
    // Set a 60 second timeout that we can cancel
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Turbo upload timeout after 60 seconds')), 60000);
    });
    
    const result = await Promise.race([uploadPromise, timeoutPromise]) as any;
    
    console.log('Turbo upload completed:', {
      id: result.id,
      owner: result.owner,
    });
    
    const dataItemId = result.id;
    const arweaveUrl = `https://arweave.net/${dataItemId}`;
    
    return { 
      txId: dataItemId, 
      arweaveUrl 
    };
  } catch (error: any) {
    console.error('Turbo upload error details:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });
    throw error;
  } finally {
    // Always clear the timeout to prevent keeping the function alive
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function uploadViaArweave(
  data: Buffer,
  contentType: string,
  fileName: string
): Promise<{ txId: string; arweaveUrl: string }> {
  // Create fresh instances each request
  const wallet = getWallet();
  const arweave = createArweaveInstance();
  
  try {
    // Get wallet address to check balance
    const walletAddress = await arweave.wallets.jwkToAddress(wallet);
    const balance = await arweave.wallets.getBalance(walletAddress);
    const winstonBalance = BigInt(balance);
    
    // Calculate transaction cost
    const dataSize = data.length;
    const reward = await arweave.transactions.getPrice(dataSize);
    const rewardBigInt = BigInt(reward);
    
    if (winstonBalance < rewardBigInt) {
      throw new Error(`Insufficient AR balance. Need ${reward} winston, have ${balance} winston`);
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
    
    // Verify transaction before uploading
    const isValid = await arweave.transactions.verify(transaction);
    if (!isValid) {
      throw new Error('Transaction verification failed after signing. Check wallet key and transaction data.');
    }
    
    // Upload transaction
    const uploader = await arweave.transactions.getUploader(transaction);
    
    while (!uploader.isComplete) {
      await uploader.uploadChunk();
    }
    
    const txId = transaction.id;
    const arweaveUrl = `https://arweave.net/${txId}`;
    
    return { txId, arweaveUrl };
  } catch (error: any) {
    console.error('Arweave upload error:', error);
    if (error.message) {
      throw new Error(`Arweave upload failed: ${error.message}`);
    }
    throw new Error('Arweave upload failed: Unknown error');
  }
}

export async function uploadToArweave(
  data: Buffer,
  contentType: string,
  fileName: string
): Promise<{ txId: string; arweaveUrl: string }> {
  const dataSize = data.length;
  
  // Use Turbo for files under the free threshold (100KB)
  // Use direct Arweave upload for larger files (charges wallet AR balance)
  if (dataSize <= FREE_MAX_BYTES) {
    try {
      console.log(`Using Turbo (free) for file size: ${dataSize} bytes`);
      return await uploadViaTurbo(data, contentType, fileName);
    } catch (error: any) {
      console.error('Turbo upload failed, falling back to Arweave:', error);
      // Fallback to Arweave if Turbo fails
      return await uploadViaArweave(data, contentType, fileName);
    }
  } else {
    console.log(`Using Arweave (paid) for file size: ${dataSize} bytes`);
    return await uploadViaArweave(data, contentType, fileName);
  }
}

