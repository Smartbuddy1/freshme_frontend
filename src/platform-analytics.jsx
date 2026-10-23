import {DailyAnalytics} from './daily-analytics.jsx';
import {DonutChart} from './revenue-donut.jsx';
import {money} from './api.js';

export function PlatformAnalytics({analytics,days,setDays,loading,recentOrders}){
  return <>
    <DailyAnalytics analytics={analytics} days={days} setDays={setDays} loading={loading} scope="platform" recentOrders={recentOrders} sideChart={analytics&&<DonutChart shops={analytics.byShop}/>}/>
    {analytics&&<>
      <details className="analytics-data"><summary>View exact client totals</summary><div className="platform-table"><table><caption>All clients · selected period</caption><thead><tr><th>Client</th><th>Paid orders</th><th>Revenue</th></tr></thead><tbody>{analytics.byShop.map(row=><tr key={row.shopId}><td>{row.shopName}</td><td>{row.count}</td><td>{money(row.revenue)}</td></tr>)}</tbody></table></div></details>
    </>}
  </>;
}
