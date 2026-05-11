import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import "../styles/Sidebar.css";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings } = useSettings();

  const handleLogout = () => {
    if (window.confirm("Confirm system logout?")) {
      logout();
      navigate("/login");
    }
  };

  const handleNavClick = () => {
    // Close sidebar on mobile after nav click
    if (window.innerWidth < 1024) onClose?.();
  };

  const menuItems = [
    { 
      name: "Dashboard", 
      path: "/", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      name: "Inventory", 
      path: "/chemicals", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.642.257a6 6 0 00-3.86.517l-2.387-.477a2 2 0 00-1.022.547l1.166 1.166a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l1.166-1.166z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" />
        </svg>
      )
    },
    { 
      name: "Alerts Center", 
      path: "/notifications", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },

    { 
      name: "Containers", 
      path: "/containers", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    { 
      name: "Batches", 
      path: "/batches", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    },
    { 
      name: "Expiry Intelligence", 
      path: "/expiry", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      name: "Master Ledger", 
      path: "/logs", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
      )
    },
    { 
      name: "Requests", 
      path: "/requests", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )
    },
    { 
      name: "Compliance", 
      path: "/reports", 
      roles: ["Admin", "Lab Manager", "Safety Officer", "Viewer/Auditor"],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 2v-6m-8 13h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      name: "Master Audit", 
      path: "/audit", 
      roles: ["Admin"],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    { 
      name: "Role Manager", 
      path: "/roles", 
      roles: ["Admin"],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    { 
      name: "Locations", 
      path: "/locations", 
      roles: ["Admin", "Lab Manager"],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      name: "Procurement", 
      path: "/procurement", 
      roles: ["Admin", "Lab Manager"],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      name: "Safety Command", 
      path: "/safety", 
      roles: ["Admin", "Lab Manager", "Safety Officer"],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    { 
      name: "Waste & Disposal", 
      path: "/waste", 
      roles: ["Admin", "Lab Manager", "Safety Officer"],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    },
    { 
      name: "Security & Backup", 
      path: "/security", 
      roles: ["Admin"],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    { 
      name: "System Settings", 
      path: "/settings", 
      roles: ["Admin"],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
  ];

  const filteredItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(user?.role)
  );

  const getInitials = (name) => {
    if (!name) return "--";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case "Admin": return "role-admin";
      case "Lab Manager": return "role-manager";
      case "Safety Officer": return "role-safety";
      case "Procurement Officer": return "role-procurement";
      case "Laboratory Staff": return "role-technician";
      case "Auditor": return "role-auditor";
      default: return "role-default";
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="mobile-backdrop"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`sidebar-container ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Logo Header */}
        <div className="sidebar-logo-section">
          <div className="logo-wrapper">
            <div className="logo-box" style={{ padding: settings?.systemLogo ? '0' : '8px', overflow: 'hidden', background: settings?.systemLogo ? 'transparent' : '', boxShadow: settings?.systemLogo ? 'none' : '' }}>
              {settings?.systemLogo ? (
                <img src={settings.systemLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.75rem' }} />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="icon-logo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            </div>
            <div className="logo-text-area">
              <h2 className="heading-font">{settings?.systemName || "CIMS"}</h2>
              <p className="logo-subtext">{settings?.orgName || "System"}</p>
            </div>
          </div>
          {/* Close button (mobile only) */}
          <button
            onClick={onClose}
            className="close-sidebar-mobile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-btn-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav custom-scrollbar">
          <div className="nav-section-label">Core Navigation</div>
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={`nav-item ${isActive ? "nav-item-active" : ""}`}
              >
                <span className="nav-icon">
                  {item.icon}
                </span>
                <span className="nav-text">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-card-bg">
            <div className="user-profile-inner">
              <Link to="/profile" className="profile-avatar-wrapper" style={{ textDecoration: 'none' }}>
                <div className="profile-avatar" style={{ padding: user?.profile_photo ? '0' : '', overflow: 'hidden', border: user?.profile_photo ? 'none' : '' }}>
                  {user?.profile_photo ? (
                    <img src={user.profile_photo} alt={user?.name || "User"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(user?.name)
                  )}
                </div>
                <div className="online-status-indicator"></div>
              </Link>
              <div className="profile-info">
                <Link to="/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h4 className="profile-name" title="View Profile" style={{ cursor: 'pointer' }}>{user?.name || "Guest"}</h4>
                </Link>
                <span className={`role-badge ${getRoleBadgeStyle(user?.role)}`}>
                  {user?.role || "Visitor"}
                </span>
              </div>

              <button 
                onClick={handleLogout}
                className="logout-icon-button"
                title="Sign Out"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="icon-btn-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;