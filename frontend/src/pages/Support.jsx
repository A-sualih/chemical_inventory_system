import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, HelpCircle, Phone, MessageSquare, Send, Trash2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import '../styles/LearnMore.css';
import '../styles/Support.css';
import ThemeToggle from '../components/common/ThemeToggle';

const HOME_FOOTER = '/#landing-footer';

const Support = () => {
  const location = useLocation();
  const backTo = location.state?.fromFooter ? HOME_FOOTER : '/';
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    department: '',
    subject: '',
    message: '',
    priority: 'Low'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setFormData({
      fullName: '',
      email: '',
      department: '',
      subject: '',
      message: '',
      priority: 'Low'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await axios.post('/api/public/support', formData);
      if (res.data.success) {
        toast.success('Your support request has been sent!');
        setSubmitted(true);
        handleClear();
      }
    } catch (err) {
      console.error('Support submission error:', err);
      toast.error(err.response?.data?.message || 'Failed to send request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="learn-more-container">
        <div className="learn-more-topbar">
          <Link to={backTo} className="back-link">← Home</Link>
          <ThemeToggle />
        </div>
        <section className="learn-hero" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
          <div className="container">
            <CheckCircle2 size={80} color="var(--accent)" style={{ marginBottom: '2rem' }} />
            <h1>Request <span>Received</span></h1>
            <p className="hero-sub">Thank you for contacting us. Our support team will review your request and get back to you shortly.</p>
            <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={() => setSubmitted(false)} className="btn-hero-primary">Send Another Message</button>
              <Link to={backTo} className="btn-hero-secondary">Back to Home</Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="learn-more-container">
      <div className="learn-more-topbar">
        <Link to={backTo} className="back-link">← Home</Link>
        <ThemeToggle />
      </div>
      <section className="learn-hero">
        <div className="container">
          <h1>Contact <span>Support</span></h1>
          <p className="hero-sub">We're here to help you maintain a safe and organized lab. Submit a request below or reach out via our direct channels.</p>
        </div>
      </section>

      <section className="learn-section">
        <div className="container">
          <div className="tech-grid" style={{ marginBottom: '4rem' }}>
            <div className="tech-card">
              <Mail size={32} color="var(--accent)" />
              <h3>Email Us</h3>
              <p>amir.mesfin136@gmail.com</p>
            </div>
            <Link to="/help-center" className="tech-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <HelpCircle size={32} color="var(--accent2)" />
              <h3>Help Center</h3>
              <p>Search our knowledge base</p>
            </Link>
            <div className="tech-card">
              <Phone size={32} color="var(--danger)" />
              <h3>Hotline</h3>
              <p>(+251) 962945025</p>
            </div>
          </div>

          <div className="support-form-container">
            <form className="support-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    name="fullName" 
                    placeholder="amir mesfin"
                    value={formData.fullName}
                    onChange={handleChange}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    name="email" 
                    placeholder="amir.mesfin136@gmail.com"
                    value={formData.email}
                    onChange={handleChange}
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Department / Lab</label>
                  <input 
                    type="text" 
                    name="department" 
                    placeholder="e.g. Bio-Chemistry Lab 4"
                    value={formData.department}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Priority Level</label>
                  <select 
                    name="priority" 
                    value={formData.priority}
                    onChange={handleChange}
                  >
                    <option value="Low">Low - General Question</option>
                    <option value="Medium">Medium - Feature Issue</option>
                    <option value="High">High - Critical Blocker</option>
                    <option value="Emergency">Emergency - Safety Incident</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input 
                  type="text" 
                  name="subject" 
                  placeholder="How can we help?"
                  value={formData.subject}
                  onChange={handleChange}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Message</label>
                <textarea 
                  name="message" 
                  rows="6" 
                  placeholder="Provide details about your inquiry..."
                  value={formData.message}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-send" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : (
                    <>
                      <Send size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                      Send Support Request
                    </>
                  )}
                </button>
                <button type="button" className="btn-clear" onClick={handleClear}>
                  <Trash2 size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Support;
