import { useEffect, useState } from 'react';
import { CircleDollarSign, ShoppingBag, ReceiptText, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { api, money, today, dateTime } from './api.js';
import { ErrorNotice, Modal } from './components.jsx';
import {ShopIdentity,PrinterConnection} from './shop-connection.jsx';

export function AgentSettings({ notify }) {
  const [data, setData] = useState(null),
    [pair, setPair] = useState(null),
    [events, setEvents] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const controller=new AbortController();let timer;
    async function refresh(){
      try{const next=await api('/admin/settings',{signal:controller.signal});if(!controller.signal.aborted){setData(next);setError('');}}
      catch(e){if(!controller.signal.aborted)setError(e.message);}
      finally{if(!controller.signal.aborted)timer=setTimeout(refresh,10000);}
    }
    refresh();return()=>{controller.abort();clearTimeout(timer);};
  }, []);
  async function act(work) {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel settings-form">
      <h2>Printer agent</h2>
      <ErrorNotice message={error} />
      <ShopIdentity id={data?.shopSlug||data?.shopId}/>
      <PrinterConnection shop={data}/>
      <p>
        Version: {data?.agentVersion || 'Not reported'}
      </p>
      <p>Last seen: {data?.agentLastSeenAt ? dateTime(data.agentLastSeenAt) : 'Never'}</p>
      <p>Status refreshes every 10 seconds. No heartbeat for 30 seconds means offline. An online agent with an offline printer needs a printer, paper or cable check.</p>
      <div className="management-actions">
        <button
          disabled={busy}
          onClick={() =>
            act(async () => setPair(await api('/admin/agent/pairing', { method: 'POST', body: {} })))
          }
        >
          Pair printer agent
        </button>
        <button disabled={busy} onClick={() => act(async () => setEvents(await api('/admin/agent/events')))}>
          Agent events
        </button>
        <button
          disabled={busy}
          onClick={() =>
            act(async () => {
              await api('/admin/agent/commands', { method: 'POST', body: { type: 'REFRESH_CONFIG' } });
              notify('Agent settings refresh queued');
            })
          }
        >
          Refresh agent settings
        </button>
      </div>
      {pair && (
        <Modal title="Pair printer agent" close={() => setPair(null)}>
          <p>
            Stop the existing agent. In its folder run <code>npm run pair</code>, enter the backend HTTPS URL and this
            Shop ID and this one-time code, then restart. Pairing saves <code>SERVER_URL</code>, <code>SHOP_ID</code> and the shop's <code>AGENT_KEY</code> in the agent .env automatically.
          </p>
          <ShopIdentity id={pair.shopId||data?.shopSlug||data?.shopId}/>
          <code className="pairing-code">{pair.code}</code>
          <p>Expires {dateTime(pair.expiresAt)}. Using this code replaces the previous agent key.</p>
        </Modal>
      )}
      {events && (
        <Modal title="Agent events" close={() => setEvents(null)}>
          <ul className="event-list">
            {events.map(e => (
              <li key={e._id}>
                {dateTime(e.createdAt)} · {e.level}: {e.message}
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </section>
  );
}

export function Reports() {
  const [from, setFrom] = useState(today()),
    [to, setTo] = useState(today()),
    [data, setData] = useState(null),
    [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api('/admin/reports?' + new URLSearchParams({ from, to }))
      .then(d => {
        if (!cancelled) {
          setData(d);
          setError('');
        }
      })
      .catch(e => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return (
    <>
      <header className="admin-top">
        <div className="admin-top-text">
          <h1>Performance Reports</h1>
          <p>Sales volume, gross revenue and refund tracking by date range.</p>
        </div>
      </header>

      <div className="filters-card">
        <div className="filters-grid">
          <label className="filter-group">
            <span className="filter-label">From Date (IST)</span>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </label>
          <label className="filter-group">
            <span className="filter-label">To Date (IST)</span>
            <input type="date" min={from} value={to} onChange={e => setTo(e.target.value)} />
          </label>
        </div>
      </div>

      <ErrorNotice message={error} />

      {data && (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-revenue">
              <div className="stat-icon-box">
                <CircleDollarSign size={20} />
              </div>
              <div className="stat-body">
                <span className="stat-label">Gross Revenue</span>
                <b className="stat-value">{money(data.revenue)}</b>
                <small className="stat-note">Total collections in period</small>
              </div>
            </div>

            <div className="stat-card stat-orders">
              <div className="stat-icon-box">
                <ShoppingBag size={20} />
              </div>
              <div className="stat-body">
                <span className="stat-label">Paid Orders</span>
                <b className="stat-value">{data.count}</b>
                <small className="stat-note">Successfully settled orders</small>
              </div>
            </div>

            <div className="stat-card stat-pending">
              <div className="stat-icon-box">
                <ReceiptText size={20} />
              </div>
              <div className="stat-body">
                <span className="stat-label">Orders with Refunds</span>
                <b className="stat-value">{data.refundedOrders}</b>
                <small className="stat-note">
                  {data.refundedOrders === 0 ? 'No refunds recorded' : 'Flagged for reconciliation'}
                </small>
              </div>
            </div>
          </div>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Settlement Summary</h2>
                <p>Accounting notes for the selected period</p>
              </div>
            </div>
            <div className="report-note-box">
              <p>
                All calculations are aggregated according to <b>Asia/Kolkata (IST)</b> payment timestamps. Gross revenue
                includes all orders that successfully completed payment. Any recorded refunds are tracked separately for
                gateway reconciliation and are not automatically deducted from gross turnover.
              </p>
            </div>
          </section>
        </>
      )}
    </>
  );
}

export function Account({ onChanged }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <>
      <header className="admin-top">
        <div className="admin-top-text">
          <h1>Your Account</h1>
          <p>Manage your login credentials.</p>
        </div>
      </header>
      <form
        className="panel settings-form"
        onSubmit={async e => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api('/admin/change-password', { method: 'POST', body: form });
            onChanged();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <ErrorNotice message={error} />
        <label>
          <span className="field-title">Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={form.currentPassword}
            onChange={e => setForm({ ...form, currentPassword: e.target.value })}
          />
        </label>
        <label>
          <span className="field-title">New password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            value={form.newPassword}
            onChange={e => setForm({ ...form, newPassword: e.target.value })}
          />
        </label>
        <p className="form-note">Use at least 12 characters. All active staff sessions will be signed out.</p>
        <button className="primary" disabled={busy}>
          Change password
        </button>
      </form>
    </>
  );
}

