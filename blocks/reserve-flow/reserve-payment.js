/*
 * PayU Hosted Checkout handoff for the reserve flow.
 *
 * The browser never sees the PayU merchant salt and never decides the amount.
 * JSW's reservation API:
 *   1. POST {api}/payments        creates the reservation + PayU transaction and
 *                                 returns the signed PayU form fields
 *   2. (PayU posts the result to the API's surl/furl; the API verifies the
 *       response hash, confirms with PayU's verify_payment API and redirects
 *       the buyer to the returnUrl sent in step 1, the status page:
 *       /reserve/status?payment=<success|pending|error>&txnid=<txnid>)
 *   3. GET  {api}/payments/{txnid} returns the verified status for display
 *
 * See docs/payu-integration.md for the full contract.
 */

const PAYU_HOSTS = ['secure.payu.in', 'test.payu.in'];
const STATUSES = ['success', 'pending', 'failed'];
const TIMEOUT_MS = 15000;

export class PaymentError extends Error {}

/** Normalise any status string to success | pending | failed. */
export function normaliseStatus(status) {
  const s = String(status || '').toLowerCase();
  if (STATUSES.includes(s)) return s;
  if (['failure', 'failed', 'error', 'usercancelled', 'cancelled', 'dropped', 'bounced'].includes(s)) return 'failed';
  // anything unknown is treated as pending: the buyer is told not to pay again
  return 'pending';
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      ...options,
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      signal: controller.signal,
    });
    let body = null;
    try {
      body = await resp.json();
    } catch (e) { /* empty or non-JSON body */ }
    if (!resp.ok) {
      throw new PaymentError((body && body.message) || `Request failed (${resp.status})`);
    }
    return body || {};
  } catch (e) {
    if (e instanceof PaymentError) throw e;
    throw new PaymentError(e.name === 'AbortError' ? 'Request timed out' : e.message);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ask the reservation API to create a PayU transaction.
 * @param {string} api API base URL
 * @param {object} order buyer details and configuration (no amount)
 * @param {string} [returnUrl] where the API sends the buyer back (the status page)
 * @returns {Promise<{txnid: string, action: string, params: object}>}
 */
export async function createPayment(api, order, returnUrl = `${window.location.origin}${window.location.pathname}`) {
  const data = await request(`${api.replace(/\/$/, '')}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...order, returnUrl }),
  });
  if (!data.action || !data.params || !data.params.hash || !data.params.txnid) {
    throw new PaymentError('Incomplete payment response');
  }
  return { txnid: data.params.txnid, action: data.action, params: data.params };
}

/**
 * Get the verified status of a transaction from the reservation API.
 * @returns {Promise<{status: string, firstName?: string, email?: string}>}
 */
export async function getPaymentStatus(api, txnid) {
  const data = await request(`${api.replace(/\/$/, '')}/payments/${encodeURIComponent(txnid)}`);
  return { ...data, status: normaliseStatus(data.status) };
}

/**
 * Send the buyer to PayU by POSTing the signed fields. Refuses any action URL
 * that is not a PayU checkout host.
 */
export function redirectToPayU(action, params) {
  let url;
  try {
    url = new URL(action);
  } catch (e) {
    throw new PaymentError('Invalid payment URL');
  }
  if (url.protocol !== 'https:' || !PAYU_HOSTS.includes(url.hostname)) {
    throw new PaymentError('Unexpected payment URL');
  }
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url.href;
  form.hidden = true;
  Object.entries(params).forEach(([name, value]) => {
    if (value === undefined || value === null) return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = String(value);
    form.append(input);
  });
  document.body.append(form);
  form.submit();
}
