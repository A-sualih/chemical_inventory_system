import React, { useState, useEffect } from 'react';
import Layout from '../layout/Layout';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Package, AlertTriangle, Clock, 
  FileText, Download, Filter, RefreshCw 
} from 'lucide-react';
import axios from 'axios';

const COLORS = ['#0f172a', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

const ReportCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-secondary-100 shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600 group-hover:scale-110 transition-transform`}>
        <Icon size={24} />
      </div>
      {trend && (
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg bg-green-50 text-green-600`}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-secondary-400 text-[10px] font-black uppercase tracking-widest mb-1">{title}</h3>
    <div className="text-2xl font-black text-secondary-900 heading-font">{value}</div>
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportExcel = async () => {
    window.open(`${axios.defaults.baseURL || ''}/api/reports/export/excel`, '_blank');
  };

  if (loading && !inventoryData) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black heading-font text-secondary-900 tracking-tight">Intelligence & Analytics</h1>
          <p className="text-secondary-500 font-medium mt-1">Data-driven insights for laboratory compliance.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex bg-white rounded-2xl border border-secondary-100 p-1 shadow-sm">
             <input 
              type="date" 
              className="px-3 py-2 text-xs font-bold bg-transparent outline-none"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
             />
             <div className="px-2 self-center text-secondary-300">→</div>
             <input 
              type="date" 
              className="px-3 py-2 text-xs font-bold bg-transparent outline-none"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
             />
          </div>
          <button 
            onClick={fetchData}
            className="p-3 bg-secondary-900 text-white rounded-2xl hover:bg-secondary-800 transition-all shadow-lg shadow-secondary-900/10 active:scale-95"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => window.open(`${axios.defaults.baseURL || ''}/api/reports/export/excel`, '_blank')}
            className="flex items-center gap-2 px-6 py-3 bg-white text-secondary-900 border border-secondary-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-secondary-50 transition-all shadow-sm active:scale-95"
          >
            <Download size={16} />
            <span>XLSX</span>
          </button>
          <button 
            onClick={() => window.open(`${axios.defaults.baseURL || ''}/api/reports/export/pdf`, '_blank')}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-500 transition-all shadow-lg shadow-primary-600/20 active:scale-95"
          >
            <FileText size={16} />
            <span>Export PDF</span>
          </button>

        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <ReportCard 
          title="Active Assets" 
          value={inventoryData?.summary?.totalChemicals || 0} 
          icon={Package} 
          color="bg-secondary-100" 
          trend="+12% vs last month"
        />
        <ReportCard 
          title="Expired Items" 
          value={inventoryData?.summary?.expired || 0} 
          icon={AlertTriangle} 
          color="bg-red-100" 
        />
        <ReportCard 
          title="Near Expiry" 
          value={inventoryData?.summary?.nearExpiry || 0} 
          icon={Clock} 
          color="bg-amber-100" 
        />
        <ReportCard 
          title="Low Stock" 
          value={inventoryData?.summary?.lowStock || 0} 
          icon={TrendingUp} 
          color="bg-blue-100" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Usage Trend */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-secondary-100 shadow-xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-secondary-900 heading-font">Consumption Velocity</h3>
            <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Daily Outflow</div>
          </div>
          <div className="h-[300px]">
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

        {/* Hazard Distribution */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-secondary-100 shadow-xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-secondary-900 heading-font">Risk Landscape</h3>
            <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Hazard Groups</div>
          </div>
          <div className="h-[300px] flex items-center">
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

        {/* Top Used Chemicals */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-secondary-100 shadow-xl lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-secondary-900 heading-font">Most Consumed Assets</h3>
            <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Top 10 Volume</div>
          </div>
          <div className="h-[400px]">
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
