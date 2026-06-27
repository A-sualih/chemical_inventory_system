import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/LearnMore.css';

const HOME_FOOTER = '/#landing-footer';

const PrivacyPolicy = () => {
  const location = useLocation();
  const backTo = location.state?.fromFooter ? HOME_FOOTER : '/';

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, []);

  return (
    <div className="learn-more-container">
      <section className="learn-hero">
        <div className="container">
          <Link to={backTo} className="back-link">← Home</Link>
          <h1>Privacy <span>Policy</span></h1>
          <p className="hero-sub">How we protect and handle your laboratory data.</p>
        </div>
      </section>

      <section className="learn-section">
        <div className="container text-content" style={{ textAlign: 'left', maxWidth: '800px' }}>
          <h2>1. Data Collection</h2>
          <p>
            We collect essential laboratory data including chemical names, quantities, locations,
            and user activity logs to facilitate system functionality.
          </p>

          <h2>2. Security Measures</h2>
          <p>
            All data is encrypted in transit and at rest using AES-256 standard. Multi-Factor
            Authentication (MFA) is enforced for administrative roles.
          </p>

          <h2>3. Data Sharing</h2>
          <p>
            We do not sell or share your laboratory data with third parties. Data access is
            restricted based on lab-specific permissions.
          </p>

          <h2>4. Compliance</h2>
          <p>
            This system is designed to meet institutional safety audit requirements and chemical
            reporting standards.
          </p>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
