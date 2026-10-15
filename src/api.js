const API_BASE = (import.meta.env?.VITE_API_URL || '/freshme/api').replace(/\/+$/, '');

export const formatImageUrl = url => {
  if (!url) return '';
  if (url.startsWith('/api/')) return `/freshme${url}`;
  return url;
};

export async function api(path, options = {}) {
  let response;
  const isCrossOrigin = API_BASE.startsWith('http');
  try { response = await fetch(`${API_BASE}${path}`, { credentials: isCrossOrigin ? 'include' : 'same-origin', ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers }, body: options.body instanceof FormData ? options.body : options.body === undefined ? undefined : JSON.stringify(options.body), signal: options.signal || AbortSignal.timeout(20000) }); }
  catch { throw new Error(navigator.onLine ? 'The connection is taking a little longer. Please try again.' : 'You’re offline. Reconnect and try again.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error || 'Something went wrong. Please try again.'); error.status = response.status; throw error; }
  return data;
}
export const money = n => `Rs.${Number(n || 0).toLocaleString('en-IN')}`;
export const dateTime = date => new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function storageGet(key, fallback = null, session = false) { try { return JSON.parse((session ? sessionStorage : localStorage).getItem(key)) ?? fallback; } catch { return fallback; } }
export function storageSet(key, value, session = false) { try { (session ? sessionStorage : localStorage).setItem(key, JSON.stringify(value)); } catch { /* Browsing remains usable when storage is unavailable. */ } }
let checkoutScript;
export function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScript) checkoutScript = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true;
    const timeout = setTimeout(() => { script.remove(); checkoutScript = null; reject(new Error('Payment checkout could not load. Please retry.')); }, 15000);
    script.onload = () => { clearTimeout(timeout); resolve(); }; script.onerror = () => { clearTimeout(timeout); script.remove(); checkoutScript = null; reject(new Error('Payment checkout could not load. Check your connection and retry.')); }; document.head.appendChild(script);
  });
  return checkoutScript;
}
