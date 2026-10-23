import {useEffect,useRef,useState} from 'react';
import {Link,NavLink,Navigate,Route,Routes,useHref,useLocation} from 'react-router-dom';
import {Building2,ChartNoAxesCombined,CircleDollarSign,LayoutDashboard,LogOut,Plus,Printer,QrCode,Settings,ShieldCheck} from 'lucide-react';
import QRCode from 'qrcode';
import {MobileNavigation} from './mobile-navigation.jsx';
import {PlatformAnalytics} from './platform-analytics.jsx';
import {api,money,today,dateTime,downloadPayments,setAdminShopId} from './api.js';
import {ErrorNotice,Modal,Brand} from './components.jsx';
import {menuPath} from './flow.js';
import './platform.css';
import {ShopIdentity} from './shop-connection.jsx';

const base='/admin/platform';
function usePlatform(path,revision=0,interval=0){
  const [data,setData]=useState(null),[error,setError]=useState('');
  useEffect(()=>{const controller=new AbortController();let timer;setData(null);setError('');
    async function refresh(){
      try{const value=await api(base+path,{signal:controller.signal});if(!controller.signal.aborted){setData(value);setError('');}}
      catch(e){if(!controller.signal.aborted){setError(e.message);if(e.status===401)window.dispatchEvent(new Event('admin-expired'));}}
      finally{if(interval&&!controller.signal.aborted)timer=setTimeout(refresh,interval);}
    }
    refresh();return()=>{controller.abort();clearTimeout(timer);};
  },[path,revision,interval]);
  return {data,error};
}
function PageTitle({title,detail,children}){return <header className="platform-title"><div><p className="platform-eyebrow">PLATFORM CONTROL</p><h1>{title}</h1><p className="platform-detail">{detail}</p></div>{children&&<div className="platform-title-actions">{children}</div>}</header>;}
function Metrics({items}){return <div className="platform-metrics">{items.map(([label,value])=><article key={label}><span>{label}</span><strong>{value??'—'}</strong></article>)}</div>;}
function ShopReport({rows=[]}){return <div className="platform-table"><table><thead><tr><th>Client shop</th><th>Paid orders</th><th>Gross collections</th><th>Refund flags</th><th>Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row.shopId}><td><strong>{row.shopName}</strong><small>/freshme/{row.slug}</small></td><td>{row.count}</td><td>{money(row.revenue)}</td><td>{row.refundedOrders}</td><td><Link to={`/admin?shop=${encodeURIComponent(row.shopId)}`}>Open admin</Link></td></tr>)}</tbody></table>{!rows.length&&<p className="platform-empty">No shops match this selection.</p>}</div>;}

