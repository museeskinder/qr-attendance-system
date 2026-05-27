import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Plus, BookOpen, Key, Check, Copy,
  Loader2, AlertCircle, Users, ShieldCheck, CheckCircle2,
  Pencil, X, Save, RefreshCw, Search
} from 'lucide-react';

/* ─── Skeleton row helper ─── */
const SkeletonRow = () => (
  <tr>
    {[70, 55, 30].map((w, i) => (
      <td key={i} style={{ padding: '1rem 1.1rem' }}>
        <div className="skeleton skeleton-text" style={{ width: `${w}%` }} />
      </td>
    ))}
  </tr>
);

/* ─── Course checkbox item ─── */
const CourseItem = ({ course, selected, onToggle, disabled }) => (
  <motion.div
    layout
    onClick={() => !disabled && onToggle(course.course_id)}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.7rem 0.9rem',
      background: selected ? 'var(--primary-glow)' : 'transparent',
      border: `1px solid ${selected ? 'var(--primary)' : 'var(--glass-border)'}`,
      borderRadius: '10px',
      cursor: disabled ? 'default' : 'pointer',
      transition: 'all 0.15s',
      userSelect: 'none',
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1, minWidth: 0 }}>
      <span style={{ fontSize: '0.75rem', color: selected ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700 }}>
        {course.course_code}
      </span>
      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {course.course_name}
      </span>
    </div>
    <div style={{
      width: '18px', height: '18px', flexShrink: 0,
      borderRadius: '5px',
      border: selected ? 'none' : '1.5px solid var(--text-muted)',
      background: selected ? 'var(--primary)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', marginLeft: '0.75rem',
      transition: 'all 0.15s',
    }}>
      {selected && <Check size={11} />}
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════
   EDIT COURSES MODAL
