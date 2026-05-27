import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { BookOpen, Plus, GraduationCap, Building, Clock, User, AlertCircle, Sparkles, CheckCircle, Loader2 } from 'lucide-react';

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    course_code: '',
    course_name: '',
    department: '',
    credit_hour: '',
    instructor_id: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      if (res.data.success) {
        setCourses(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitLoading(true);
    try {
      const res = await api.post('/courses', formData);
      if (res.data.success) {
        setSuccess('Course created successfully!');
        setFormData({ course_code: '', course_name: '', department: '', credit_hour: '', instructor_id: '' });
        fetchCourses();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create course');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      <div>
        <h2>Course Catalogue Management</h2>
        <p style={{ color: 'var(--text-muted)' }}>Create new courses and monitor existing curricula catalogues.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* Create Course Form */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: 'var(--primary-glow)', padding: '0.4rem', borderRadius: '8px', color: 'var(--primary)', display: 'flex' }}>
              <Plus size={18} />
            </div>
            <h3 style={{ margin: 0 }}>Create New Course</h3>
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

          {success && (
            <div style={{ 
              background: 'rgba(16, 185, 129, 0.12)', 
              color: 'var(--success)', 
              padding: '0.85rem 1rem', 
              borderRadius: '10px', 
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle size={16} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label><Sparkles size={13} /> Course Code</label>
              <input 
                type="text" 
                className="input-field" 
                name="course_code" 
                placeholder="e.g. ECE-512" 
                value={formData.course_code} 
                onChange={handleChange} 
                required 
                disabled={submitLoading}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label><BookOpen size={13} /> Course Name</label>
              <input 
                type="text" 
                className="input-field" 
                name="course_name" 
                placeholder="e.g. Embedded Systems" 
                value={formData.course_name} 
                onChange={handleChange} 
                required 
                disabled={submitLoading}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label><Building size={13} /> Department</label>
              <input 
                type="text" 
                className="input-field" 
                name="department" 
                placeholder="e.g. Electrical Engineering" 
                value={formData.department} 
                onChange={handleChange} 
                disabled={submitLoading}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label><Clock size={13} /> Credit Hours</label>
              <input 
                type="number" 
                className="input-field" 
                name="credit_hour" 
                placeholder="e.g. 4" 
                value={formData.credit_hour} 
                onChange={handleChange} 
                disabled={submitLoading}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label><User size={13} /> Instructor ID (Optional)</label>
              <input 
                type="number" 
                className="input-field" 
                name="instructor_id" 
                placeholder="e.g. 102" 
                value={formData.instructor_id} 
                onChange={handleChange} 
                disabled={submitLoading}
              />
            </div>

            <button type="submit" className="btn" style={{ marginTop: '0.5rem' }} disabled={submitLoading}>
              {submitLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Creating Course...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Create Course</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing Courses List */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: 'var(--primary-glow)', padding: '0.4rem', borderRadius: '8px', color: 'var(--primary)', display: 'flex' }}>
              <GraduationCap size={18} />
            </div>
            <h3 style={{ margin: 0 }}>Existing Catalogue</h3>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
              <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Loading catalogue...</span>
            </div>
          ) : courses.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No courses registered in database.</p>
          ) : (
            <div className="data-table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Dept.</th>
                    <th>Credits</th>
                    <th>Instructor</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(course => (
                    <tr key={course.course_id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{course.course_code}</td>
                      <td>{course.course_name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{course.department || '—'}</td>
                      <td>{course.credit_hour || '—'} hrs</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {course.instructor_name ? (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <User size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> {course.instructor_name}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                            Unassigned
                          </span>
                        )}
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

export default CourseManagement;
