import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.data.user));
        setUser(res.data.data.user);
        return res.data.data.user;
      }
      throw new Error(res.data.error || 'Login failed');
    } catch (err) {
      // Axios wraps HTTP errors — extract the server message if available
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Unable to connect to the server. Please try again.';
      throw new Error(msg);
    }
  };

  const register = async (name, email, password, role, extra = {}) => {
    try {
      const res = await api.post('/auth/register', { name, email, password, role, ...extra });
      if (!res.data.success) {
        throw new Error(res.data.error || 'Registration failed');
      }
      return res.data;
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Registration failed. Please try again.';
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updatePasswordChanged = () => {
    if (user) {
      const updated = { ...user, requiresPasswordChange: false };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updatePasswordChanged }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
