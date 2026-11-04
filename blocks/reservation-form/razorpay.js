/*
 * Razorpay Standard Checkout, in the browser only (no backend): Razorpay's own window takes the
 * card / UPI / netbanking details and shows every step of the payment (loading, OTP and bank
 * verification, errors). Only the public Key ID is used; the Key Secret never belongs here.
 * https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
 */

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

// how long Razorpay's window may take to appear (slow connections included)
const OPEN_TIMEOUT = 15000;

// a Razorpay Key ID: rzp_test_… (test mode) or rzp_live_… (live)
export const KEY_ID = /^rzp_(test|live)_[A-Za-z0-9]+$/;

let loading;

/**
 * loads Razorpay's checkout script once (on first use, not with the page)
 * @returns {Promise<Function>} the Razorpay constructor
 */
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SRC;
      script.async = true;
      script.onload = () => (window.Razorpay
        ? resolve(window.Razorpay) : reject(new Error('Razorpay checkout did not start')));
      script.onerror = () => {
        loading = null;
        script.remove();
        reject(new Error('Razorpay checkout could not be loaded'));
      };
      document.head.append(script);
    });
  }
  return loading;
}

/**
 * opens the Razorpay payment window and waits for its outcome
 * @param {Object} options Razorpay checkout options (key, amount in paise, currency, name, …)
 * @returns {Promise<{status: 'success', response: Object}
 *   | {status: 'failed', error: Object} | {status: 'dismissed'}>}
 *   success: razorpay_payment_id (and order/signature when an order is used);
 *   failed: Razorpay's error (code, description, reason, …); dismissed: closed without paying
 */
export async function payWithRazorpay(options) {
  const Razorpay = await loadRazorpay();
  return new Promise((resolve) => {
    let settled = false;
    const done = (outcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };
    const checkout = new Razorpay({
      ...options,
      handler: (response) => done({ status: 'success', response }),
      modal: { ...options.modal, ondismiss: () => done({ status: 'dismissed' }) },
    });
    checkout.on('payment.failed', ({ error } = {}) => {
      done({ status: 'failed', error: error || {} });
      try {
        checkout.close();
      } catch (e) { /* already closed */ }
    });
    checkout.open();

    // Razorpay's window not showing while nothing is decided (a wrong Key ID is turned down
    // with no message: the window shows its loader, then hides): a failure once it has been
    // hidden for OPEN_TIMEOUT, so the visitor is not left waiting
    let lastSeen = Date.now();
    const watch = setInterval(() => {
      if (settled) {
        clearInterval(watch);
        return;
      }
      const container = document.querySelector('.razorpay-container');
      if (container && getComputedStyle(container).display !== 'none') lastSeen = Date.now();
      if (Date.now() - lastSeen < OPEN_TIMEOUT) return;
      clearInterval(watch);
      done({ status: 'failed', error: { code: 'CHECKOUT_NOT_OPENED', description: 'Razorpay did not open: check the Key ID' } });
      try {
        checkout.close();
      } catch (e) { /* not open */ }
    }, 500);
  });
}
