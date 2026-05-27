import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  Camera, 
  Calendar, 
  Lock, 
  Unlock, 
  Clock, 
  ArrowRight, 
  History, 
  Loader2,
  AlertTriangle,
  User,
  MapPin
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [openSessions, setOpenSessions] = useState([]);
  const [courseStats, setCourseStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(10);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // Load selected session from local storage on mount
  useEffect(() => {
    const cached = localStorage.getItem('selected_session_id');
    if (cached) {
      setSelectedSessionId(parseInt(cached));
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [historyRes, sessionsRes, statsRes] = await Promise.all([
        api.get('/attendance/history'),
        api.get('/sessions'), // Students only get 'open' sessions for enrolled courses
        api.get('/attendance/stats') // Dynamic stats calculations
      ]);
      if (historyRes.data.success) {
        setHistory(historyRes.data.data);
      }
      if (sessionsRes.data.success) {
        setOpenSessions(sessionsRes.data.data);
      }
      if (statsRes.data.success) {
        setCourseStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh open sessions list every 10 seconds
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  // 10-second countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 10 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const selectSession = (session) => {
    localStorage.setItem('selected_session_id', session.session_id);
    localStorage.setItem('selected_session_code', session.course_code);
    localStorage.setItem('selected_session_room', session.room_number || 'N/A');
    localStorage.setItem('selected_session_end', session.end_time || '');
    setSelectedSessionId(session.session_id);
  };

  const deselectSession = () => {
    localStorage.removeItem('selected_session_id');
    localStorage.removeItem('selected_session_code');
    localStorage.removeItem('selected_session_room');
    localStorage.removeItem('selected_session_end');
    setSelectedSessionId(null);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* Welcome info header */}
      <motion.div variants={itemVariants}>
        <h2>Student Dashboard</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Welcome back, <strong>{user?.name}</strong>. Monitor class logs and scan active lecture QR tokens.
        </p>
      </motion.div>

      {/* Course Stats / Exam Eligibility Section */}
      <motion.div variants={itemVariants} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ background: 'var(--primary-glow)', padding: '0.4rem', borderRadius: '8px', color: 'var(--primary)', display: 'flex' }}>
            <GraduationCap size={18} />
          </div>
          <h3 style={{ margin: 0 }}>Enrolled Curricula & Exam Eligibility</h3>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 0' }}>
            <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--text-muted)' }}>Loading stats...</span>
          </div>
        ) : courseStats.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', margin: 0 }}>You are not registered in any course catalogues.</p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '1.25rem'
          }}>
            {courseStats.map(stat => {
              const eligible = stat.attendance_percentage >= 75;
              return (
                <div key={stat.course_id} style={{
                  background: 'rgba(10, 15, 30, 0.4)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        background: 'var(--primary-glow)', 
                        color: 'var(--primary)', 
                        padding: '0.25rem 0.55rem', 
                        borderRadius: '6px', 
                        fontWeight: '700' 
                      }}>
                        {stat.course_code}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        ID: {stat.course_id}
                      </span>
                    </div>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'white', fontWeight: 700 }}>{stat.course_name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><User size={12} /> {stat.instructor_name || 'Unassigned'}</span>
                  </div>
                  
                  {/* Attendance visual indicator meter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Attendance Rate</span>
                        <strong style={{ color: eligible ? 'var(--success)' : 'var(--danger)' }}>{stat.attendance_percentage}%</strong>
                      </div>
                      
                      {/* Visual progress bar */}
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${stat.attendance_percentage}%`, 
                          height: '100%', 
                          background: eligible ? 'var(--success)' : 'var(--danger)',
                          borderRadius: '99px'
                        }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Attended: <strong style={{ color: 'white' }}>{stat.attended_count}</strong></span>
                      <span>Missed: <strong>{stat.missed_count}</strong></span>
                    </div>
                  </div>

                  {/* Exam Eligibility check footer tag */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    borderTop: '1px solid var(--glass-border)', 
                    paddingTop: '0.75rem'
                  }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Exam Status</span>
                    {eligible ? (
                      <span className="status-badge status-present" style={{ fontSize: '0.75rem' }}>
                        <CheckCircle size={11} />
                        <span>Eligible</span>
                      </span>
                    ) : (
                      <span className="status-badge status-absent" style={{ fontSize: '0.75rem' }}>
                        <XCircle size={11} />
                        <span>Ineligible</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Active Open Sessions Selector */}
      <motion.div 
        variants={itemVariants} 
        className="glass-panel animate-glow" 
        style={{ 
          border: '1px solid rgba(16, 185, 129, 0.25)', 
          background: 'radial-gradient(circle at 100% 100%, rgba(16, 185, 129, 0.04) 0%, rgba(16, 22, 42, 0.6) 80%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
            <Camera size={18} />
            <h3 style={{ margin: 0, color: 'white' }}>Active Open Broadcasts</h3>
          </div>
          <span style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '20px', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
            Rotating refresh token: <strong style={{ color: 'var(--primary)' }}>{countdown}s</strong>
          </span>
        </div>

        {/* Selected Session Lock Widget */}
        <AnimatePresence>
          {selectedSessionId && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ 
                background: 'rgba(99, 102, 241, 0.08)', 
                border: '1.5px dashed rgba(99, 102, 241, 0.25)',
                borderRadius: '12px', 
                padding: '1.25rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.65rem', borderRadius: '50%', display: 'flex' }}>
                  <Lock size={18} />
                </div>
                <div>
                  <p style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>
                    Locked Session: {localStorage.getItem('selected_session_code')}
                  </p>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Gate open in {localStorage.getItem('selected_session_room')}. Mark attendance now.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <Link to="/student/scan" className="btn btn-success" style={{ textDecoration: 'none', padding: '0.6rem 1.1rem', fontSize: '0.85rem' }}>
                  <Camera size={14} />
                  <span>Start Camera</span>
                </Link>
                <button onClick={deselectSession} className="btn btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
                  <Unlock size={14} />
                  <span>Release</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {openSessions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No active class sessions broadcasted at this moment.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {openSessions.map(session => {
              const isSelected = selectedSessionId === session.session_id;
              const isAnySelected = selectedSessionId !== null;
              
              return (
                <div key={session.session_id} style={{
                  background: isSelected ? 'rgba(99, 102, 241, 0.03)' : 'rgba(10, 15, 30, 0.4)',
                  border: isSelected ? '1.2px solid var(--primary)' : '1.2px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '1.1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    <h4 style={{ margin: 0, color: 'white', fontSize: '1.05rem', fontWeight: 700 }}>
                      {session.course_code} - {session.course_name}
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><User size={12} /> {session.instructor_name || 'N/A'}</span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={12} /> Room {session.room_number || 'N/A'}</span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12} /> {session.start_time} - {session.end_time}</span>
                    </div>
                  </div>
                  <div>
                    {isSelected ? (
                      <span className="status-badge status-present">
                        <Lock size={12} /> Checked
                      </span>
                    ) : (
                      <button 
                        onClick={() => selectSession(session)} 
                        className="btn" 
                        style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                        disabled={isAnySelected}
                      >
                        <span>Select Class</span>
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Attendance History */}
      <motion.div variants={itemVariants} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ background: 'var(--primary-glow)', padding: '0.4rem', borderRadius: '8px', color: 'var(--primary)', display: 'flex' }}>
            <History size={18} />
          </div>
          <h3 style={{ margin: 0 }}>Attendance Log Book</h3>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 0' }}>
            <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--text-muted)' }}>Loading history log...</span>
          </div>
        ) : history.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', margin: 0 }}>No attendance records registered under this student profile.</p>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Session Date</th>
                  <th>Course Code & Name</th>
                  <th>Time Block</th>
                  <th style={{ textAlign: 'right' }}>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, i) => {
                  const markedStamp = new Date(record.timestamp);
                  const gmt3Marked = new Date(markedStamp.getTime() + 3 * 60 * 60 * 1000);
                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {gmt3Marked.toLocaleString('en-GB')}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {new Date(record.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'white' }}>{record.course_code}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{record.course_name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{record.start_time} - {record.end_time}</td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <span className={`status-badge ${record.status === 'Present' ? 'status-present' : 'status-late'}`}>
                            {record.status || 'Present'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

export default StudentDashboard;
