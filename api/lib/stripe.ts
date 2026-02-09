import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export function calculatePrice(sizeBytes: number): number {
  const PRICE_PER_MB_USD = parseFloat(process.env.STRIPE_PRICE_PER_MB_USD || '0.05');
  const MIN_PRICE_USD = parseFloat(process.env.STRIPE_MIN_PRICE_USD || '1.00');
  
  const sizeMB = sizeBytes / (1024 * 1024);
  const priceUSD = Math.max(MIN_PRICE_USD, PRICE_PER_MB_USD * sizeMB);
  
  // Convert to cents
  return Math.round(priceUSD * 100);
}

/**
 * Attach Arweave transaction ID to a Stripe PaymentIntent's metadata
 * @param sessionId - The Stripe checkout session ID
 * @param arweaveTxId - The Arweave transaction ID to attach
 */
export async function attachArweaveTxToPayment(sessionId: string, arweaveTxId: string): Promise<void> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session.payment_intent) {
      console.error('[STRIPE] No payment intent found for session:', sessionId);
      return;
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent.id;

    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        arweave_tx_id: arweaveTxId,
        arweave_url: `https://arweave.net/${arweaveTxId}`,
      },
    });

    console.log('[STRIPE] Attached Arweave tx to payment intent:', { paymentIntentId, arweaveTxId });
  } catch (error) {
    console.error('[STRIPE] Failed to attach Arweave tx to payment:', error);
  }
}

/**
 * Refund a payment for a failed upload
 * @param sessionId - The Stripe checkout session ID
 * @returns The refund object or null if refund failed
 */
export async function refundPaymentForFailedUpload(sessionId: string): Promise<Stripe.Refund | null> {
  try {
    console.log('[STRIPE-REFUND] Attempting to refund payment for session:', sessionId);
    
    // Retrieve the checkout session to get the payment intent
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session.payment_intent) {
      console.error('[STRIPE-REFUND] No payment intent found in session');
      return null;
    }
    
    const paymentIntentId = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : session.payment_intent.id;
    
    console.log('[STRIPE-REFUND] Creating refund for payment intent:', paymentIntentId);
    
    // Create a full refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        reason: 'upload_failed',
        session_id: sessionId,
      },
    });
    
    console.log('[STRIPE-REFUND] Refund created successfully:', refund.id);
    return refund;
  } catch (error) {
    console.error('[STRIPE-REFUND] Failed to create refund:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[STRIPE-REFUND] Error details:', errorMessage);
    return null;
  }
}