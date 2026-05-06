import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IconMoney, IconClipboard, IconTrending, IconFactory } from './ProcurementIcons';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MetricCard = ({ label, value, sub, colorClass, Icon: IcoCmp }) => (
  <div className={`rounded-2xl p-5 border ${colorClass} flex items-center gap-4`}>
    <div className="opacity-80"><IcoCmp size={28} /></div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      {sub && <p className="text-xs opacity-60 font-medium mt-0.5">{sub}</p>}
    </div>
  </div>
);

const BarChart = ({ data, maxVal, color, labelKey, valueKey, prefix='' }) => (
  <div className="space-y-2">
    {data.map((d,i) => {
      const pct = maxVal ? Math.max(2, (d[valueKey] / maxVal) * 100) : 0;
      return (
        <div key={i} className="flex items-center gap-3">
          <div className="w-16 text-xs font-bold text-secondary-500 text-right shrink-0">{d[labelKey]}</div>
          <div className="flex-1 bg-secondary-100 rounded-full h-6 overflow-hidden">
            <div className={`h-full rounded-full flex items-center px-2 transition-all ${color}`} style={{ width:`${pct}%` }}>
              <span className="text-[10px] font-black text-white whitespace-nowrap">{prefix}{typeof d[valueKey]==='number'?d[valueKey].toLocaleString(undefined,{maximumFractionDigits:0}):d[valueKey]}</span>
            </div>
          </div>
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_,i) => <div key={i} className="bg-white rounded-2xl p-6 border border-secondary-100 animate-pulse h-28" />)}
    </div>
  );

  if (!data) return <div className="text-center py-20 text-secondary-400"><p className="font-bold">Failed to load analytics</p></div>;

  const { summary, ordersByStatus, monthlySpending, topSuppliers, topChemicals } = data;
  const maxMonthly = Math.max(...(monthlySpending||[]).map(m=>m.total), 1);
  const maxSupplier = Math.max(...(topSuppliers||[]).map(s=>s.totalSpent), 1);
  const maxChem = Math.max(...(topChemicals||[]).map(c=>c.totalCost), 1);

  const statusData = (ordersByStatus||[]).map(s => ({ label: s._id, value: s.count }));
  const totalOrders = statusData.reduce((a,s)=>a+s.value, 0)||1;

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <div className="flex justify-end">
        <select value={year} onChange={e=>setYear(Number(e.target.value))} className="px-4 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm font-bold outline-none">
          {[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Spending"   value={fmt(summary?.totalSpending)} sub="Completed orders" colorClass="bg-violet-50 border-violet-100 text-violet-900" Icon={IconMoney} />
        <MetricCard label="Total Orders"     value={summary?.totalOrders||0}    sub="All time"        colorClass="bg-blue-50 border-blue-100 text-blue-900"     Icon={IconClipboard} />
        <MetricCard label="Avg Order Value"  value={fmt(summary?.avgOrderValue)} sub="Per PO"         colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" Icon={IconTrending} />
        <MetricCard label="Active Suppliers" value={summary?.activeSuppliers||0} sub={`of ${summary?.totalSuppliers||0} total`} colorClass="bg-amber-50 border-amber-100 text-amber-900" Icon={IconFactory} />
      </div>

      {/* Monthly Spending Chart */}
      <div className="bg-white rounded-2xl border border-secondary-100 p-6 shadow-sm">
        <h3 className="font-black text-secondary-900 mb-1">Monthly Procurement Spending — {year}</h3>
        <p className="text-xs text-secondary-400 font-medium mb-5">Total spend per month from completed purchase orders</p>
        <div className="space-y-2">
          {(monthlySpending||[]).map((m,i) => {
            const pct = Math.max(m.total>0?2:0, (m.total/maxMonthly)*100);
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 text-xs font-black text-secondary-400 text-right">{MONTHS[m.month-1]}</div>
                <div className="flex-1 bg-secondary-100 rounded-full h-7 overflow-hidden">
                  {m.total > 0 && (
                    <div className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center px-3 transition-all" style={{width:`${pct}%`}}>
                      <span className="text-[10px] font-black text-white whitespace-nowrap">{fmt(m.total)}</span>
                    </div>
                  )}
                </div>
                <div className="w-12 text-[10px] text-secondary-400 font-bold">{m.count} PO{m.count!==1?'s':''}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="bg-white rounded-2xl border border-secondary-100 p-6 shadow-sm">
          <h3 className="font-black text-secondary-900 mb-5">Orders by Status</h3>
          <div className="space-y-3">
            {statusData.map(s => {
              const pct = Math.round((s.value/totalOrders)*100);
              const colors = { Draft:'bg-secondary-300', Submitted:'bg-blue-400', Approved:'bg-indigo-500', Rejected:'bg-red-400', Ordered:'bg-purple-500', 'Partially Received':'bg-amber-400', Completed:'bg-emerald-500', Cancelled:'bg-secondary-400' };
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-bold text-secondary-600 truncate">{s.label}</div>
                  <div className="flex-1 bg-secondary-100 rounded-full h-5 overflow-hidden">
                    <div className={`h-full rounded-full ${colors[s.label]||'bg-secondary-400'}`} style={{width:`${Math.max(pct,2)}%`}} />
                  </div>
                  <div className="w-10 text-xs font-black text-secondary-700 text-right">{s.value}</div>
                  <div className="w-8 text-[10px] text-secondary-400">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Suppliers by Spend */}
        <div className="bg-white rounded-2xl border border-secondary-100 p-6 shadow-sm">
          <h3 className="font-black text-secondary-900 mb-5">Top Suppliers by Spend</h3>
          {topSuppliers?.length === 0 ? (
            <p className="text-sm text-secondary-400 italic">No completed orders yet</p>
          ) : (
            <BarChart
              data={(topSuppliers||[]).map(s=>({ label:(s.supplier?.name||'Unknown').substring(0,8), value:s.totalSpent, count:s.orderCount }))}
              maxVal={maxSupplier}
              color="bg-gradient-to-r from-blue-500 to-indigo-600"
              labelKey="label" valueKey="value" prefix="$"
            />
          )}
        </div>
      </div>

      {/* Top Chemicals */}
      <div className="bg-white rounded-2xl border border-secondary-100 p-6 shadow-sm">
        <h3 className="font-black text-secondary-900 mb-1">Most Purchased Chemicals</h3>
        <p className="text-xs text-secondary-400 font-medium mb-5">By total procurement cost across all orders</p>
        {topChemicals?.length === 0 ? (
          <p className="text-sm text-secondary-400 italic">No orders yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(topChemicals||[]).map((c,i)=>(
              <div key={i} className="flex items-center gap-4 bg-secondary-50 rounded-xl p-3.5">
                <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 font-black text-sm flex items-center justify-center">#{i+1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-secondary-900 text-sm truncate">{c._id}</p>
                  <p className="text-xs text-secondary-400">{c.orderCount} order{c.orderCount!==1?'s':''} · {c.totalQty?.toLocaleString()} units</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-secondary-900 text-sm">{fmt(c.totalCost)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
