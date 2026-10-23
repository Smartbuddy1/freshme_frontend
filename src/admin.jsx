import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Download,
  LayoutDashboard,
  LogOut,
  Package,
  Pencil,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
  Settings as SettingsIcon,
  ShoppingBag,
  Trash2,
  X,
  TrendingUp,
  Clock,
  Sparkles,
  Store
} from 'lucide-react';
import QRCode from 'qrcode';
import {MobileNavigation} from './mobile-navigation.jsx';
import heroCupsImg from './assets/hero-cups.jpg';
import { api, money, today, dateTime, storageGet, storageSet, formatImageUrl, downloadPayments, setAdminShopId } from './api.js';
import { Badge, Brand, Cup, ErrorNotice, Modal } from './components.jsx';
import {ShopIdentity,PrinterConnection} from './shop-connection.jsx';
import { menuPath } from './flow.js';
import { Reports } from './admin-extras.jsx';
import {DailyAnalytics} from './daily-analytics.jsx';

export function Sparkline({ color = '#ec4899', id = '1' }) {
  return (
    <svg className="stat-sparkline" viewBox="0 0 100 36" fill="none" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M0 26 Q 25 32, 50 18 T 100 8 L 100 36 L 0 36 Z"
        fill={`url(#spark-${id})`}
      />
      <path
        d="M0 26 Q 25 32, 50 18 T 100 8"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function useData(path, interval = 0) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const controller = new AbortController();

    async function fetchData() {
      try {
        const next = await api(path, { signal: controller.signal });
        if (!cancelled) {
          setData(next);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          if (e.status === 401) window.dispatchEvent(new Event('admin-expired'));
        }
      } finally {
        if (!cancelled && interval) timer = setTimeout(fetchData, interval);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [path, interval, nonce]);

  return { data, error, reload };
}

function Pagination({ data, page, setPage }) {
  if (!data?.pages || data.pages <= 1) return null;
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
        Previous
      </button>
      <span className="pagination-count">
        Page <b>{page}</b> of <b>{data.pages}</b>
      </span>
      <button disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
        Next
      </button>
    </div>
  );
}

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle ${checked ? 'on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-track">
        <i />
      </span>
      <span className="toggle-label">{label}</span>
    </button>
  );
}

