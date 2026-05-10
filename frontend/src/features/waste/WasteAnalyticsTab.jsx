import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function WasteAnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/waste/analytics')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  if (loading) return <div className="empty-state">Loading analytics...</div>;

  const methodData = data.methodStats.map(s => ({ name: s._id, value: s.count, qty: s.totalQty }));
  const statusData = data.statusStats.map(s => ({ name: s._id, value: s.count }));
  const monthlyData = data.monthlyStats.map(s => ({ name: `Month ${s._id}`, count: s.count, qty: s.quantity }));

  return (
    <div className="analytics-tab">
      <div className="waste-stats-grid">
        <div className="waste-card glass-card" style={{ padding: '2.5rem', gridColumn: 'span 1' }}>
          <div style={{ marginBottom: '2rem' }}>
            <span className="waste-subtitle">Distribution</span>
            <h3 className="stat-label" style={{ color: 'var(--secondary-900)', fontSize: '1.25rem', marginTop: '0.5rem' }}>Disposal Methods</h3>
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {methodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '1rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
            {methodData.map((m, i) => (
              <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.02)', borderRadius: '1rem' }}>
                <div style={{ width: '10px', height: '10px', background: COLORS[i % COLORS.length], borderRadius: '50%' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--secondary-900)' }}>{m.name}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--secondary-400)', fontWeight: 600 }}>{m.value} Requests</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="waste-card glass-card" style={{ padding: '2.5rem', gridColumn: 'span 1' }}>
          <div style={{ marginBottom: '2rem' }}>
            <span className="waste-subtitle">Volume Analysis</span>
            <h3 className="stat-label" style={{ color: 'var(--secondary-900)', fontSize: '1.25rem', marginTop: '0.5rem' }}>Monthly Disposal Qty</h3>
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '1rem' }}
                />
                <Bar dataKey="qty" fill="url(#colorBar)" radius={[10, 10, 0, 0]} barSize={45}>
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="waste-card glass-card" style={{ padding: '2.5rem', marginTop: '2.5rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <span className="waste-subtitle">Trends</span>
          <h3 className="stat-label" style={{ color: 'var(--secondary-900)', fontSize: '1.25rem', marginTop: '0.5rem' }}>Request Frequency Trend</h3>
        </div>
        <div style={{ height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '1rem' }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#6366f1" 
                strokeWidth={6} 
                dot={{ r: 8, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }}
                activeDot={{ r: 10, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
