export const validPhone = value => /^[6-9]\d{9}$/.test(String(value).trim());
export function checkoutPayload(cart, phone = '', customerName = '', shopSlug) {
  return { phone: phone.trim(), customerName: customerName.trim(),
    ...(shopSlug && shopSlug !== 'fresh-me' ? {shopSlug} : {}),
    items: cart.map(({ productId, size, qty }) => ({ productId, size, qty })) };
}
export const shopStorageKey = (slug,key) => !slug || slug === 'fresh-me' ? key : 'freshme:'+slug+':'+key;
export const shopRequestPath = (path,slug) => slug ? path+(path.includes('?')?'&':'?')+'shopSlug='+encodeURIComponent(slug) : path;
export const cartTotal = cart => cart.reduce((total,item)=>total+item.qty*item.price,0);
export const orderPath = (id,slug) => `${slug ? menuPath(slug) : ""}/order/${encodeURIComponent(id)}`;
export const menuPath = slug => slug ? '/'+encodeURIComponent(slug) : '/';
export function changeSize(cart,index,size){
  const next=cart.map((item,i)=>i===index?{...item,size:size.label,price:size.price}:item);const merged=[];
  for(const item of next){const existing=merged.find(x=>x.productId===item.productId&&x.size===item.size);if(existing)existing.qty=Math.min(20,existing.qty+item.qty);else merged.push({...item});}
  return merged;
}