function PageTop({ title, subtitle, eyebrow = 'COUNTER CONTROL', children }) {
  return (
    <header className="admin-top">
      <div className="admin-top-text">
        {eyebrow && <p className="platform-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="platform-detail">{subtitle}</p>}
      </div>
      <div className="admin-top-actions">{children}</div>
    </header>
  );
}

export function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const user = await api('/admin/login', {
        method: 'POST',
        body: { email, password }
      });
      await onLogin(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <Brand />
      <div className="login-card">
        <ErrorNotice message={error} />
        <form onSubmit={submit}>
          <label>
            Email address
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@freshme.in"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </label>
          <button className="primary full" disabled={busy}>
            <span>{busy ? 'Logging inâ€¦' : 'Login'}</span>
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}

function adminPath(path){const id=new URLSearchParams(window.location.search).get('shop');return path+(id?'?shop='+encodeURIComponent(id):'');}
export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const location=useLocation();
  const selectedShop=new URLSearchParams(location.search).get('shop');
  async function acceptUser(next){
    if(next.role==='SUPER_ADMIN' && !selectedShop){setAdminShopId(null);setUser(next);return;}
    setAdminShopId(next.role==='SUPER_ADMIN'?selectedShop:next.shopId);
    const shop=next.role==='SUPER_ADMIN'?await api('/admin/context'):next.shop;
    setUser({...next,shop});
  }
  useEffect(() => {
    let active=true;setUser(undefined);setError('');
    (async()=>{
      try{
        const next=await api('/admin/me');if(!active)return;
        setAdminShopId(next.role==='SUPER_ADMIN'?selectedShop:next.shopId);
        const shop=next.role==='SUPER_ADMIN'&&selectedShop?await api('/admin/context'):next.shop;
        if(active)setUser({...next,shop});
      }catch(e){if(active){setUser(null);if(e.status!==401)setError(e.message);}}
    })();
    const expire = () => {setUser(null);setAdminShopId(null);};
    window.addEventListener('admin-expired', expire);
    return () => {active=false;window.removeEventListener('admin-expired', expire);};
  }, [selectedShop]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [message]);

  async function logout() {
    try {
      await api('/admin/logout', { method: 'POST' });
      setUser(null);
      navigate('/admin');
    } catch (e) {
      setError(e.message);
    }
  }

  if (user === undefined) return <div className="page-loading">Opening counter suiteâ€¦</div>;
  if (!user && (location.pathname !== '/admin' || location.search)) return <Navigate to="/admin" replace/>;
  if (!user) return <><ErrorNotice message={error}/><Login onLogin={acceptUser} /></>;
  if(user.role==='SUPER_ADMIN'&&!selectedShop)return <Navigate to='/super-admin' replace/>;

  const common = { notify: setMessage };
  const links = [
    ['', 'Dashboard', LayoutDashboard],
    ['orders', 'Orders', ReceiptText],
    ['products', 'Products', Package],
    ['payments', 'Payments', CircleDollarSign],
    ['reports', 'Reports', TrendingUp],
    ['settings', 'Settings', SettingsIcon]
  ];

  const userInitials = (user.email ? user.email.slice(0, 2) : 'AD').toUpperCase();
  const formattedHeaderDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="admin-shell">
      <MobileNavigation home={adminPath('/admin')} title={user.shop?.name || 'Client Admin'} links={links.map(([path,label,Icon])=>({to:adminPath(`/admin${path?`/${path}`:''}`),label,Icon,end:!path}))} onLogout={logout} backToPlatform={user.role==='SUPER_ADMIN'}/>
      <aside className="admin-nav">
        <Brand compact to={adminPath('/admin')} />
        <div className="platform-role">
          <Store size={15} /> CLIENT ADMIN
        </div>

        <nav className="admin-links">
          {links.map(([path, label, Icon]) => (
            <NavLink key={path} to={adminPath(`/admin${path ? `/${path}` : ''}`)} end={!path}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-nav-footer">
          <div className="admin-nav-user">
            <strong>{user.shop?.name || 'Fresh Me Counter'}</strong>
            <small>{user.email}</small>
          </div>
          <button className="nav-logout-btn" onClick={logout} title="Sign out" aria-label="Sign out">
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main" key={user.shop?.id}>
        {user.role === 'SUPER_ADMIN' && (
          <div className="super-admin-return-bar">
            <div className="return-bar-content">
              <span className="return-bar-badge">SUPER ADMIN VIEW</span>
              <span>Managing <strong>{user.shop?.name}</strong></span>
            </div>
            <Link to="/super-admin/clients" className="return-bar-btn" aria-label="Back to Super Admin">
              â† Back to Super Admin
            </Link>
          </div>
        )}
        <div className="admin-top-bar">
          <div className="admin-shop-context">
            <strong>{user.shop?.name}</strong>
          </div>
        </div>
        <ErrorNotice message={error} />
        <Routes>
          <Route index element={<Dashboard {...common} user={user} />} />
          <Route path="products" element={<Products {...common} />} />
          <Route path="orders" element={<Orders {...common} />} />
          <Route path="payments" element={<Payments />} />
          <Route path="settings" element={<ShopSettings {...common} user={user} onPasswordChange={() => setUser(null)} />} />
          <Route path="reports" element={<Reports />} />
          <Route path="account" element={<Navigate to={adminPath("/admin/settings")} replace />} />
          <Route path="*" element={<Dashboard {...common} user={user} />} />
        </Routes>
      </main>

      {message && (
        <div className="status-message" role="status">
          <Check size={16} />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}

function OrderTable({ orders, reload, notify, highlighted = new Set() }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function action(order, type) {
    if (busy) return;
    setBusy(order._id + type);
    setError('');
    try {
      await api(`/admin/orders/${order._id}/${type}`, {
        method: type === 'serve' ? 'PATCH' : 'POST'
      });
      notify(type === 'serve' ? `Token #${order.tokenNo} marked served` : `Token #${order.tokenNo} sent to printer`);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <ErrorNotice message={error} />
      {!orders?.length ? (
        <div className="admin-empty">
          <Sparkles size={28} className="empty-icon" />
          <p>No orders in queue yet. The next happy sip is on its way!</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table orders-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Order Details</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Receipt</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o._id} className={highlighted.has(o._id) ? 'new-order' : ''}>
                  <td className="token-cell">
                    <span className="token-capsule">
                      <span className="token-number">{o.tokenNo ? `#${String(o.tokenNo).padStart(3, '0')}` : 'â€”'}</span>
                      {(o.orderCode || (o.tokenNo && `ORD-${100 + o.tokenNo}`)) && (
                        <span className="token-code">{o.orderCode || `ORD-${100 + o.tokenNo}`}</span>
                      )}
                    </span>
                  </td>
                  <td className="order-item-cell">
                    <div className="table-items">
                      {(o.customerName || o.phone) && (
                        <div className="customer-tag">
                          {o.customerName && <strong className="customer-name">{o.customerName}</strong>}
                          {o.phone && <span className="customer-phone">ðŸ“± {o.phone}</span>}
                        </div>
                      )}
                      <div className="order-items-list">
                        {o.items.map((i, j) => (
                          <div key={j} className="order-item-line">
                            <span className="item-qty">{i.qty}Ã—</span>
                            <span className="item-name">{i.name}</span>
                            <span className="item-size">({i.size})</span>
                          </div>
                        ))}
                      </div>
                      <small className="order-time">{dateTime(o.createdAt)} IST</small>
                    </div>
                  </td>
                  <td data-label="Total" className="total-cell">
                    <strong>{money(o.total)}</strong>
                  </td>
                  <td data-label="Payment">
                    <Badge status={o.status} />
                    {o.refunded && <div className="warning-dot">Refund recorded</div>}
                  </td>
                  <td data-label="Print status">
                    <Badge status={o.printStatus} />
                    {o.printError && <div className="warning-dot" title={o.printError}>Printer check required</div>}
                  </td>
                  <td className="order-action-cell">
                    <div className="row-actions">
                      <button
                        className="btn-action-reprint"
                        disabled={!!busy || !['PAID', 'SERVED'].includes(o.status)}
                        onClick={() => action(o, 'reprint')}
                        title="Reprint receipt on thermal printer"
                      >
                        <Printer size={14} />
                        <span>Reprint</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function CustomerQRModal({ shopSlug, shopName, close }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const isSubpath = typeof window !== 'undefined' && (window.location.pathname === '/freshme' || window.location.pathname.startsWith('/freshme/'));
  const basePath = isSubpath ? '/freshme' : '';
  const url = typeof window !== 'undefined' && shopSlug
    ? `${window.location.origin}${basePath}${menuPath(shopSlug)}`
    : '';

  useEffect(() => {
    let active = true;
    if (canvasRef.current && url) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 260,
        margin: 3,
        errorCorrectionLevel: 'M',
        color: { dark: '#0b2545', light: '#ffffff' }
      })
        .then(() => { if (active) setReady(true); })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [url]);

  function download() {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `fresh-me-${shopSlug || 'menu'}-qr.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }

  function copyUrl() {
    if (!url) return;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal title={`Customer Ordering QR Â· ${shopName || 'Counter'}`} close={close}>
      <div className="shop-qr-modal-body">
        <p className="shop-qr-instructions">
          Display this QR code at your shop counter. Customers scan it with any smartphone camera to open your live menu and place orders.
        </p>
        <div className="shop-qr-canvas-wrap">
          <canvas ref={canvasRef} role="img" aria-label={`Ordering QR for ${shopName}`} />
        </div>
        <div className="shop-qr-url-box">
          <input type="text" readOnly value={url} className="shop-qr-url-input" />
          <button type="button" className="secondary" onClick={copyUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <Copy size={15} />
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
        <div className="shop-qr-actions">
          <button type="button" className="primary" disabled={!ready} onClick={download} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} />
            <span>Download High-Res QR (PNG)</span>
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="secondary-link-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ExternalLink size={15} />
            <span>Open Menu</span>
          </a>
        </div>
      </div>
    </Modal>
  );
}

function Dashboard({ notify, user }) {
  const [days,setDays] = useState('7');
  const { data, error, reload } = useData('/admin/dashboard?days='+days, 5000);
  const [testBusy, setTestBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const miniCanvasRef = useRef(null);

  const shopSlug = data?.shopSlug || user?.shop?.slug;
  const shopName = data?.shopName || user?.shop?.name || 'Fresh Me';
  const isSubpath = typeof window !== 'undefined' && (window.location.pathname === '/freshme' || window.location.pathname.startsWith('/freshme/'));
  const basePath = isSubpath ? '/freshme' : '';
  const menuUrl = typeof window !== 'undefined' && shopSlug
    ? `${window.location.origin}${basePath}${menuPath(shopSlug)}`
    : '';

  useEffect(() => {
    if (miniCanvasRef.current && menuUrl) {
      QRCode.toCanvas(miniCanvasRef.current, menuUrl, {
        width: 44,
        margin: 1,
        color: { dark: '#0b2545', light: '#ffffff' }
      }).catch(() => {});
    }
  }, [menuUrl, data]);

  async function testPrint() {
    setTestBusy(true);
    try {
      await api('/admin/test-print', { method: 'POST' });
      notify('Test receipt sent to the printer queue');
      reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setTestBusy(false);
    }
  }

  const currentDateFormatted = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <>
      <div className="admin-top">
        <div>
          <p className="platform-eyebrow">STORE OVERVIEW</p>
          <h1>A fresh start.</h1>
          <p className="platform-detail">Hereâ€™s whatâ€™s happening at your counter today in Indian Standard Time.</p>
        </div>
        <span className="admin-date">{currentDateFormatted}</span>
      </div>

      <ErrorNotice message={error || actionError} retry={reload} />

      {!data ? (
        <div className="skeleton admin-skeleton" />
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-orders">
              <div className="stat-header">
                <span className="stat-label">Todayâ€™s orders</span>
                <div className="stat-icon-box">
                  <ShoppingBag size={18} />
                </div>
              </div>
              <strong className="stat-value">{data.todayOrders}</strong>
              <small className="stat-note">Paid & served</small>
            </div>

            <div className="stat-card stat-revenue">
              <div className="stat-header">
                <span className="stat-label">Todayâ€™s revenue</span>
                <div className="stat-icon-box">
                  <CircleDollarSign size={18} />
                </div>
              </div>
              <strong className="stat-value">{money(data.revenue)}</strong>
              <small className="stat-note">Gross collected Â· IST</small>
            </div>

            <div className="stat-card stat-pending">
              <div className="stat-header">
                <span className="stat-label">Pending prints</span>
                <div className="stat-icon-box">
                  <Printer size={18} />
                </div>
              </div>
              <strong className="stat-value">{data.pendingPrints}</strong>
              <small className="stat-note">Waiting at the counter</small>
            </div>

            <div
              className="stat-card stat-qr clickable-stat"
              onClick={() => setShowQR(true)}
              role="button"
              tabIndex={0}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setShowQR(true)}
              title="Click to view and download your customer ordering QR code"
            >
              <div className="stat-header">
                <span className="stat-label">Customer QR</span>
                <div className="stat-icon-box">
                  <QrCode size={18} />
                </div>
              </div>
              <div className="stat-qr-preview-row">
                <canvas ref={miniCanvasRef} className="stat-mini-qr" width={44} height={44} />
                <div>
                  <strong className="stat-qr-headline">Scan to order</strong>
                  <small className="stat-note stat-qr-link-hint">View & print QR â†’</small>
                </div>
              </div>
            </div>
          </div>

          <DailyAnalytics analytics={data.analytics} days={days} setDays={setDays} error={error}/>

          <div className="printer-panel">
            <div className="printer-info">
              <div className="printer-icon-wrap">
                <Printer size={22} />
              </div>
              <div>
                <div className="printer-title-wrap">
                  <h3>Thermal Receipt Printer</h3>
                  <PrinterConnection shop={data} />
                </div>
                <p>
                  {data.printerStatus === 'Agent not running'
                    ? 'Start the Fresh Me agent on the shop computer (start-agent.bat) to print receipts automatically.'
                    : 'Receipts print automatically as soon as customer payments arrive.'}
                </p>
              </div>
            </div>
            <div className="printer-actions">
              <button className="btn-test-print" disabled={testBusy} onClick={testPrint}>
                <Printer size={15} />
                <span>{testBusy ? 'Sendingâ€¦' : 'Test print'}</span>
              </button>
            </div>
          </div>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Fresh off the menu</h2>
                <p>Your 10 latest orders Â· updates automatically</p>
              </div>
              <Link to={adminPath('/admin/orders')} className="panel-link">
                <span>All orders</span>
                <ArrowRight size={14} />
              </Link>
            </div>
            <OrderTable orders={data.orders} reload={reload} notify={notify} />
          </section>
        </>
      )}

      {showQR && (
        <CustomerQRModal
          shopSlug={shopSlug}
          shopName={shopName}
          close={() => setShowQR(false)}
        />
      )}
    </>
  );
}

function Orders({ notify }) {
  const [status, setStatus] = useState('');
  const [date, setDate] = useState(today());
  const [token, setToken] = useState('');
  const [page, setPage] = useState(1);
  const seen = useRef(null);
  const [highlighted, setHighlighted] = useState(new Set());

  const query = new URLSearchParams({
    page,
    ...(status && { status }),
    ...(date && { date }),
    ...(token && { token })
  });
  const { data, error, reload } = useData(`/admin/orders?${query}`, 5000);

  useEffect(() => {
    if (!data) return;
    const paid = data.orders.filter(o => ['PAID', 'SERVED'].includes(o.status)).map(o => o._id);
    const fresh = new Set(seen.current ? paid.filter(id => !seen.current.has(id)) : []);
    setHighlighted(fresh);
    seen.current = new Set([...(seen.current || []), ...paid]);
  }, [data]);

  return (
    <>
      <PageTop title="Live Orders Lineup" subtitle="Track orders in real time, mark orders served, and reprint receipts." />

      <div className="filters-card">
        <div className="filters-grid">
          <label className="filter-group">
            <span className="filter-label">Order Status</span>
            <select
              value={status}
              onChange={e => {
                setStatus(e.target.value);
                setPage(1);
                seen.current = null;
              }}
            >
              <option value="">All Orders</option>
              {['PAID', 'SERVED', 'PENDING_PAYMENT', 'EXPIRED'].map(s => (
                <option key={s} value={s}>
                  {s.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-group">
            <span className="filter-label">Date (IST)</span>
            <input
              type="date"
              value={date}
              onChange={e => {
                setDate(e.target.value);
                setPage(1);
                seen.current = null;
              }}
            />
          </label>

          <label className="filter-group token-filter">
            <span className="filter-label">Token #</span>
            <input
              type="number"
              min="1"
              placeholder="Any"
              value={token}
              onChange={e => {
                setToken(e.target.value);
                setPage(1);
                seen.current = null;
              }}
            />
          </label>
        </div>
      </div>

      <ErrorNotice message={error} retry={reload} />

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Order Queue</h2>
            <p>Real-time queue synchronized every 5s</p>
          </div>
          <Badge status={`${data?.total || 0} orders`} />
        </div>
        {!data ? (
          <div className="skeleton admin-skeleton" />
        ) : (
          <OrderTable orders={data.orders} reload={reload} notify={notify} highlighted={highlighted} />
        )}
        <Pagination data={data} page={page} setPage={setPage} />
      </div>
    </>
  );
}

const blankProduct = () => ({
  name: '',
  category: 'Fruit slush',
  flavorColor: '#f4ba1b',
  imageUrl: '',
  sizes: [
    { label: 'Small', price: 40 },
    { label: 'Medium', price: 60 },
    { label: 'Large', price: 80 }
  ],
  sortOrder: 0,
  available: true
});

function Products({ notify }) {
  const { data, error, reload } = useData('/admin/products');
  const [edit, setEdit] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  async function toggle(p, available) {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try {
      await api(`/admin/products/${p._id}/availability`, {
        method: 'PATCH',
        body: { available }
      });
      reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/admin/products/${deleting._id}`, { method: 'DELETE' });
      setDeleting(null);
      notify('Flavor removed from menu');
      reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTop title="Flavors & Menu" subtitle="Manage slush flavors, custom cup sizes, pricing and instant item availability.">
        <button
          className="primary"
          onClick={() =>
            setEdit({
              ...blankProduct(),
              sortOrder: Math.max(-1, ...(data || []).map(p => p.sortOrder)) + 1
            })
          }
        >
          <Plus size={17} />
          <span>Add New Flavor</span>
        </button>
      </PageTop>

      <ErrorNotice message={error || actionError} retry={reload} />

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Current Menu Catalog</h2>
            <p>Active drinks served at your counter</p>
          </div>
          <span className="form-note">{data?.length || 0} items active</span>
        </div>
        {!data ? (
          <div className="skeleton admin-skeleton" />
        ) : !data.length ? (
          <div className="admin-empty">
            <Sparkles size={28} className="empty-icon" />
            <p>Add your first flavor to get the slush flowing!</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table product-table">
              <thead>
                <tr>
                  <th>Flavor</th>
                  <th>Sizes & Pricing</th>
                  <th>Availability</th>
                  <th>Sort Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(p => (
                  <tr key={p._id}>
                    <td className="product-name-cell">
                      <div className="product-admin-name">
                        {p.imageUrl ? (
                          <img src={formatImageUrl(p.imageUrl)} alt="" loading="lazy" />
                        ) : (
                          <Cup color={p.flavorColor} />
                        )}
                        <div>
                          <b>{p.name}</b>
                          <small>{p.category}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label="Sizes">
                      <div className="product-size-list">
                        {p.sizes.map(s => (
                          <div key={s.label} className="product-size-pill">
                            <span className="size-label">{s.label}:</span>
                            <span className="size-price">{money(s.price)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td data-label="Availability">
                      <Toggle
                        checked={p.available}
                        label={p.available ? 'In Stock' : 'Sold Out'}
                        onChange={v => toggle(p, v)}
                        disabled={busy}
                      />
                    </td>
                    <td data-label="Display order">
                      <span className="sort-order-badge">#{p.sortOrder}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-edit" onClick={() => setEdit(p)} title="Edit flavor details">
                          <Pencil size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          className="btn-delete"
                          aria-label={`Delete ${p.name}`}
                          onClick={() => setDeleting(p)}
                          title="Delete flavor"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {edit && (
        <ProductEditor
          product={edit}
          close={() => setEdit(null)}
          saved={() => {
            setEdit(null);
            reload();
            notify('Flavor saved. Looking fresh!');
          }}
        />
      )}

      {deleting && (
        <Modal title="Remove this flavor?" close={() => !busy && setDeleting(null)} className="delete-dialog">
          <p>
            <b>{deleting.name}</b> will disappear from the storefront menu. Past order receipts will preserve their original details.
          </p>
          <div className="dialog-actions">
            <button className="secondary" disabled={busy} onClick={() => setDeleting(null)}>
              Keep Flavor
            </button>
            <button className="primary danger-button" disabled={busy} onClick={remove}>
              Remove from Menu
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function ProductEditor({ product, close, saved }) {
  const [form, setForm] = useState(() => {
    const { name, category, flavorColor, imageUrl = '', sizes, sortOrder, available } = product;
    return {
      name,
      category,
      flavorColor,
      imageUrl,
      sizes: sizes ? sizes.map(({ label, price }) => ({ label, price })) : [{ label: 'Small', price: 40 }],
      sortOrder,
      available
    };
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const field = (key, value) => setForm(f => ({ ...f, [key]: value }));

  async function save(e) {
    e.preventDefault();
    if (busy || uploading) return;
    setBusy(true);
    setError('');
    try {
      const sanitizedSizes = form.sizes
        .map(s => ({
          label: String(s.label || '').trim(),
          price: Math.max(1, Math.min(10000, Number(s.price) || 0))
        }))
        .filter(s => s.label);
      if (!sanitizedSizes.length) {
        throw new Error('Add at least one size with a name and price');
      }
      const payload = {
        ...form,
        name: form.name.trim(),
        category: form.category.trim(),
        sizes: sanitizedSizes
      };
      await api(`/admin/products${product._id ? `/${product._id}` : ''}`, {
        method: product._id ? 'PUT' : 'POST',
        body: payload
      });
      saved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose an image smaller than 5 MB');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('image', file);
      const result = await api('/admin/products/image', { method: 'POST', body });
      field('imageUrl', result.imageUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal
      title={product._id ? 'Edit Slush Flavor' : 'Add New Flavor'}
      close={() => !busy && !uploading && close()}
    >
      <form
        className="product-editor"
        onSubmit={save}
        onKeyDown={e => {
          if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            e.preventDefault();
          }
        }}
      >
        <ErrorNotice message={error} />
        <label>
          <span className="field-title">Flavor Name</span>
          <input
            required
            maxLength={80}
            value={form.name}
            onChange={e => field('name', e.target.value)}
            placeholder="e.g. Berry Blast"
          />
        </label>
        <div className="form-row">
          <label>
            <span className="field-title">Category</span>
            <input
              required
              maxLength={40}
              value={form.category}
              onChange={e => field('category', e.target.value)}
              placeholder="e.g. Fruit slush"
            />
          </label>
          <label>
            <span className="field-title">Display Order</span>
            <input
              type="number"
              required
              min={0}
              max={10000}
              value={form.sortOrder}
              onChange={e => field('sortOrder', e.target.value === '' ? 0 : Number(e.target.value))}
            />
          </label>
        </div>
        <label>
          <span className="field-title">Accent Color</span>
          <div className="color-field">
            <input
              type="color"
              value={form.flavorColor}
              onChange={e => field('flavorColor', e.target.value)}
            />
            <span>{form.flavorColor}</span>
          </div>
        </label>
        <div className="sizes-section">
          <label className="field-title">Sizes & Prices (â‚¹)</label>
          {form.sizes.map((s, index) => (
            <div className="size-edit" key={index}>
              <label>
                <span>Size Label</span>
                <input
                  required
                  maxLength={30}
                  aria-label={`Size ${index + 1}`}
                  value={s.label}
                  placeholder="e.g. Regular"
                  onChange={e => {
                    const val = e.target.value;
                    setForm(f => ({
                      ...f,
                      sizes: f.sizes.map((x, i) => (i === index ? { ...x, label: val } : x))
                    }));
                  }}
                />
              </label>
              <label>
                <span>Price (â‚¹)</span>
                <input
                  required
                  type="number"
                  min={1}
                  max={10000}
                  step={1}
                  aria-label={`Price ${index + 1}`}
                  value={s.price === '' ? '' : s.price}
                  onChange={e => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setForm(f => ({
                      ...f,
                      sizes: f.sizes.map((x, i) => (i === index ? { ...x, price: val } : x))
                    }));
                  }}
                />
              </label>
              <button
                type="button"
                className="icon-button size-remove-button"
                title={`Remove size ${index + 1}`}
                aria-label={`Remove size ${index + 1}`}
                disabled={form.sizes.length === 1}
                onClick={() =>
                  setForm(f => ({
                    ...f,
                    sizes: f.sizes.filter((_, i) => i !== index)
                  }))
                }
              >
                <X size={17} />
              </button>
            </div>
          ))}
          {form.sizes.length < 3 && (
            <button
              type="button"
              className="text-button add-size-btn"
              onClick={() =>
                setForm(f => ({
                  ...f,
                  sizes: [...f.sizes, { label: '', price: 40 }]
                }))
              }
            >
              <Plus size={15} /> <span>Add Size Option</span>
            </button>
          )}
        </div>
        <label>
          <span className="field-title">
            Product Image <small>(optional Â· JPG, PNG or WebP)</small>
          </span>
          <input
            className="upload-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading || busy}
            onChange={upload}
          />
        </label>
        {uploading && <p className="form-note">Uploading imageâ€¦</p>}
        {form.imageUrl && (
          <div className="preview-wrap">
            <img className="product-preview" src={formatImageUrl(form.imageUrl)} alt="Product preview" />
            <button className="text-button" type="button" onClick={() => field('imageUrl', '')}>
              Use default illustrated cup
            </button>
          </div>
        )}
        <Toggle checked={form.available} onChange={v => field('available', v)} label="Available to order" />
        <button className="primary full" disabled={busy || uploading}>
          <span>{busy ? 'Saving changesâ€¦' : 'Save Flavor'}</span>
          <Check size={18} />
        </button>
      </form>
    </Modal>
  );
}

function Payments() {
  const [exportError, setExportError] = useState('');
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ from, to, page });
  const { data, error, reload } = useData(`/admin/payments?${query}`);

  return (
    <>
      <ErrorNotice message={exportError} />
      <PageTop title="Payment Ledger" subtitle="Every customer order payment recorded and verified.">
        <button
          onClick={async () => {
            try {
              setExportError('');
              await downloadPayments(new URLSearchParams({ from, to }));
            } catch (e) {
              setExportError(e.message);
            }
          }}
          className="secondary"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </PageTop>

      <div className="filters-card">
        <div className="filters-grid">
          <label className="filter-group">
            <span className="filter-label">From Date (IST)</span>
            <input
              required
              type="date"
              value={from}
              onChange={e => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="filter-group">
            <span className="filter-label">To Date (IST)</span>
            <input
              required
              type="date"
              value={to}
              min={from}
              onChange={e => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <button className="secondary filter-refresh-btn" onClick={reload}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <ErrorNotice message={error} retry={reload} />

      <div className="payment-summary">
        <div className="payment-summary-metric">
          <small>Gross Collections (Period)</small>
          <b>{money(data?.totals.total)}</b>
        </div>
        <div className="payment-summary-details">
          <span>
            <b>{data?.totals.count || 0}</b> settled payments
          </span>
          <span>
            <b>{data?.totals.refundedOrders || 0}</b> refunded orders
          </span>
        </div>
      </div>

      <div className="panel">
        {!data ? (
          <div className="skeleton admin-skeleton" />
        ) : !data.orders.length ? (
          <div className="admin-empty">
            <Sparkles size={28} className="empty-icon" />
            <p>No payments recorded in this date range.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table payments-table">
              <thead>
                <tr>
                  <th>Date (IST)</th>
                  <th>Token</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Refunded</th>
                  <th>Razorpay Order</th>
                  <th>Payment ID</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map(o => (
                  <tr key={o._id}>
                    <td data-label="Date (IST)">{dateTime(o.paidAt)}</td>
                    <td>
                      <span className="table-token">#{String(o.tokenNo).padStart(3, '0')}</span>
                    </td>
                    <td data-label="Amount">
                      <strong>{money(o.total)}</strong>
                    </td>
                    <td data-label="Status">
                      <Badge status={o.status} />
                    </td>
                    <td data-label="Refunded">
                      {o.refunded ? <span className="text-amber-600 font-bold">Yes</span> : 'No'}
                    </td>
                    <td data-label="Razorpay order">
                      <span className="payment-id">{o.razorpayOrderId}</span>
                    </td>
                    <td data-label="Payment ID">
                      <span className="payment-id">{o.razorpayPaymentId}</span>
                    </td>
                    <td data-label="Method">
                      <span className="payment-method-pill">{o.paymentMethod || 'UPI'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination data={data} page={page} setPage={setPage} />
      </div>
    </>
  );
}

function ShopSettings({ notify, onPasswordChange, user }) {
  const { data, error, reload } = useData('/admin/settings');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [acceptingOrders, setAcceptingOrders] = useState(true);

  useEffect(() => {
    if (data) {
      setAcceptingOrders(Boolean(data.acceptingOrders));
    }
  }, [data]);

  async function toggleOrders(nextVal) {
    if (!data || busy) return;
    setBusy(true);
    setActionError('');
    try {
      await api('/admin/settings', {
        method: 'PUT',
        body: {
          shopName: data.shopName || user?.shop?.name || 'Fresh Me',
          tagline: data.tagline || '',
          acceptingOrders: nextVal,
          receiptHeader: data.receiptHeader || '',
          receiptFooter: data.receiptFooter || 'Thank you!',
          prepCopy: Boolean(data.prepCopy),
          batchSize: data.batchSize || 5
        }
      });
      setAcceptingOrders(nextVal);
      notify(nextVal ? 'Storefront is now OPEN for customer orders' : 'Storefront ordering PAUSED');
      reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function password(e) {
    e.preventDefault();
    setBusy(true);
    setActionError('');
    try {
      await api('/admin/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword }
      });
      notify('Password updated successfully. Please sign in again.');
      setCurrentPassword('');
      setNewPassword('');
      onPasswordChange();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const shopSlug = data?.shopSlug || user?.shop?.slug;
  const shopName = data?.shopName || user?.shop?.name || 'Fresh Me';

  return (
    <>
      <PageTop
        title="Settings & Security"
        subtitle="View your shop identity and manage your administrator login credentials."
        eyebrow="CONFIGURATION"
      />
      <ErrorNotice message={error || actionError} retry={reload} />
      {!data ? (
        <div className="skeleton admin-skeleton" />
      ) : (
        <div className="settings-grid single-col">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Shop Identity</h2>
                <p>Your shop name, unique ID and ordering status</p>
              </div>
            </div>
            <div className="settings-form">
              <div className={`store-status-card ${acceptingOrders ? 'status-open' : 'status-paused'}`}>
                <Toggle
                  checked={acceptingOrders}
                  onChange={toggleOrders}
                  disabled={busy}
                  label={acceptingOrders ? 'Storefront is Open (Accepting Orders)' : 'Storefront Paused (Resting)'}
                />
                <p className="store-status-note">
                  {acceptingOrders
                    ? 'Customers can browse menu, customize cups, and pay online.'
                    : "Ordering paused. Customers see 'Shop is resting, back soon'."}
                </p>
              </div>

              <label>
                <span className="field-title">Shop Name</span>
                <div className="settings-readonly-value">{shopName}</div>
              </label>

              <label>
                <span className="field-title">Shop ID / Customer Menu URL</span>
                <div style={{ marginTop: '8px' }}>
                  <ShopIdentity id={shopSlug} />
                </div>
                <small style={{ color: '#64748b', marginTop: '6px', display: 'block' }}>
                  This is your shopâ€™s unique identifier for customer orders and printer pairing.
                </small>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Change Password</h2>
                <p>Update administrator login credentials for this counter</p>
              </div>
            </div>
            <form className="settings-form" onSubmit={password}>
              <p className="panel-subtitle">
                Use at least 12 characters. Updating your password will sign out your account on all devices.
              </p>
              <label>
                <span className="field-title">Account Email</span>
                <div className="settings-readonly-value">{user?.email || 'Counter Admin'}</div>
              </label>
              <label>
                <span className="field-title">Current Password</span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </label>
              <label>
                <span className="field-title">New Password</span>
                <input
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 12 characters"
                />
              </label>
              <button className="primary" disabled={busy || !currentPassword || !newPassword} style={{ width: 'fit-content' }}>
                <span>Update Password</span>
                <Check size={16} />
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}


