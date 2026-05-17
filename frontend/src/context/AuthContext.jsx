import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Role-Permission mapping synchronized with backend roles.js
  const rolePermissions = {
    "Admin": [
      "create_chemical", "edit_chemical", "delete_chemical", "approve_request",
      "view_reports", "view_audit_logs", "assign_roles", "view_chemicals",
      "submit_request", "update_stock", "view_safety_info", "manage_settings",
      "manage_waste", "approve_disposal", "perform_backup", "perform_restore",
      "manage_security", "view_financials", "MANAGE_LABS", "approve_cross_lab_transfer"
    ],
    "Lab Manager": [
      "create_chemical", "edit_chemical", "approve_request", "view_reports",
      "view_audit_logs", "view_chemicals", "submit_request", "update_stock",
      "view_safety_info", "manage_waste", "approve_disposal", "approve_cross_lab_transfer"
    ],
    "Lab Technician": [
      "view_chemicals", "update_stock", "submit_request", "view_safety_info"
    ],
    "Safety Officer": [
      "view_chemicals", "view_safety_info", "view_reports", "view_audit_logs",
      "manage_waste", "edit_chemical"
    ],
    "Viewer / Auditor": [
      "view_chemicals", "view_reports", "view_audit_logs", "view_safety_info"
    ]
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
      try {
        const decoded = jwtDecode(savedToken);
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          // Token is already expired!
          logout();
          setSessionExpired(true);
        } else {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        }
      } catch (err) {
        logout();
      }
    }

    // Auto-logout interceptor built in a modern robust way
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          setSessionExpired(true);
          logout();
        }
        if (error.response && error.response.status === 403 && error.response.data?.code === 'NO_LABS_ASSIGNED') {
          // Entirely restricted from system access
          console.error('System access revoked: No labs assigned');
          logout();
          setSessionExpired(true);
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

  const updateUserContext = (newUserData) => {
    setUser((prev) => {
      const updatedUser = { ...prev, ...newUserData };
      localStorage.setItem('cims_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const switchActiveLab = async (labId) => {
    try {
      const response = await axios.post('/api/labs/switch', { labId });
      if (response.data && response.data.user) {
        const newUser = response.data.user;
        setUser(newUser);
        localStorage.setItem('cims_user', JSON.stringify(newUser));
      }
      // If a fresh token is returned, update it immediately
      if (response.data && response.data.token) {
        const newToken = response.data.token;
        setToken(newToken);
        localStorage.setItem('cims_token', newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to switch lab context', error);
      return { success: false, error: error.response?.data?.message || 'Failed to switch lab' };
    }
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    const permissions = rolePermissions[user.role] || [];
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, hasPermission, sessionExpired, setSessionExpired, updateUserContext, switchActiveLab }}>
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



