import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Instant inline validation
  const validateEmail = (value) => {
    if (!value) {
      setEmailError('Email address is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value) => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    if (value.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate inputs before submitting
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.requiresPasswordChange) {
        navigate('/change-password');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'instructor') {
        navigate('/instructor');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="auth-box glass-panel"
      >
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'var(--primary-glow)', borderRadius: '12px', marginBottom: '0.75rem', color: 'var(--primary)' }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Welcome Back</h2>
          <p style={{ marginTop: '0.25rem' }}>Log in to secure your session attendance</p>
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ 
              background: 'rgba(244, 63, 94, 0.1)', 
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
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label>
              <Mail size={14} /> Email Address
            </label>
            <input 
              type="email" 
              className={`input-field ${emailError ? 'error' : ''}`}
              placeholder="name@university.edu"
              value={email} 
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }} 
              onBlur={(e) => validateEmail(e.target.value)}
              required 
              disabled={loading}
            />
            {emailError && (
              <span className="input-feedback">
                <AlertCircle size={12} /> {emailError}
              </span>
            )}
          </div>
          
          <div className="input-group">
            <label>
              <Lock size={14} /> Password
            </label>
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
            {passwordError && (
              <span className="input-feedback">
                <AlertCircle size={12} /> {passwordError}
              </span>
            )}
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
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <span>Log In</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Don't have a student account?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
            Register here
          </Link>
        </p>
      </motion.div>
      
      {/* Mini animations support inline style */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
