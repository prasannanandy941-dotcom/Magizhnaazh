// Lazily loads Razorpay's Checkout script on first use, rather than eagerly
// in index.html, so pages that never touch payment don't pay for a
// third-party script load.
declare global {
  interface Window {
    Razorpay?: any;
  }
}

let loadPromise: Promise<boolean> | null = null;

export function loadRazorpayCheckout(): Promise<boolean> {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve(true);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => {
      loadPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return loadPromise;
}
