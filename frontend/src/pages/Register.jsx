import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  Lock, 
  GraduationCap, 
  Calendar, 
  Building, 
  BookOpen, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';

const Register = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentYear, setStudentYear] = useState('');
  const role = 'student'; // Always student
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [departmentCourses, setDepartmentCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  
  // Inline error states
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [studentIdError, setStudentIdError] = useState('');
  const [yearError, setYearError] = useState('');
  const [deptError, setDeptError] = useState('');
  const [courseError, setCourseError] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  // Load departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/auth/departments');
        if (res.data.success) {
          setDepartments(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch courses when department changes
  useEffect(() => {
    const fetchCourses = async () => {
      if (!departmentId) {
        setDepartmentCourses([]);
        setSelectedCourses([]);
        return;
      }
      try {
        const res = await api.get(`/courses/department/${departmentId}`);
        if (res.data.success) {
          setDepartmentCourses(res.data.data);
          setSelectedCourses([]); // Clear selected on change
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };
    fetchCourses();
  }, [departmentId]);

  const handleCourseCheckboxChange = (courseId) => {
    setSelectedCourses(prev => {
      const updated = prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId];
      if (updated.length > 0) setCourseError('');
      return updated;
    });
  };

  // Step 1 Validation
  const handleNextStep = () => {
    setError('');
    let valid = true;

    if (!name.trim()) {
      setNameError('Full Name is required');
      valid = false;
    } else {
      setNameError('');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (valid) {
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    let valid = true;
    if (!studentId.trim()) {
      setStudentIdError('Student ID is required');
      valid = false;
    } else {
      setStudentIdError('');
    }

    if (!studentYear) {
      setYearError('Please select your current academic year');
      valid = false;
    } else {
      setYearError('');
    }

    if (!departmentId) {
      setDeptError('Please select a department');
      valid = false;
    } else {
      setDeptError('');
    }

    if (selectedCourses.length === 0) {
      setCourseError('Please enroll in at least one course');
      valid = false;
    } else {
      setCourseError('');
    }

    if (!valid) return;

    setLoading(true);
    try {
      const extra = {
        student_id: studentId.trim(),
        student_year: studentYear,
        department_id: parseInt(departmentId),
        courses: selectedCourses
      };

      await register(name, email, password, role, extra);
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ minHeight: '100vh', padding: '2rem 1.5rem' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="auth-box glass-panel"
        style={{ maxWidth: '500px', width: '100%' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Create Account</h2>
          <p style={{ marginTop: '0.25rem' }}>Register student profile for Attendance tracking</p>
        </div>

        {/* ── Visual Stepper Progress Bar ── */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2.5rem', 
          position: 'relative' 
        }}>
          <div style={{ 
            flex: 1, 
            height: '2.5px', 
            background: 'rgba(255,255,255,0.06)', 
            position: 'absolute', 
            top: '16px', 
            left: 0, 
            right: 0,
            zIndex: 0 
          }} />
          <div style={{ 
            height: '2.5px', 
            background: 'var(--primary)', 
            position: 'absolute', 
            top: '16px', 
            left: 0, 
            width: step === 1 ? '50%' : '100%', 
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
            zIndex: 0 
          }} />
          
          {/* Step 1 Node */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, cursor: 'pointer' }} onClick={() => step === 2 && setStep(1)}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'var(--primary)', 
              color: 'white', 
              fontWeight: '700', 
              fontSize: '0.85rem', 
              boxShadow: '0 0 12px var(--primary-glow)',
              transition: 'all 0.3s'
            }}>
              {step === 2 ? <Check size={16} /> : '1'}
            </div>
            <span style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-primary)', fontWeight: '600' }}>Account</span>
          </div>

          {/* Step 2 Node */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: step === 2 ? 'var(--primary)' : 'var(--bg-primary)', 
              border: step === 2 ? 'none' : '1px solid var(--glass-border)', 
              color: step === 2 ? 'white' : 'var(--text-muted)', 
              fontWeight: '700', 
              fontSize: '0.85rem', 
              transition: 'all 0.3s', 
              boxShadow: step === 2 ? '0 0 12px var(--primary-glow)' : 'none' 
            }}>
              2
            </div>
            <span style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: step === 2 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: '600' }}>Profile & Courses</span>
          </div>
        </div>
        
        {/* Global Submit Error */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              background: 'rgba(244, 63, 94, 0.15)', 
              color: 'var(--danger)', 
              padding: '0.85rem 1rem', 
              borderRadius: '10px', 
              marginBottom: '1.5rem', 
              border: '1px solid rgba(244, 63, 94, 0.25)',
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
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <div className="input-group">
                  <label><User size={14} /> Full Name</label>
                  <input 
                    type="text" 
                    className={`input-field ${nameError ? 'error' : ''}`}
                    placeholder="John Doe"
                    value={name} 
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError('');
                    }} 
                    required 
                  />
                  {nameError && <span className="input-feedback"><AlertCircle size={12} /> {nameError}</span>}
                </div>
                
                <div className="input-group">
                  <label><Mail size={14} /> Email Address</label>
                  <input 
                    type="email" 
                    className={`input-field ${emailError ? 'error' : ''}`}
                    placeholder="john.doe@university.edu"
                    value={email} 
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }} 
                    required 
                  />
                  {emailError && <span className="input-feedback"><AlertCircle size={12} /> {emailError}</span>}
                </div>
                
                <div className="input-group">
                  <label><Lock size={14} /> Password</label>
                  <input 
                    type="password" 
                    className={`input-field ${passwordError ? 'error' : ''}`}
                    placeholder="••••••••"
                    value={password} 
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError('');
                    }} 
                    required 
                  />
                  {passwordError && <span className="input-feedback"><AlertCircle size={12} /> {passwordError}</span>}
                </div>
                
                <button 
                  type="button" 
                  onClick={handleNextStep} 
                  className="btn" 
                  style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}
                >
                  <span>Continue</span>
                  <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.25 }}
              >
                <div className="input-group">
                  <label><GraduationCap size={14} /> Student ID</label>
                  <input 
                    type="text" 
                    className={`input-field ${studentIdError ? 'error' : ''}`}
                    placeholder="e.g. S10024"
                    value={studentId} 
                    onChange={(e) => {
                      setStudentId(e.target.value);
                      if (studentIdError) setStudentIdError('');
                    }} 
                    required 
                  />
                  {studentIdError && <span className="input-feedback"><AlertCircle size={12} /> {studentIdError}</span>}
                </div>

                <div className="input-group">
                  <label><Calendar size={14} /> Academic Year</label>
                  <select 
                    className={`input-field ${yearError ? 'error' : ''}`}
                    value={studentYear} 
                    onChange={(e) => {
                      setStudentYear(e.target.value);
                      if (yearError) setYearError('');
                    }}
                    required
                    style={{ appearance: 'none', background: 'rgba(10, 15, 30, 0.8)' }}
                  >
                    <option value="">Select Year</option>
                    {['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  {yearError && <span className="input-feedback"><AlertCircle size={12} /> {yearError}</span>}
                </div>

                <div className="input-group">
                  <label><Building size={14} /> Department</label>
                  <select 
                    className={`input-field ${deptError ? 'error' : ''}`}
                    value={departmentId} 
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      if (deptError) setDeptError('');
                    }}
                    required
                    style={{ appearance: 'none', background: 'rgba(10, 15, 30, 0.8)' }}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.department_id} value={d.department_id}>{d.name || d.department_name}</option>
                    ))}
                  </select>
                  {deptError && <span className="input-feedback"><AlertCircle size={12} /> {deptError}</span>}
                </div>

                {/* ── Premium Enrolled Courses Grid Selector ── */}
                {departmentCourses.length > 0 && (
                  <div className="input-group">
                    <label><BookOpen size={14} /> Select Enrolled Courses</label>
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: '0.65rem',
                      maxHeight: '180px', 
                      overflowY: 'auto', 
                      background: 'rgba(6, 9, 19, 0.6)', 
                      padding: '0.85rem', 
                      borderRadius: '12px', 
                      border: '1px solid var(--glass-border)' 
                    }} className="custom-scrollbar">
                      {departmentCourses.map(course => {
                        const isSelected = selectedCourses.includes(course.course_id);
                        return (
                          <div 
                            key={course.course_id}
                            onClick={() => handleCourseCheckboxChange(course.course_id)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              padding: '0.75rem 1rem',
                              background: isSelected ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.01)',
                              border: isSelected ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              userSelect: 'none'
                            }}
                            onMouseEnter={e => {
                              if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            }}
                            onMouseLeave={e => {
                              if (!isSelected) e.currentTarget.style.borderColor = 'var(--glass-border)';
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <span style={{ fontSize: '0.8rem', color: isSelected ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                                {course.course_code}
                              </span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                {course.course_name}
                              </span>
                            </div>
                            <div style={{ 
                              width: '20px', 
                              height: '20px', 
                              borderRadius: '4px', 
                              border: isSelected ? 'none' : '1.5px solid var(--text-muted)', 
                              background: isSelected ? 'var(--primary)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              transition: 'all 0.15s'
                            }}>
                              {isSelected && <Check size={14} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {courseError && <span className="input-feedback"><AlertCircle size={12} /> {courseError}</span>}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '0.9rem' }}
                  >
                    <ChevronLeft size={18} />
                    <span>Back</span>
                  </button>
                  <button 
                    type="submit" 
                    className="btn" 
                    style={{ flex: 2, padding: '0.9rem' }} 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <span>Register</span>
                        <Check size={18} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
            Log in
          </Link>
        </p>
      </motion.div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Register;
