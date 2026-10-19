export const config={api:{bodyParser:false}};
const hop=new Set(['host','connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade']);
const responseHop=new Set([...hop,'content-encoding','content-length','set-cookie']);
export function proxyTarget(req,base=process.env.BACKEND_URL){
  if(!base)throw new Error('Backend URL is not configured');
  const target=new URL(base);
  if(target.username||target.password||target.search||target.hash)throw new Error('Invalid backend URL');
  const local=['localhost','127.0.0.1','[::1]'].includes(target.hostname);
  if(target.protocol!=='https:'&&!(local&&target.protocol==='http:'))throw new Error('Backend requires HTTPS');
  const incoming=new URL(req.url,'http://localhost');
  let path=req.query?.path;
  path=Array.isArray(path)?path.join('/'):path===undefined?incoming.pathname.replace(/^\/api\/?/,''):String(path);
  if(path==='proxy')path='';
  path=path.replace(/^api\//,'');
  // Disallow path normalization, encoded separators and query/fragment injection.
  if(path&&(!/^[A-Za-z0-9_/-]+(?:\.[A-Za-z0-9_-]+)?$/.test(path)||path.startsWith('/')||path.split('/').some(part=>!part||part==='.'||part==='..')))throw new Error('Invalid API path');
  incoming.searchParams.delete('path');
  target.pathname=target.pathname.replace(/\/+$/,'')+'/api'+(path?'/'+path:'');
  target.search=incoming.searchParams.toString();return target;
}
export default async function handler(req,res){
  let target;try{target=proxyTarget(req);}catch{return res.status(500).json({error:'Backend proxy configuration or API path is invalid'});}
  try{
    const chunks=[];let size=0;
    for await(const chunk of req){const buffer=Buffer.from(chunk);size+=buffer.length;if(size>6*1024*1024)return res.status(413).json({error:'Request too large'});chunks.push(buffer);}
    const headers={};const connection=String(req.headers.connection||'').toLowerCase().split(',').map(v=>v.trim());
    for(const [key,value] of Object.entries(req.headers))if(!hop.has(key.toLowerCase())&&!connection.includes(key.toLowerCase())&&value!==undefined)headers[key]=value;
    delete headers['content-length'];delete headers['x-forwarded-host'];delete headers['x-forwarded-for'];
    // Preserve the caller's Origin/Referer. Backend CSRF checks must see the real origin.
    const response=await fetch(target,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks),redirect:'manual',signal:AbortSignal.timeout(20000)});
    res.status(response.status);
    const responseConnection=(response.headers.get('connection')||'').toLowerCase().split(',').map(v=>v.trim());
    response.headers.forEach((value,key)=>{if(!responseHop.has(key)&&!responseConnection.includes(key))res.setHeader(key,value);});
    const cookies=response.headers.getSetCookie?.();if(cookies?.length)res.setHeader('Set-Cookie',cookies);
    const buffer=Buffer.from(await response.arrayBuffer());res.send(buffer);
  }catch{res.status(502).json({error:'Backend gateway unreachable'});}
}
