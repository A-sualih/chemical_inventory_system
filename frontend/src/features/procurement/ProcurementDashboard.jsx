import React, { useState } from 'react';
import Layout from '../../layout/Layout';
import SuppliersTab from './SuppliersTab';
import PurchaseOrdersTab from './PurchaseOrdersTab';

const ProcurementDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-black heading-font text-secondary-900 tracking-tight">Procurement & Suppliers</h1>
        <p className="text-secondary-500 font-medium">Manage vendor relationships, purchase orders, and track fulfillment.</p>
      </div>
      
      <div className="flex gap-4 mb-6 border-b border-secondary-200">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`pb-4 px-2 font-black text-sm uppercase tracking-wider transition-all border-b-2 ${activeTab === 'orders' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-400 hover:text-secondary-600'}`}
        >
          Purchase Orders
        </button>
        <button 
          onClick={() => setActiveTab('suppliers')}
          className={`pb-4 px-2 font-black text-sm uppercase tracking-wider transition-all border-b-2 ${activeTab === 'suppliers' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-400 hover:text-secondary-600'}`}
        >
          Supplier Directory
        </button>
      </div>

      {activeTab === 'orders' ? <PurchaseOrdersTab /> : <SuppliersTab />}
    </Layout>
  );
};

export default ProcurementDashboard;
