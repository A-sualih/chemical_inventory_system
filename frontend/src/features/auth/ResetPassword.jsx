import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useSettings } from "../../context/SettingsContext";
import "../../styles/Login.css";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match!");
    }
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { data } = await axios.post(`/api/auth/reset-password/${token}`, { newPassword });
      setMessage(data.message || "Password reset successfully!");
      setIsLoading(false);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setIsLoading(false);
      setError(err.response?.data?.error || "Error resetting password.");
    }
  };

  return (
    <div className="login-page-container">
      {/* Background Gradient Blobs */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>

      {/* Glass Card */}
      <div className="login-card" style={{ maxWidth: '28rem' }}>
        <div className="login-view-wrapper">
          <div className="logo-header-wrapper">
            <div className="app-logo-box" style={{ backgroundColor: settings?.systemLogo ? 'transparent' : '', boxShadow: settings?.systemLogo ? 'none' : '' }}>
              {settings?.systemLogo ? (
                <img src={settings.systemLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '1rem' }} />
              ) : (
                <svg className="app-logo icon-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>
            <h2 className="login-title-h2">Set New Password</h2>
            <p className="login-subtitle">Enter your new secure password below.</p>
          </div>

          {message ? (
            <div className="login-text-center">
              <div className="locked-icon-wrapper" style={{ backgroundColor: 'rgba(34,197,94,0.2)' }}>
                <svg className="locked-icon" style={{ color: '#4ade80' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p style={{ color: '#4ade80', fontWeight: 700, marginBottom: '1rem' }}>{message}</p>
              <p className="login-subtitle">Redirecting to login page...</p>
            </div>
          ) : (
            <div className="form-spacing">
              <div className="login-form-group">
                <label className="login-label">New Password</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="login-input"
                    required
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label className="login-label">Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="login-input"
                    required
                  />
                </div>
              </div>

              {error && <p className="login-error-text">{error}</p>}

              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading}
                className="submit-btn"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          )}

          <div className="register-prompt" style={{ marginTop: '2rem' }}>
            <Link to="/login" className="register-link">
              ← Return to Login
            </Link>
          </div>
        </div>
      </div>

      <p className="page-footer-tag">Chemical Inventory System</p>
    </div>
  );
};

export default ResetPassword;
