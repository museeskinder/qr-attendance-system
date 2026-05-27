import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  BookOpen, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Loader2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

const SessionReport = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get(`/sessions/${id}/report`);
        if (res.data.success) {
          setReport(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch session report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '0.5rem' }}>
        <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
        <span style={{ color: 'var(--text-muted)' }}>Compiling session report data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', padding: '3rem 0' }}
      >
        <div style={{ 
          background: 'rgba(244, 63, 94, 0.12)', 
          color: 'var(--danger)', 
          padding: '1rem 1.5rem', 
          borderRadius: '12px',
          border: '1px solid rgba(244, 63, 94, 0.2)',
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          maxWidth: '480px'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
        <Link to="/instructor/sessions" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Return to Sessions</span>
        </Link>
      </motion.div>
    );
  }

  if (!report) return <p>No data found.</p>;

  const { session, attendance, total_attendance } = report;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/instructor/sessions" className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', display: 'flex', minWidth: 'auto' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h2 style={{ margin: 0 }}>Attendance Report</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Detailed summary log of students marked present during class.</p>
          </div>
        </div>
      </div>

      {/* Grid Meta stats highlights */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.25rem' 
      }}>
        {/* Course Card */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--primary-glow)', padding: '0.65rem', borderRadius: '12px', color: 'var(--primary)', display: 'flex' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Course code</span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{session.course_code}</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
              {session.course_name}
            </span>
          </div>
        </div>

        {/* Room Card */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--success-glow)', padding: '0.65rem', borderRadius: '12px', color: 'var(--success)', display: 'flex' }}>
            <MapPin size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Location</span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{session.room_number || 'N/A'}</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Lecture Room</span>
          </div>
        </div>

        {/* Date Card */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '0.65rem', borderRadius: '12px', color: '#06b6d4', display: 'flex' }}>
            <Calendar size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Session date</span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              {new Date(session.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Ethiopian Time</span>
          </div>
        </div>

        {/* Total Presents Card */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--warning-glow)', padding: '0.65rem', borderRadius: '12px', color: 'var(--warning)', display: 'flex' }}>
            <Users size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Total Attended</span>
            <strong style={{ fontSize: '1.5rem', color: 'var(--warning)', fontWeight: 800, lineHeight: 1.1 }}>{total_attendance}</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Students present</span>
          </div>
        </div>
      </div>

      {/* Attended list */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.25rem' }}>
        <h3 style={{ marginBottom: '1.25rem' }}>Attended Student Roster</h3>
        
        {attendance.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1.5rem 0' }}>No attendance tokens signed for this session yet.</p>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Student Profile</th>
                  <th>Email Address</th>
                  <th>Marked Timestamp (GMT+3)</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record) => {
                  const stamp = new Date(record.timestamp);
                  const gmt3Stamp = new Date(stamp.getTime() + 3 * 60 * 60 * 1000);
                  return (
                    <tr key={record.attendance_id}>
                      <td data-label="Student ID" style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{record.student_id}</td>
                      <td data-label="Student Profile" style={{ fontWeight: 600 }}>{record.student_name}</td>
                      <td data-label="Email Address" style={{ color: 'var(--text-muted)' }}>{record.student_email}</td>
                      <td data-label="Marked Timestamp" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {gmt3Stamp.toLocaleString('en-GB')}
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

export default SessionReport;
