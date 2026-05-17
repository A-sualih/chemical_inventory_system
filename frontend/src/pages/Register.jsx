import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import "../styles/Login.css";

const Register = () => {
  const { user: currentUser } = useAuth();
  const { settings } = useSettings();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) navigate("/");
  }, [currentUser, navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await axios.post('/api/auth/register', { name, email, password });
      setIsLoading(false);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setIsLoading(false);
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="login-page-container">
      {/* Background Decorative Gradient Blobs */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>

      {/* Glassmorph Card */}
      <div className="login-card">
        <div className="login-view-wrapper">
          <div className="logo-header-wrapper" style={{marginBottom: '2.5rem'}}>
            <div 
              className="app-logo-box" 
              style={{
                marginBottom: '1.5rem', 
                cursor: 'pointer', 
                transition: 'transform 0.3s',
                backgroundColor: settings?.systemLogo ? 'transparent' : '',
                boxShadow: settings?.systemLogo ? 'none' : ''
              }} 
              onMouseOver={e => e.currentTarget.style.transform = 'rotate(12deg)'} 
              onMouseOut={e => e.currentTarget.style.transform = 'rotate(0)'}
            >
              {settings?.systemLogo ? (
                <img src={settings.systemLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '1rem' }} />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="app-logo icon-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width: '2.5rem', height: '2.5rem'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              )}
            </div>
            <h1 className="login-title-h1">
              Create Account
            </h1>
            <p className="logo-subtext" style={{marginTop: '0.5rem'}}>
              Join {settings?.systemName || "the Chemical Inventory System"}
            </p>
          </div>

          {success ? (
            <div className="login-text-center" style={{padding: '1.5rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '1rem', animation: 'zoom-in 0.3s'}}>
              <div style={{width: '3rem', height: '3rem', backgroundColor: 'rgba(34, 197, 94, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'}}>
                <svg xmlns="http://www.w3.org/2000/svg" style={{width: '1.5rem', height: '1.5rem', color: '#22c55e'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 style={{color: 'white', fontWeight: 700, marginBottom: '0.5rem'}}>Registration Successful!</h3>
              <p className="login-subtitle">Welcome aboard. Redirecting you to login...</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="form-spacing">
              <div className="login-form-group">
                <label className="login-label">Full Name</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="Ahmed Sualih"
                    className="login-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label className="login-label">Work Email</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className="login-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label className="login-label">Secure Password</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && <p className="login-error-text" style={{textAlign: 'left'}}>{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="submit-btn"
              >
                {!isLoading ? (
                  <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                    Create Account
                    <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                ) : (
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <div className="spinner-mini" style={{width: '1.5rem', height: '1.5rem', borderTopColor: 'white'}}></div>
                  </div>
                )}
              </button>
            </form>
          )}

          <div className="register-prompt" style={{marginTop: '2rem'}}>
            <p>
              Already have an account?{" "}
              <Link to="/login" className="register-link">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Subtle Bottom Footer */}
      <p className="page-footer-tag">
        Secure Access Provided by GoldenBatch Tech
      </p>
    </div>
  );
};

export default Register;


