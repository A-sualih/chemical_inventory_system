import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Role-Permission mapping
  const rolePermissions = {
    "Admin": ["inventory:manage", "requests:approve", "reports:view", "roles:manage"],
    "Lab Manager": ["inventory:manage", "requests:approve", "reports:view"],
    "Lab Technician": ["inventory:manage"],
    "Safety Officer": ["reports:view"],
    "Viewer/Auditor": ["reports:view"]
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('cims_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('cims_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cims_user');
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    const permissions = rolePermissions[user.role] || [];
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
