import React, { useState } from 'react';
import DisposalLogTab from './DisposalLogTab';
import ComplianceTab from './ComplianceTab';
import SafetyIncidentsTab from './SafetyIncidentsTab';
import WasteAnalyticsTab from './WasteAnalyticsTab';
import { IconTrash, IconFileText, IconAlertTriangle, IconBarChart } from './WasteIcons';
import Layout from '../../layout/Layout';
import './Waste.css';

const TABS = [
  { id: 'disposal', label: 'Disposal Records', Icon: IconTrash },
  { id: 'compliance', label: 'Regulatory Compliance', Icon: IconFileText },
  { id: 'safety', label: 'Safety & Incidents', Icon: IconAlertTriangle },
  { id: 'analytics', label: 'Analytics', Icon: IconBarChart }
];

export default function WasteDashboard() {
  const [activeTab, setActiveTab] = useState('disposal');

  return (
    <Layout>
      <div className="waste-container">
        <header className="waste-header">
          <div>
            <h1 className="waste-title">Waste & Disposal Management</h1>
            <p style={{ color: 'var(--secondary-500)', fontWeight: 600, marginTop: '0.25rem' }}>
              Safe chemical disposal, environmental tracking, and regulatory compliance
            </p>
          </div>
        </header>

        <nav className="waste-tabs">
          {TABS.map(tab => {
            const { Icon } = tab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`waste-tab ${activeTab === tab.id ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <main className="waste-content">
          {activeTab === 'disposal' && <DisposalLogTab />}
          {activeTab === 'compliance' && <ComplianceTab />}
          {activeTab === 'safety' && <SafetyIncidentsTab />}
          {activeTab === 'analytics' && <WasteAnalyticsTab />}
        </main>
      </div>
    </Layout>
  );
}
