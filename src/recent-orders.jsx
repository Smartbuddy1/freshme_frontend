import {useId} from 'react';
import {ReceiptText} from 'lucide-react';
import {dateTime,money} from './api.js';
import './recent-orders.css';

const labels={PAID:'Paid',SERVED:'Served',PENDING_PAYMENT:'Pending payment',EXPIRED:'Expired'};

export function RecentOrders({orders=[],showShop=false}) {
  const id=useId();
  const recent=orders.slice(0,5);
  return <section className="recent-orders" aria-labelledby={id}>
    <header className="recent-orders-heading"><div><h3 id={id}>Recent orders</h3><p>Latest 5 orders · IST</p></div><ReceiptText size={20} aria-hidden="true"/></header>
    {recent.length?<ol className="recent-orders-list">{recent.map(order=><li key={order._id}>
      <div className="recent-order-top"><strong>{order.orderCode||(order.tokenNo?`Token #${order.tokenNo}`:'Order')}</strong><b>{money(order.total)}</b></div>
      {showShop&&<span className="recent-order-shop">{order.shopName||'Shop'}</span>}
      <div className="recent-order-bottom"><span className={`recent-order-status recent-order-status--${order.status?.toLowerCase()}`}>
        {labels[order.status]||order.status}{order.refunded?' · Refund flagged':''}
      </span><time dateTime={order.createdAt}>{dateTime(order.createdAt)}</time></div>
    </li>)}</ol>:<p className="recent-orders-empty">No orders yet. New orders will appear here.</p>}
  </section>;
}
