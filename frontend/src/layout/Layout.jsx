import { useState } from "react";
import Sidebar from "./Sidebar";
import NotificationBell from "../components/NotificationBell";
import { useAuth } from "../AuthContext";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex bg-secondary-50 min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-secondary-100 px-4 sm:px-6 lg:px-12 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-secondary-50 border border-secondary-200 text-secondary-700 hover:bg-secondary-100 transition-all"
                aria-label="Open menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Desktop Greeting (Optional) */}
              <div className="hidden lg:block">
                <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest">Welcome back,</p>
                <p className="text-sm font-black text-secondary-900">{user?.name || 'User'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="h-8 w-[1px] bg-secondary-100 hidden sm:block"></div>
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-black shadow-lg shadow-primary-600/20">
                  {user?.name?.[0] || 'U'}
                </div>
              </div>
            </div>
          </div>
        </header>


        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;