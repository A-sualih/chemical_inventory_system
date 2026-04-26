import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";

const Register = () => {
  const { user: currentUser } = useAuth();
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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-secondary-950">
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[140px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-700/40 rounded-full blur-[140px] animate-pulse delay-700"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-violet-600/10 rounded-full blur-[160px]"></div>

      {/* Glassmorph Card */}
      <div className="glass-dark w-full max-w-md p-8 md:p-12 rounded-[2rem] relative z-10 border border-white/10 shadow-2xl transition-all duration-500">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary-500/30 transform hover:rotate-12 transition-transform cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 heading-font text-center">
              Create Account
            </h1>
            <p className="text-secondary-400 mt-2 text-center text-sm tracking-wide uppercase font-medium">
              Join the Chemical Inventory System
            </p>
          </div>

          {success ? (
            <div className="text-center p-6 bg-green-500/10 border border-green-500/20 rounded-2xl animate-in zoom-in duration-300">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-white font-bold mb-2">Registration Successful!</h3>
              <p className="text-secondary-400 text-sm">Welcome aboard. Redirecting you to login...</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="group">
                <label className="block text-xs font-semibold text-secondary-400 uppercase tracking-widest mb-2 px-1">Full Name</label>
                <div className="relative group-focus-within:transform group-focus-within:-translate-y-1 transition-transform">
                  <input
                    type="text"
                    placeholder="Ahmed Sualih"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-secondary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-semibold text-secondary-400 uppercase tracking-widest mb-2 px-1">Work Email</label>
                <div className="relative group-focus-within:transform group-focus-within:-translate-y-1 transition-transform">
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-secondary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-semibold text-secondary-400 uppercase tracking-widest mb-2 px-1">Secure Password</label>
                <div className="relative group-focus-within:transform group-focus-within:-translate-y-1 transition-transform">
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-secondary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-xs font-medium px-1 drop-shadow-sm">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full relative group overflow-hidden bg-primary-600 hover:bg-primary-500 text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary-900/40 transform active:scale-[0.98] transition-all duration-200 ${isLoading ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                <span className={isLoading ? 'opacity-0' : 'opacity-100 flex items-center justify-center gap-2'}>
                  Create Account
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </span>
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 text-center px-1">
            <p className="text-secondary-400 text-sm font-medium">
              Already have an account?{" "}
              <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Subtle Bottom Footer */}
      <p className="absolute bottom-8 text-secondary-600 text-[10px] uppercase tracking-[0.2em] font-bold">
        Secure Access Provided by GoldenBatch Tech
      </p>
    </div>
  );
};

export default Register;