═══════════════════════════════════════════════════ */
const EditCoursesModal = ({ instructor, allCourses, onClose, onSaved }) => {
  const [selected, setSelected] = useState([]);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Fetch current assignments when modal opens
  useEffect(() => {
    const fetchAssigned = async () => {
      try {
        const res = await api.get(`/auth/instructor/${instructor.id}/courses`);
        if (res.data.success) {
          setSelected(res.data.data.map(c => c.course_id));
        }
      } catch {
        setError('Could not load current courses.');
      } finally {
        setLoadingCurrent(false);
      }
    };
    fetchAssigned();
  }, [instructor.id]);

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/auth/instructor/${instructor.id}/courses`, { course_ids: selected });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = allCourses.filter(c =>
    c.course_name.toLowerCase().includes(search.toLowerCase()) ||
    c.course_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.92, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 30, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 200 }}
        style={{ maxWidth: '500px' }}
      >
        <button className="modal-close-btn" onClick={onClose}><X size={15} /></button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingRight: '2.5rem' }}>
          <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.6rem', borderRadius: '12px', display: 'flex', flexShrink: 0 }}>
            <Pencil size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Edit Course Assignments</h3>
            <p style={{ margin: 0, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {instructor.name} · {instructor.email}
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search courses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem', padding: '0.7rem 1rem 0.7rem 2.25rem' }}
          />
        </div>

        {/* Selected count badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {allCourses.length} courses available
          </span>
          <span className="course-chip">
            <BookOpen size={11} /> {selected.length} selected
          </span>
        </div>

        {/* Course list */}
        {loadingCurrent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton skeleton-row" />
            ))}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
            maxHeight: '320px',
            overflowY: 'auto',
            paddingRight: '0.25rem',
          }}>
            {filtered.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem 0', fontStyle: 'italic' }}>No courses match your search.</p>
            ) : (
              filtered.map(course => (
                <CourseItem
                  key={course.course_id}
                  course={course}
                  selected={selected.includes(course.course_id)}
                  onToggle={toggle}
                  disabled={saving}
                />
              ))
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'var(--danger-glow)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', border: '1px solid rgba(244,63,94,0.2)' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }} disabled={saving}>
            Cancel
          </button>
          <button className="btn" onClick={handleSave} style={{ flex: 2 }} disabled={saving || loadingCurrent}>
            {saving ? (
              <><Loader2 size={15} className="spin" /> Saving…</>
            ) : (
              <><Save size={15} /> Save Changes</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
const CreateInstructor = () => {
  const [instructors, setInstructors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [error, setError] = useState('');
  const [createdInfo, setCreatedInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);

  const fetchInstructors = useCallback(async () => {
    try {
      const res = await api.get('/auth/instructors');
      if (res.data.success) setInstructors(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await api.get('/courses');
      if (res.data.success) setCourses(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchInstructors(), fetchCourses()]);
      setLoading(false);
    };
    init();
  }, [fetchInstructors, fetchCourses]);

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCourseToggle = (courseId) =>
    setSelectedCourses(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCreatedInfo(null);
    setCopied(false);
    if (selectedCourses.length === 0) {
      setError('Please assign at least one course to the instructor.');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await api.post('/auth/instructor', { ...formData, assigned_courses: selectedCourses });
      if (res.data.success) {
        setCreatedInfo(res.data.data);
        setFormData({ name: '', email: '' });
        setSelectedCourses([]);
        fetchInstructors();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create instructor.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCopy = () => {
    if (createdInfo?.temporaryPassword) {
      navigator.clipboard.writeText(createdInfo.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
      >
        {/* Page heading */}
        <motion.div variants={itemVariants}>
          <h2>Instructor Management</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Register new instructors, assign courses, and edit existing assignments.
          </p>
        </motion.div>

        {/* Two-column grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
        }}>
          {/* ── Create Instructor Panel ── */}
          <motion.div variants={itemVariants} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: 'var(--primary-glow)', padding: '0.45rem', borderRadius: '8px', color: 'var(--primary)', display: 'flex' }}>
                <Plus size={18} />
              </div>
              <h3 style={{ margin: 0 }}>Create Instructor Account</h3>
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ background: 'var(--danger-glow)', color: 'var(--danger)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(244,63,94,0.2)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <AlertCircle size={16} /> <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success info card */}
            <AnimatePresence>
              {createdInfo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  style={{ background: 'var(--success-glow)', border: '1px solid rgba(16,185,129,0.25)', padding: '1.25rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700 }}>
                    <CheckCircle2 size={18} /> <span>Instructor Registered!</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}><strong>Name:</strong> {createdInfo.name}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}><strong>Email:</strong> {createdInfo.email}</p>
                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--glass-border)', padding: '0.75rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Temporary Password</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                        {createdInfo.temporaryPassword}
                      </span>
                    </div>
                    <button onClick={handleCopy} className={`btn btn-sm ${copied ? 'btn-success' : 'btn-secondary'}`} style={{ minWidth: '76px' }}>
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Share with the instructor — password change required on first login.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label><User size={13} /> Full Name</label>
                <input type="text" className="input-field" name="name" placeholder="Dr. Sarah Connor" value={formData.name} onChange={handleChange} required disabled={submitLoading} />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label><Mail size={13} /> Email Address</label>
                <input type="email" className="input-field" name="email" placeholder="sarah@university.edu" value={formData.email} onChange={handleChange} required disabled={submitLoading} />
              </div>

              {/* Course selector */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label><BookOpen size={13} /> Assign Courses <span style={{ color: 'var(--danger)', marginLeft: '2px' }}>*</span></label>
                {courses.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-disabled)', fontStyle: 'italic' }}>No courses registered yet.</p>
                ) : (
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '0.45rem',
                    maxHeight: '200px', overflowY: 'auto',
                    background: 'var(--bg-input)', padding: '0.75rem',
                    borderRadius: '12px', border: '1px solid var(--glass-border)',
                  }}>
                    {courses.map(course => (
                      <CourseItem
                        key={course.course_id}
                        course={course}
                        selected={selectedCourses.includes(course.course_id)}
                        onToggle={handleCourseToggle}
                        disabled={submitLoading}
                      />
                    ))}
                  </div>
                )}
                {selectedCourses.length > 0 && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.4rem' }}>
                    {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} selected
                  </span>
                )}
              </div>

              <button type="submit" className="btn" disabled={submitLoading} style={{ marginTop: '0.25rem' }}>
                {submitLoading
                  ? <><Loader2 size={16} className="spin" /> <span>Registering…</span></>
                  : <><Plus size={16} /> <span>Create Instructor</span></>}
              </button>
            </form>
          </motion.div>

          {/* ── Registered Instructors Panel ── */}
          <motion.div variants={itemVariants} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: 'var(--primary-glow)', padding: '0.45rem', borderRadius: '8px', color: 'var(--primary)', display: 'flex' }}>
                  <Users size={18} />
                </div>
                <h3 style={{ margin: 0 }}>Registered Instructors</h3>
              </div>
              <button
                onClick={fetchInstructors}
                className="btn btn-secondary btn-sm"
                title="Refresh"
                style={{ padding: '0.4rem 0.65rem' }}
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <p style={{ margin: '-0.5rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Click any row to edit course assignments.
            </p>

            {/* Table — vertical scroll only, no horizontal overflow */}
            <div className="data-table-container" style={{ maxHeight: '520px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '38%' }}>Name</th>
                    <th style={{ width: '42%' }}>Email</th>
                    <th style={{ width: '20%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [1, 2, 3, 4].map(i => <SkeletonRow key={i} />)
                  ) : instructors.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                          <Users size={28} style={{ opacity: 0.35 }} />
                          <span style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>No instructors registered yet.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    instructors.map(inst => (
                      <motion.tr
                        key={inst.id}
                        className="clickable"
                        onClick={() => setEditingInstructor(inst)}
                        title="Click to edit course assignments"
                        whileHover={{ backgroundColor: 'rgba(99,102,241,0.06)' }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                              background: 'var(--primary-glow)', color: 'var(--primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '0.78rem', fontFamily: 'Plus Jakarta Sans',
                            }}>
                              {inst.name?.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {inst.name}
                            </span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inst.email}
                        </td>
                        <td>
                          {inst.requires_password_change ? (
                            <span className="status-badge status-late">Pending</span>
                          ) : (
                            <span className="status-badge status-present">
                              <ShieldCheck size={10} /> Active
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && instructors.length > 0 && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '-0.75rem 0 0' }}>
                {instructors.length} instructor{instructors.length !== 1 ? 's' : ''} registered
              </p>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* ── Edit Courses Modal ── */}
      <AnimatePresence>
        {editingInstructor && (
          <EditCoursesModal
            instructor={editingInstructor}
            allCourses={courses}
            onClose={() => setEditingInstructor(null)}
            onSaved={fetchInstructors}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default CreateInstructor;
