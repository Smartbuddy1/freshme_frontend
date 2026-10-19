import {useEffect,useId,useRef,useState} from 'react';
import {Link,NavLink,useLocation} from 'react-router-dom';
import {Menu,X,LogOut,ExternalLink} from 'lucide-react';
import {Brand} from './components.jsx';
import './responsive-admin.css';

export function MobileNavigation({home,title,links,onLogout,customerUrl,backToPlatform=false}){
  const dialog=useRef(null),trigger=useRef(null),id=useId(),[open,setOpen]=useState(false);
  const location=useLocation();
  const close=()=>{dialog.current?.close();setOpen(false);};
  useEffect(()=>{close();},[location.pathname,location.search]);
  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    const media=window.matchMedia('(min-width: 769px)');
    const resize=()=>{if(media.matches)close();};media.addEventListener('change',resize);
    return()=>{document.body.style.overflow=previous;media.removeEventListener('change',resize);};
  },[open]);
  return <header className="mobile-admin-header">
    <Brand compact to={home}/><span>{title}</span>
    <button ref={trigger} type="button" className="mobile-menu-trigger" aria-label="Open navigation" aria-controls={id} aria-expanded={open} onClick={()=>{dialog.current.showModal();setOpen(true);}}><Menu size={24}/></button>
    <dialog ref={dialog} id={id} className="mobile-admin-drawer" aria-label={title+' navigation'} onClose={()=>{setOpen(false);trigger.current?.focus();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>
      <div className="drawer-content">
        <div className="drawer-heading"><Brand compact to={home}/><button type="button" aria-label="Close navigation" onClick={close}><X size={22}/></button></div>
        <p className="drawer-caption">{title}</p>
        <nav aria-label={title}>{links.map(({to,label,Icon,end})=><NavLink key={to} to={to} end={end} onClick={close}><Icon size={20}/>{label}</NavLink>)}</nav>
        <div className="drawer-footer">
          {backToPlatform&&<Link to="/super-admin/clients" onClick={close}>Back to Super Admin</Link>}
          {customerUrl&&<Link to={customerUrl} target="_blank" rel="noreferrer" onClick={close}><ExternalLink size={18}/> Open customer menu</Link>}
          <button type="button" onClick={()=>{close();onLogout();}}><LogOut size={20}/> Sign out</button>
        </div>
      </div>
    </dialog>
  </header>;
}
