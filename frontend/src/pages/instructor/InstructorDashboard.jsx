import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  QrCode, 
  ClipboardList, 
  Award, 
  ArrowRight, 
  Settings, 
  Percent, 
  Save, 
  Loader2, 
  Check, 
  AlertTriangle 
} from 'lucide-react';
import api from '../../services/api';

const InstructorDashboard = () => {
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingCourseId, setUpdatingCourseId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingThresholds, setEditingThresholds] = useState({}); // courseId -> percentage value

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/courses');
      if (res.data.success) {
        setCourses(res.data.data);
        const initial = {};
        res.data.data.forEach(c => {
          initial[c.course_id] = c.eligibility_percentage || 75;
        });
        setEditingThresholds(initial);
      }
    } catch (err) {
      console.error('Error fetching instructor courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleSaveEligibility = async (courseId) => {
    const percentage = editingThresholds[courseId];
    setUpdatingCourseId(courseId);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const res = await api.put(`/courses/${courseId}/eligibility`, { eligibility_percentage: percentage });
      if (res.data.success) {
        setSuccessMessage(`Exam target successfully updated to ${percentage}%!`);
        setCourses(prev => prev.map(c => c.course_id === courseId ? { ...c, eligibility_percentage: percentage } : c));
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to update threshold');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setUpdatingCourseId(null);
    }
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
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2.5rem' }}
    >
      {/* Welcome Banner Card */}
      <motion.div 
        variants={itemVariants}
        className="glass-panel"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(16, 22, 42, 0.6) 100%)',
          borderWidth: '1.2px',
          borderColor: 'rgba(99,102,241,0.2)',
          padding: '2.5rem 2rem'
        }}
      >
        <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Instructor Workspace
        </span>
        <h2 style={{ fontSize: '2.1rem', marginTop: '0.35rem', fontWeight: 800 }}>Welcome Back, {user?.name}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem', maxWidth: '600px', lineHeight: 1.6 }}>
          Manage your course schedules, open real-time session gates, generate secure rolling attendance QR codes, and review student eligibility reports.
        </p>
      </motion.div>

      {/* Course Eligibility Custom Controls panel */}
      <motion.div variants={itemVariants} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: 'var(--primary-glow)', padding: '0.4rem', borderRadius: '8px', color: 'var(--primary)', display: 'flex' }}>
              <Settings size={18} />
            </div>
            <h3 style={{ margin: 0 }}>Exam Eligibility Setup</h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Configure attendance thresholds per assigned course
          </span>
        </div>

        {successMessage && (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.12)', 
            color: 'var(--success)', 
            padding: '0.65rem 1rem', 
            borderRadius: '10px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Check size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div style={{ 
            background: 'rgba(244, 63, 94, 0.12)', 
            color: 'var(--danger)', 
            padding: '0.65rem 1rem', 
            borderRadius: '10px',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 0' }}>
            <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--text-muted)' }}>Loading assigned courses...</span>
          </div>
        ) : courses.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', margin: 0 }}>No course curricula assigned to your profile by the administrator.</p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '1.25rem'
          }}>
            {courses.map(course => {
              const currentThreshold = course.eligibility_percentage || 75;
              const selectedValue = editingThresholds[course.course_id] !== undefined ? editingThresholds[course.course_id] : currentThreshold;
              const isUpdating = updatingCourseId === course.course_id;
              const hasChanged = selectedValue !== currentThreshold;

              return (
                <div key={course.course_id} style={{
                  background: 'var(--bg-card)',
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
                        {course.course_code}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Credit Hours: {course.credit_hour || 'N/A'}
                      </span>
                    </div>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>{course.course_name}</h4>
                  </div>
                  
                  {/* Slider Control Container */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Exam Target Threshold</span>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}>
                        <span>{selectedValue}</span>
                        <Percent size={14} />
                      </strong>
                    </div>

                    <input 
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={selectedValue}
                      onChange={(e) => setEditingThresholds({
                        ...editingThresholds,
                        [course.course_id]: parseInt(e.target.value)
                      })}
                      style={{
                        width: '100%',
                        accentColor: 'var(--primary)',
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.05)',
                        height: '6px',
                        borderRadius: '3px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Actions Footer */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem' }}>
                    <button 
                      onClick={() => handleSaveEligibility(course.course_id)}
                      disabled={isUpdating || !hasChanged}
                      className="btn btn-primary"
                      style={{ 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.82rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.35rem',
                        opacity: hasChanged ? 1 : 0.6,
                        cursor: hasChanged ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {isUpdating ? (
                        <Loader2 size={13} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Save size={13} />
                      )}
                      <span>Save Threshold</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Grid Quick Navigation Links */}
      <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Workspace Operations</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          {/* Link 1: Session Management */}
          <Link to="/instructor/sessions" style={{ textDecoration: 'none' }}>
            <motion.div 
              whileHover={{ y: -3 }}
              className="glass-panel" 
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                borderWidth: '1.2px',
                borderColor: 'var(--glass-border)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = '0 8px 24px -6px rgba(99, 102, 241, 0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)' }}>
                <div style={{ background: 'var(--primary-glow)', padding: '0.65rem', borderRadius: '10px', display: 'flex' }}>
                  <QrCode size={20} />
                </div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Manage Attendance Sessions</h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', flex: 1 }}>
                Open active session gates, select courses, set rooms, and project secure QR codes onto class screens.
              </p>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.5rem' }}>
                <span>Launch Gate</span>
                <ArrowRight size={14} />
              </span>
            </motion.div>
          </Link>

          {/* Link 2: Reports */}
          <Link to="/instructor/reports" style={{ textDecoration: 'none' }}>
            <motion.div 
              whileHover={{ y: -3 }}
              className="glass-panel" 
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                borderWidth: '1.2px',
                borderColor: 'var(--glass-border)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--success)';
                e.currentTarget.style.boxShadow = '0 8px 24px -6px rgba(16, 185, 129, 0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)' }}>
                <div style={{ background: 'var(--success-glow)', padding: '0.65rem', borderRadius: '10px', display: 'flex' }}>
                  <ClipboardList size={20} />
                </div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Student Eligibility Reports</h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', flex: 1 }}>
                Monitor attendance percentages for students, check exam eligibility lists based on your set thresholds, and export to PDF/Excel.
              </p>
              <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.5rem' }}>
                <span>View Audits</span>
                <ArrowRight size={14} />
              </span>
            </motion.div>
          </Link>

        </div>
      </motion.div>
    </motion.div>
  );
};

export default InstructorDashboard;

