import {useId,useState} from 'react';
import {money} from './api.js';

const COLORS=['#d91b65','#0ea5e9','#8b5cf6','#f59e0b','#10b981','#f43f5e'];
const dateLabel=date=>new Date(date+'T00:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',timeZone:'UTC'});

function AreaChart({rows,metric,title,color}){
  const [hovered,setHovered]=useState(null);
  const id=useId();
  const W=560,H=140,PL=8,PR=8,PT=8,PB=4;
  const IW=W-PL-PR,IH=H-PT-PB;
  const n=rows.length;
  const max=Math.max(1,...rows.map(r=>r[metric]));
  const x=i=>PL+i*IW/Math.max(1,n-1);
  const y=v=>PT+IH-(v/max)*IH;
  const idx=Math.max(0,Math.min(hovered??n-1,n-1));
  const point=rows[idx];
  const fmt=v=>metric==='revenue'?money(v):v.toLocaleString('en-IN');

  /* smooth bezier path */
  const pts=rows.map((r,i)=>[x(i),y(r[metric])]);
  let path='';
  if(pts.length===1){
    path=`M${pts[0][0]},${pts[0][1]}`;
  } else {
    path=`M${pts[0][0]},${pts[0][1]}`;
    for(let i=1;i<pts.length;i++){
      const [x0,y0]=pts[i-1],[x1,y1]=pts[i];
      const cpx=(x0+x1)/2;
      path+=` C${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
    }
  }
  const areaPath=n>0?`${path} L${x(n-1)},${PT+IH} L${x(0)},${PT+IH} Z`:'';

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
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.0"/>
          </linearGradient>
        </defs>
        {/* grid lines */}
        {[0,0.5,1].map(r=>(
          <line key={r} x1={PL} x2={W-PR} y1={y(max*r)} y2={y(max*r)}
            stroke={r===0?'transparent':'#f0f3f7'} strokeWidth="1"/>
        ))}
        {/* area fill */}
        {n>1&&<path d={areaPath} fill={`url(#g${id})`}/>}
        {/* line */}
        {n>1&&<path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
        {/* single point dot */}
        {n===1&&<circle cx={x(0)} cy={y(rows[0][metric])} r="4" fill={color}/>}
        {/* hover crosshair + dot */}
        {point&&n>1&&(
          <>
            <line x1={x(idx)} x2={x(idx)} y1={PT} y2={PT+IH}
              stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.5"/>
            <circle cx={x(idx)} cy={y(point[metric])} r="4.5" fill={color} stroke="white" strokeWidth="2"/>
          </>
        )}
        {/* invisible hover zones */}
        {rows.map((r,i)=>(
          <rect key={r.date} x={x(i)-IW/Math.max(1,n-1)/2} y={0} width={IW/Math.max(1,n-1)} height={H}
            fill="transparent"
            onPointerEnter={()=>setHovered(i)}
            onPointerLeave={()=>setHovered(null)}>
            <title>{dateLabel(r.date)}: {fmt(r[metric])}</title>
          </rect>
        ))}
        {/* date labels */}
        {n>0&&(
          <>
            <text x={x(0)} y={H} fill="#94a3b8" fontSize="10" textAnchor="start">{dateLabel(rows[0].date)}</text>
            <text x={x(n-1)} y={H} fill="#94a3b8" fontSize="10" textAnchor="end">{dateLabel(rows[n-1].date)}</text>
          </>
        )}
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
