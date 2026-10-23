import {useId,useLayoutEffect,useRef,useState} from 'react';
import {ChartColumnIncreasing,ShoppingCart} from 'lucide-react';
import {money} from './api.js';
import './daily-analytics.css';

const dateLabel=date=>new Date(date+'T00:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',timeZone:'UTC'});

function DailyChart({rows,metric,title}) {
  const [selected,setSelected]=useState(null);
  const [hovered,setHovered]=useState(null);
  const id=useId();
  const plot=useRef(null);
  const [plotWidth,setPlotWidth]=useState(720);
  useLayoutEffect(()=>{
    const observer=new ResizeObserver(([entry])=>setPlotWidth(Math.max(240,Math.round(entry.contentRect.width))));
    observer.observe(plot.current);
    return ()=>observer.disconnect();
  },[]);
  const revenue=metric==='revenue';
  const Icon=revenue?ChartColumnIncreasing:ShoppingCart;
  const W=plotWidth,H=150,PL=42,PR=4,PT=9,PB=31;
  const width=W-PL-PR,height=H-PT-PB,baseline=H-PB;
  const maximum=Math.max(1,...rows.map(row=>row[metric]));
  // Four readable grid intervals, with headroom above the tallest bar.
  const magnitude=10**Math.floor(Math.log10(maximum/4));
  const step=Math.ceil(maximum*1.15/4/magnitude)*magnitude;
  const limit=step*4;
  const slot=width/Math.max(rows.length,1),barWidth=Math.min(55,slot*.57);
  const x=i=>PL+slot*(i+.5);
  const index=Math.max(0,Math.min(hovered??selected??rows.length-1,rows.length-1));
  const point=rows[index];
  const format=value=>revenue?money(value):value.toLocaleString('en-IN');
  const tick=value=>value>=1000?new Intl.NumberFormat('en-IN',{notation:'compact',maximumFractionDigits:1}).format(value):value.toFixed(limit<2?1:step<1?1:0);
  const labelEvery=Math.max(1,Math.ceil(rows.length/7));

  return <section className={`daily-chart daily-chart--${metric}`} aria-labelledby={id}>
    <div className="daily-chart-header">
      <div className="daily-chart-title">
        <span className="daily-chart-icon"><Icon size={24} strokeWidth={1.9} aria-hidden="true"/></span>
        <div><h3 id={id}>{title}</h3><span>{point?`${dateLabel(point.date)} · IST`:'No data'}</span></div>
      </div>
      <div className="daily-chart-total"><strong>{format(point?.[metric]??0)}</strong><span>{revenue?'Total revenue':'Total orders'}</span></div>
    </div>
    <div className="daily-chart-plot" ref={plot}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${point?`${dateLabel(point.date)}: ${format(point[metric])}`:'No data'}`} onPointerLeave={()=>setHovered(null)}>
        <defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-color)"/><stop offset="100%" stopColor="var(--chart-color)" stopOpacity=".65"/></linearGradient></defs>
        {[0,1,2,3,4].map(i=>{
          const y=baseline-height*i/4;
          return <g key={i}><line x1={PL} x2={W-PR} y1={y} y2={y} stroke={i===0?'var(--chart-color)':'#e8eff5'} strokeWidth="1"/><line x1={PL-6} x2={PL} y1={y} y2={y} stroke="#a5b6c7"/><text x={PL-14} y={y+4} textAnchor="end">{tick(step*i)}</text></g>;
        })}
        <line x1={PL} x2={PL} y1={PT} y2={baseline} stroke="#a5b6c7"/>
        {rows.map((row,i)=>{
          const h=row[metric]/limit*height,y=baseline-h,left=x(i)-barWidth/2,r=Math.min(8,barWidth/2,h);
          return <g key={row.date}>
            {h>0?<path className="daily-chart-bar" d={`M${left},${baseline}V${y+r}Q${left},${y} ${left+r},${y}H${left+barWidth-r}Q${left+barWidth},${y} ${left+barWidth},${y+r}V${baseline}Z`} fill={`url(#${id}-fill)`} opacity={hovered===null||i===index?1:.45}/>:<circle cx={x(i)} cy={baseline} r="3.5" fill="var(--chart-color)"/>}
            {(i%labelEvery===0||i===rows.length-1)&&<text x={x(i)} y={H-8} textAnchor="middle">{dateLabel(row.date)}</text>}
            <rect x={PL+slot*i} y={PT} width={slot} height={height+PB} fill="transparent" onPointerEnter={()=>setHovered(i)} onClick={()=>setSelected(i)}><title>{dateLabel(row.date)}: {format(row[metric])}</title></rect>
          </g>;
        })}
      </svg>
    </div>
    {point&&<input className="daily-chart-day" type="range" min="0" max={rows.length-1} value={index} aria-label={`${title} day`} aria-valuetext={`${dateLabel(point.date)}: ${format(point[metric])}`} onChange={event=>{setHovered(null);setSelected(Number(event.target.value));}}/>}
  </section>;
}

export function DailyAnalytics({analytics,days,setDays,loading=false,error='',scope='shop',sideChart}) {
  const ready=analytics&&(!analytics.days||analytics.days===Number(days));
  return <section className="daily-analytics" aria-label={scope==='platform'?'All client analytics':'Shop analytics'} aria-busy={loading||Boolean(analytics&&!ready)}>
    <div className="daily-analytics-toolbar"><h2>Sales overview</h2><label>Time period<select value={days} onChange={event=>setDays(event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label></div>
    {error&&!ready?<p role="status">Analytics could not be loaded. Refresh to try again.</p>:loading||analytics&&!ready?<p role="status">Loading analytics…</p>:ready?<>
      <div className={sideChart?'analytics-grid':undefined}>
        <div className="daily-chart-stack">
          <DailyChart key={`revenue-${days}`} rows={analytics.daily} metric="revenue" title="Daily revenue"/>
          <DailyChart key={`orders-${days}`} rows={analytics.daily} metric="orders" title="Daily orders"/>
        </div>
        {sideChart}
      </div>
      <div className="daily-period-summary"><span><b>{money(analytics.totals.revenue)}</b> collected · <b>{analytics.totals.orders.toLocaleString('en-IN')}</b> paid orders</span><span>{dateLabel(analytics.from)} – {dateLabel(analytics.to)} · IST</span></div>
      <details className="daily-analytics-data"><summary>View exact daily totals</summary><div><table><caption>Daily totals · IST</caption><thead><tr><th>Date</th><th>Paid orders</th><th>Revenue</th></tr></thead><tbody>{analytics.daily.map(row=><tr key={row.date}><td>{dateLabel(row.date)}</td><td>{row.orders}</td><td>{money(row.revenue)}</td></tr>)}</tbody></table></div></details>
      <p className="daily-analytics-note">Gross collections include orders flagged for refunds; figures are not net settlements.</p>
    </>:<p role="status">Analytics are unavailable. Refresh to try again.</p>}
  </section>;
}
