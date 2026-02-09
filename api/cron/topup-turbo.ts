import type { VercelRequest, VercelResponse } from '@vercel/node';
import { TurboFactory, ArweaveSigner } from '@ardrive/turbo-sdk';
import Arweave from 'arweave';
import type { JWKInterface } from 'arweave/node/lib/wallet';

// Minimum Turbo balance in winc before triggering a top-up.
// At current rates: 0.1 AR ≈ 76.6B winc, 100MB upload ≈ 393B winc.
// Default threshold: 400B winc ≈ enough for one 100MB upload.
// Configurable via TURBO_MIN_BALANCE_WINC env var.
const MIN_BALANCE_WINC = BigInt(process.env.TURBO_MIN_BALANCE_WINC || '400000000000');

// Amount of AR (in winston) to top up with when balance is low.
// Default: 0.5 AR ≈ 383B winc ≈ enough for ~1GB of uploads.
// Configurable via TURBO_TOPUP_WINSTON env var.
const TOP_UP_WINSTON = process.env.TURBO_TOPUP_WINSTON || '500000000000'; // 0.5 AR

function getWallet(): JWKInterface {
  if (!process.env.ARWEAVE_KEY_JSON) {
    throw new Error('ARWEAVE_KEY_JSON environment variable is required');
  }
  return JSON.parse(process.env.ARWEAVE_KEY_JSON);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[CRON-TOPUP] Turbo credit top-up check started');

  // Verify this is a legitimate cron invocation (Vercel sends this header)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[CRON-TOPUP] Unauthorized request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const wallet = getWallet();
    const signer = new ArweaveSigner(wallet);
    const turbo = TurboFactory.authenticated({ signer });

    // Check current Turbo balance
    const balance = await turbo.getBalance();
    const currentWinc = BigInt(balance.winc);
    console.log(`[CRON-TOPUP] Current Turbo balance: ${balance.winc} winc (controlled: ${balance.controlledWinc})`);

    if (currentWinc >= MIN_BALANCE_WINC) {
      console.log(`[CRON-TOPUP] Balance is sufficient (${currentWinc} >= ${MIN_BALANCE_WINC}), no top-up needed`);
      return res.status(200).json({
        success: true,
        action: 'none',
        currentWinc: balance.winc,
        threshold: MIN_BALANCE_WINC.toString(),
      });
    }

    // Check AR balance before attempting top-up
    const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' });
    const walletAddress = await arweave.wallets.jwkToAddress(wallet);
    const arBalance = await arweave.wallets.getBalance(walletAddress);
    const arBalanceBigInt = BigInt(arBalance);
    const topUpBigInt = BigInt(TOP_UP_WINSTON);

    console.log(`[CRON-TOPUP] AR balance: ${arBalance} winston (${(Number(arBalance) / 1e12).toFixed(6)} AR)`);

    if (arBalanceBigInt < topUpBigInt * BigInt(2)) {
      // Not enough AR to safely top up (keep some for tx fees)
      console.error(`[CRON-TOPUP] Insufficient AR balance for top-up. Have ${arBalance}, need at least ${(topUpBigInt * BigInt(2)).toString()}`);
      return res.status(200).json({
        success: false,
        action: 'skipped',
        reason: 'insufficient_ar_balance',
        arBalanceWinston: arBalance,
        currentWinc: balance.winc,
      });
    }

    // Top up
    console.log(`[CRON-TOPUP] Balance low (${currentWinc} < ${MIN_BALANCE_WINC}), topping up with ${TOP_UP_WINSTON} winston...`);

    const result = await turbo.topUpWithTokens({
      tokenAmount: TOP_UP_WINSTON,
    });

    console.log(`[CRON-TOPUP] Top-up submitted: txId=${result.id}, winc=${result.winc}, status=${result.status}`);

    // Check balance after top-up
    const newBalance = await turbo.getBalance();
    console.log(`[CRON-TOPUP] New balance: ${newBalance.winc} winc`);

    return res.status(200).json({
      success: true,
      action: 'topped_up',
      txId: result.id,
      wincAdded: result.winc,
      status: result.status,
      previousWinc: balance.winc,
      newWinc: newBalance.winc,
    });
  } catch (error) {
    console.error('[CRON-TOPUP] Error:', error);
    const message = error instanceof Error ? error.message : String(error);

    // If it's a "save this tx ID" error, extract and submit
    const txIdMatch = message.match(/Save this Transaction ID.*?: (\w{43})/);
    if (txIdMatch) {
      const pendingTxId = txIdMatch[1];
      console.log(`[CRON-TOPUP] AR transaction pending confirmation: ${pendingTxId}`);
      return res.status(200).json({
        success: true,
        action: 'pending',
        pendingTxId,
        message: 'AR transaction submitted but awaiting confirmation. Credits will appear after mining.',
      });
    }

    return res.status(500).json({
      success: false,
      error: message,
    });
  }
}
