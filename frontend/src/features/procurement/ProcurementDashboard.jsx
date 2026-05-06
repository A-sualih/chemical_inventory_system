import React, { useState, useEffect } from 'react';
import Layout from '../../layout/Layout';
import SuppliersTab from './SuppliersTab';
import PurchaseOrdersTab from './PurchaseOrdersTab';
import OrderTrackingTab from './OrderTrackingTab';
import AnalyticsTab from './AnalyticsTab';
import VendorPerformanceTab from './VendorPerformanceTab';
import {
  IconCart, IconMoney, IconClipboard, IconTrending,
  IconFactory, IconCheckCircle, IconTruck, IconBarChart, IconStar
} from './ProcurementIcons';
import axios from 'axios';

const TABS = [
  { id: 'orders',    label: 'Purchase Orders',    Icon: IconClipboard },
  { id: 'suppliers', label: 'Suppliers',           Icon: IconFactory   },
  { id: 'tracking',  label: 'Order Tracking',      Icon: IconTruck     },
  { id: 'analytics', label: 'Analytics',           Icon: IconBarChart  },
  { id: 'vendors',   label: 'Vendor Performance',  Icon: IconStar      },
];

const StatCard = ({ label, value, sub, bgClass, Icon: IcoCmp }) => (
  <div className="bg-white rounded-2xl p-5 border border-secondary-100 shadow-sm flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgClass}`}>
      <IcoCmp size={22} />
    </div>
    <div>
      <p className="text-[11px] font-black text-secondary-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-secondary-900">{value}</p>
      {sub && <p className="text-xs text-secondary-400 font-medium mt-0.5">{sub}</p>}
    </div>
  </div>
);

const ProcurementDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    axios.get('/api/procurement/analytics')
      .then(r => setSummary(r.data.summary))
      .catch(() => {});
  }, []);

  const fmt = (n) => {
    if (!n && n !== 0) return '—';
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
            <IconCart size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-black heading-font text-secondary-900 tracking-tight">Procurement & Suppliers</h1>
            <p className="text-secondary-500 font-medium text-sm">Manage vendors, purchase orders, shipments, and spending analytics.</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Spending"   value={fmt(summary.totalSpending)}  sub="All completed POs"  bgClass="bg-violet-100 text-violet-600"  Icon={IconMoney} />
          <StatCard label="Total Orders"     value={summary.totalOrders || 0}    sub="All time"           bgClass="bg-blue-100 text-blue-600"     Icon={IconClipboard} />
          <StatCard label="Avg Order Value"  value={fmt(summary.avgOrderValue)}  sub="Per PO"             bgClass="bg-emerald-100 text-emerald-600" Icon={IconTrending} />
          <StatCard label="Total Suppliers"  value={summary.totalSuppliers || 0} sub={`${summary.activeSuppliers || 0} active`} bgClass="bg-amber-100 text-amber-600" Icon={IconFactory} />
          <StatCard label="Active Suppliers" value={summary.activeSuppliers || 0} sub="Ready to order"   bgClass="bg-rose-100 text-rose-600"     Icon={IconCheckCircle} />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-secondary-100/60 p-1.5 rounded-2xl w-fit flex-wrap">
        {TABS.map(({ id, label, Icon: IcoCmp }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === id
                ? 'bg-white text-secondary-900 shadow-sm'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
          >
            <IcoCmp size={16} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'orders'    && <PurchaseOrdersTab />}
        {activeTab === 'suppliers' && <SuppliersTab />}
        {activeTab === 'tracking'  && <OrderTrackingTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'vendors'   && <VendorPerformanceTab />}
      </div>
    </Layout>
  );
};

export default ProcurementDashboard;
