import {useId,useState} from 'react';
import {money} from './api.js';

const COLORS=['#d91b65','#0ea5e9','#8b5cf6','#f59e0b','#10b981','#f43f5e'];
const dateLabel=date=>new Date(date+'T00:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',timeZone:'UTC'});

function AreaChart({rows,metric,title,color}){
  const [hovered,setHovered]=useState(null);
  const id=useId();
  const W=560,H=140,PL=8,PR=8,PT=8,PB=16;
  const IW=W-PL-PR,IH=H-PT-PB;
  const n=rows.length;
  const max=Math.max(1,...rows.map(r=>r[metric]));
  const barW=n>1?Math.max(4,IW/n*0.7):IW*0.3;
  const bx=i=>PL+i*(IW/Math.max(1,n-1));
  const barH=v=>(v/max)*IH;
  const idx=Math.max(0,Math.min(hovered??n-1,n-1));
  const point=rows[idx];
  const fmt=v=>metric==='revenue'?money(v):v.toLocaleString('en-IN');
  const baseline=PT+IH;

  return(
    <section className="ac-card" aria-labelledby={id}>
      <div className="ac-header">
        <div>
          <h3 className="ac-label" id={id}>{title}</h3>
          <span className="ac-sub">{point?dateLabel(point.date)+' · IST':'—'}</span>
        </div>
        <strong className="ac-value" style={{color}}>{fmt(point?.[metric]||0)}</strong>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="ac-svg" role="img" aria-label={title}>
        {/* grid lines */}
        {[0,0.5,1].map(r=>(
          <line key={r} x1={PL} x2={W-PR} y1={PT+IH-(r*IH)} y2={PT+IH-(r*IH)}
            stroke={r===0?'transparent':'#f0f3f7'} strokeWidth="1"/>
        ))}
        {/* bars */}
        {rows.map((r,i)=>{
          const h=Math.max(1,barH(r[metric]));
          const isHov=i===idx;
          return(
            <rect key={r.date}
              x={bx(i)-barW/2} y={baseline-h}
              width={barW} height={h}
              rx="3" ry="3"
              fill={color}
              opacity={hovered===null?0.82:isHov?1:0.35}
              style={{transition:'opacity 0.15s'}}
            />
          );
        })}
        {/* date labels */}
        {n>0&&(
          <>
            <text x={bx(0)} y={H} fill="#94a3b8" fontSize="10" textAnchor="start">{dateLabel(rows[0].date)}</text>
            <text x={bx(n-1)} y={H} fill="#94a3b8" fontSize="10" textAnchor="end">{dateLabel(rows[n-1].date)}</text>
          </>
        )}
        {/* invisible hover zones */}
        {rows.map((r,i)=>(
          <rect key={'h'+r.date} x={bx(i)-IW/Math.max(1,n-1)/2} y={0}
            width={IW/Math.max(1,n-1)} height={H}
            fill="transparent"
            onPointerEnter={()=>setHovered(i)}
            onPointerLeave={()=>setHovered(null)}>
            <title>{dateLabel(r.date)}: {fmt(r[metric])}</title>
          </rect>
        ))}
      </svg>
      {n>1&&<input className="chart-day" type="range" min="0" max={n-1} value={idx}
        aria-label={`${title} day`} aria-valuetext={`${dateLabel(point.date)}: ${fmt(point[metric])}`}
        onChange={event=>setHovered(Number(event.target.value))}/>}
    </section>
  );
}

