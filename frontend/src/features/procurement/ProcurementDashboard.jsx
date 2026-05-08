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
import '../../styles/Procurement.css';

const TABS = [
  { id: 'orders',    label: 'Purchase Orders',    Icon: IconClipboard },
  { id: 'suppliers', label: 'Suppliers',           Icon: IconFactory   },
  { id: 'tracking',  label: 'Order Tracking',      Icon: IconTruck     },
  { id: 'analytics', label: 'Analytics',           Icon: IconBarChart  },
  { id: 'vendors',   label: 'Vendor Performance',  Icon: IconStar      },
];

const StatCard = ({ label, value, sub, variant, Icon: IcoCmp }) => (
  <div className="procurement-stat-card">
    <div className={`procurement-stat-icon-box ${variant}`}>
      <IcoCmp size={22} />
    </div>
    <div className="procurement-stat-info">
      <p className="procurement-stat-label">{label}</p>
      <p className="procurement-stat-value">{value}</p>
      {sub && <p className="procurement-stat-sub">{sub}</p>}
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
      <div className="procurement-header">
        <div className="procurement-title-group">
          <div className="procurement-icon-badge">
            <IconCart size={22} />
          </div>
          <div>
            <h1 className="procurement-main-title">Procurement & Suppliers</h1>
            <p className="procurement-main-desc">Manage vendors, purchase orders, shipments, and spending analytics.</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="procurement-summary-grid">
          <StatCard label="Total Spending"   value={fmt(summary.totalSpending)}  sub="All completed POs"  variant="variant-violet"  Icon={IconMoney} />
          <StatCard label="Total Orders"     value={summary.totalOrders || 0}    sub="All time"           variant="variant-blue"    Icon={IconClipboard} />
          <StatCard label="Avg Order Value"  value={fmt(summary.avgOrderValue)}  sub="Per PO"             variant="variant-emerald" Icon={IconTrending} />
          <StatCard label="Total Suppliers"  value={summary.totalSuppliers || 0} sub={`${summary.activeSuppliers || 0} active`} variant="variant-amber" Icon={IconFactory} />
          <StatCard label="Active Suppliers" value={summary.activeSuppliers || 0} sub="Ready to order"   variant="variant-rose"    Icon={IconCheckCircle} />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="procurement-tabs">
        {TABS.map(({ id, label, Icon: IcoCmp }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`procurement-tab ${activeTab === id ? 'active' : ''}`}
          >
            <IcoCmp size={16} />
            <span className="tab-label">{label}</span>
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
