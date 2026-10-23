import {useState} from 'react';
import {money} from './api.js';
import './revenue-donut.css';

const COLORS=['#d91b65','#0ea5e9','#8b5cf6','#f59e0b','#10b981','#f43f5e'];
export function DonutChart({shops=[],title='Revenue by client',totalLabel='All clients',unit='shops',moreLabel='clients',emptyMessage='Payments will show here once clients start selling.'}){
  const [hovered,setHovered]=useState(null);
  const positive=shops.filter(s=>s.revenue>0).sort((a,b)=>b.revenue-a.revenue);
  const total=positive.reduce((sum,s)=>sum+s.revenue,0);
  const slices=positive.length>6
    ?[...positive.slice(0,5),{shopId:'other',shopName:`${positive.length-5} more ${moreLabel}`,revenue:positive.slice(5).reduce((s,x)=>s+x.revenue,0)}]
    :positive;
  const R=80,CX=110,CY=110,SW=22;
  const circumference=2*Math.PI*R;
  let cumulativeFrac=0;
  const active=hovered?slices.find(s=>s.shopId===hovered):null;
  return(
    <section className="revenue-donut donut-card" aria-label={title}>
      <div className="ac-header">
        <div>
          <h3 className="ac-label">{title}</h3>
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
            <span>{active?active.shopName:totalLabel}</span>
            <strong>{money(active?.revenue??total)}</strong>
            <small>{active?`${(active.revenue/total*100).toFixed(1)}%`:`${positive.length} ${positive.length===1?unit.replace(/s$/,''):unit}`}</small>
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
          <p className="donut-empty">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
