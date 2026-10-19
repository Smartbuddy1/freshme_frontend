import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import handler,{proxyTarget} from '../api/proxy.js';
test('proxy requires an explicit verified remote URL and preserves prefixes/query',()=>{
  assert.throws(()=>proxyTarget({url:'/api/menu'},''));assert.throws(()=>proxyTarget({url:'/api/menu'},'http://198.51.100.7'));
  assert.equal(proxyTarget({url:'/api/proxy?path=menu&shopSlug=alpha-shop',query:{path:'menu'}},'https://backend.invalid/freshme').href,'https://backend.invalid/freshme/api/menu?shopSlug=alpha-shop');
  assert.equal(proxyTarget({url:'/api/menu'},'http://127.0.0.1:3103').href,'http://127.0.0.1:3103/api/menu');
});
test('proxy rejects traversal, encoded paths and credential-bearing URLs',()=>{
  for(const path of ['../admin','/evil','%2e%2e','a\\b','a?b','a#b','a//b','https://evil.invalid'])assert.throws(()=>proxyTarget({url:'/api/proxy',query:{path}},'https://backend.invalid'));
  assert.throws(()=>proxyTarget({url:'/api/menu'},'https://user:pass@backend.invalid'));
});
function response(){return {headers:{},statusCode:200,status(code){this.statusCode=code;return this;},setHeader(k,v){this.headers[k.toLowerCase()]=v;},json(value){this.body=value;return this;},send(value){this.body=value;return this;}};}
test('proxy preserves untrusted Origin and scoped header; forwards exact bytes and cookies',async()=>{
  const originalFetch=globalThis.fetch,previous=process.env.BACKEND_URL;process.env.BACKEND_URL='https://backend.invalid';
  try{let seen;globalThis.fetch=async(url,options)=>{seen={url:String(url),...options};return new Response('ok',{headers:{'set-cookie':'freshme_admin=test; HttpOnly','content-type':'text/plain'}});};
    const req=Object.assign(Readable.from([Buffer.from('{"x":1}')]),{method:'POST',url:'/api/admin/settings',headers:{origin:'https://untrusted.invalid',referer:'https://untrusted.invalid/page','x-shop-id':'alpha','content-type':'application/json',host:'frontend.invalid'}}),res=response();
    await handler(req,res);assert.equal(seen.headers.origin,'https://untrusted.invalid');assert.equal(seen.headers['x-shop-id'],'alpha');assert.equal(seen.headers.host,undefined);assert.equal(seen.body.toString(),'{"x":1}');assert.equal(seen.redirect,'manual');assert(seen.signal);assert.equal(res.body.toString(),'ok');assert.deepEqual(res.headers['set-cookie'],['freshme_admin=test; HttpOnly']);
  }finally{globalThis.fetch=originalFetch;if(previous===undefined)delete process.env.BACKEND_URL;else process.env.BACKEND_URL=previous;}
});
test('proxy leaves missing Origin absent and returns generic errors',async()=>{
  const originalFetch=globalThis.fetch,previous=process.env.BACKEND_URL;process.env.BACKEND_URL='https://backend.invalid';
  try{globalThis.fetch=async(_url,options)=>{assert.equal(options.headers.origin,undefined);throw new Error('private internal details');};const req=Object.assign(Readable.from([]),{method:'GET',url:'/api/menu',headers:{}}),res=response();await handler(req,res);assert.equal(res.statusCode,502);assert.deepEqual(res.body,{error:'Backend gateway unreachable'});}finally{globalThis.fetch=originalFetch;if(previous===undefined)delete process.env.BACKEND_URL;else process.env.BACKEND_URL=previous;}
});
test('proxy rejects oversized bodies before forwarding',async()=>{
  const previous=process.env.BACKEND_URL;process.env.BACKEND_URL='https://backend.invalid';
  try{const req=Object.assign(Readable.from([Buffer.alloc(6*1024*1024+1)]),{method:'POST',url:'/api/orders',headers:{}}),res=response();await handler(req,res);assert.equal(res.statusCode,413);}finally{if(previous===undefined)delete process.env.BACKEND_URL;else process.env.BACKEND_URL=previous;}
});
