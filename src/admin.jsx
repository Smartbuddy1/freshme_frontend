import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, CircleDollarSign, ExternalLink, Download, LayoutDashboard, LogOut, Package, Pencil, Plus, Printer, ReceiptText, RefreshCw, Settings as SettingsIcon, ShoppingBag, Trash2, Volume2, X } from 'lucide-react';
import { api, money, today, dateTime, storageGet, storageSet, formatImageUrl, setActiveMachine, downloadPayments } from './api.js';
import { Badge, Brand, Cup, ErrorNotice, Modal } from './components.jsx';
import { Machines,Users,Reports,Account } from './management.jsx';
function useData(path, interval = 0) {
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce(n => n + 1), []);
  useEffect(() => { let cancelled = false; let timer; const controller = new AbortController(); async function fetchData() { try { const next = await api(path, { signal: controller.signal }); if (!cancelled) { setData(next); setError(''); } } catch (e) { if (!cancelled) { setError(e.message); if (e.status === 401) window.dispatchEvent(new Event('admin-expired')); } } finally { if (!cancelled && interval) timer = setTimeout(fetchData, interval); } } fetchData(); return () => { cancelled = true; clearTimeout(timer); controller.abort(); }; }, [path, interval, nonce]);
  return { data, error, reload };
}
function Pagination({ data, page, setPage }) { return data?.pages > 1 && <div className="pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>{page} / {data.pages}</span><button disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></div>; }
function Toggle({ checked, onChange, label, disabled }) { return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? 'on' : ''}`} disabled={disabled} onClick={() => onChange(!checked)}><span className="toggle-track"><i/></span>{label}</button>; }
function PageTop({ title, subtitle, children }) { return <div className="admin-top"><div><h1>{title}</h1><p>{subtitle}</p></div><div className="admin-top-actions">{children}</div></div>; }
function Login({ onLogin }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) { e.preventDefault(); if (busy) return; setBusy(true); setError(''); try { const user = await api('/admin/login', { method: 'POST', body: { email, password } }); onLogin(user); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <div className="login-page"><Brand/><div className="login-card"><h1>Hello, happy maker.</h1><p>Sign in to keep the good stuff flowing.</p><ErrorNotice message={error}/><form onSubmit={submit}><label>Email address<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@freshme.in"/></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}/></label><button className="primary full" disabled={busy}>{busy ? 'Signing in…' : 'Let’s get pouring'}<ArrowRight size={17}/></button></form></div><Link className="login-back" to="/">Back to the slush menu</Link></div>;
}
export default function Admin() {
  const [user, setUser] = useState(undefined); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const navigate = useNavigate();
  const [machines,setMachines]=useState([]),[selected,setSelected]=useState(''),[machineRevision,setMachineRevision]=useState(0);
  useEffect(()=>{if(!user)return;let cancelled=false;api('/admin/machines').then(list=>{if(cancelled)return;setMachines(list);const saved=storageGet('freshme-admin-machine');const code=list.find(m=>m.code===selected)?.code || list.find(m=>m.code===saved)?.code || list[0]?.code || '';setActiveMachine(code);setSelected(code);}).catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};},[user,machineRevision]);
  useEffect(() => { api('/admin/me').then(setUser).catch(() => setUser(null)); const expire = () => setUser(null); window.addEventListener('admin-expired', expire); return () => window.removeEventListener('admin-expired', expire); }, []);
  useEffect(() => { if (message) { const timer = setTimeout(() => setMessage(''), 3500); return () => clearTimeout(timer); } }, [message]);
  async function logout() { try { await api('/admin/logout', { method: 'POST' }); setUser(null); navigate('/admin'); } catch (e) { setError(e.message); } }
  if (user === undefined) return <div className="page-loading">Opening the counter…</div>; if (!user) return <Login onLogin={setUser}/>;
  const common = { notify: setMessage, role:user.role };
  const owner=user.role==='OWNER';
  const links=[['','Dashboard',LayoutDashboard],['orders','Orders',ReceiptText],...(owner?[['products','Products',Package],['payments','Payments',CircleDollarSign],['reports','Reports',LayoutDashboard],['machines','Machines',Printer],['users','Users',SettingsIcon],['settings','Settings',SettingsIcon]]:[]),['account','Account',SettingsIcon]];
  return <div className="admin-shell"><aside className="admin-nav"><Brand compact/><span className="admin-label">BEHIND THE COUNTER</span><nav className="admin-links">{links.map(([path,label,Icon]) => <NavLink key={path} to={`/admin${path ? `/${path}` : ''}`} end={!path}><Icon size={19}/><span>{label}</span></NavLink>)}</nav><Link to="/" className="nav-store"><ExternalLink size={15}/> Open customer menu</Link><button className="secondary logout" onClick={logout}><LogOut size={16}/> Sign out</button></aside><main className="admin-main"><label className="machine-selector">Selected machine<select value={selected} onChange={e=>{setActiveMachine(e.target.value);setSelected(e.target.value);storageSet('freshme-admin-machine',e.target.value);}}>{machines.map(m=><option key={m.id} value={m.code}>{m.name} ({m.code})</option>)}</select></label><ErrorNotice message={error}/>{selected && <Routes key={selected}><Route index element={<Dashboard {...common}/>}/><Route path="products" element={owner?<Products {...common}/>:<h1>Owner access required</h1>}/><Route path="orders" element={<Orders {...common}/>}/><Route path="payments" element={owner?<Payments/>:<h1>Owner access required</h1>}/><Route path="settings" element={owner?<ShopSettings {...common} logout={logout} onPasswordChange={() => setUser(null)}/>:<h1>Owner access required</h1>}/><Route path="machines" element={owner?<Machines {...common} onChange={()=>setMachineRevision(v=>v+1)}/>:<h1>Owner access required</h1>}/><Route path="users" element={owner?<Users {...common}/>:<h1>Owner access required</h1>}/><Route path="reports" element={owner?<Reports/>:<h1>Owner access required</h1>}/><Route path="account" element={<Account onChanged={()=>setUser(null)}/>}/><Route path="*" element={<Dashboard {...common}/>}/></Routes>}</main>{message && <div className="status-message" role="status">{message}</div>}</div>;
}
function OrderTable({ orders, reload, notify, highlighted = new Set() }) {
  const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  async function action(order, type) { if (busy) return; setBusy(order._id + type); setError(''); try { await api(`/admin/orders/${order._id}/${type}`, { method: type === 'serve' ? 'PATCH' : 'POST' }); notify(type === 'serve' ? `Token ${order.tokenNo} marked served` : `Token ${order.tokenNo} queued for reprint`); reload(); } catch (e) { setError(e.message); } finally { setBusy(''); } }
  return <><ErrorNotice message={error}/>{!orders?.length ? <div className="admin-empty">No orders here yet. The next happy sip is on its way.</div> : <div className="table-scroll"><table className="data-table orders-table"><thead><tr><th>Token</th><th>Order</th><th>Total</th><th>Payment</th><th>Printer</th><th>Actions</th></tr></thead><tbody>{orders.map(o => <tr key={o._id} className={highlighted.has(o._id) ? 'new-order' : ''}><td><span className="table-token">{o.tokenNo ? `#${String(o.tokenNo).padStart(3,'0')}` : '—'}</span>{(o.orderCode || (o.tokenNo && `ORD-${100 + o.tokenNo}`)) && <small style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>{o.orderCode || `ORD-${100 + o.tokenNo}`}</small>}</td><td className="order-item-cell"><div className="table-items">{o.customerName&&<strong>{o.customerName}</strong>}{o.items.map((i,j) => <div key={j}>{i.qty}× {i.name} <span className="text-slate-500">({i.size})</span></div>)}<small>{dateTime(o.createdAt)} IST</small></div></td><td data-label="Total"><strong>{money(o.total)}</strong></td><td data-label="Payment"><Badge status={o.status}/>{o.refunded && <div className="warning-dot">Refund recorded</div>}</td><td data-label="Print status"><Badge status={o.printStatus}/>{o.printError && <div className="warning-dot" title={o.printError}>Check printer</div>}</td><td className="order-action-cell"><div className="row-actions"><button disabled={!!busy || o.status !== 'PAID'} onClick={() => action(o,'serve')}><Check size={13}/>Mark served</button><button disabled={!!busy || !['PAID','SERVED'].includes(o.status)} onClick={() => action(o,'reprint')}><Printer size={13}/>Reprint</button></div></td></tr>)}</tbody></table></div>}</>;
}
function Dashboard({ notify }) {
  const { data, error, reload } = useData('/admin/dashboard', 5000); const [testBusy, setTestBusy] = useState(false); const [actionError, setActionError] = useState('');
  async function testPrint() { setTestBusy(true); try { await api('/admin/test-print', { method: 'POST' }); notify('Test receipt sent to the printer queue'); reload(); } catch (e) { setActionError(e.message); } finally { setTestBusy(false); } }
  return <><PageTop title="A fresh start." subtitle="Here’s what’s happening at your happy little counter."><span className="admin-date">{new Date().toLocaleDateString('en-IN',{ timeZone:'Asia/Kolkata',day:'numeric',month:'long',year:'numeric' })}</span></PageTop><ErrorNotice message={error || actionError} retry={reload}/>{!data ? <div className="skeleton admin-skeleton"/> : <><div className="stats-grid">{[[ShoppingBag,"Today’s orders",data.todayOrders,'Paid & served'],[CircleDollarSign,"Today’s revenue",money(data.revenue),'Gross collected · IST'],[Printer,'Pending prints',data.pendingPrints,'Waiting at the counter'],[ReceiptText,'Failed prints',data.failedPrints,'Need your attention']].map(([Icon,label,value,note]) => <div className="stat-card" key={label}><Icon/><span>{label}</span><b>{value}</b><small>{note}</small></div>)}</div><div className="printer-panel"><div className="printer-info"><Printer size={26}/><div><h3>Your counter connection</h3><p>{data.printerStatus === 'Agent not running' ? 'Start the Fresh Me agent on the shop laptop.' : 'Receipts print automatically when payments arrive.'}</p></div></div><div className="printer-actions"><Badge status={data.printerStatus}/><button className="secondary" disabled={testBusy} onClick={testPrint}><Printer size={15}/>{testBusy ? 'Sending…' : 'Test print'}</button></div></div><section className="panel"><div className="panel-heading"><div><h2>Fresh off the menu</h2><p>Your 10 latest orders · updates automatically</p></div><Link to="/admin/orders">All orders <ArrowRight size={14}/></Link></div><OrderTable orders={data.orders} reload={reload} notify={notify}/></section></>}</>;
}
function Orders({ notify }) {
  const [status, setStatus] = useState(''); const [date, setDate] = useState(today()); const [token, setToken] = useState(''); const [page, setPage] = useState(1); const [beep, setBeep] = useState(false); const audio = useRef(null); const seen = useRef(null); const [highlighted,setHighlighted] = useState(new Set());
  const query = new URLSearchParams({ page, ...(status && { status }), ...(date && { date }), ...(token && { token }) }); const { data, error, reload } = useData(`/admin/orders?${query}`, 5000);
  useEffect(() => { if (!data) return; const paid = data.orders.filter(o => ['PAID','SERVED'].includes(o.status)).map(o => o._id); const fresh = new Set(seen.current ? paid.filter(id => !seen.current.has(id)) : []); setHighlighted(fresh); if (fresh.size && beep && audio.current) { const ctx = audio.current; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = 880; gain.gain.setValueAtTime(.06,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.25); osc.start(); osc.stop(ctx.currentTime+.25); } seen.current = new Set([...(seen.current || []),...paid]); }, [data]);
  useEffect(() => () => { audio.current?.close(); }, []);
  function toggleBeep() { if (!beep) { try { audio.current ||= new (window.AudioContext || window.webkitAudioContext)(); audio.current.resume(); } catch { return; } } setBeep(!beep); }
  return <><PageTop title="Orders" subtitle="A little less waiting. A lot more happy sipping."/><div className="filters"><label>Status<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); seen.current = null; }}><option value="">All orders</option>{['PAID','SERVED','PENDING_PAYMENT','EXPIRED'].map(s => <option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></label><label>Date (IST)<input type="date" value={date} onChange={e => { setDate(e.target.value); setPage(1); seen.current = null; }}/></label><label className="token-filter">Token<input type="number" min="1" placeholder="Any" value={token} onChange={e => { setToken(e.target.value); setPage(1); seen.current = null; }}/></label><label className="beep"><input type="checkbox" checked={beep} onChange={toggleBeep}/><Volume2 size={16}/> New order sound</label></div><ErrorNotice message={error} retry={reload}/><div className="panel"><div className="panel-heading"><h2>The live lineup</h2><Badge status={`${data?.total || 0} orders`}/></div>{!data ? <div className="skeleton admin-skeleton"/> : <OrderTable orders={data.orders} reload={reload} notify={notify} highlighted={highlighted}/>}<Pagination data={data} page={page} setPage={setPage}/></div></>;
}
const blankProduct = () => ({ name: '', category: 'Fruit slush', flavorColor: '#f4ba1b', imageUrl: '', sizes: [{ label: 'Small', price: 40 },{ label: 'Medium', price: 60 },{ label: 'Large', price: 80 }], sortOrder: 0, available: true });
function Products({ notify }) {
  const { data, error, reload } = useData('/admin/products'); const [edit, setEdit] = useState(null); const [deleting, setDeleting] = useState(null); const [actionError, setActionError] = useState(''); const [busy,setBusy] = useState(false);
  async function toggle(p, available) { if (busy) return; setBusy(true); setActionError(''); try { await api(`/admin/products/${p._id}/availability`, { method:'PATCH',body:{available} }); reload(); } catch(e) { setActionError(e.message); } finally { setBusy(false); } }
  async function remove() { if (busy) return; setBusy(true); try { await api(`/admin/products/${deleting._id}`, { method:'DELETE' }); setDeleting(null); notify('Flavor removed from the menu'); reload(); } catch(e) { setActionError(e.message); } finally { setBusy(false); } }
  return <><PageTop title="The flavor cabinet" subtitle="Keep your menu fresh and your favorites ready."><button className="primary" onClick={() => setEdit({ ...blankProduct(), sortOrder: Math.max(-1, ...(data || []).map(p => p.sortOrder)) + 1 })}><Plus size={17}/> Add flavor</button></PageTop><ErrorNotice message={error || actionError} retry={reload}/><div className="panel"><div className="panel-heading"><h2>All flavors</h2><span className="form-note">{data?.length || 0} drinks on the menu</span></div>{!data ? <div className="skeleton admin-skeleton"/> : !data.length ? <div className="admin-empty">Add your first flavor to get the slush flowing.</div> : <div className="table-scroll"><table className="data-table product-table"><thead><tr><th>Flavor</th><th>Sizes & prices</th><th>Availability</th><th>Slot order</th><th>Actions</th></tr></thead><tbody>{data.map(p => <tr key={p._id}><td className="product-name-cell"><div className="product-admin-name">{p.imageUrl ? <img src={formatImageUrl(p.imageUrl)} alt="" loading="lazy"/> : <Cup color={p.flavorColor}/>}<span><b>{p.name}</b><small>{p.category}</small></span></div></td><td data-label="Sizes">{p.sizes.map(s => <div key={s.label} className="leading-6">{s.label} <b>{money(s.price)}</b></div>)}</td><td data-label="Availability"><Toggle checked={p.available} label={p.available ? 'Available' : 'Sold out'} onChange={v => toggle(p,v)} disabled={busy}/></td><td data-label="Slot order">{p.sortOrder}</td><td><div className="row-actions"><button onClick={() => setEdit(p)}><Pencil size={14}/>Edit</button><button aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}><Trash2 size={14}/></button></div></td></tr>)}</tbody></table></div>}</div>{edit && <ProductEditor product={edit} close={() => setEdit(null)} saved={() => { setEdit(null); reload(); notify('Flavor saved. Looking fresh!'); }}/ >}{deleting && <Modal title="Remove this flavor?" close={() => !busy && setDeleting(null)} className="delete-dialog"><p>{deleting.name} will disappear from the customer menu. Past order receipts will keep their original details.</p><div className="dialog-actions"><button className="secondary" disabled={busy} onClick={() => setDeleting(null)}>Keep it</button><button className="primary" disabled={busy} onClick={remove}>Remove flavor</button></div></Modal>}</>;
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
      title={product._id ? 'Freshen up this flavor' : 'Meet your next favorite'}
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
        <ErrorNotice message={error}/>
        <label>
          Flavor name
          <input
            required
            maxLength={80}
            value={form.name}
            onChange={e => field('name', e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            Category
            <input
              required
              maxLength={40}
              value={form.category}
              onChange={e => field('category', e.target.value)}
            />
          </label>
          <label>
            Slot order
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
          Flavor color
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
          <label>Sizes & prices (Rs.)</label>
          {form.sizes.map((s, index) => (
            <div className="size-edit" key={index}>
              <label>
                <span>Size</span>
                <input
                  required
                  maxLength={30}
                  aria-label={`Size ${index + 1}`}
                  value={s.label}
                  onChange={e => {
                    const val = e.target.value;
                    setForm(f => ({
                      ...f,
                      sizes: f.sizes.map((x, i) => i === index ? { ...x, label: val } : x)
                    }));
                  }}
                />
              </label>
              <label>
                <span>Price</span>
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
                      sizes: f.sizes.map((x, i) => i === index ? { ...x, price: val } : x)
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
                onClick={() => setForm(f => ({
                  ...f,
                  sizes: f.sizes.filter((_, i) => i !== index)
                }))}
              >
                <X size={17}/>
              </button>
            </div>
          ))}
          {form.sizes.length < 3 && (
            <button
              type="button"
              className="text-button"
              onClick={() => setForm(f => ({
                ...f,
                sizes: [...f.sizes, { label: '', price: 40 }]
              }))}
            >
              <Plus size={15}/> Add size
            </button>
          )}
        </div>
        <label>
          Product image <span>optional · JPG, PNG or WebP</span>
          <input
            className="upload-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading || busy}
            onChange={upload}
          />
        </label>
        {uploading && <p className="form-note">Uploading your image…</p>}
        {form.imageUrl && (
          <div className="flex items-center gap-3">
            <img
              className="product-preview"
              src={formatImageUrl(form.imageUrl)}
              alt="Product preview"
            />
            <button
              className="text-button"
              type="button"
              onClick={() => field('imageUrl', '')}
            >
              Use illustrated cup
            </button>
          </div>
        )}
        <Toggle
          checked={form.available}
          onChange={v => field('available', v)}
          label="Available to order"
        />
        <button className="primary full" disabled={busy || uploading}>
          {busy ? 'Saving…' : 'Save flavor'}
          <Check size={18}/>
        </button>
      </form>
    </Modal>
  );
}
function Payments() {
  const [exportError,setExportError]=useState('');
  const [from,setFrom] = useState(today()); const [to,setTo] = useState(today()); const [page,setPage] = useState(1); const query = new URLSearchParams({from,to,page}); const {data,error,reload} = useData(`/admin/payments?${query}`);
  return <><ErrorNotice message={exportError}/><PageTop title="Payments" subtitle="Every happy sip, accounted for."><button onClick={async()=>{try{setExportError('');await downloadPayments(new URLSearchParams({from,to}));}catch(e){setExportError(e.message);}}} className="secondary"><Download size={16}/>Export CSV</button></PageTop><div className="filters"><label>From (IST)<input required type="date" value={from} onChange={e=>{setFrom(e.target.value);setPage(1);}}/></label><label>To (IST)<input required type="date" value={to} min={from} onChange={e=>{setTo(e.target.value);setPage(1);}}/></label><button className="secondary" onClick={reload}><RefreshCw size={16}/>Refresh</button></div><ErrorNotice message={error} retry={reload}/><div className="payment-summary"><div><small>Total collected · gross</small><b>{money(data?.totals.total)}</b></div><span>{data?.totals.count || 0} payments<br/>{data?.totals.refundedOrders || 0} orders with refunds</span></div><p className="form-note">Refund flags include partial refunds. Gross collections do not subtract refunds.</p><div className="panel">{!data ? <div className="skeleton admin-skeleton"/> : !data.orders.length ? <div className="admin-empty">No payments in this date range.</div> : <div className="table-scroll"><table className="data-table payments-table"><thead><tr><th>Date</th><th>Token</th><th>Amount</th><th>Status</th><th>Refunded</th><th>Razorpay order</th><th>Payment ID</th><th>Method</th></tr></thead><tbody>{data.orders.map(o=><tr key={o._id}><td data-label="Date (IST)">{dateTime(o.paidAt)}</td><td><span className="table-token">#{String(o.tokenNo).padStart(3,'0')}</span></td><td data-label="Amount"><strong>{money(o.total)}</strong></td><td data-label="Status"><Badge status={o.status}/></td><td data-label="Refunded">{o.refunded?'Yes':'No'}</td><td data-label="Razorpay order"><span className="payment-id">{o.razorpayOrderId}</span></td><td data-label="Payment ID"><span className="payment-id">{o.razorpayPaymentId}</span></td><td data-label="Method">{o.paymentMethod}</td></tr>)}</tbody></table></div>}<Pagination data={data} page={page} setPage={setPage}/></div></>;
}
function ShopSettings({ notify, logout, onPasswordChange }) {
  const {data,error,reload}=useData('/admin/settings'); const [form,setForm]=useState(null); const [busy,setBusy]=useState(false); const [actionError,setActionError]=useState(''); const [currentPassword,setCurrentPassword]=useState(''); const [newPassword,setNewPassword]=useState('');
  useEffect(()=>{if(data) setForm({shopName:data.shopName,tagline:data.tagline,acceptingOrders:data.acceptingOrders,receiptHeader:data.receiptHeader,receiptFooter:data.receiptFooter,prepCopy:data.prepCopy,batchSize:data.batchSize});},[data]);
  async function save(e) { e.preventDefault(); setBusy(true);setActionError('');try{await api('/admin/settings',{method:'PUT',body:form});notify('Shop settings saved');}catch(e){setActionError(e.message);}finally{setBusy(false);}}
  async function password(e) { e.preventDefault();setBusy(true);setActionError('');try{await api('/admin/change-password',{method:'POST',body:{currentPassword,newPassword}});notify('Password updated. Please sign in again.');onPasswordChange();}catch(e){setActionError(e.message);}finally{setBusy(false);}}
  return <><PageTop title="A few finishing touches" subtitle="Your shop, your way."/><ErrorNotice message={error || actionError} retry={reload}/>{!form ? <div className="skeleton admin-skeleton"/> : <div className="settings-grid"><section className="panel"><div className="panel-heading"><h2>Shop details</h2></div><form className="settings-form" onSubmit={save}><label>Shop name<input required maxLength={60} value={form.shopName} onChange={e=>setForm({...form,shopName:e.target.value})}/></label><label>Tagline<input maxLength={120} value={form.tagline} onChange={e=>setForm({...form,tagline:e.target.value})}/></label><label>Receipt header<input maxLength={120} value={form.receiptHeader} onChange={e=>setForm({...form,receiptHeader:e.target.value})}/></label><label>Receipt footer<input maxLength={120} value={form.receiptFooter} onChange={e=>setForm({...form,receiptFooter:e.target.value})}/></label><Toggle checked={form.prepCopy} onChange={prepCopy=>setForm({...form,prepCopy})} label="Print a preparation copy"/><label>Agent batch size<input type="number" min={1} max={20} required value={form.batchSize} onChange={e=>setForm({...form,batchSize:Number(e.target.value)})}/></label><div><Toggle checked={form.acceptingOrders} onChange={v=>setForm({...form,acceptingOrders:v})} label="Accepting orders"/><p className="form-note mt-2">Turn off for a break. Customers will see “Machine is resting, back soon”. Save to apply.</p></div><button className="primary" disabled={busy}>Save settings<Check size={17}/></button></form></section><section className="panel"><div className="panel-heading"><h2>Keep your account safe</h2></div><form className="settings-form" onSubmit={password}><p className="panel-subtitle">Use at least 12 characters. Changing your password signs out all staff sessions.</p><label>Current password<input type="password" required autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label><label>New password<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><button className="secondary" disabled={busy}>Update password</button></form></section></div>}<button className="secondary" onClick={logout}><LogOut size={16}/>Sign out of the counter</button></>;
}