function DonutChart({shops=[]}){
  const [hovered,setHovered]=useState(null);
  const positive=shops.filter(s=>s.revenue>0).sort((a,b)=>b.revenue-a.revenue);
  const total=positive.reduce((sum,s)=>sum+s.revenue,0);
  const slices=positive.length>6
    ?[...positive.slice(0,5),{shopId:'other',shopName:`${positive.length-5} more clients`,revenue:positive.slice(5).reduce((s,x)=>s+x.revenue,0)}]
    :positive;
  const R=80,CX=110,CY=110,SW=22;
  const circumference=2*Math.PI*R;
  let cumulativeFrac=0;
  const active=hovered?slices.find(s=>s.shopId===hovered):null;
  return(
    <section className="ac-card donut-card">
      <div className="ac-header">
        <div>
          <h3 className="ac-label">Revenue by client</h3>
          <span className="ac-sub">Share of gross collections</span>
        </div>
      </div>
      <div className="donut-body">
        <div className="donut-wrap">
          <svg viewBox="0 0 220 220" className="donut-svg">
            {/* track */}
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={SW}/>
            {total===0&&<circle cx={CX} cy={CY} r={R} fill="none" stroke="#e2e8f0" strokeWidth={SW}/>}
            {slices.map((shop,i)=>{
              const frac=shop.revenue/total;
              const dash=frac*circumference;
              const gap=circumference-dash;
              const offset=circumference*(0.25-cumulativeFrac);
              cumulativeFrac+=frac;
              const isActive=hovered===shop.shopId;
              return(
                <circle key={shop.shopId} cx={CX} cy={CY} r={R} fill="none"
                  stroke={COLORS[i%COLORS.length]}
                  strokeWidth={isActive?SW+4:SW}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={offset}
                  style={{transition:'stroke-width 0.2s ease'}}
                  onPointerEnter={()=>setHovered(shop.shopId)}
                  onPointerLeave={()=>setHovered(null)}
                  role="img"
                  aria-label={`${shop.shopName}: ${money(shop.revenue)}`}>
                  <title>{shop.shopName}: {money(shop.revenue)} · {(frac*100).toFixed(1)}%</title>
                </circle>
              );
            })}
          </svg>
          <div className="donut-center">
            <span>{active?active.shopName:'All clients'}</span>
            <strong>{money(active?.revenue??total)}</strong>
            <small>{active?`${(active.revenue/total*100).toFixed(1)}%`:`${positive.length} shops`}</small>
          </div>
        </div>
        {total>0?(
          <ul className="donut-legend">
            {slices.map((shop,i)=>(
              <li key={shop.shopId} className={hovered===shop.shopId?'active':''}>
                <button type="button" aria-pressed={hovered===shop.shopId}
                  onClick={()=>setHovered(hovered===shop.shopId?null:shop.shopId)}>
                <i style={{background:COLORS[i%COLORS.length]}}/>
                <span>{shop.shopName}</span>
                <b>{(shop.revenue/total*100).toFixed(0)}%</b>
                </button>
              </li>
            ))}
          </ul>
        ):(
          <p className="donut-empty">Payments will show here once clients start selling.</p>
        )}
      </div>
    </section>
  );
}

export function PlatformAnalytics({analytics,days,setDays,loading}){
  return(
    <section className="platform-analytics" aria-label="All client analytics" aria-busy={loading}>
      <div className="analytics-heading">
        <div>
          <p className="platform-eyebrow">THE BIG PICTURE</p>
          <h2>Every shop. Every day.</h2>
          <p>Daily paid orders and gross revenue across all clients, in IST.</p>
        </div>
        <label className="period-select">
          <span>Time period</span>
          <select value={days} onChange={e=>setDays(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
      </div>

      {loading?(
        <p role="status" className="chart-empty">Loading analytics…</p>
      ):analytics?(
        <>
          <div className="period-summary">
            <div className="ps-stat"><strong>{money(analytics.totals.revenue)}</strong><span>collected</span></div>
            <div className="ps-stat"><strong>{analytics.totals.orders.toLocaleString('en-IN')}</strong><span>paid orders</span></div>
            <small>{dateLabel(analytics.from)} – {dateLabel(analytics.to)}</small>
          </div>

          <div className="analytics-grid">
            <div className="daily-charts">
              <AreaChart key={'rev'+days} rows={analytics.daily} metric="revenue" title="Daily revenue" color={COLORS[0]}/>
              <AreaChart key={'ord'+days} rows={analytics.daily} metric="orders" title="Daily orders" color={COLORS[1]}/>
            </div>
            <DonutChart shops={analytics.byShop}/>
          </div>

          <details className="analytics-data">
            <summary>View exact daily totals</summary>
            <div className="analytics-tables">
              <div className="platform-table">
                <table>
                  <caption>Daily totals · IST</caption>
                  <thead><tr><th>Date</th><th>Paid orders</th><th>Revenue</th></tr></thead>
                  <tbody>{analytics.daily.map(row=><tr key={row.date}><td>{row.date}</td><td>{row.orders}</td><td>{money(row.revenue)}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="platform-table">
                <table>
                  <caption>All clients · selected period</caption>
                  <thead><tr><th>Client</th><th>Paid orders</th><th>Revenue</th></tr></thead>
                  <tbody>{analytics.byShop.map(row=><tr key={row.shopId}><td>{row.shopName}</td><td>{row.count}</td><td>{money(row.revenue)}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          </details>
          <p className="analytics-note">Gross collections include orders flagged for refunds; figures are not net settlements.</p>
        </>
      ):(
        <p className="chart-empty">Analytics are unavailable. Refresh to try again.</p>
      )}
    </section>
  );
}
