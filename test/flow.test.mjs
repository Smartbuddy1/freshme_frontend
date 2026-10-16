import test from 'node:test';
import assert from 'node:assert/strict';
import { validPhone, checkoutPayload, cartTotal, changeSize, orderPath } from '../src/flow.js';

test('phone validation rejects empty, short, letters and eleven digits', () => {
  for (const phone of ['', '12', 'abcdefghij', '99999000011', '1234567890']) {
    assert.equal(validPhone(phone), false);
  }
  assert(validPhone('9999900001'));
});

test('checkout sends cart items and optional customer name without requiring phone', () => {
  const cart = [{ productId: 'qa-id', size: 'Small', qty: 2, price: 1, status: 'PAID' }];
  const payloadWithNameOnly = checkoutPayload(cart, ' QA-TEST ');
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