export default function SuperAdmin(){
  const {pathname}=useLocation();
  const [user,setUser]=useState(),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const {data:settings}=usePlatform('/settings',revision);
  useEffect(()=>{setAdminShopId(null);let active=true;api('/admin/me').then(u=>{if(active)setUser(u);}).catch(()=>{if(active)setUser(null);});const expire=()=>setUser(null);window.addEventListener('admin-expired',expire);return()=>{active=false;window.removeEventListener('admin-expired',expire);};},[]);
  async function logout(){try{await api('/admin/logout',{method:'POST'});setUser(null);}catch(e){setError(e.message);}}
  if(user===undefined)return <div className="page-loading">Opening platform…</div>;
  if(!user)return <Navigate to="/admin" replace/>;
  if(user.role!=='SUPER_ADMIN')return <Navigate to="/admin" replace/>;
  const nav=[['','Overview',LayoutDashboard],['clients','Clients',Building2],['payments','Payments',CircleDollarSign],['reports','Reports',ChartNoAxesCombined],['settings','Settings',Settings]];
  return <div className={`platform-shell${pathname.replace(/\/$/,'').endsWith('/clients')?' platform-clients':''}`}>
    <MobileNavigation home="/super-admin" title="Super Admin" links={nav.map(([path,label,Icon])=>({to:'/super-admin'+(path?'/'+path:''),label,Icon,end:!path}))} onLogout={logout}/>
    <aside className="platform-sidebar">
      <Brand to="/super-admin" />
      <div className="platform-role"><ShieldCheck size={16}/> SUPER ADMIN</div>
      <nav>{nav.map(([path,label,Icon])=><NavLink key={path} to={'/super-admin'+(path?'/'+path:'')} end={!path}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
      <footer><strong>{settings?.name||'Fresh Me'}</strong><small>{user.email}</small><button onClick={logout}><LogOut size={16}/> Sign out</button></footer>
    </aside>
    <main className="platform-main">
      <ErrorNotice message={error}/>
      <Routes>
        <Route index element={<Overview/>}/>
        <Route path="clients" element={<Clients/>}/>
        <Route path="payments" element={<Financials/>}/>
        <Route path="reports" element={<Financials report/>}/>
        <Route path="settings" element={<PlatformSettings user={user} onPasswordChange={()=>setUser(null)}/>}/>
        <Route path="*" element={<Navigate to="/super-admin" replace/>}/>
      </Routes>
      {settings?.supportEmail&&<p className="platform-support">Support: <a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a></p>}
    </main>

  </div>;
}
function Overview(){
  const [days,setDays]=useState('7');
  const {data,error}=usePlatform('/dashboard?days='+days,0,30000);
  return <><PageTitle title="All shops. One overview." detail="Today's activity across your client shops, in Indian Standard Time."><Link className="primary" to="/super-admin/clients"><Plus size={18}/> Manage clients</Link></PageTitle><ErrorNotice message={error}/><Metrics items={[["Active clients",data?`${data.activeClients} / ${data.clients}`:null],["Today's paid orders",data?.todayOrders],["Today's collections",data?money(data.revenue):null],["Prints waiting / failed",data?`${data.pendingPrints} / ${data.failedPrints}`:null]]}/><PlatformAnalytics recentOrders={data?.recentOrders} analytics={data?.analytics} days={days} setDays={setDays} loading={!data&&!error}/><section className="platform-panel"><h2>Today’s collections by shop</h2><p>All shops use your shared Razorpay account. Each payment stays assigned to the shop that created its order.</p>{data?<ShopReport rows={data.byShop}/>:!error&&<p role="status">Loading overview…</p>}</section></>;
}
const slugify=name=>name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60).replace(/-$/,'');
function Clients(){
  const [revision,setRevision]=useState(0),[search,setSearch]=useState(''),[dialog,setDialog]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const {data,error:loadError}=usePlatform('/clients',revision,10000);
  const reload=()=>setRevision(r=>r+1);
  async function patch(shop,body){setBusy(true);setError('');try{await api(`${base}/clients/${shop.id}`,{method:'PATCH',body});reload();setNotice('Client updated.');}catch(e){setError(e.message);}finally{setBusy(false);}}
  const shops=data?.filter(s=>(s.name+' '+s.slug+' '+s.admins.map(a=>a.email).join(' ')).toLowerCase().includes(search.toLowerCase()));
  return <><PageTitle title="Your client shops" detail="Create a shop, edit its URL and share its own ordering QR."><button className="primary" onClick={()=>setDialog({type:'create'})}><Plus size={18}/> Add client</button></PageTitle><ErrorNotice message={error||loadError}/>{notice&&<p role="status" className="platform-notice">{notice}</p>}<label className="platform-search">Find a client<input type="search" placeholder="Shop name, URL or admin email" value={search} onChange={e=>setSearch(e.target.value)}/></label>{!data&&!loadError&&<p role="status">Loading clients…</p>}<div className="client-grid">{shops?.map(shop=><article className="client-card" key={shop.id}><div className="client-summary"><div className="client-icon"><Building2 size={24}/></div><div className="client-information"><div className="client-card-top"><h2>{shop.name}</h2><span className={'platform-pill '+(shop.enabled?'good':'muted')}>{shop.enabled?'Enabled':'Disabled'}</span></div><ShopIdentity id={shop.slug}/><div className="client-admin-emails">{shop.admins.length?shop.admins.map(a=><small key={a.id}>{a.email}{a.disabled?' \u00b7 Access disabled':''}</small>):<small>No client admin yet</small>}</div></div></div><div className="client-actions"><Link className="primary" to={`/admin?shop=${encodeURIComponent(shop.id)}`}>Open admin</Link><button className="edit-client-btn" onClick={()=>setDialog({type:'edit',shop})}>Edit client</button><button className="qr-btn" onClick={()=>setDialog({type:'qr',shop})}><QrCode size={14}/> QR code</button><button className="pair-btn" onClick={()=>setDialog({type:'pair',shop})}><Printer size={14}/> Pair printer</button><button disabled={busy||!shop.enabled} onClick={()=>patch(shop,{acceptingOrders:!shop.acceptingOrders})}>{shop.acceptingOrders?'Pause orders':'Accept orders'}</button><button disabled={busy} onClick={()=>setDialog({type:'status',shop})}>{shop.enabled?'Disable shop':'Enable shop'}</button></div></article>)}</div>{shops?.length===0&&<p className="platform-empty">No clients found. Add your first client to get started.</p>}{dialog?.type==='create'&&<ClientForm close={()=>setDialog(null)} saved={()=>{setDialog(null);reload();setNotice('Client created. Add its menu and pair its printer, then enable orders.');}}/>}{dialog?.type==='edit'&&<ClientAccess shop={dialog.shop} close={()=>setDialog(null)} saved={()=>{reload();setNotice('Client details saved.');}}/>}{dialog?.type==='qr'&&<ShopQR shop={dialog.shop} close={()=>setDialog(null)}/>}{dialog?.type==='pair'&&<PairPrinterModal shop={dialog.shop} close={()=>setDialog(null)}/>}{dialog?.type==='status'&&<Modal title={`${dialog.shop.enabled?'Disable':'Enable'} ${dialog.shop.name}?`} close={()=>!busy&&setDialog(null)}><p>{dialog.shop.enabled?'Customers will not be able to place new orders. Client admin sessions and printer access will be disabled. Payment history and existing orders are preserved.':'The client admin and printer can reconnect. Order acceptance follows this shop\'s saved setting.'}</p><button disabled={busy} className="primary" onClick={async()=>{await patch(dialog.shop,{enabled:!dialog.shop.enabled});setDialog(null);}}>{busy?'Saving…':'Confirm'}</button></Modal>}</>;
}
function ClientForm({close,saved}){
  const [form,setForm]=useState({name:'',slug:'',email:'',password:'',tagline:'Sip and chill.'}),[manualSlug,setManualSlug]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const change=(key,value)=>setForm(f=>({...f,[key]:value,...(key==='name'&&!manualSlug?{slug:slugify(value)}:{})}));
  async function submit(e){e.preventDefault();if(busy)return;setBusy(true);setError('');try{await api(base+'/clients',{method:'POST',body:form});saved();}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <Modal title="Add client shop" close={()=>!busy&&close()}><form className="platform-form" onSubmit={submit}><ErrorNotice message={error}/><label>Shop name<input required maxLength={60} value={form.name} onChange={e=>change('name',e.target.value)}/></label><label>Shop ID / URL<input required minLength={3} maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={e=>{setManualSlug(true);change('slug',e.target.value);}}/><small>/freshme/{form.slug||'your-shop'} · Lowercase letters, numbers and hyphens. This ID is also used in the printer agent. You can edit it later.</small></label><label>Tagline<input maxLength={120} value={form.tagline} onChange={e=>change('tagline',e.target.value)}/></label><label>Client admin email<input required type="email" autoComplete="off" maxLength={254} value={form.email} onChange={e=>change('email',e.target.value)}/></label><label>Initial admin password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={form.password} onChange={e=>change('password',e.target.value)}/><small>At least 12 characters with uppercase, lowercase, a number and a symbol. Share privately with the client.</small></label><p>The new shop starts with orders paused. Its admin can add products and pair a printer before opening.</p><button className="primary" disabled={busy}>{busy?'Creating…':'Create client'}</button></form></Modal>;
}
function ClientAccess({shop,close,saved}){
  const firstAdmin=shop.admins[0];
  const [name,setName]=useState(shop.name),[slug,setSlug]=useState(shop.slug),[admins,setAdmins]=useState(shop.admins),[target,setTarget]=useState(firstAdmin?firstAdmin.id:'new'),[email,setEmail]=useState(firstAdmin?firstAdmin.email:''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  async function act(work){if(busy)return;setBusy(true);setError('');setNotice('');try{await work();saved();}catch(e){setError(e.message);}finally{setBusy(false);}}
  const refresh=async()=>{const shops=await api(base+'/clients');setAdmins(shops.find(s=>s.id===shop.id)?.admins||[]);};
  return <Modal title={'Manage '+shop.name} close={()=>!busy&&close()}><div className="platform-form"><ErrorNotice message={error}/>{notice&&<p role="status">{notice}</p>}<form onSubmit={e=>{e.preventDefault();act(async()=>{await api(`${base}/clients/${shop.id}`,{method:'PATCH',body:{name,slug}});setNotice('Shop name and URL saved. Existing QR links and paired agents still work.');});}}><label>Shop name<input required maxLength={60} value={name} onChange={e=>setName(e.target.value)}/></label><label>Shop ID / URL<input required minLength={3} maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={e=>setSlug(e.target.value)}/><small>/freshme/{slug} · Use this same ID in the agent SHOP_ID setting. Existing QR links keep working after an edit.</small></label><button disabled={busy}>Save shop details</button></form><h3>Client admin access</h3>{admins.map(a=><div className="platform-access-row" key={a.id}><span>{a.email}<small>{a.disabled?'Access disabled':'Active'}</small></span><button disabled={busy} onClick={()=>act(async()=>{await api(`${base}/clients/${shop.id}/admins/${a.id}`,{method:'PATCH',body:{disabled:!a.disabled}});await refresh();setNotice('Admin access updated. Existing sessions revoked.');})}>{a.disabled?'Enable':'Disable'}</button></div>)}<form onSubmit={e=>{e.preventDefault();act(async()=>{const creating=target==='new';await api(`${base}/clients/${shop.id}/admins${creating?'':'/'+target}`,{method:creating?'POST':'PATCH',body:{email,...(password?{password}:{})}});setPassword('');setEmail('');setTarget('new');await refresh();setNotice('Admin saved. Password changes revoke existing sessions.');});}}><label>Account<select value={target} onChange={e=>{setTarget(e.target.value);setEmail(admins.find(a=>a.id===e.target.value)?.email||'');setPassword('');}}><option value="new">Add client admin</option>{admins.map(a=><option key={a.id} value={a.id}>{a.email}</option>)}</select></label><label>Admin email<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label><label>{target==='new'?'Initial password':'New password (leave blank to keep)'}<input type="password" autoComplete="new-password" required={target==='new'} minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label><small>12+ characters with upper/lowercase, number and symbol. This account can access only this client shop.</small><button className="primary" disabled={busy}>{busy?'Saving…':'Save admin access'}</button></form></div></Modal>;
}
function ShopQR({shop,close}){
  const canvas=useRef(null),[error,setError]=useState(''),[ready,setReady]=useState(false);
  const url=new URL(useHref(menuPath(shop.slug)),window.location.origin).href;
  useEffect(()=>{let active=true;QRCode.toCanvas(canvas.current,url,{width:320,margin:4,errorCorrectionLevel:'M',color:{dark:'#0b2545',light:'#ffffff'}}).then(()=>{if(active)setReady(true);}).catch(()=>{if(active)setError('QR code could not be generated.');});return()=>{active=false;};},[url]);
  function download(){const link=document.createElement('a');link.download=`fresh-me-${shop.slug}-qr.png`;link.href=canvas.current.toDataURL('image/png');link.click();}
  return <Modal title={'Ordering QR · '+shop.name} close={close} className="shop-qr-modal"><div className="shop-qr"><p>Scan to order from <strong>{shop.name}</strong></p><ErrorNotice message={error}/><canvas ref={canvas} role="img" aria-label={'Ordering QR for '+shop.name}/><a href={url} target="_blank" rel="noreferrer">{url}</a><button className="primary" disabled={!ready} onClick={download}>Download QR PNG</button><p>Use this QR on your shop counter or menu. Editing the Shop ID updates this QR. Existing printed QR links continue to open this shop.</p></div></Modal>;
}
function PairPrinterModal({shop,close}){
  const [pair,setPair]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);
  const generate=async()=>{
    setBusy(true);setError('');setCopied(false);
    try{
      const data=await api('/admin/agent/pairing',{method:'POST',body:{},headers:{'X-Shop-Id':shop.id}});
      setPair(data);
    }catch(e){
      setError(e.message||'Failed to generate pairing code');
    }finally{
      setBusy(false);
    }
  };
  useEffect(()=>{generate();},[shop.id]);
  const copyCode=()=>{
    if(pair?.code){
      navigator.clipboard?.writeText(pair.code);
      setCopied(true);
      setTimeout(()=>setCopied(false),2000);
    }
  };
  return <Modal title={'Pair printer · '+shop.name} close={close}>
    <div className="platform-form">
      <ErrorNotice message={error}/>
      <p>Connect this shop’s receipt printer to its computer:</p>
      <ol style={{paddingLeft:'20px',margin:'10px 0',display:'flex',flexDirection:'column',gap:'8px',fontSize:'14px',color:'#334155'}}>
        <li>Plug in the thermal printer to the shop PC and confirm Windows prints a test page.</li>
        <li>Open the <code>agent</code> folder on that PC and run: <code style={{background:'#f1f5f9',padding:'2px 6px',borderRadius:'4px',fontWeight:600}}>npm run pair</code></li>
        <li>Enter your backend HTTPS URL, this shop’s <strong>Shop ID</strong>, and this one-time code:</li>
      </ol>
      <label>Shop ID<ShopIdentity id={shop.slug}/></label>
      {pair?(
        <div style={{margin:'14px 0'}}>
          <label>One-time pairing code</label>
          <div style={{display:'flex',gap:'8px',alignItems:'center',marginTop:'6px'}}>
            <code className="pairing-code" style={{fontSize:'20px',letterSpacing:'2px',fontWeight:700,padding:'10px 16px',background:'#eef6ff',color:'#0b2545',borderRadius:'6px',border:'1px solid #bfdbfe',flex:1,textAlign:'center'}}>{pair.code}</code>
            <button type="button" onClick={copyCode} style={{padding:'10px 14px',fontSize:'13px'}}>{copied?'Copied!':'Copy code'}</button>
          </div>
          <small style={{display:'block',marginTop:'8px',color:'#64748b'}}>Expires {dateTime(pair.expiresAt)} (valid for 10 minutes). Once paired, start the agent with <code>start-agent.bat</code>.</small>
          <button type="button" disabled={busy} onClick={generate} style={{marginTop:'12px',fontSize:'13px'}}>{busy?'Generating…':'Generate new code'}</button>
        </div>
      ):(
        busy?<p role="status">Generating pairing code…</p>:null
      )}
    </div>
  </Modal>;
}
function Financials({report=false}){
  const [from,setFrom]=useState(today()),[to,setTo]=useState(today()),[shopId,setShopId]=useState(''),[page,setPage]=useState(1),[error,setError]=useState(''),[exporting,setExporting]=useState(false);
  const {data:shops}=usePlatform('/clients');const query=new URLSearchParams({from,to,...(shopId?{shopId}:{}),page:String(page)}).toString();
  const {data,error:loadError}=usePlatform((report?'/reports?':'/payments?')+query);
  const change=setter=>e=>{setter(e.target.value);setPage(1);};
  async function download(){setExporting(true);setError('');try{await downloadPayments(query,true);}catch(e){setError(e.message);}finally{setExporting(false);}}
  return <><PageTitle title={report?'Shop performance':'All client payments'} detail="Shared Razorpay collections, separated by the shop recorded on each order."><button disabled={exporting||!data} onClick={download}>{exporting?'Exporting…':'Export payments CSV'}</button></PageTitle><div className="platform-filters"><label>From<input type="date" required value={from} max={to} onChange={change(setFrom)}/></label><label>To<input type="date" required value={to} min={from} onChange={change(setTo)}/></label><label>Client shop<select aria-label="Client shop" value={shopId} onChange={change(setShopId)}><option value="">All clients</option>{shops?.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label></div><ErrorNotice message={error||loadError}/><Metrics items={[["Gross collections",data?money(data.totals.revenue):null],["Paid orders",data?.totals.count],["Orders flagged refunded",data?.totals.refundedOrders]]}/><p className="platform-explainer">Amounts are gross paid collections, including orders with refund flags. Refund flags are order counts, not refunded amounts or net settlement. Razorpay settlement remains in your single account.</p><section className="platform-panel">{!data&&!loadError&&<p role="status">Loading {report?'reports':'payments'}…</p>}{data&&(report?<ShopReport rows={data.byShop}/>:<><div className="platform-table"><table><thead><tr><th>Client shop</th><th>Order / token</th><th>Paid (IST)</th><th>Amount</th><th>Status</th><th>Payment ID</th></tr></thead><tbody>{data.orders.map(o=><tr key={o._id}><td>{o.shopName}</td><td>{o.orderCode}<small>Token #{o.tokenNo}</small></td><td>{dateTime(o.paidAt)}</td><td>{money(o.total)}</td><td>{o.status}{o.refunded&&<small>Refund flagged</small>}</td><td><code>{o.razorpayPaymentId}</code></td></tr>)}</tbody></table>{!data.orders.length&&<p className="platform-empty">No paid orders in this date range.</p>}</div>{data.pages>1&&<div className="platform-pagination"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page} of {data.pages}</span><button disabled={page>=data.pages} onClick={()=>setPage(p=>p+1)}>Next</button></div>}</>)}</section></>;
}
function PlatformSettings({user,onPasswordChange}){
  const [password,setPassword]=useState({currentPassword:'',newPassword:''}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  async function savePassword(e){
    e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
    try{
      await api('/admin/change-password',{method:'POST',body:password});
      onPasswordChange();
    }catch(e){
      setError(e.message);
    }finally{
      setBusy(false);
    }
  }
  return <>
    <PageTitle title="Account settings" detail="Your Super Admin credentials and password management."/>
    <ErrorNotice message={error}/>
    {notice&&<p role="status" className="platform-notice">{notice}</p>}
    <div className="platform-settings-grid">
      <section className="platform-panel">
        <h2>Super Admin ID</h2>
        <div className="platform-form">
          <label>Admin ID / Email
            <input type="text" readOnly value={user?.email||''} style={{background:'#f8fafc',cursor:'default'}}/>
          </label>
          <label>Role
            <input type="text" readOnly value="Super Admin" style={{background:'#f8fafc',cursor:'default'}}/>
          </label>
          <h3>Shared payments</h3>
          <p>All shops use the Razorpay credentials configured on your backend. Client admins cannot view or change these credentials. Use Payments and Reports to review collections by shop.</p>
        </div>
      </section>
      <section className="platform-panel">
        <h2>Change your password</h2>
        <form className="platform-form" onSubmit={savePassword}>
          <label>Current password
            <input required type="password" autoComplete="current-password" maxLength={128} value={password.currentPassword} onChange={e=>setPassword({...password,currentPassword:e.target.value})}/>
          </label>
          <label>New password
            <input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password.newPassword} onChange={e=>setPassword({...password,newPassword:e.target.value})}/>
          </label>
          <small>Use 12+ characters with upper/lowercase, a number and a symbol. You will sign in again after saving.</small>
          <button className="primary" disabled={busy}>{busy?'Updating…':'Update password'}</button>
        </form>
      </section>
    </div>
  </>;
}
