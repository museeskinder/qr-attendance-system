import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import { motion } from 'framer-motion';
import { Key, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const ChangePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Validation inline errors
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, updatePasswordChanged } = useContext(AuthContext);
  const navigate = useNavigate();

  const validatePassword = (val) => {
    if (val.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validateConfirm = (val) => {
    if (val !== password) {
      setConfirmError('Passwords do not match');
      return false;
    }
    setConfirmError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const isPasswordValid = validatePassword(password);
    const isConfirmValid = validateConfirm(confirmPassword);

    if (!isPasswordValid || !isConfirmValid) return;

    setLoading(true);
    try {
      const res = await api.post('/auth/change-password', { password });
      if (res.data.success) {
        setSuccess('Password updated successfully! Redirecting...');
        updatePasswordChanged();
        
        setTimeout(() => {
          if (user.role === 'admin') navigate('/admin');
          else if (user.role === 'instructor') navigate('/instructor');
          else navigate('/student');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="auth-box glass-panel"
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'var(--warning-glow)', borderRadius: '12px', marginBottom: '0.75rem', color: 'var(--warning)' }}>
            <Key size={26} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Update Password</h2>
          <p style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>You are required to change your temporary password to secure your account.</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ 
              background: 'rgba(244, 63, 94, 0.12)', 
              color: 'var(--danger)', 
              padding: '0.85rem 1rem', 
              borderRadius: '10px', 
              marginBottom: '1.5rem', 
              border: '1px solid rgba(244, 63, 94, 0.2)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ 
              background: 'rgba(16, 185, 129, 0.12)', 
              color: 'var(--success)', 
              padding: '0.85rem 1rem', 
              borderRadius: '10px', 
              marginBottom: '1.5rem', 
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <CheckCircle size={16} />
            <span>{success}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label><Lock size={13} /> New Password</label>
            <input 
              type="password" 
              className={`input-field ${passwordError ? 'error' : ''}`}
              placeholder="••••••••"
              value={password} 
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) validatePassword(e.target.value);
              }} 
              onBlur={(e) => validatePassword(e.target.value)}
              required 
              disabled={loading}
            />
            {passwordError && <span className="input-feedback"><AlertCircle size={12} /> {passwordError}</span>}
          </div>
          
          <div className="input-group">
            <label><Lock size={13} /> Confirm New Password</label>
            <input 
              type="password" 
              className={`input-field ${confirmError ? 'error' : ''}`}
              placeholder="••••••••"
              value={confirmPassword} 
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (confirmError) validateConfirm(e.target.value);
              }} 
              onBlur={(e) => validateConfirm(e.target.value)}
              required 
              disabled={loading}
            />
            {confirmError && <span className="input-feedback"><AlertCircle size={12} /> {confirmError}</span>}
          </div>
          
          <button 
            type="submit" 
            className="btn" 
            style={{ width: '100%', padding: '1rem', marginTop: '0.5rem' }} 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Updating...</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ChangePassword;
