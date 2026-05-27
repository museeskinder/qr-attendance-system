import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Calendar, 
  AlertCircle, 
  QrCode, 
  FileText, 
  Plus, 
  MapPin, 
  Loader2, 
  X,
  Play,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  AlarmClock
} from 'lucide-react';

// GMT+3 utility
const getGMT3Now = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3 * 60 * 60 * 1000);
};

const formatGMT3Time = (date) => {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const SessionManagement = () => {
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const [formData, setFormData] = useState({
    course_id: '',
    session_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:30',
    room_number: ''
  });

  const [activeSession, setActiveSession] = useState(null);
  const [countdown, setCountdown] = useState(10);
  const [currentTime, setCurrentTime] = useState(getGMT3Now());
  const [sessionTimeLeft, setSessionTimeLeft] = useState('');
  const [sessionAutoClosing, setSessionAutoClosing] = useState(false);

  const autoCloseTimerRef = useRef(null);

  // Live GMT+3 clock
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(getGMT3Now());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, sessionsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/sessions')
      ]);
      if (coursesRes.data.success) setCourses(coursesRes.data.data);
      if (sessionsRes.data.success) setSessions(sessionsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Poll for new QR Code Token every 10s
  useEffect(() => {
    if (!activeSession?.session_id) return;

    const fetchNewQR = async () => {
      try {
        const res = await api.get(`/sessions/${activeSession.session_id}/qr`);
        if (res.data.success) {
          setActiveSession(prev => {
            if (!prev) return null;
            return { ...prev, qr_code: res.data.data.qr_code };
          });
        } else {
          if (res.data.error?.includes('closed') || res.data.error?.includes('expired')) {
            handleSessionExpired();
          }
        }
      } catch (err) {
        console.error('Error fetching QR token:', err);
        if (err.response?.data?.error?.includes('closed') || err.response?.data?.error?.includes('expired')) {
          handleSessionExpired();
        }
      }
    };

    fetchNewQR();
    const interval = setInterval(fetchNewQR, 10000);
    return () => clearInterval(interval);
  }, [activeSession?.session_id]);

  // Countdown timer for QR code rotation display
  useEffect(() => {
    if (!activeSession?.session_id) return;
    setCountdown(10);
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 10 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession?.qr_code]);

  // Auto-termination: watch active session end time
  useEffect(() => {
    if (!activeSession?.end_time || !activeSession?.session_date) return;

    if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);

    const checkSessionEnd = () => {
      const now = getGMT3Now();
      const sessionEnd = new Date(`${activeSession.session_date}T${activeSession.end_time}`);
      const diffMs = sessionEnd - now;

      if (diffMs <= 0) {
        handleSessionExpired();
        return;
      }

      const diffSec = Math.floor(diffMs / 1000);
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      setSessionTimeLeft(`${mins}m ${secs}s remaining`);
    };

    checkSessionEnd();
    autoCloseTimerRef.current = setInterval(checkSessionEnd, 1000);
    return () => clearInterval(autoCloseTimerRef.current);
  }, [activeSession?.session_id, activeSession?.end_time]);

  const handleSessionExpired = async () => {
    setSessionAutoClosing(true);
    clearInterval(autoCloseTimerRef.current);

    try {
      await api.post('/sessions/auto-close');
    } catch (err) {
      console.error('Auto-close error:', err);
    }

    setSessionTimeLeft('Session ended');
    setTimeout(() => {
      setActiveSession(null);
      setSessionAutoClosing(false);
      setSessionTimeLeft('');
      fetchData();
    }, 3000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    try {
      const res = await api.post('/sessions', formData);
      if (res.data.success) {
        const newSession = res.data.data;
        setActiveSession({
          session_id: newSession.session_id,
          qr_code: newSession.qr_code,
          session_date: formData.session_date,
          end_time: formData.end_time,
          start_time: formData.start_time,
          course_id: formData.course_id
        });
        setFormData({
          course_id: '',
          session_date: new Date().toISOString().split('T')[0],
          start_time: '09:00',
          end_time: '10:30',
          room_number: ''
        });
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create session');
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';
    try {
      await api.put(`/sessions/${id}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openQRForSession = (s) => {
    setActiveSession({
      session_id: s.session_id,
      qr_code: s.qr_code,
      session_date: s.session_date ? new Date(s.session_date).toISOString().split('T')[0] : '',
      end_time: s.end_time,
      start_time: s.start_time,
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* Clock Banner */}
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
              {formatGMT3Time(currentTime)}
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

      <div>
        <h2>Session Management</h2>
        <p style={{ color: 'var(--text-muted)' }}>Launch active attendance gates and project rolling QR codes to students.</p>
      </div>

      {/* Futuristic QR code modal */}
      <AnimatePresence>
        {activeSession && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content animate-glow"
              style={{ maxWidth: '460px', textAlign: 'center', padding: '2.5rem 2rem' }}
            >
              <button className="modal-close-btn" onClick={() => setActiveSession(null)}>
                <X size={16} />
              </button>

              {sessionAutoClosing ? (
                <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ background: 'var(--danger-glow)', borderRadius: '50%', padding: '1rem', color: 'var(--danger)' }}>
                    <AlarmClock size={40} />
                  </div>
                  <h3 style={{ color: 'var(--danger)', fontWeight: 800 }}>Attendance Ended</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>The designated session time window has closed. Auto-saving attendance logs...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                    Live Attendance Broadcast
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Mark Attendance Now</h3>
                  
                  {sessionTimeLeft && (
                    <div style={{ 
                      background: 'var(--warning-glow)', 
                      color: 'var(--warning)', 
                      border: '1.5px solid rgba(245, 158, 11, 0.2)',
                      padding: '0.35rem 0.95rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      <Clock size={13} />
                      <span>{sessionTimeLeft}</span>
                    </div>
                  )}

                  {/* QR refresh countdown text */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.88rem' }}>
                    <span className="live-pulse" />
                    <span>Token rotating in {countdown}s</span>
                  </div>

                  {/* High contrast QR box */}
                  <div style={{ 
                    background: 'white', 
                    padding: '1.25rem', 
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                    display: 'inline-flex',
                    border: '4px solid var(--primary)'
                  }}>
                    <QRCodeSVG value={activeSession.qr_code || 'locked-placeholder'} size={230} />
                  </div>

                  {/* Extra Metadata details */}
                  <div style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--glass-border)',
                    padding: '0.65rem 1rem', 
                    borderRadius: '10px',
                    width: '100%',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.4rem', marginBottom: '0.4rem' }}>
                      <span>Start Time:</span>
                      <strong style={{ color: 'white' }}>{activeSession.start_time}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Close Time:</span>
                      <strong style={{ color: 'white' }}>{activeSession.end_time}</strong>
                    </div>
                  </div>

                  <button className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setActiveSession(null)}>
                    Dismiss Broadcast
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        
        {/* Create Session Form */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: 'var(--primary-glow)', padding: '0.4rem', borderRadius: '8px', color: 'var(--primary)', display: 'flex' }}>
              <Plus size={18} />
            </div>
            <h3 style={{ margin: 0 }}>Create Active Gate</h3>
          </div>

          {error && (
            <div style={{ 
              background: 'rgba(244, 63, 94, 0.12)', 
              color: 'var(--danger)', 
              padding: '0.85rem 1rem', 
              borderRadius: '10px', 
              border: '1px solid rgba(244, 63, 94, 0.2)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label><Sparkles size={13} /> Target Course</label>
              <select 
                className="input-field" 
                name="course_id" 
                value={formData.course_id} 
                onChange={handleChange} 
                required
                disabled={submitLoading}
              >
                <option value="">Select Target Course</option>
                {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_code} - {c.course_name}</option>)}
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label><Calendar size={13} /> Session Date</label>
              <input 
                type="date" 
                className="input-field" 
                name="session_date" 
                value={formData.session_date} 
                onChange={handleChange} 
                required 
                disabled={submitLoading}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label><Clock size={13} /> Start (GMT+3)</label>
                <input 
                  type="time" 
                  className="input-field" 
                  name="start_time" 
                  value={formData.start_time} 
                  onChange={handleChange} 
                  required 
                  disabled={submitLoading}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label><Clock size={13} /> End (GMT+3)</label>
                <input 
                  type="time" 
                  className="input-field" 
                  name="end_time" 
                  value={formData.end_time} 
                  onChange={handleChange} 
                  required 
                  disabled={submitLoading}
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label><MapPin size={13} /> Room / Hall Number</label>
              <input 
                type="text" 
                className="input-field" 
                name="room_number" 
                placeholder="e.g. Room 302, block B"
                value={formData.room_number} 
                onChange={handleChange} 
                disabled={submitLoading}
              />
            </div>

            <button type="submit" className="btn" style={{ marginTop: '0.5rem' }} disabled={submitLoading}>
              {submitLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Activating Gate...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Launch Broadcast Session</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing sessions lists */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: 'var(--primary-glow)', padding: '0.4rem', borderRadius: '8px', color: 'var(--primary)', display: 'flex' }}>
              <QrCode size={18} />
            </div>
            <h3 style={{ margin: 0 }}>Active / Previous Session Gates</h3>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
              <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Loading sessions catalog...</span>
            </div>
          ) : sessions.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No broadcast sessions registered.</p>
          ) : (
            <div className="data-table-container" style={{ maxHeight: '520px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Course</th>
                    <th>Details</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.session_id}>
                      <td data-label="Date" style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {new Date(s.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                       <td data-label="Course" style={{ fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{s.course_code}</td>
                      <td data-label="Details">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}><MapPin size={12} /> {s.room_number || 'N/A'}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}><Clock size={12} /> {s.start_time} – {s.end_time}</span>
                        </div>
                      </td>
                      <td data-label="Status" style={{ whiteSpace: 'nowrap' }}>
                        <span className={`status-badge ${s.status === 'open' ? 'status-open' : 'status-closed'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td data-label="Actions" style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => toggleStatus(s.session_id, s.status)}
                            className={`btn ${s.status === 'open' ? 'btn-danger' : 'btn-success'}`}
                            style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', minWidth: '60px' }}
                          >
                            <span>{s.status === 'open' ? 'Close' : 'Open'}</span>
                          </button>
                          
                          {s.status === 'open' && (
                            <button
                              onClick={() => openQRForSession(s)}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
                            >
                              <span>QR</span>
                            </button>
                          )}
                          
                          <Link 
                            to={`/instructor/sessions/${s.session_id}/report`}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', textDecoration: 'none' }}
                          >
                            <FileText size={12} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      <style>{`
        .live-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
          animation: pulse 1.6s infinite;
        }
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(99, 102, 241, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

export default SessionManagement;
