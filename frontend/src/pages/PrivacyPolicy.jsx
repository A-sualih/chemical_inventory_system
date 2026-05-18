import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, FileText } from 'lucide-react';
import '../styles/LearnMore.css'; // Reuse common layout styles

const PrivacyPolicy = () => {
  return (
    <div className="learn-more-container">
      <section className="learn-hero">
        <div className="container">
          <Link to="/" className="back-link">← Home</Link>
          <h1>Privacy <span>Policy</span></h1>
          <p className="hero-sub">How we protect and handle your laboratory data.</p>
        </div>
      </section>

      <section className="learn-section">
        <div className="container text-content" style={{ textAlign: 'left', maxWidth: '800px' }}>
          <h2>1. Data Collection</h2>
          <p>We collect essential laboratory data including chemical names, quantities, locations, and user activity logs to facilitate system functionality.</p>
          
          <h2>2. Security Measures</h2>
          <p>All data is encrypted in transit and at rest using AES-256 standard. Multi-Factor Authentication (MFA) is enforced for administrative roles.</p>

          <h2>3. Data Sharing</h2>
          <p>We do not sell or share your laboratory data with third parties. Data access is restricted based on lab-specific permissions.</p>

          <h2>4. Compliance</h2>
          <p>This system is designed to meet institutional safety audit requirements and chemical reporting standards.</p>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
