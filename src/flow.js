export const validPhone = value => /^[6-9]\d{9}$/.test(String(value).trim());
export const checkoutPayload = (cart,phone='',customerName='') => ({phone:(phone||'').trim(),customerName:(customerName||'').trim(),items:cart.map(({productId,size,qty})=>({productId,size,qty}))});
export const cartTotal = cart => cart.reduce((total,item)=>total+item.qty*item.price,0);
export const orderPath = id => `/order/${id}`;
export const menuPath = () => '/';
export function changeSize(cart,index,size){
  const next=cart.map((item,i)=>i===index?{...item,size:size.label,price:size.price}:item);const merged=[];
  for(const item of next){const existing=merged.find(x=>x.productId===item.productId&&x.size===item.size);if(existing)existing.qty=Math.min(20,existing.qty+item.qty);else merged.push({...item});}
  return merged;
}
