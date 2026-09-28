import crypto from 'crypto';
import Razorpay from 'razorpay';

let instance: Razorpay | null = null;

export function getRazorpayInstance(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing in environment.');
  }
  if (!instance) instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return instance;
}

export interface RouteTransfer {
  account: string;
  amount: number; // paise
  currency?: string;
  notes?: Record<string, string>;
  on_hold?: boolean;
}

export interface CreateOrderParams {
  amountPaise: number;
  currency?: string;
  receipt: string;
  transfers?: RouteTransfer[];
  notes?: Record<string, string>;
}

// Creates a Razorpay order for the exact amount due. When `transfers` is
// supplied AND the vendor's Route account is fully active, Razorpay
// auto-splits the vendor's share to their linked account the moment the
// payment captures — otherwise the whole amount lands in the platform's own
// balance, same as the existing manual-settlement assumption.
export async function createMarketplaceOrder(params: CreateOrderParams) {
  const razorpay = getRazorpayInstance();
  const payload: any = {
    amount: Math.round(params.amountPaise),
    currency: params.currency || 'INR',
    receipt: params.receipt,
    notes: params.notes || {},
  };
  if (params.transfers && params.transfers.length > 0) {
    payload.transfers = params.transfers.map((t) => ({
      account: t.account,
      amount: Math.round(t.amount),
      currency: t.currency || 'INR',
      notes: t.notes || {},
      on_hold: t.on_hold ? 1 : 0,
    }));
  }
  return razorpay.orders.create(payload);
}

// The Route transfers Razorpay created off one captured payment (the vendor's
// share). Empty when the payment had no transfer attached.
export async function fetchPaymentTransfers(paymentId: string): Promise<any[]> {
  const res: any = await getRazorpayInstance().payments.fetchTransfer(paymentId);
  return Array.isArray(res?.items) ? res.items : [];
}

// A linked account's settlement (Razorpay -> vendor's bank), for its UTR. The
// SDK can't send the X-Razorpay-Account header this call needs, so it goes over
// plain HTTP. Best-effort: returns null on any failure.
export async function fetchLinkedAccountSettlement(settlementId: string, accountId: string): Promise<{ utr?: string; createdAt?: number } | null> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || !settlementId || !accountId) return null;
  try {
    const r = await fetch(`https://api.razorpay.com/v1/settlements/${settlementId}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'X-Razorpay-Account': accountId,
      },
    });
    if (!r.ok) return null;
    const s: any = await r.json();
    return { utr: s?.utr || undefined, createdAt: s?.created_at };
  } catch {
    return null;
  }
}

export function verifyPaymentSignature(params: { orderId: string; paymentId: string; signature: string }): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !params.orderId || !params.paymentId || !params.signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(params.signature, 'utf8'));
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(params: { rawBody: Buffer | string; signature: string }): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !params.signature) return false;
  const bodyString = Buffer.isBuffer(params.rawBody) ? params.rawBody.toString('utf8') : params.rawBody;
  const expected = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(params.signature, 'utf8'));
  } catch {
    return false;
  }
}
