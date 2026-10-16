import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock3, CreditCard, Lock, Minus, Plus, Printer, ShieldCheck, ShoppingBag, Snowflake, Sparkles, Ticket, Trash2, X } from 'lucide-react';
import { api, money, dateTime, loadCheckout, storageGet, storageSet, formatImageUrl } from './api.js';
import { Brand, Cup, Header, ErrorNotice, Skeleton, Modal, Empty, unlockScroll } from './components.jsx';
import logoImg from './assets/logo.png';
import { validPhone,checkoutPayload,cartTotal,orderPath,menuPath,changeSize as resizedCart } from './flow.js';
const descriptions = { 'Kala Khatta': 'Tangy. Bold. A true original.', 'Blue Raspberry': 'A little blue, a lot of wow.', 'Green Apple': 'Crisp, zingy & oh-so-cool.', Orange: 'Sunshine in every icy sip.', Cola: 'Your classic, with a cool twist.', Mango: 'The king of summer. On ice.' };

function PaymentPortal({ order, busy, onConfirm, onFail, onCancel }) {
  const [method, setMethod] = useState('upi');
  return (
    <div className="payment-portal-overlay" role="dialog" aria-modal="true" aria-label="Fresh Me Secure Checkout">
      <div className="payment-portal-card">
        <div className="portal-header">
          <div className="portal-brand">
            <img src={logoImg} alt="Fresh Me" className="portal-logo-img" />
            <span className="portal-secure"><Lock size={12}/> 256-bit SSL Secure</span>
          </div>
          <button type="button" className="portal-close" disabled={busy} onClick={onCancel} aria-label="Cancel payment">
            <X size={18}/>
          </button>
        </div>

        <div className="portal-body">
          <div className="portal-amount-banner">
            <span className="portal-amount-label">TOTAL PAYABLE AMOUNT</span>
            <div className="portal-amount-value">{money(order.amount / 100)}</div>
            <div className="portal-order-pills">
              <span className="portal-pill">Order #{order.orderId.slice(-6).toUpperCase()}</span>
              {order.phone && <span className="portal-pill">📱 {order.phone}</span>}
              <span className="portal-pill test-pill">🧪 Demo Mode Active</span>
            </div>
          </div>

          <div className="portal-sandbox-card">
            <div className="sandbox-header">
              <Sparkles size={16}/>
              <strong>Simulated Payment Gateway Active</strong>
            </div>
            <p>Testing checkout seamlessly without real bank deduction. Choose your payment method below and authorize instantly.</p>
          </div>

          <div className="portal-methods-group">
            <span className="methods-heading">Select Payment Method:</span>

            <button
              type="button"
              className={`portal-method-card ${method === 'upi' ? 'active' : ''}`}
              onClick={() => setMethod('upi')}
            >
              <div className="method-info">
                <span className="method-radio-dot" />
                <div className="method-text">
                  <div className="method-title-row">
                    <strong>⚡ Instant UPI & QR</strong>
                    <span className="instant-badge">Fastest</span>
                  </div>
                  <small>Google Pay · PhonePe · Paytm · BHIM</small>
                </div>
              </div>
            </button>

            <button
              type="button"
              className={`portal-method-card ${method === 'card' ? 'active' : ''}`}
              onClick={() => setMethod('card')}
            >
              <div className="method-info">
                <span className="method-radio-dot" />
                <div className="method-text">
                  <div className="method-title-row">
                    <strong>💳 Debit & Credit Card</strong>
                  </div>
                  <small>Visa · Mastercard · RuPay</small>
                </div>
              </div>
            </button>

            <button
              type="button"
              className={`portal-method-card ${method === 'netbanking' ? 'active' : ''}`}
              onClick={() => setMethod('netbanking')}
            >
              <div className="method-info">
                <span className="method-radio-dot" />
                <div className="method-text">
                  <div className="method-title-row">
                    <strong>🏦 NetBanking & Wallets</strong>
                  </div>
                  <small>All Indian banks & digital wallets</small>
                </div>
              </div>
            </button>
          </div>

          <div className="portal-actions-area">
            <button
              type="button"
              className="portal-pay-btn"
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? (
                <>
                  <span className="portal-spinner" />
                  <span>Authorizing payment...</span>
                </>
              ) : (
                <>
                  <Check size={20}/>
                  <span>Authorize & Pay {money(order.amount / 100)}</span>
                  <ArrowRight size={18}/>
                </>
              )}
            </button>

            <div className="portal-sub-actions">
              <button
                type="button"
                className="portal-fail-btn"
                disabled={busy}
                onClick={onFail}
              >
                ✕ Simulate Failure
              </button>
              <button
                type="button"
                className="portal-cancel-btn"
                disabled={busy}
                onClick={onCancel}
              >
                ← Return to Tray
              </button>
            </div>
          </div>
        </div>

        <div className="portal-footer">
          <ShieldCheck size={14}/>
          <span>Safe payments · Automated dispenser token issued immediately</span>
        </div>
      </div>
    </div>
  );
}
export function Menu() {
  const location=useLocation();
  const navigate = useNavigate(); const [menu, setMenu] = useState(null); const [error, setError] = useState(''); const [category, setCategory] = useState('All flavors');
  const [cart, setCart] = useState(() => storageGet('freshme-cart', [], true)); const [open, setOpen] = useState(false); const [drop, setDrop] = useState(''); const [toast, setToast] = useState('');
  const [paymentState, setPaymentState] = useState(''); const [busy, setBusy] = useState(false); const busyRef = useRef(false);
  const [demoOrder, setDemoOrder] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const checkout = useRef(storageGet('freshme-checkout', null, true));
  async function refresh() { try { const data = await api('/menu'); setMenu(data); setError(''); } catch (e) { setError(e.message); } }
  useEffect(() => {
    refresh();
    const id = storageGet('freshme-last-order');
    if (id) {
      api(`/orders/${id}`).then(o => {
        const age = Date.now() - new Date(o.createdAt).getTime();
        if (age < 30 * 60 * 1000 && ['PAID', 'PENDING_PAYMENT'].includes(o.status)) {
          setActiveOrder(o);
        } else {
          storageSet('freshme-last-order', null);
        }
      }).catch(() => {
        storageSet('freshme-last-order', null);
      });
    }
  }, []);
  useEffect(() => {
    if (!menu?.products?.length) return;
    setCart(currentCart => {
      if (!currentCart?.length) return currentCart;
      let changed = false;
      const reconciled = currentCart.map(item => {
        const p = menu.products.find(prod => prod._id === item.productId);
        if (!p || !p.available || !p.sizes?.length) {
          changed = true;
          return null;
        }
        const sizeObj = p.sizes.find(s => s.label === item.size) || p.sizes[0];
        if (sizeObj.label !== item.size || sizeObj.price !== item.price) {
          changed = true;
          return { ...item, size: sizeObj.label, price: sizeObj.price, name: p.name, color: p.flavorColor };
        }
        return item;
      }).filter(Boolean);
      return changed ? reconciled : currentCart;
    });
  }, [menu]);
  useEffect(() => { if (!open && !demoOrder && !busy) unlockScroll(); }, [open, demoOrder, busy]);
  useEffect(() => { storageSet('freshme-cart', cart, true); }, [cart]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 1800); return () => clearTimeout(t); }, [toast]);
  const total = cartTotal(cart); const count = cart.reduce((sum, i) => sum + i.qty, 0);
  function invalidate() { checkout.current = null; storageSet('freshme-checkout',null,true); setPaymentState(''); }
  function changeCart(next) { invalidate(); setCart(next); }
  function add(p) {
    const size = p.sizes[0]; const existing = cart.find(i => i.productId === p._id && i.size === size.label);
    if (existing?.qty >= 20) return;
    changeCart(existing ? cart.map(i => i === existing ? { ...i, qty: i.qty + 1 } : i) : [...cart, { productId: p._id, name: p.name, color: p.flavorColor, size: size.label, price: size.price, qty: 1 }]);
    setDrop(p._id); setToast(`${p.name} dropped into your tray`); setTimeout(() => setDrop(''), 550);
  }
  function remove(p) {
    const existingIndex = cart.map(i => i.productId).lastIndexOf(p._id);
    if (existingIndex === -1) return;
    const existing = cart[existingIndex];
    if (existing.qty > 1) {
      changeCart(cart.map((item, idx) => idx === existingIndex ? { ...item, qty: item.qty - 1 } : item));
    } else {
      changeCart(cart.filter((_, idx) => idx !== existingIndex));
      setToast(`${p.name} removed from your tray`);
    }
  }
  function changeSize(index, label) {
    const current = cart[index]; const size = menu.products.find(p => p._id === current.productId)?.sizes.find(s => s.label === label); if (!size) return;
    changeCart(resizedCart(cart,index,size));
  }
  async function pay(e) {
    e?.preventDefault(); if (busyRef.current || !cart.length) return;
    busyRef.current = true; setBusy(true); setPaymentState(''); setError('');
    try {
      const payload = checkoutPayload(cart);
      const fingerprint = JSON.stringify(payload);
      if (!checkout.current || checkout.current.fingerprint !== fingerprint) checkout.current = { fingerprint, idempotencyKey: crypto.randomUUID() };
      storageSet('freshme-checkout', checkout.current, true);
      let order;
      try {
        order = await api('/orders', { method: 'POST', body: { ...payload, idempotencyKey: checkout.current.idempotencyKey } });
      } catch (e) {
        if (e.status !== 410) throw e;
        checkout.current = { fingerprint, idempotencyKey: crypto.randomUUID() };
        storageSet('freshme-checkout', checkout.current, true);
        order = await api('/orders', { method: 'POST', body: { ...payload, idempotencyKey: checkout.current.idempotencyKey } });
      }
      storageSet('freshme-last-order', order.orderId);
      if (['PAID','SERVED'].includes(order.status)) { navigate(orderPath(order.orderId)); return; }
      if (order.isDemo) {
        setOpen(false);
        setDemoOrder(order);
        setBusy(false);
        busyRef.current = false;
        return;
      }
      await loadCheckout();
      setOpen(false);
      let settled = false;
      const razorpay = new window.Razorpay({ key: order.keyId, amount: order.amount, currency: 'INR', name: menu?.settings?.shopName || 'Fresh Me', description: 'Sip and chill.', order_id: order.razorpayOrderId, theme: { color: '#d91b65', backdrop_color: '#0b2545' },
        handler: async response => {
          settled = true;
          unlockScroll();
          const verification = { orderId: order.orderId, razorpayOrderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature };
          storageSet('freshme-verification', verification, true);
          storageSet('freshme-cart', [], true);
          storageSet('freshme-last-order', order.orderId);
          busyRef.current = false;
          setBusy(false);
          navigate(orderPath(order.orderId), { state: { verification } });
        },
        modal: {
          backdropclose: false,
          escape: true,
          confirm_close: true,
          animation: true,
          ondismiss: async () => {
            unlockScroll();
            if (!settled) {
              setBusy(true);
              busyRef.current = true;
              try {
                const check = await api(`/orders/${order.orderId}`);
                if (['PAID', 'SERVED'].includes(check.status)) {
                  settled = true;
                  storageSet('freshme-cart', [], true);
                  storageSet('freshme-last-order', order.orderId);
                  busyRef.current = false;
                  setBusy(false);
                  navigate(orderPath(order.orderId));
                  return;
                }
              } catch {}
              setOpen(true);
              setPaymentState('cancelled');
              busyRef.current = false;
              setBusy(false);
            }
          }
        }
      });
      razorpay.on('payment.failed', response => { settled = true; razorpay.close(); unlockScroll(); setOpen(true); setPaymentState('failed'); setError(response?.error?.description || "Payment didn't go through"); busyRef.current = false; setBusy(false); });
      razorpay.open();
    } catch (e) { unlockScroll(); setOpen(true); setError(e.message); setPaymentState('failed'); busyRef.current = false; setBusy(false); }
  }
  const categories = ['All flavors', ...new Set(menu?.products.map(p => p.category) || [])];
  if(!menu && error)return <><Header/><Empty title="Menu unavailable"><ErrorNotice message={error} retry={refresh}/></Empty></>;
  if (menu && !menu.settings.acceptingOrders) return <><Header shopName={menu.settings.shopName}/><Empty title="Shop is resting, back soon"><Cup className="resting-cup"/><span>We're taking a little chill break. Your next happy sip is on its way.</span><button className="primary" onClick={refresh}>Check again</button>{storageGet('freshme-last-order') && <Link to={orderPath(storageGet('freshme-last-order'))}>View my token</Link>}</Empty></>;
  return <div className="store-page"><Header shopName={menu?.settings.shopName}/>{activeOrder && (
    <button type="button" className="active-order-banner" onClick={() => navigate(orderPath(activeOrder.orderId))}>
      <span className="active-order-badge">Active Order</span>
      <span>{activeOrder.status === 'PAID' ? `Token #${String(activeOrder.tokenNo).padStart(3, '0')} · Tap to view receipt` : 'Payment in progress · Tap to view token'}</span>
      <ArrowRight size={16} />
    </button>
  )}<main className="store-main">
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span/> SIP AND CHILL</div>
        <h1>Big chill.<br/><span>Bigger smiles.</span><svg viewBox="0 0 310 16" aria-hidden="true"><path d="M5 11Q155-7 303 9" fill="none" stroke="#ffcc46" strokeWidth="7" strokeLinecap="round"/></svg></h1>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="hero-orbit"/>
        <Cup color="#00aee7" className="hero-cup blue"/>
        <Cup color="#ed3679" className="hero-cup pink"/>
        <span className="chill-sticker">100%<br/><b>CHILL</b></span>
      </div>
    </section>
    <section id="flavors" className="menu-section" aria-labelledby="flavors-title"><h2 id="flavors-title" className="sr-only">Choose a flavor</h2><nav className="category-tabs" aria-label="Flavor categories">{categories.map(c => <button key={c} className={category === c ? 'selected' : ''} aria-pressed={category === c} onClick={() => setCategory(c)}>{c === 'All flavors' && <Snowflake size={16}/>} {c}</button>)}</nav>
    {!open && <ErrorNotice message={error} retry={refresh}/>}{!menu ? <Skeleton/> : <div className="product-grid">{menu.products.filter(p => category === 'All flavors' || p.category === category).map((p, index) => { const pQty = cart.filter(i => i.productId === p._id).reduce((sum, i) => sum + i.qty, 0); return <article key={p._id} className={`product-slot ${!p.available ? 'sold-out' : ''} ${drop === p._id ? 'dropping' : ''}`} style={{ '--flavor': p.flavorColor, '--i': index }}><div className="slot-art">{!p.available && <span className="sold-ribbon">SOLD OUT</span>}{p.imageUrl ? <img src={formatImageUrl(p.imageUrl)} alt={`${p.name} slush`} loading="lazy" width="180" height="190"/> : <Cup color={p.flavorColor}/>}<div className="slot-shelf"/></div><div className="slot-info"><h3>{p.name}</h3><p>{descriptions[p.name] || 'A fresh little burst of happiness.'}</p><div className="slot-bottom"><span>from <b>{money(Math.min(...p.sizes.map(s => s.price)))}</b></span>{pQty > 0 ? <div className="card-stepper" role="group" aria-label={`Quantity for ${p.name}`}><button type="button" disabled={busy} onClick={() => remove(p)} aria-label={`Remove one ${p.name}`} className="stepper-btn minus">{pQty === 1 ? <Trash2 size={14}/> : <Minus size={15}/>}</button><span className="stepper-qty">{pQty}</span><button type="button" disabled={busy || pQty >= 20} onClick={() => add(p)} aria-label={`Add one ${p.name}`} className="stepper-btn plus"><Plus size={15}/></button></div> : <button disabled={!p.available || busy} onClick={() => add(p)} aria-label={`Add ${p.name}`} className="add-button">{drop === p._id ? <Check size={18}/> : <Plus size={18}/>}</button>}</div></div></article>; })}</div>}{menu?.products.length === 0 && <Empty embedded title="Fresh flavors are on their way">Check back in a little while.</Empty>}</section>
    <div className="goodness-note"><Snowflake/><span>Good vibes. Great slush. <b>That's Fresh Me.</b></span><Snowflake/></div>
  </main>{toast && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
  {!open && !busy && count > 0 && <section className="cart-dock" aria-label="Shopping tray"><div className="cart-display"><div className="cart-count"><ShoppingBag size={21}/><span>{count}</span></div><div className="cart-total"><span>{`${count} ${count === 1 ? 'drink' : 'drinks'} in your tray`}</span><b className="digital">{money(total)}</b></div><button className="primary cart-pay" onClick={() => setOpen(true)}>Pay <ArrowRight size={18}/></button></div><span className="dock-caption"><ShieldCheck size={12}/> Safe payments. Happy sipping.</span></section>}
  {open && <Modal title="Your happy little tray" close={() => !busy && setOpen(false)} className="cart-sheet"><form onSubmit={pay} className="cart-form"><div className="cart-items">{cart.map((i, index) => <div className="cart-item" key={`${i.productId}-${i.size}`}><Cup color={i.color} className="cart-cup"/><div className="cart-item-main"><div className="cart-item-top"><h3>{i.name}</h3><button type="button" className="icon-button" aria-label={`Remove ${i.name}`} disabled={busy} onClick={() => changeCart(cart.filter((_, j) => j !== index))}><Trash2 size={17}/></button></div><div className="size-chips">{menu.products.find(p => p._id === i.productId)?.sizes.map(s => <button type="button" key={s.label} disabled={busy} className={s.label === i.size ? 'active' : ''} onClick={() => changeSize(index, s.label)}>{s.label}</button>)}</div><div className="qty-row"><div className="stepper"><button type="button" disabled={busy || i.qty <= 1} aria-label={`Decrease ${i.name}`} onClick={() => changeCart(cart.map((x,j) => j === index ? { ...x, qty: x.qty - 1 } : x))}><Minus size={15}/></button><b>{i.qty}</b><button type="button" disabled={busy || i.qty >= 20} aria-label={`Increase ${i.name}`} onClick={() => changeCart(cart.map((x,j) => j === index ? { ...x, qty: x.qty + 1 } : x))}><Plus size={15}/></button></div><strong>{money(i.qty * i.price)}</strong></div></div></div>)}{!cart.length && <p className="empty-cart">Your tray is waiting for a little happiness.</p>}{paymentState && <div className="notice" role="status"><strong>{paymentState === 'cancelled' ? 'Checkout cancelled' : "Payment didn't go through"}</strong><p>{paymentState === 'cancelled' ? 'Your tray is saved. Ready when you are.' : 'You can retry safely with the same checkout. If money was deducted, check your token before paying again.'}</p>{storageGet('freshme-last-order') && <Link to={orderPath(storageGet('freshme-last-order'))}>Check payment status</Link>}</div>}<ErrorNotice message={error}/></div><div className="checkout-footer"><div className="checkout-total"><span>Total happiness</span><strong>{money(total)}</strong></div><button type="submit" className="primary full" disabled={busy || !cart.length}><CreditCard size={18}/>{busy ? 'Opening secure checkout…' : `${paymentState ? 'Retry · ' : 'Pay '}${money(total)}`}<ArrowRight size={18}/></button><p className="secure-note"><ShieldCheck size={14}/> {menu?.settings?.isDemo ? 'Local Test Mode · Simulated Checkout' : 'Secure checkout by Razorpay'}</p></div></form></Modal>}
  {demoOrder && <PaymentPortal
    order={demoOrder}
    busy={busy}
    onConfirm={async () => {
      setBusy(true);
      busyRef.current = true;
      try {
        await api('/payments/demo-confirm', { method: 'POST', body: { orderId: demoOrder.orderId } });
        storageSet('freshme-cart', [], true);
        setDemoOrder(null);
        setOpen(false);
        navigate(orderPath(demoOrder.orderId));
      } catch (err) {
        setError(err.message);
        setDemoOrder(null);
        setPaymentState('failed');
        setOpen(true);
      } finally {
        setBusy(false);
        busyRef.current = false;
      }
    }}
    onFail={() => {
      setDemoOrder(null);
      setPaymentState('failed');
      setOpen(true);
    }}
    onCancel={() => {
      setDemoOrder(null);
      setPaymentState('cancelled');
      setOpen(true);
    }}
  />}
  </div>;
}
export function Token() {
  const { id } = useParams(); const [order, setOrder] = useState(null); const [error, setError] = useState(''); const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { unlockScroll(); window.scrollTo(0, 0); }, []);
  useEffect(() => {
    storageSet('freshme-last-order', id); let cancelled = false; let timer; let attempts = 0; let currentStatus; let lastVerification=0;
    let pendingVerification=location.state?.verification || storageGet('freshme-verification',null,true);
    async function poll() {
      try {
        const pending = pendingVerification;
        if (pending?.orderId === id && Date.now()-lastVerification>=12000) {
          lastVerification=Date.now();
          try {
            const verifyRes = await api('/payments/verify', { method: 'POST', body: pending });
            storageSet('freshme-verification', null, true);
            pendingVerification=null;
            if (verifyRes && ['PAID', 'SERVED'].includes(verifyRes.status)) {
              storageSet('freshme-cart', [], true);
              storageSet('freshme-checkout', null, true);
            }
          } catch { /* Auto-reconciliation on GET /api/orders/:id will handle fallback */ }
        }
        const data = await api(`/orders/${id}`);
        currentStatus=data.status;
        if (!cancelled) {
          setOrder(data);
          setError('');
          unlockScroll();
          if (['PAID', 'SERVED'].includes(data.status)) {
            storageSet('freshme-cart', [], true);
            storageSet('freshme-checkout', null, true);
            storageSet('freshme-verification', null, true);
            pendingVerification=null;
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
        if (e.status === 404) {
          storageSet('freshme-last-order', null);
          return;
        }
      } finally {
        attempts++;
        if (!cancelled && currentStatus !== undefined) {
          const isDone = ['PAID', 'SERVED'].includes(currentStatus);
          const nextInterval = isDone ? 6000 : (attempts < 15 ? 1200 : 3000);
          timer = setTimeout(poll, nextInterval);
        }
      }
    }
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [id]);
  const paid = ['PAID','SERVED'].includes(order?.status);
  function browse() { unlockScroll(); navigate(menuPath(), {state:{browse:true}}); }
  return (
    <div className="token-page">
      <Header shopName={order?.shopName}/>
      <main className="token-main">
        <button className="back-link" onClick={browse}><ArrowLeft size={16}/> Back to flavors</button>
        <ErrorNotice message={error}/>
        {!order
          ? <div className="ticket skeleton token-skeleton"/>
          : <>
              <div className="token-intro">
                <span className={`success-icon${paid ? ' paid' : ''}`}>
                  {paid ? <Check size={22}/> : <Clock3 size={22}/>}
                </span>
                <h1>{order.status === 'SERVED' ? "Now that's a happy sip!" : paid ? 'Your chill is on its way!' : order.status === 'EXPIRED' ? 'This checkout has expired' : 'Checking your payment\u2026'}</h1>
                <p>{paid ? 'Your order is confirmed. Show the token below at the counter.' : 'If your payment completed, your token will appear here automatically.'}</p>
              </div>

              <div className="ticket">
                <div className="ticket-top">
                  <Brand compact to={menuPath()}/>
                  <span><Ticket size={16}/> YOUR HAPPY TICKET</span>
                  <p>{paid ? 'TOKEN NUMBER' : 'PAYMENT STATUS'}</p>
                  <div className={`token-number digital${!paid ? ' pending-number' : ''}`}>
                    {paid ? String(order.tokenNo).padStart(3,'0') : order.status === 'EXPIRED' ? 'EXPIRED' : 'HOLD TIGHT'}
                  </div>
                  <strong>{paid ? 'Show this token at the counter' : "Please don't pay again while we confirm."}</strong>
                  <span className="ticket-date">{dateTime(order.createdAt)} IST</span>
                </div>
                <div className="ticket-tear"/>
                <div className="ticket-summary">
                  {order.items.map((i,j) => (
                    <div key={j}>
                      <span><b>{i.qty}&times;</b> {i.name}<small>{i.size}</small></span>
                      <strong>{money(i.qty*i.unitPrice)}</strong>
                    </div>
                  ))}
                  <div className="ticket-total">
                    <span>Total {paid && <small>PAID ONLINE</small>}</span>
                    <strong>{money(order.total)}</strong>
                  </div>
                </div>
                <div className="ticket-order-id">
                  Order ID: <code>{order.orderCode || (paid && order.tokenNo ? `ORD-${100 + order.tokenNo}` : (order.status === 'EXPIRED' ? 'EXPIRED' : 'PENDING'))}</code>
                </div>
              </div>

              {paid ? (
                <button
                  type="button"
                  className="primary full"
                  onClick={browse}
                  style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <ArrowLeft size={18}/> Back to menu & start new order
                </button>
              ) : order?.status === 'EXPIRED' ? (
                <button
                  type="button"
                  className="primary full"
                  onClick={browse}
                >
                  Start a new order <ArrowRight size={18}/>
                </button>
              ) : (
                <div className="verifying-status">
                  <div className="verifying-pulse" />
                  <span>Confirming payment with the counter…</span>
                </div>
              )}
              <p className="token-tip">
                <Snowflake size={16}/>
                {order.status === 'SERVED' ? 'Thanks for chilling with us. See you for the next one!' : 'Keep this page handy. It updates all by itself.'}
              </p>
            </>
        }
      </main>
    </div>
  );
}
