import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, HelpCircle, Phone, MessageSquare, Send, Trash2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import '../styles/LearnMore.css';
import '../styles/Support.css';

const Support = () => {
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
        <section className="learn-hero" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
          <div className="container">
            <CheckCircle2 size={80} color="var(--landing-teal)" style={{ marginBottom: '2rem' }} />
            <h1>Request <span>Received</span></h1>
            <p className="hero-sub">Thank you for contacting us. Our support team will review your request and get back to you shortly.</p>
            <div style={{ marginTop: '3rem' }}>
              <button onClick={() => setSubmitted(false)} className="btn-hero-primary" style={{ marginRight: '1rem' }}>Send Another Message</button>
              <Link to="/" className="btn-hero-secondary">Back to Home</Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="learn-more-container">
      <section className="learn-hero">
        <div className="container">
          <Link to="/" className="back-link">← Home</Link>
          <h1>Contact <span>Support</span></h1>
          <p className="hero-sub">We're here to help you maintain a safe and organized lab. Submit a request below or reach out via our direct channels.</p>
        </div>
      </section>

      <section className="learn-section">
        <div className="container">
          <div className="tech-grid" style={{ marginBottom: '4rem' }}>
            <div className="tech-card">
              <Mail size={32} color="var(--landing-accent)" />
              <h3>Email Us</h3>
              <p>support@labsystem.edu</p>
            </div>
            <div className="tech-card">
              <HelpCircle size={32} color="var(--landing-teal)" />
              <h3>Help Center</h3>
              <p>Search our knowledge base</p>
            </div>
            <div className="tech-card">
              <Phone size={32} color="#f87171" />
              <h3>Hotline</h3>
              <p>(555) 999-SUPPORT</p>
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
                    placeholder="e.g. John Doe"
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
                    placeholder="john@institution.edu"
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
