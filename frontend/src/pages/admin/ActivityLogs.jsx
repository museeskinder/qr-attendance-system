import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Calendar, 
  User, 
  Search, 
  RefreshCw, 
  Activity,
  AlertCircle,
  Loader2
} from 'lucide-react';

const getGMT3Now = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3 * 60 * 60 * 1000);
};

const roleColors = (role) => {
  if (role === 'admin') return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
  if (role === 'instructor') return { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' };
  if (role === 'student') return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
  return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' };
};

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(getGMT3Now());
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(getGMT3Now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/activity-logs');
      if (res.data.success) {
        setLogs(res.data.data);
      } else {
        setError(res.data.error || 'Failed to load activity logs');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Server error loading activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchLogs(); 
  }, []);

  const filteredLogs = logs.filter(l => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      (l.name && l.name.toLowerCase().includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.role && l.role.toLowerCase().includes(q)) ||
      (l.action && l.action.toLowerCase().includes(q))
    );
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* GMT+3 Clock Header widget */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.15)',
        borderRadius: '16px',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ background: 'var(--primary-glow)', padding: '0.55rem', borderRadius: '10px', color: 'var(--primary)', display: 'flex' }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ 
              fontWeight: '800', 
              fontSize: '1.3rem', 
              fontFamily: 'monospace', 
              color: 'var(--primary)',
              letterSpacing: '0.05em',
              display: 'block',
              lineHeight: 1.1
            }}>
              {currentTime.toLocaleTimeString('en-GB')}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ethiopian Standard Time (GMT+3)</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>
          <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
          <span>
            {currentTime.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Title & Count Header info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>System Activity Logs</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Showing {filteredLogs.length} of {logs.length} logged operations in database.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchLogs} disabled={loading} style={{ padding: '0.65rem 1.25rem' }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem 1.5rem' }}>
        <Search size={18} style={{ color: 'var(--text-disabled)' }} />
        <input
          type="text"
          className="input-field"
          placeholder="Filter by user name, role, email, or log action..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ flex: 1, marginBottom: 0 }}
        />
        {filter && (
          <button onClick={() => setFilter('')} className="btn btn-secondary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
            Clear
          </button>
        )}
      </div>

      {error && (
        <div style={{ 
          background: 'rgba(244, 63, 94, 0.12)', 
          color: 'var(--danger)', 
          padding: '0.85rem 1.25rem', 
          borderRadius: '12px',
          border: '1px solid rgba(244, 63, 94, 0.2)',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.25rem' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '0.5rem' }}>
            <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Loading activity logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>No audit activities log found.</p>
        ) : (
          <div className="data-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp (GMT+3)</th>
                  <th>Action Triggered</th>
                  <th>Operated By</th>
                  <th>User Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, i) => {
                  const logTime = new Date(log.created_at);
                  const gmt3Time = new Date(logTime.getTime() + 3 * 60 * 60 * 1000);
                  const rc = roleColors(log.role);
                  return (
                    <tr key={log.log_id || i}>
                      <td data-label="Timestamp" style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {gmt3Time.toLocaleString('en-GB')}
                      </td>
                      <td data-label="Action Triggered" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.action}</td>
                      <td data-label="Operated By">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '0.35rem', borderRadius: '50%' }}>
                            <User size={13} style={{ color: 'var(--text-muted)' }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{log.name || 'System Auto'}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.email || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td data-label="User Role">
                        <span className="status-badge" style={{
                          background: rc.bg,
                          color: rc.color,
                          border: `1px solid ${rc.color}25`,
                          textTransform: 'capitalize'
                        }}>
                          {log.role || 'System'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

export default ActivityLogs;
