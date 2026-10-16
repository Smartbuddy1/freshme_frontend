import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  ExternalLink,
  Download,
  LayoutDashboard,
  LogOut,
  Package,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Settings as SettingsIcon,
  ShoppingBag,
  Trash2,
  Volume2,
  X,
  TrendingUp,
  Clock,
  Sparkles
} from 'lucide-react';
import { api, money, today, dateTime, storageGet, storageSet, formatImageUrl, downloadPayments } from './api.js';
import { Badge, Brand, Cup, ErrorNotice, Modal } from './components.jsx';
import { Reports } from './admin-extras.jsx';

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

function PageTop({ title, subtitle, children }) {
  return (
    <header className="admin-top">
      <div className="admin-top-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="admin-top-actions">{children}</div>
    </header>
  );
}

function Login({ onLogin }) {
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
      onLogin(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <Brand />
          <span className="admin-badge-pill">COUNTER OPS</span>
        </div>
        <h1>Welcome Back</h1>
        <p>Sign in to manage orders, live receipts, and counter flow.</p>
        <ErrorNotice message={error} />
        <form onSubmit={submit}>
          <label>
            <span className="field-title">Email address</span>
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
            <span className="field-title">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </label>
          <button className="primary full" disabled={busy}>
            <span>{busy ? 'Signing in…' : 'Sign in to Counter'}</span>
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
      <Link className="login-back" to="/">
        ← Back to customer storefront
      </Link>
    </div>
  );
}

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api('/admin/me')
      .then(setUser)
      .catch(() => setUser(null));
    const expire = () => setUser(null);
    window.addEventListener('admin-expired', expire);
    return () => window.removeEventListener('admin-expired', expire);
  }, []);

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

  if (user === undefined) return <div className="page-loading">Opening counter suite…</div>;
  if (!user) return <Login onLogin={setUser} />;

  const common = { notify: setMessage };
  const links = [
    ['', 'Dashboard', LayoutDashboard],
    ['orders', 'Live Orders', ReceiptText],
    ['products', 'Flavors & Menu', Package],
    ['payments', 'Payments', CircleDollarSign],
    ['reports', 'Reports', TrendingUp],
    ['settings', 'Shop Settings', SettingsIcon]
  ];

  const userInitials = (user.email ? user.email.slice(0, 2) : 'FM').toUpperCase();

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div className="admin-nav-header">
          <Brand compact />
          <div className="admin-counter-pill">
            <span className="live-pulse-dot" />
            <span>COUNTER OPS</span>
          </div>
        </div>

        <nav className="admin-links">
          {links.map(([path, label, Icon]) => (
            <NavLink key={path} to={`/admin${path ? `/${path}` : ''}`} end={!path}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-nav-footer">
          <Link to="/" target="_blank" rel="noopener noreferrer" className="nav-store">
            <ExternalLink size={15} />
            <span>Open Customer Menu</span>
          </Link>
          <div className="admin-user-card">
            <div className="admin-avatar">{userInitials}</div>
            <div className="admin-user-info">
              <span className="user-email-text" title={user.email}>{user.email || 'Admin'}</span>
              <span className="user-role-text">Counter Staff</span>
            </div>
            <button className="admin-logout-btn" onClick={logout} title="Sign out" aria-label="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <ErrorNotice message={error} />
        <Routes>
          <Route index element={<Dashboard {...common} />} />
          <Route path="products" element={<Products {...common} />} />
          <Route path="orders" element={<Orders {...common} />} />
          <Route path="payments" element={<Payments />} />
          <Route path="settings" element={<ShopSettings {...common} onPasswordChange={() => setUser(null)} />} />
          <Route path="reports" element={<Reports />} />
          <Route path="account" element={<Navigate to="/admin/settings" replace />} />
          <Route path="*" element={<Dashboard {...common} />} />
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
                    <div className="token-capsule">
                      <span className="token-number">
                        {o.tokenNo ? `#${String(o.tokenNo).padStart(3, '0')}` : '—'}
                      </span>
                      {(o.orderCode || (o.tokenNo && `ORD-${100 + o.tokenNo}`)) && (
                        <span className="token-code">{o.orderCode || `ORD-${100 + o.tokenNo}`}</span>
                      )}
                    </div>
                  </td>
                  <td className="order-item-cell">
                    <div className="table-items">
                      {(o.customerName || o.phone) && (
                        <div className="customer-tag">
                          {o.customerName && <span className="customer-name">{o.customerName}</span>}
                          {o.phone && <span className="customer-phone">📱 {o.phone}</span>}
                        </div>
                      )}
                      <div className="order-items-list">
                        {o.items.map((i, j) => (
                          <div key={j} className="order-item-line">
                            <span className="item-qty">{i.qty}×</span>
                            <span className="item-name">{i.name}</span>
                            <span className="item-size">({i.size})</span>
                          </div>
                        ))}
                      </div>
                      <small className="order-time">
                        <Clock size={11} /> {dateTime(o.createdAt)} IST
                      </small>
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
                        className="btn-action-serve"
                        disabled={!!busy || o.status !== 'PAID'}
                        onClick={() => action(o, 'serve')}
                        title="Mark order as served to customer"
                      >
                        <Check size={14} />
                        <span>Served</span>
                      </button>
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

function Dashboard({ notify }) {
  const { data, error, reload } = useData('/admin/dashboard', 5000);
  const [testBusy, setTestBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function testPrint() {
    setTestBusy(true);
    try {
      await api('/admin/test-print', { method: 'POST' });
      notify('Test receipt sent to thermal printer');
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
    month: 'short',
    year: 'numeric'
  });

  return (
    <>
      <PageTop
        title="Counter Dashboard"
        subtitle="Live orders, revenue metrics and receipt printing connection."
      >
        <div className="admin-status-pill">
          <span className="live-pulse-dot" />
          <span>Live Sync</span>
          <span className="pill-divider">·</span>
          <span>{currentDateFormatted}</span>
        </div>
      </PageTop>

      <ErrorNotice message={error || actionError} retry={reload} />

      {!data ? (
        <div className="skeleton admin-skeleton" />
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-orders">
              <div className="stat-icon-box">
                <ShoppingBag size={20} />
              </div>
              <div className="stat-body">
                <span className="stat-label">Today’s Orders</span>
                <b className="stat-value">{data.todayOrders}</b>
                <small className="stat-note">Paid & served today</small>
              </div>
            </div>

            <div className="stat-card stat-revenue">
              <div className="stat-icon-box">
                <CircleDollarSign size={20} />
              </div>
              <div className="stat-body">
                <span className="stat-label">Today’s Revenue</span>
                <b className="stat-value">{money(data.revenue)}</b>
                <small className="stat-note">Gross collected · IST</small>
              </div>
            </div>

            <div className="stat-card stat-pending">
              <div className="stat-icon-box">
                <Printer size={20} />
              </div>
              <div className="stat-body">
                <span className="stat-label">Pending Prints</span>
                <b className="stat-value">{data.pendingPrints}</b>
                <small className="stat-note">Waiting at counter</small>
              </div>
            </div>

            <div className={`stat-card ${data.failedPrints > 0 ? 'stat-failed' : 'stat-healthy'}`}>
              <div className="stat-icon-box">
                <ReceiptText size={20} />
              </div>
              <div className="stat-body">
                <span className="stat-label">Failed Prints</span>
                <b className="stat-value">{data.failedPrints}</b>
                <small className="stat-note">{data.failedPrints > 0 ? 'Needs attention' : 'All prints normal'}</small>
              </div>
            </div>
          </div>

          <div className="printer-panel">
            <div className="printer-info">
              <div className="printer-icon-wrap">
                <Printer size={24} />
                <span className={`printer-pulse-ring ${data.printerStatus === 'ONLINE' ? 'online' : 'offline'}`} />
              </div>
              <div>
                <div className="printer-title-wrap">
                  <h3>Epson Counter Printer</h3>
                  <span className="model-pill">TM-T82X-II</span>
                </div>
                <p>
                  {data.printerStatus === 'Agent not running'
                    ? 'Windows print agent is offline. Start the agent on the shop PC to print bills.'
                    : 'Thermal printer is ready. Receipts print automatically when customer payment arrives.'}
                </p>
              </div>
            </div>
            <div className="printer-actions">
              <Badge status={data.printerStatus} />
              <button className="secondary btn-test-print" disabled={testBusy} onClick={testPrint}>
                <Printer size={15} />
                <span>{testBusy ? 'Sending…' : 'Test receipt'}</span>
              </button>
            </div>
          </div>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Fresh Off The Menu</h2>
                <p>Your 10 latest orders · updates automatically</p>
              </div>
              <Link to="/admin/orders" className="panel-link">
                <span>View all orders</span>
                <ArrowRight size={14} />
              </Link>
            </div>
            <OrderTable orders={data.orders} reload={reload} notify={notify} />
          </section>
        </>
      )}
    </>
  );
}

function Orders({ notify }) {
  const [status, setStatus] = useState('');
  const [date, setDate] = useState(today());
  const [token, setToken] = useState('');
  const [page, setPage] = useState(1);
  const [beep, setBeep] = useState(false);
  const audio = useRef(null);
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
    if (fresh.size && beep && audio.current) {
      const ctx = audio.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
    seen.current = new Set([...(seen.current || []), ...paid]);
  }, [data]);

  useEffect(() => () => {
    audio.current?.close();
  }, []);

  function toggleBeep() {
    if (!beep) {
      try {
        audio.current ||= new (window.AudioContext || window.webkitAudioContext)();
        audio.current.resume();
      } catch {
        return;
      }
    }
    setBeep(!beep);
  }

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

          <button
            type="button"
            className={`beep-toggle-btn ${beep ? 'active' : ''}`}
            onClick={toggleBeep}
            title={beep ? 'Disable new order chime' : 'Enable new order chime'}
          >
            <Volume2 size={16} />
            <span>{beep ? 'Sound alert ON' : 'Sound alert OFF'}</span>
          </button>
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
          <label className="field-title">Sizes & Prices (₹)</label>
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
                <span>Price (₹)</span>
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
            Product Image <small>(optional · JPG, PNG or WebP)</small>
          </span>
          <input
            className="upload-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading || busy}
            onChange={upload}
          />
        </label>
        {uploading && <p className="form-note">Uploading image…</p>}
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
          <span>{busy ? 'Saving changes…' : 'Save Flavor'}</span>
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

function ShopSettings({ notify, onPasswordChange }) {
  const { data, error, reload } = useData('/admin/settings');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (data)
      setForm({
        shopName: data.shopName,
        tagline: data.tagline,
        acceptingOrders: data.acceptingOrders,
        receiptHeader: data.receiptHeader || '',
        receiptFooter: data.receiptFooter || 'Thank you!',
        prepCopy: Boolean(data.prepCopy),
        batchSize: data.batchSize || 5
      });
  }, [data]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setActionError('');
    try {
      await api('/admin/settings', { method: 'PUT', body: form });
      notify('Shop settings saved successfully');
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
      notify('Password updated. Please sign in again.');
      onPasswordChange();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTop
        title="Shop & System Settings"
        subtitle="Control storefront availability, receipt custom headers, and security."
      />
      <ErrorNotice message={error || actionError} retry={reload} />
      {!form ? (
        <div className="skeleton admin-skeleton" />
      ) : (
        <div className="settings-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Storefront & Receipt Setup</h2>
                <p>Customize brand texts printed on bills</p>
              </div>
            </div>
            <form className="settings-form" onSubmit={save}>
              <div
                className={`store-status-card ${form.acceptingOrders ? 'status-open' : 'status-paused'}`}
              >
                <Toggle
                  checked={form.acceptingOrders}
                  onChange={v => setForm({ ...form, acceptingOrders: v })}
                  label={form.acceptingOrders ? 'Storefront is Open (Accepting Orders)' : 'Storefront Paused (Resting)'}
                />
                <p className="store-status-note">
                  {form.acceptingOrders
                    ? 'Customers can browse menu, customize cups, and pay online.'
                    : "Ordering paused. Customers see 'Shop is resting, back soon'."}
                </p>
              </div>

              <label>
                <span className="field-title">Shop Name</span>
                <input
                  required
                  maxLength={60}
                  value={form.shopName}
                  onChange={e => setForm({ ...form, shopName: e.target.value })}
                />
              </label>
              <label>
                <span className="field-title">Tagline</span>
                <input
                  maxLength={120}
                  value={form.tagline}
                  onChange={e => setForm({ ...form, tagline: e.target.value })}
                />
              </label>
              <label>
                <span className="field-title">Receipt Header Note (top of thermal bill)</span>
                <input
                  maxLength={120}
                  value={form.receiptHeader}
                  onChange={e => setForm({ ...form, receiptHeader: e.target.value })}
                  placeholder="e.g. Welcome to Fresh Me!"
                />
              </label>
              <label>
                <span className="field-title">Receipt Footer Note (bottom of thermal bill)</span>
                <input
                  maxLength={120}
                  value={form.receiptFooter}
                  onChange={e => setForm({ ...form, receiptFooter: e.target.value })}
                  placeholder="Thank you! Visit again!"
                />
              </label>
              <button className="primary" disabled={busy}>
                <span>Save Settings</span>
                <Check size={17} />
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Security & Password</h2>
                <p>Update administrator credentials</p>
              </div>
            </div>
            <form className="settings-form" onSubmit={password}>
              <p className="panel-subtitle">
                Use at least 12 characters. Updating your password automatically invalidates all active staff sessions.
              </p>
              <label>
                <span className="field-title">Current Password</span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
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
                />
              </label>
              <button className="secondary" disabled={busy}>
                Update Password
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}


