import test from 'node:test';
import assert from 'node:assert/strict';
import { validPhone, checkoutPayload, cartTotal, changeSize, orderPath,menuPath,shopStorageKey,shopRequestPath } from '../src/flow.js';
import {printerConnection} from '../src/printer-status.js';
test('printer status distinguishes disconnected agent, stale heartbeat and offline hardware',()=>{
  const now=Date.parse('2026-10-18T10:00:00Z');
  const shop={enabled:true,agentLastSeenAt:new Date(now-1000).toISOString(),agentPrinterStatus:'online'};
  assert.deepEqual(printerConnection(shop,now),{agent:'Online',printer:'Online',online:true});
  assert.deepEqual(printerConnection({...shop,agentPrinterStatus:'offline'},now),{agent:'Online',printer:'Offline',online:true});
  assert.equal(printerConnection({...shop,agentPrinterStatus:'unknown'},now).printer,'Unknown');
  for(const date of [null,'invalid',new Date(now-31000).toISOString()])assert.deepEqual(printerConnection({...shop,agentLastSeenAt:date},now),{agent:'Offline',printer:'Offline',online:false});
  assert.deepEqual(printerConnection({...shop,enabled:false},now),{agent:'Disabled',printer:'Disabled',online:false});
});

test('phone validation rejects empty, short, letters and eleven digits', () => {
  for (const phone of ['', '12', 'abcdefghij', '99999000011', '1234567890']) {
    assert.equal(validPhone(phone), false);
  }
  assert(validPhone('9999900001'));
});

test('checkout sends cart items and optional customer name without requiring phone', () => {
  const cart = [{ productId: 'qa-id', size: 'Small', qty: 2, price: 1, status: 'PAID' }];
  const payloadWithNameOnly = checkoutPayload(cart, '', ' QA-TEST ');
  assert.deepEqual(payloadWithNameOnly, {
    phone: '',
    customerName: 'QA-TEST',
    items: [{ productId: 'qa-id', size: 'Small', qty: 2 }]
  });

  const payloadWithPhoneAndName = checkoutPayload(cart, '9999900001', ' QA-TEST ');
  assert.deepEqual(payloadWithPhoneAndName, {
    phone: '9999900001',
    customerName: 'QA-TEST',
    items: [{ productId: 'qa-id', size: 'Small', qty: 2 }]
  });
});

test('size change merges matching lines with bounded quantities and correct total', () => {
  const cart = [{ productId: 'a', size: 'Small', qty: 2, price: 1 }, { productId: 'a', size: 'Large', qty: 3, price: 2 }];
  const next = changeSize(cart, 0, { label: 'Large', price: 2 });
  assert.equal(next.length, 1);
  assert.equal(next[0].qty, 5);
  assert.equal(cartTotal(next), 10);
  assert.equal(cart[0].size, 'Small');
  assert.equal(changeSize([{ ...cart[0], qty: 20 }, cart[1]], 0, { label: 'Large', price: 2 })[0].qty, 20);
});

test('orderPath formats canonical route', () => {
  assert.equal(orderPath('order-id-123'), '/order/order-id-123');
});
test('shop routes, request attribution and carts stay isolated with legacy default compatibility',()=>{
  assert.equal(menuPath('rahul-juice'),'/fresheme/rahul-juice');
  assert.equal(orderPath('abc','rahul-juice'),'/fresheme/rahul-juice/order/abc');
  assert.equal(shopRequestPath('/orders/abc','rahul-juice'),'/orders/abc?shopSlug=rahul-juice');
  assert.equal(shopRequestPath('/menu?x=1','rahul-juice'),'/menu?x=1&shopSlug=rahul-juice');
  assert.notEqual(shopStorageKey('rahul-juice','cart'),shopStorageKey('other-shop','cart'));
  assert.equal(shopStorageKey('fresh-me','freshme-checkout'),'freshme-checkout');
  assert.equal(checkoutPayload([],'','','rahul-juice').shopSlug,'rahul-juice');
  assert.equal(checkoutPayload([],'','','fresh-me').shopSlug,undefined);
  assert.equal(checkoutPayload([],'9999900001','').phone,'9999900001');
});
