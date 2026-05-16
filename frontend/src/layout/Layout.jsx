import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "./Sidebar";
import NotificationBell from "../components/feedback/NotificationBell";
import LabSwitcher from "../components/common/LabSwitcher";
import { useAuth } from "../context/AuthContext";
import "../styles/Layout.css";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="app-wrapper">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-wrapper">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-inner">
            <div className="header-left">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="mobile-toggle"
                aria-label="Open menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Desktop Greeting */}
              <div className="user-greeting">
                <p className="greeting-text">Welcome back,</p>
                <p className="user-name-text">{user?.name || 'User'}</p>
              </div>
            </div>

            <div className="header-right">
              <LabSwitcher />
              {user?.role !== "Viewer / Auditor" && <NotificationBell />}
              <div className="vertical-divider"></div>
              <div className="user-profile-summary">
                <Link to="/profile" className="user-avatar-badge" style={{ padding: user?.profile_photo ? 0 : '', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  {user?.profile_photo ? (
                    <img src={user.profile_photo} alt={user?.name || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    user?.name?.[0] || 'U'
                  )}
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="content-area">
          <div className="content-inner">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;