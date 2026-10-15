import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Snowflake, WifiOff, X } from 'lucide-react';
import logoImg from './assets/logo.png';
export function Cup({ color = '#d91b65', className = '', small = false }) {
  const uid = useId().replaceAll(':','');
  return <svg className={className} viewBox="0 0 160 190" fill="none" role="img" aria-label="Freshly poured slush"><defs><linearGradient id={`${uid}-fill`} x1="34" y1="66" x2="130" y2="169" gradientUnits="userSpaceOnUse"><stop stopColor={color}/><stop offset=".5" stopColor={color}/><stop offset="1" stopColor="#0b2545" stopOpacity=".5"/></linearGradient><linearGradient id={`${uid}-gloss`}><stop stopColor="white" stopOpacity=".7"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient></defs><ellipse cx="80" cy="178" rx="44" ry="7" fill="#0b2545" opacity=".09"/><path d="M90 72 109 14h22" stroke="#0B2545" strokeWidth="9" strokeLinecap="round"/><path d="M90 72 109 14h22" stroke="#ff709f" strokeWidth="6" strokeLinecap="round"/><path d="M37 72c0-25 18-40 43-40s43 15 43 40" fill={color} opacity=".85"/><path d="M42 65c3-16 12-22 24-24" stroke="white" strokeOpacity=".65" strokeWidth="6" strokeLinecap="round"/><path d="m34 73 15 93c2 12 60 12 62 0l15-93z" fill={`url(#${uid}-fill)`} stroke="white" strokeWidth="3"/><path d="m42 80 12 77c1 5 6 8 12 8L57 80z" fill={`url(#${uid}-gloss)`}/><path d="m115 81-12 78" stroke="white" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round"/><rect x="27" y="69" width="106" height="10" rx="5" fill="white" stroke="#d5e6ec" strokeWidth="2"/><ellipse cx="80" cy="123" rx="26" ry="24" fill="white" opacity=".95"/><text x="80" y="121" textAnchor="middle" fill="#0b2545" fontFamily="Fredoka, sans-serif" fontWeight="600" fontSize="17">fresh</text><text x="80" y="137" textAnchor="middle" fill={color} fontFamily="Fredoka, sans-serif" fontWeight="600" fontSize="17">me.</text>{!small && <><path d="m16 111 3-8 3 8 8 3-8 3-3 8-3-8-8-3z" fill={color}/><circle cx="135" cy="46" r="4" fill={color} opacity=".5"/><circle cx="27" cy="41" r="3" fill={color} opacity=".5"/></>}</svg>;
}
export function Brand({ compact = false }) { return <Link to="/" className={`brand ${compact ? 'compact' : ''}`} aria-label="Fresh Me"><img src={logoImg} alt="Fresh Me" className="brand-logo-img" /></Link>; }
export function Header({ shopName = 'Fresh Me' }) { return <header className="store-header"><Brand/><span className="fresh-label"><span/> Fresh & ready</span></header>; }
export function ErrorNotice({ message, retry }) { if (!message) return null; return <div className="notice error" role="alert"><span>{message}</span>{retry && <button className="text-button" onClick={retry}>Try again <ArrowRight size={15}/></button>}</div>; }
export function Skeleton({ rows = 6 }) { return <div className="product-grid" aria-label="Loading drinks" aria-busy="true">{Array.from({ length: rows }, (_, i) => <div className="skeleton" key={i}/>)}</div>; }
export function unlockScroll() {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.bottom = '';
  document.body.style.height = '';
  document.body.style.width = '';
  document.body.style.touchAction = '';
  document.documentElement.style.overflow = '';
  document.documentElement.style.position = '';
  document.documentElement.style.height = '';
  document.documentElement.style.touchAction = '';
}
export function Modal({ title, children, close, className = '' }) {
  const ref = useRef(null); const heading = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      try { dialog.showModal(); } catch {}
    }
    const saved = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      try { dialog?.close(); } catch {}
      document.body.style.overflow = (saved === 'hidden' ? '' : saved);
      document.body.style.position = '';
      document.documentElement.style.overflow = '';
    };
  }, []);
  return <dialog ref={ref} className={`sheet ${className}`} aria-labelledby={heading} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === ref.current) close(); }}><div className="sheet-inner"><div className="sheet-heading"><h2 id={heading}>{title}</h2><button className="icon-button" onClick={close} aria-label="Close"><X/></button></div>{children}</div></dialog>;
}
export function OfflineBanner() { const [online, setOnline] = useState(navigator.onLine); useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []); return !online && <div className="offline"><WifiOff size={16}/> You’re offline. We’ll reconnect when you’re back.</div>; }
export function Badge({ status = 'NONE' }) { return <span className={`badge badge-${status.toLowerCase().replaceAll(' ','-')}`}>{status.replaceAll('_',' ')}</span>; }
export function Empty({ title, children }) { return <div className="empty"><Snowflake size={36}/><h2>{title}</h2><p>{children}</p></div>; }
export function Progress({ active, children }) { return <div className={`progress-step ${active ? 'active' : ''}`}><span>{active ? <Check size={15}/> : <i/>}</span><strong>{children}</strong></div>; }


