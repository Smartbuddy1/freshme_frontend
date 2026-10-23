import {useState} from 'react';
import {DailyAnalytics} from './daily-analytics.jsx';
import {money} from './api.js';

const COLORS=['#d91b65','#0ea5e9','#8b5cf6','#f59e0b','#10b981','#f43f5e'];
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
  return <>
    <DailyAnalytics analytics={analytics} days={days} setDays={setDays} loading={loading} scope="platform" sideChart={analytics&&<DonutChart shops={analytics.byShop}/>}/>
    {analytics&&<>
      <details className="analytics-data"><summary>View exact client totals</summary><div className="platform-table"><table><caption>All clients · selected period</caption><thead><tr><th>Client</th><th>Paid orders</th><th>Revenue</th></tr></thead><tbody>{analytics.byShop.map(row=><tr key={row.shopId}><td>{row.shopName}</td><td>{row.count}</td><td>{money(row.revenue)}</td></tr>)}</tbody></table></div></details>
    </>}
  </>;
}
