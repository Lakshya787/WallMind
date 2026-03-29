import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize user from localStorage without making an API call 
    // to strictly avoid changing the backend.
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);

    // Listen for 401 Unauthorized events from our Axios interceptor
    // This allows seamless redirection and state clearing if a cookie expires.
    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem('user');
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('user');
    
    // Clear the http-only cookie on backend
    try {
      await api.post('/auth/logout');
    } catch(err) {
      console.error("Logout error", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
        {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
