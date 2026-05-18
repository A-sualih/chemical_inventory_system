import React, { useState, useEffect } from 'react';
import Layout from '../layout/Layout';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Package, AlertTriangle, Clock, 
  FileText, Download, RefreshCw 
} from 'lucide-react';
import axios from 'axios';
import { fmtQty } from '../utils/formatQuantity';
import '../styles/Reports.css';

const COLORS = ['#0f172a', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

const ReportCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="report-card">
    <div className="card-top-row">
      <div className={`card-icon-box ${color}`} style={{ backgroundColor: color.includes('bg-') ? '' : color }}>
        <Icon size={24} />
      </div>
      {trend && (
        <span className="trend-badge">
          {trend}
        </span>
      )}
    </div>
    <h3 className="card-label">{title}</h3>
    <div className="card-value">{value}</div>
  </div>
);

const Reports = () => {
  const [inventoryData, setInventoryData] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, usageRes] = await Promise.all([
        axios.get('/api/reports/inventory'),
        axios.get('/api/reports/usage', { params: dateRange })
      ]);
      setInventoryData(invRes.data);
      setUsageData(usageRes.data);
    } catch (err) {
      console.error("Error fetching report data", err);
      alert("Failed to load analytics data. Please ensure you have sufficient permissions and the server is reachable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async (type) => {
    try {
      const response = await axios.get(`/api/reports/export/${type}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_report.${type === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(`Error exporting ${type}`, err);
      alert(`Failed to export ${type}.`);
    }
  };

  if (loading && !inventoryData) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner-lg"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="reports-header">
        <div>
          <h1 className="reports-title">Intelligence & Analytics</h1>
          <p className="reports-subtitle">Data-driven insights for laboratory compliance.</p>
        </div>
        <div className="reports-actions-group">
          <div className="date-picker-range">
             <input 
              type="date" 
              className="date-input"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
             />
             <div className="date-separator">→</div>
             <input 
              type="date" 
              className="date-input"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
             />
          </div>
          <button 
            onClick={fetchData}
            className="refresh-btn"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => handleExport('excel')}
            className="export-btn"
          >
            <Download size={16} />
            <span className="hidden-mobile">XLSX</span>
          </button>
          <button 
            onClick={() => handleExport('pdf')}
            className="export-primary-btn"
          >
            <FileText size={16} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <div className="report-grid">
        <ReportCard 
          title="Active Assets" 
          value={inventoryData?.summary?.totalChemicals || 0} 
          icon={Package} 
          color="rgba(15, 23, 42, 0.05)" 
          trend="+12% vs last month"
        />
        <ReportCard 
          title="Expired Items" 
          value={inventoryData?.summary?.expired || 0} 
          icon={AlertTriangle} 
          color="rgba(239, 68, 68, 0.05)" 
        />
        <ReportCard 
          title="Near Expiry" 
          value={inventoryData?.summary?.nearExpiry || 0} 
          icon={Clock} 
          color="rgba(245, 158, 11, 0.05)" 
        />
        <ReportCard 
          title="Low Stock" 
          value={inventoryData?.summary?.lowStock || 0} 
          icon={TrendingUp} 
          color="rgba(59, 130, 246, 0.05)" 
        />
      </div>

      <div className="status-list-grid">
        <div className="status-list-card card-red">
          <h3 className="status-list-title title-red">
            <div className="pulse-dot dot-red"></div>
            Expired Inventory
          </h3>
          <div className="status-items-container custom-scrollbar">
            {inventoryData?.lists?.expired?.length === 0 ? (
              <p className="empty-state-text">No expired items detected.</p>
            ) : (
              inventoryData.lists.expired.map(item => (
                <div key={item.id} className="status-item-row bg-red-light">
                  <div className="item-main-info">
                    <p className="item-name-sm">{item.name}</p>
                    <p className="item-meta-xs">
                      {item.location || 'No Location'} {item.batch_number && `• Batch: ${item.batch_number}`}
                    </p>
                  </div>
                  <span className="item-badge-xs badge-red">
                    {new Date(item.expiry_date).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="status-list-card card-orange">
          <h3 className="status-list-title title-orange">
            <div className="pulse-dot dot-orange"></div>
            Near Expiry (30d)
          </h3>
          <div className="status-items-container custom-scrollbar">
            {inventoryData?.lists?.nearExpiry?.length === 0 ? (
              <p className="empty-state-text">No items near expiry.</p>
            ) : (
              inventoryData.lists.nearExpiry.map(item => (
                <div key={item.id} className="status-item-row bg-orange-light">
                  <div className="item-main-info">
                    <p className="item-name-sm">{item.name}</p>
                    <p className="item-meta-xs">
                      {item.location || 'No Location'} {item.batch_number && `• Batch: ${item.batch_number}`}
                    </p>
                  </div>
                  <span className="item-badge-xs badge-orange">
                    {new Date(item.expiry_date).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="status-list-card card-blue">
          <h3 className="status-list-title title-blue">
            <div className="pulse-dot dot-blue"></div>
            Low Stock Alerts
          </h3>
          <div className="status-items-container custom-scrollbar">
            {inventoryData?.lists?.lowStock?.length === 0 ? (
              <p className="empty-state-text">All stock levels adequate.</p>
            ) : (
              inventoryData.lists.lowStock.map(item => (
                <div key={item.id} className="status-item-row bg-blue-light">
                  <div className="item-main-info">
                    <p className="item-name-sm">{item.name}</p>
                    <p className="item-meta-xs">{item.id}</p>
                  </div>
                  <span className="item-badge-xs badge-blue">
                    {fmtQty(item.quantity, item.unit)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-section-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Consumption Velocity</h3>
            <div className="chart-card-subtitle">Daily Outflow</div>
          </div>
          <div className="chart-container-inner">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageData?.usageStats}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  labelStyle={{ fontWeight: 'black', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="totalQuantity" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorUsage)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-section-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Risk Landscape</h3>
            <div className="chart-card-subtitle">Hazard Groups</div>
          </div>
          <div className="chart-container-inner">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={inventoryData?.hazards}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="_id"
                >
                  {inventoryData?.hazards?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-section-card col-span-full">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Most Consumed Assets</h3>
            <div className="chart-card-subtitle">Top 10 Volume</div>
          </div>
          <div className="chart-container-large">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usageData?.topChemicals}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip />
                <Bar dataKey="totalUsed" fill="#0f172a" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;

