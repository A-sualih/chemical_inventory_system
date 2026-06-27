import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/LearnMore.css';

const HOME_FOOTER = '/#landing-footer';

const TermsOfService = () => {
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
          <h1>Terms of <span>Service</span></h1>
          <p className="hero-sub">Operating guidelines for institutional chemical management.</p>
        </div>
      </section>

      <section className="learn-section">
        <div className="container text-content" style={{ textAlign: 'left', maxWidth: '800px' }}>
          <h2>1. Use of Service</h2>
          <p>
            Users must use the system exclusively for authorized laboratory inventory tracking and
            safety management.
          </p>

          <h2>2. Accountability</h2>
          <p>
            Users are responsible for the accuracy of chemical entries, consumption updates, and
            disposal requisitions.
          </p>

          <h2>3. Prohibited Actions</h2>
          <p>
            Circumventing laboratory isolation or attempting unauthorized data extraction is
            strictly prohibited.
          </p>

          <h2>4. Termination</h2>
          <p>
            Institutional administrators reserve the right to revoke access for non-compliance with
            safety protocols.
          </p>
        </div>
      </section>
    </div>
  );
};

export default TermsOfService;
