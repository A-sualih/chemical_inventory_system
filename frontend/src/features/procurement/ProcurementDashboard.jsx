import React, { useState, useEffect } from 'react';
import Layout from '../../layout/Layout';
import SuppliersTab from './SuppliersTab';
import PurchaseOrdersTab from './PurchaseOrdersTab';
import OrderTrackingTab from './OrderTrackingTab';
import AnalyticsTab from './AnalyticsTab';
import VendorPerformanceTab from './VendorPerformanceTab';
import { 
  ShoppingBag, ClipboardList, Truck, PieChart, Star, Factory, 
  TrendingUp, Wallet, CheckCircle2 
} from 'lucide-react';
import axios from 'axios';
import '../../styles/Procurement.css';

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

  const tabs = [
    { id: 'orders',    label: 'Purchase Orders',    icon: ClipboardList, color: 'indigo' },
    { id: 'suppliers', label: 'Suppliers',           icon: Factory,       color: 'blue'   },
    { id: 'tracking',  label: 'Order Tracking',      icon: Truck,         color: 'amber'  },
    { id: 'analytics', label: 'Analytics',           icon: PieChart,      color: 'emerald' },
    { id: 'vendors',   label: 'Vendor Performance',  icon: Star,          color: 'rose'   },
  ];

  return (
    <Layout>
      <div className="procurement-container">
        {/* Superior Header Bar */}
        <div className="procurement-header-bar">
          <div className="procurement-header-content">
            <div className="procurement-title-section">
              <div className="procurement-icon-box">
                <ShoppingBag size={28} />
              </div>
              <div>
                <h1 className="procurement-title">Procurement Hub</h1>
                <p className="procurement-subtitle">Modern supply chain & inventory acquisition</p>
              </div>
            </div>

            <div className="procurement-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`procurement-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <tab.icon size={18} className={`tab-icon-${tab.color}`} />
                  <span>{tab.label}</span>
                  {activeTab === tab.id && <div className="tab-indicator" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="procurement-main-view">
          {/* Summary Cards - Only shown on some tabs or as an overview? 
              The original implementation had them above the tabs. 
              Let's keep them accessible or integrated into an 'Overview' but for now following original flow. */}
          {activeTab === 'analytics' && summary && (
            <div className="procurement-summary-grid">
              <StatCard label="Total Spending"   value={fmt(summary.totalSpending)}  sub="All completed POs"  variant="variant-violet"  Icon={Wallet} />
              <StatCard label="Total Orders"     value={summary.totalOrders || 0}    sub="All time"           variant="variant-blue"    Icon={ClipboardList} />
              <StatCard label="Avg Order Value"  value={fmt(summary.avgOrderValue)}  sub="Per PO"             variant="variant-emerald" Icon={TrendingUp} />
              <StatCard label="Active Suppliers" value={summary.activeSuppliers || 0} sub="Ready to order"   variant="variant-amber"   Icon={CheckCircle2} />
            </div>
          )}

          <div className="proc-tab-content">
            {activeTab === 'orders'    && <PurchaseOrdersTab />}
            {activeTab === 'suppliers' && <SuppliersTab />}
            {activeTab === 'tracking'  && <OrderTrackingTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
            {activeTab === 'vendors'   && <VendorPerformanceTab />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProcurementDashboard;
