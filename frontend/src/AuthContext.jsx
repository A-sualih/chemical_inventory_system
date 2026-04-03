import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Role-Permission mapping
  const rolePermissions = {
    "Admin": ["inventory:manage", "requests:approve", "reports:view", "roles:manage", "system:audit"],
    "Lab Manager": ["inventory:manage", "requests:approve", "reports:view"],
    "Lab Technician": ["inventory:manage", "requests:create"],
    "Safety Officer": ["reports:view", "safety:manage", "audit:view"],
    "Viewer/Auditor": ["reports:view", "audit:view"]
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cims_token');
    localStorage.removeItem('cims_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('cims_token');
    const savedUser = localStorage.getItem('cims_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    
    // Auto-logout interceptor built in a modern robust way
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          setSessionExpired(true);
          logout();
        }
        return Promise.reject(error);
      }
    );

    setLoading(false);

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      
      setToken(token);
      setUser(user);
      localStorage.setItem('cims_token', token);
      localStorage.setItem('cims_user', JSON.stringify(user));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setSessionExpired(false);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || "Login failed due to a server error." 
      };
    }
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    const permissions = rolePermissions[user.role] || [];
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, hasPermission, sessionExpired, setSessionExpired }}>
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
