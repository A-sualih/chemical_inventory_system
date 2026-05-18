import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, FileCheck, ShieldAlert } from 'lucide-react';
import '../styles/LearnMore.css';

const TermsOfService = () => {
  return (
    <div className="learn-more-container">
      <section className="learn-hero">
        <div className="container">
          <Link to="/" className="back-link">← Home</Link>
          <h1>Terms of <span>Service</span></h1>
          <p className="hero-sub">Operating guidelines for institutional chemical management.</p>
        </div>
      </section>

      <section className="learn-section">
        <div className="container text-content" style={{ textAlign: 'left', maxWidth: '800px' }}>
          <h2>1. Use of Service</h2>
          <p>Users must use the system exclusively for authorized laboratory inventory tracking and safety management.</p>
          
          <h2>2. Accountability</h2>
          <p>Users are responsible for the accuracy of chemical entries, consumption updates, and disposal requisitions.</p>

          <h2>3. Prohibited Actions</h2>
          <p>Circumventing laboratory isolation or attempting unauthorized data extraction is strictly prohibited.</p>

          <h2>4. Termination</h2>
          <p>Institutional administrators reserve the right to revoke access for non-compliance with safety protocols.</p>
        </div>
      </section>
    </div>
  );
};

export default TermsOfService;
