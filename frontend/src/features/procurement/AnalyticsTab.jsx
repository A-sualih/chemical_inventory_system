import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Wallet, ClipboardList, TrendingUp, Factory, BarChart3, 
  PieChart, Activity, Package 
} from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];


const MetricCard = ({ label, value, sub, className, Icon: IcoCmp }) => (
  <div className={`metric-card ${className}`}>
    <div className="metric-card-icon"><IcoCmp size={28} /></div>
    <div>
      <p className="metric-card-label">{label}</p>
      <p className="metric-card-value">{value}</p>
      {sub && <p className="metric-card-sub">{sub}</p>}
    </div>
  </div>
);

const BarChart = ({ data, maxVal, colorClass, labelKey, valueKey, prefix='' }) => (
  <div className="bar-chart-container">
    {data.map((d,i) => {
      const pct = maxVal ? Math.max(2, (d[valueKey] / maxVal) * 100) : 0;
      return (
        <div key={i} className="bar-chart-row">
          <div className="bar-label">{d[labelKey]}</div>
          <div className="bar-track">
            <div className={`bar-fill ${colorClass}`} style={{ width:`${pct}%` }}>
              <span className="bar-value">{prefix}{typeof d[valueKey]==='number'?d[valueKey].toLocaleString(undefined,{maximumFractionDigits:0}):d[valueKey]}</span>
            </div>
          </div>
          <div className="bar-meta">{d.count} POs</div>
        </div>
      );
    })}
  </div>
);

export default function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    axios.get('/api/procurement/analytics', { params:{ year } })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year]);

  const fmt = (n) => {
    if (!n && n !== 0) return '—';
    if (n >= 1000000) return `$${(n/1000000).toFixed(2)}M`;
    if (n >= 1000) return `$${(n/1000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  };

  if (loading) return (
    <div className="analytics-grid">
      {[...Array(8)].map((_,i) => <div key={i} className="skeleton-card" style={{ height: '7rem' }} />)}
    </div>
  );

  if (!data) return <div className="empty-state"><p className="empty-title">Failed to load analytics</p></div>;

  const { summary, ordersByStatus, monthlySpending, topSuppliers, topChemicals } = data;
  const maxMonthly = Math.max(...(monthlySpending||[]).map(m=>m.total), 1);
  const maxSupplier = Math.max(...(topSuppliers||[]).map(s=>s.totalSpent), 1);
  const maxChem = Math.max(...(topChemicals||[]).map(c=>c.totalCost), 1);

  const statusData = (ordersByStatus||[]).map(s => ({ label: s._id, value: s.count }));
  const totalOrders = statusData.reduce((a,s)=>a+s.value, 0)||1;

  const statusColors = {
    Draft: 'var(--secondary-300)',
    Submitted: '#3b82f6',
    Approved: '#4f46e5',
    Rejected: '#ef4444',
    Ordered: '#7c3aed',
    'Partially Received': '#f59e0b',
    Completed: '#10b981',
    Cancelled: 'var(--secondary-400)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Year Selector */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <select value={year} onChange={e=>setYear(Number(e.target.value))} className="filter-select">
          {[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="analytics-grid">
        <MetricCard label="Total Spending"   value={fmt(summary?.totalSpending)} sub="Completed orders" className="metric-violet" Icon={Wallet} />
        <MetricCard label="Total Orders"     value={summary?.totalOrders||0}    sub="All time"        className="metric-blue"     Icon={ClipboardList} />
        <MetricCard label="Avg Order Value"  value={fmt(summary?.avgOrderValue)} sub="Per PO"         className="metric-emerald" Icon={TrendingUp} />
        <MetricCard label="Active Suppliers" value={summary?.activeSuppliers||0} sub={`of ${summary?.totalSuppliers||0} total`} className="metric-amber" Icon={Factory} />
      </div>

      {/* Monthly Spending Chart */}
      <div className="analytics-chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Monthly Procurement Spending — {year}</h3>
          <p className="chart-desc">Total spend per month from completed purchase orders</p>
        </div>
        <div className="bar-chart-container">
          {(monthlySpending||[]).map((m,i) => {
            const pct = Math.max(m.total>0?2:0, (m.total/maxMonthly)*100);
            return (
              <div key={i} className="bar-chart-row">
                <div className="bar-label">{MONTHS[m.month-1]}</div>
                <div className="bar-track">
                  {m.total > 0 && (
                    <div className="bar-fill bar-fill-violet" style={{width:`${pct}%`}}>
                      <span className="bar-value">{fmt(m.total)}</span>
                    </div>
                  )}
                </div>
                <div className="bar-meta">{m.count} POs</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="tracking-grid">
        {/* Orders by Status */}
        <div className="analytics-chart-card">
          <h3 className="chart-title" style={{ marginBottom: '1.25rem' }}>Orders by Status</h3>
          <div className="status-progress-container">
            {statusData.map(s => {
              const pct = Math.round((s.value/totalOrders)*100);
              return (
                <div key={s.label} className="status-progress-row">
                  <div className="status-label-wide">{s.label}</div>
                  <div className="status-track-small">
                    <div className="status-fill" style={{width:`${Math.max(pct,2)}%`, backgroundColor: statusColors[s.label]||'var(--secondary-400)'}} />
                  </div>
                  <div className="status-count-val">{s.value}</div>
                  <div className="status-pct-val">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Suppliers by Spend */}
        <div className="analytics-chart-card">
          <h3 className="chart-title" style={{ marginBottom: '1.25rem' }}>Top Suppliers by Spend</h3>
          {topSuppliers?.length === 0 ? (
            <p className="empty-desc">No completed orders yet</p>
          ) : (
            <BarChart
              data={(topSuppliers||[]).map(s=>({ label:(s.supplier?.name||'Unknown').substring(0,8), value:s.totalSpent, count:s.orderCount }))}
              maxVal={maxSupplier}
              colorClass="bar-fill-blue"
              labelKey="label" valueKey="value" prefix="$"
            />
          )}
        </div>
      </div>

      {/* Top Chemicals */}
      <div className="analytics-chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Most Purchased Chemicals</h3>
          <p className="chart-desc">By total procurement cost across all orders</p>
        </div>
        {topChemicals?.length === 0 ? (
          <p className="empty-desc">No orders yet</p>
        ) : (
          <div className="top-items-grid">
            {(topChemicals||[]).map((c,i)=>(
              <div key={i} className="top-item-card">
                <div className="item-rank">#{i+1}</div>
                <div className="item-info">
                  <p className="item-name">{c._id}</p>
                  <p className="item-sub">{c.orderCount} orders · {c.totalQty?.toLocaleString()} units</p>
                </div>
                <div className="item-total">{fmt(c.totalCost)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

