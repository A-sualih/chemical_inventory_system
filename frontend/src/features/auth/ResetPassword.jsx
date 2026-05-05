import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-secondary-950">
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[140px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-700/40 rounded-full blur-[140px] animate-pulse delay-700"></div>
      
      {/* Glassmorph Card */}
      <div className="glass-dark w-full max-w-md p-8 md:p-12 rounded-[2rem] relative z-10 border border-white/10 shadow-2xl transition-all duration-500">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold text-white mb-2 heading-font">Set New Password</h2>
          <p className="text-secondary-400 text-sm mb-8">Enter your new secure password below.</p>
          
          {message ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-400 font-bold mb-4">{message}</p>
              <p className="text-secondary-400 text-sm">Redirecting to login page...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">New Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all" 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Confirm Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all" 
                  required 
                />
              </div>
              
              {error && <p className="text-red-400 text-xs font-medium px-1">{error}</p>}
              
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-primary-600 hover:bg-primary-500 text-white p-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
          
          <div className="mt-8 text-center px-1">
            <Link to="/login" className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors">
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
