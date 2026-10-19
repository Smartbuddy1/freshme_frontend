import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {menuPath} from './flow.js';
import {printerConnection} from './printer-status.js';
export function ShopIdentity({id}){
  const [message,setMessage]=useState('');
  useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),4000);return()=>clearTimeout(timer);},[message]);
  if(!id)return null;
  const isSubpath = typeof window !== 'undefined' && (window.location.pathname === '/freshme' || window.location.pathname.startsWith('/freshme/'));
  const displayUrl = `${isSubpath ? '/freshme' : ''}/${id}`;
  return <div className="shop-identity"><Link to={menuPath(id)} target="_blank" rel="noreferrer"><code>{displayUrl}</code></Link><button type="button" disabled={!id} onClick={async()=>{try{await navigator.clipboard.writeText(id);setMessage('Shop ID copied');}catch{setMessage('Select and copy the Shop ID above');}}}>Copy ID</button>{message&&<small role="status">{message}</small>}</div>;
}
export function PrinterConnection({shop}){
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),5000);return()=>clearInterval(timer);},[]);
  const state=printerConnection(shop,now);
  return <div className="printer-connection" role="status" aria-label="Shop printer connection"><span className={state.online?'connection-online':'connection-offline'}>Agent: <b>{state.agent}</b></span><span className={state.printer==='Online'?'connection-online':'connection-offline'}>Printer: <b>{state.printer}</b></span></div>;
}
