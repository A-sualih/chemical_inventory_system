import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  HelpCircle, 
  ShieldAlert, 
  Video, 
  Wrench,
  Search,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import '../styles/HelpCenter.css';

const HelpCenter = () => {
  const [activeSection, setActiveSection] = useState('getting_started');
  const [searchQuery, setSearchQuery] = useState('');

  // Expandable FAQ state
  const [openFaqs, setOpenFaqs] = useState({});
  const [openGuides, setOpenGuides] = useState({});

  const toggleFaq = (idx) => {
    setOpenFaqs(prev => ({...prev, [idx]: !prev[idx]}));
  };

  const toggleGuide = (idx) => {
    setOpenGuides(prev => ({...prev, [idx]: !prev[idx]}));
  };

  const categories = [
    { id: 'getting_started', title: 'Getting Started', icon: <BookOpen size={18} /> },
    { id: 'chemical_management', title: 'Chemical Management', icon: <BookOpen size={18} /> },
    { id: 'scanner_help', title: 'Scanner Help', icon: <Wrench size={18} /> },
    { id: 'disposal_requests', title: 'Disposal Requests', icon: <ShieldAlert size={18} /> },
    { id: 'reports_pdfs', title: 'Reports & PDFs', icon: <BookOpen size={18} /> },
    { id: 'account_settings', title: 'Account Settings', icon: <Wrench size={18} /> },
    { id: 'emergency_support', title: 'Emergency Support', icon: <ShieldAlert size={18} color="#ef4444" /> }
  ];

  const renderContent = () => {
    return (
      <div className="help-content-wrapper">
        
        {/* Intro */}
        <div className="help-intro">
          <h2>What Help Center Means</h2>
          <p>
            It helps users learn how to use the system, how to solve common problems, 
            and how to manage chemicals safely.
          </p>
        </div>

        {/* 1. User Guides */}
        <div className="help-content-section" id="user-guides">
          <h3><BookOpen size={24} className="section-icon" /> 1. User Guides</h3>
          <div className="faq-accordion">
            {[
              {
                q: 'How to Add Chemicals',
                a: (
                  <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                    <li>Open the Inventory or Chemicals page.</li>
                    <li>Click <strong>Add Chemical</strong>.</li>
                    <li>Enter chemical information such as: Chemical name, CAS number, Formula, Quantity and unit, Storage location, Supplier information, and Expiry date.</li>
                    <li>Upload the SDS (Safety Data Sheet) PDF if available.</li>
                    <li>Assign the chemical to a batch or container if needed.</li>
                    <li>Click <strong>Save</strong> to register the chemical in the system.</li>
                  </ol>
                )
              },
              {
                q: 'How to Scan QR / Barcodes',
                a: (
                  <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                    <li>Open the Scanner or Quick Scan feature.</li>
                    <li>Allow camera access if prompted.</li>
                    <li>Point the camera toward the QR code or barcode.</li>
                    <li>The system automatically identifies the chemical or container.</li>
                    <li>Chemical details, stock status, and location will appear instantly. You can then: View details, Check in/out, Update quantity, Transfer inventory, or Open SDS files.</li>
                  </ol>
                )
              },
              {
                q: 'How to Check In / Check Out Chemicals',
                a: (
                  <div>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>Check In</h5>
                    <p style={{ margin: '0 0 0.5rem 0' }}><em>Used when adding or returning chemicals to storage.</em></p>
                    <ol style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                      <li>Scan or search for the chemical/container.</li>
                      <li>Click <strong>Check In</strong>.</li>
                      <li>Enter: Quantity added, Storage location, and Notes or reason.</li>
                      <li>Confirm the operation. Inventory quantity updates automatically.</li>
                    </ol>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>Check Out</h5>
                    <p style={{ margin: '0 0 0.5rem 0' }}><em>Used when chemicals are taken for experiments or use.</em></p>
                    <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                      <li>Scan or search for the chemical/container.</li>
                      <li>Click <strong>Check Out</strong>.</li>
                      <li>Enter: Quantity removed, Experiment or purpose, and Department or user.</li>
                      <li>Confirm the request. The system records the activity in the inventory log and updates stock levels.</li>
                    </ol>
                  </div>
                )
              },
              {
                q: 'How to Generate Reports',
                a: (
                  <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                    <li>Open the Reports or Analytics section.</li>
                    <li>Select the report type (Inventory, Expiry, Disposal, Audit, Low stock, or Transfer).</li>
                    <li>Apply filters such as Lab, Date range, Chemical type, or Status.</li>
                    <li>Click <strong>Generate Report</strong>.</li>
                    <li>View, download, or print the report in formats like PDF or Excel.</li>
                  </ol>
                )
              },
              {
                q: 'How to Dispose Chemicals',
                a: (
                  <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                    <li>Open the Disposal Management page.</li>
                    <li>Select the chemical or container for disposal.</li>
                    <li>Enter disposal details: Quantity, Disposal reason, Disposal method, and Compliance notes.</li>
                    <li>Review the SDS disposal instructions and complete the required safety checklist.</li>
                    <li>Submit for approval if required by the lab or safety manager. After approval, inventory is updated, disposal logs are recorded, audit history is maintained, and compliance records are stored.</li>
                  </ol>
                )
              }
            ].map((guide, idx) => (
              <div key={idx} className={`faq-row ${openGuides[idx] ? 'open' : ''}`}>
                <div className="faq-question" onClick={() => toggleGuide(idx)}>
                  <span>{guide.q}</span>
                  <ChevronDown size={18} className="faq-chevron" />
                </div>
                <div className="faq-answer">
                  <div style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.95rem' }}>{guide.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. FAQ */}
        <div className="help-content-section" id="faq">
          <h3><HelpCircle size={24} className="section-icon" /> 2. FAQ (Frequently Asked Questions)</h3>
          <div className="faq-accordion">
            {[
              { q: 'How do I reset my password?', a: 'Click on "Forgot Password" on the login page and follow the email instructions.' },
              { q: 'How do I scan a barcode?', a: 'Navigate to Fast Check-In/Out or use the Quick Scan feature on supported devices with cameras.' },
              { q: 'Why is a chemical marked expired?', a: 'The system automatically flags chemicals past their logged expiration date to prevent safety hazards.' },
              { q: 'How do I request disposal?', a: 'Go to Waste & Disposal, locate the chemical, and submit a disposal request for review.' }
            ].map((faq, idx) => (
              <div key={idx} className={`faq-row ${openFaqs[idx] ? 'open' : ''}`}>
                <div className="faq-question" onClick={() => toggleFaq(idx)}>
                  <span>Q: {faq.q}</span>
                  <ChevronDown size={18} className="faq-chevron" />
                </div>
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Safety Instructions */}
        <div className="help-content-section" id="safety">
          <h3><ShieldAlert size={24} className="section-icon text-red" /> 3. Safety Instructions</h3>
          <div className="safety-cards">
            <div className="safety-card">
              <h4>Chemical handling rules</h4>
              <p>Always review the SDS before handling and ensure incompatible classes are separated.</p>
            </div>
            <div className="safety-card">
              <h4>PPE requirements</h4>
              <p>Goggles, lab coats, and appropriate gloves are mandatory in all active use areas.</p>
            </div>
            <div className="safety-card">
              <h4>Spill response steps</h4>
              <p>Evacuate, isolate, and refer to Emergency Oversight for cleanup protocols.</p>
            </div>
            <div className="safety-card">
              <h4>Hazard labels meaning</h4>
              <p>Reference GHS pictograms and the NFPA diamond in the SDS tab for accurate hazard levels.</p>
            </div>
          </div>
        </div>

        {/* 4. Video Tutorials */}
        <div className="help-content-section" id="videos">
          <h3><Video size={24} className="section-icon" /> 4. Video Tutorials</h3>
          <p className="coming-soon-text">You can later add short tutorials, demo videos, and walkthroughs here.</p>
          <div className="video-placeholders">
            <div className="video-placeholder">
               <Video size={32} opacity={0.5} />
               <span>Short Tutorials (Coming Soon)</span>
            </div>
            <div className="video-placeholder">
               <Video size={32} opacity={0.5} />
               <span>Demo Videos (Coming Soon)</span>
            </div>
          </div>
        </div>

        {/* 5. Troubleshooting */}
        <div className="help-content-section" id="troubleshooting">
          <h3><Wrench size={24} className="section-icon" /> 5. Troubleshooting</h3>
          <ul className="guide-list troubleshooting">
            <li><strong>Scanner not working:</strong> Ensure your browser has camera permissions active.</li>
            <li><strong>PDF not downloading:</strong> Check pop-up blocker settings or try regenerating.</li>
            <li><strong>Login issue:</strong> Ensure credentials are correct and you are assigned to an active lab.</li>
            <li><strong>QR code not detected:</strong> Improve lighting, tap to focus, and hold camera steady.</li>
          </ul>
        </div>

      </div>
    );
  };

  return (
    <div className="help-center-layout">
      {/* Header */}
      <header className="help-header">
        <div className="container help-header-inner">
          <div className="header-brand">
             <Link to="/" className="back-link-help">← Back</Link>
             <h1>Help <span>Center</span></h1>
          </div>
          <div className="help-search">
            <Search size={20} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search guides, FAQs, troubleshooting..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="container help-main">
        {/* Sidebar Navigation */}
        <aside className="help-sidebar">
          <h3>Structure Categories</h3>
          <ul>
            {categories.map(cat => (
              <li 
                key={cat.id} 
                className={activeSection === cat.id ? 'active' : ''}
                onClick={() => setActiveSection(cat.id)}
              >
                {cat.icon}
                <span>{cat.title}</span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content Area */}
        <main className="help-content">
           {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default HelpCenter;
