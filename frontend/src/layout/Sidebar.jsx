import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm("Confirm system logout?")) {
      logout();
      navigate("/login");
    }
  };

  const menuItems = [
    { 
      name: "Dashboard", 
      path: "/", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      name: "Inventory", 
      path: "/chemicals", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.642.257a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l1.166 1.166a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l1.166-1.166z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" />
        </svg>
      )
    },
    { 
      name: "Master Ledger", 
      path: "/logs", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
      )
    },
    { 
      name: "Requests", 
      path: "/requests", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )
    },
    { 
      name: "Compliance", 
      path: "/reports", 
      roles: ["Admin", "Lab Manager", "Safety Officer", "Viewer/Auditor"],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 2v-6m-8 13h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      name: "Master Audit", 
      path: "/audit", 
      roles: ["Admin"],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    { 
      name: "Role Manager", 
      path: "/roles", 
      roles: ["Admin"],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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
      case "Admin": return "text-red-400 bg-red-400/10 border-red-500/20";
      case "Lab Manager": return "text-primary-400 bg-primary-400/10 border-primary-500/20";
      case "Safety Officer": return "text-orange-400 bg-orange-400/10 border-orange-500/20";
      case "Lab Technician": return "text-green-400 bg-green-400/10 border-green-500/20";
      case "Viewer/Auditor": return "text-secondary-400 bg-secondary-400/10 border-secondary-500/20";
      default: return "text-secondary-400 bg-secondary-400/10 border-secondary-500/20";
    }
  };


  return (
    <div className="w-72 h-screen sticky top-0 bg-secondary-950 text-white flex flex-col items-stretch border-r border-white/5 shadow-2xl z-50">
      <div className="p-8 pb-12 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/30">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold heading-font tracking-tighter">CIMS <span className="text-primary-500">PRO</span></h2>
          <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-secondary-500">Managed Stack</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-secondary-600 px-4 mb-4">Core Navigation</div>
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? "bg-primary-600 text-white font-semibold shadow-xl shadow-primary-900/40" 
                  : "text-secondary-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110 text-secondary-500"}`}>
                {item.icon}
              </span>
              <span className="text-sm tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="p-1 rounded-[1.5rem] bg-gradient-to-b from-white/10 to-transparent border border-white/5">
          <div className="p-3 rounded-[1.2rem] flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center font-bold text-xs text-white">
                {getInitials(user?.name)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-secondary-950"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold truncate text-white">{user?.name || "Guest"}</h4>
              <span className={`inline-block px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider mt-1 border ${getRoleBadgeStyle(user?.role)}`}>
                {user?.role || "Visitor"}
              </span>
            </div>

            <button 
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-secondary-400 hover:bg-red-500/20 hover:text-red-400 transition-all hover:rotate-12"
              title="Sign Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;