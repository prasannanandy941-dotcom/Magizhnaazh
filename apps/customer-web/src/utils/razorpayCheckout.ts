import { createRazorpayOrder, verifyRazorpayPayment } from '../api';
import { loadRazorpayCheckout } from './loadRazorpay';

// Shared "pay a booking via Razorpay" sequence used for both the initial
// advance payment (App.tsx, right after a booking is created) and a balance
// payment later (MyOrders.tsx) — order creation, opening Checkout, and
// server-side verification are identical either way; only the `type` and the
// booking id differ.
export async function payBookingWithRazorpay(
  bookingId: string,
  type: 'advance' | 'balance',
  opts: {
    onSuccess: (booking: any) => void;
    onDismiss?: () => void;
    onError?: (message: string) => void;
  }
): Promise<void> {
  try {
    const orderRes = await createRazorpayOrder(bookingId, type);
    if (!orderRes.success || !orderRes.data) {
      opts.onError?.(orderRes.message || 'Could not start payment. Please try again.');
      return;
    }

    // The vendor's policy requires no advance/balance — the server already
    // confirmed the booking directly, so there's nothing to check out for.
    if (orderRes.data.noPaymentNeeded) {
      opts.onSuccess(orderRes.data.booking);
      return;
    }

    const scriptLoaded = await loadRazorpayCheckout();
    if (!scriptLoaded || !window.Razorpay) {
      opts.onError?.('Could not load the payment window. Check your connection and try again.');
      return;
    }

    const { orderId, amount, currency, keyId, name, description, prefill } = orderRes.data;
    const rzp = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      name: name || 'Magizhnaazh',
      description,
      order_id: orderId,
      prefill,
      theme: { color: '#10b981' },
      handler: async (response: any) => {
        try {
          const verifyRes = await verifyRazorpayPayment(bookingId, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            type,
          });
          if (verifyRes.success && verifyRes.data?.booking) {
            opts.onSuccess(verifyRes.data.booking);
          } else {
            opts.onError?.(verifyRes.message || 'Payment could not be verified. Contact support with your payment ID.');
          }
        } catch (err: any) {
          opts.onError?.(err?.message || 'Payment could not be verified. Contact support with your payment ID.');
        }
      },
      modal: {
        // Customer closed the checkout without paying — nothing to roll back:
        // no ledger entry is ever written until a verified payment exists, so
        // the booking is untouched and safe to retry.
        ondismiss: () => opts.onDismiss?.(),
      },
    });
    rzp.open();
  } catch (err: any) {
    opts.onError?.(err?.message || 'Could not start payment. Please try again.');
  }
}
