import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Loader2, 
  AlertCircle, 
  Filter, 
  RefreshCw, 
  UserCheck, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

  // Edit modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', student_year: '', password: '' });
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm state
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const url = roleFilter ? `/admin/users?role=${roleFilter}` : '/admin/users';
      const res = await api.get(url);
      if (res.data.success) setUsers(res.data.data);
      else setError(res.data.error || 'Failed to load users');
    } catch (err) {
      setError(err.response?.data?.error || 'Server error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchUsers(); 
  }, [roleFilter]);

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({ name: user.name, email: user.email, student_year: user.student_year || '', password: '' });
    setSuccess('');
    setError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setError('');
    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        student_year: editForm.student_year || null,
      };
      if (editForm.password) payload.password = editForm.password;

      const res = await api.put(`/admin/users/${editingUser.id}`, payload);
      if (res.data.success) {
        setSuccess(`Account for ${editingUser.name} updated successfully!`);
        setEditingUser(null);
        fetchUsers();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);
    setError('');
    try {
      const res = await api.delete(`/admin/users/${deletingUser.id}`);
      if (res.data.success) {
        setSuccess(`Account for ${deletingUser.name} was deleted successfully.`);
        setDeletingUser(null);
        fetchUsers();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
      setDeletingUser(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      <div>
        <h2>User Management</h2>
        <p style={{ color: 'var(--text-muted)' }}>Monitor, edit, or delete active student and instructor accounts registered in the system.</p>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ 
              background: 'rgba(16, 185, 129, 0.12)', 
              border: '1px solid rgba(16, 185, 129, 0.25)', 
              color: 'var(--success)', 
              padding: '0.85rem 1.25rem', 
              borderRadius: '12px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={18} />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
          </motion.div>
        )}
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ 
              background: 'rgba(244, 63, 94, 0.12)', 
              border: '1px solid rgba(244, 63, 94, 0.25)', 
              color: 'var(--danger)', 
              padding: '0.85rem 1.25rem', 
              borderRadius: '12px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters & Actions Panel */}
      <div className="glass-panel" style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
          <Search size={18} style={{ color: 'var(--text-disabled)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 0 }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="input-field"
              style={{ padding: '0.55rem 1.75rem 0.55rem 1rem', width: 'auto', marginBottom: 0, appearance: 'none', background: 'rgba(10, 15, 30, 0.8)' }}
            >
              <option value="">All Roles</option>
              <option value="instructor">Instructors</option>
              <option value="student">Students</option>
            </select>
          </div>

          <button className="btn btn-secondary" onClick={fetchUsers} style={{ padding: '0.65rem 1.25rem' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.25rem' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '0.5rem' }}>
            <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Loading accounts register...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>No users match the active filters.</p>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Role</th>
                  <th>Acad. Year</th>
                  <th>ID Code</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className="status-badge" style={{ 
                        background: u.role === 'instructor' ? 'var(--primary-glow)' : 'var(--success-glow)',
                        color: u.role === 'instructor' ? 'var(--primary)' : 'var(--success)',
                        border: u.role === 'instructor' ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(16,185,129,0.2)'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.student_year || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{u.student_id || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEdit(u)}
                          className="btn btn-secondary"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="btn btn-danger"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Modal Overlay ── */}
      <AnimatePresence>
        {editingUser && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content"
            >
              <button className="modal-close-btn" onClick={() => setEditingUser(null)}><X size={16} /></button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
                <Edit2 size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0 }}>Edit User Profile</h3>
              </div>

              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={editForm.name} 
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                    required 
                    disabled={editLoading}
                  />
                </div>
                
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    value={editForm.email} 
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })} 
                    required 
                    disabled={editLoading}
                  />
                </div>
                
                {editingUser.role === 'student' && (
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Student Year</label>
                    <select 
                      className="input-field" 
                      value={editForm.student_year} 
                      onChange={e => setEditForm({ ...editForm, student_year: e.target.value })}
                      disabled={editLoading}
                      style={{ appearance: 'none', background: 'rgba(10, 15, 30, 0.8)' }}
                    >
                      <option value="">— None —</option>
                      {['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>
                    <span>New Password</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-disabled)', fontWeight: 400 }}>(leave blank to retain current)</span>
                  </label>
                  <input 
                    type="password" 
                    className="input-field" 
                    value={editForm.password} 
                    onChange={e => setEditForm({ ...editForm, password: e.target.value })} 
                    placeholder="••••••••" 
                    autoComplete="new-password"
                    disabled={editLoading}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn" style={{ flex: 1.5 }} disabled={editLoading}>
                    {editLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingUser(null)} disabled={editLoading}>
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal Overlay ── */}
      <AnimatePresence>
        {deletingUser && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="modal-content"
              style={{ textAlign: 'center', maxWidth: '440px' }}
            >
              <div style={{ 
                background: 'var(--danger-glow)', 
                color: 'var(--danger)', 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: '1rem',
                border: '1.5px solid rgba(244, 63, 94, 0.25)'
              }}>
                <ShieldAlert size={28} />
              </div>
              
              <h3 style={{ marginBottom: '0.5rem' }}>Delete Account?</h3>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, margin: '0.25rem 0' }}>
                {deletingUser.name} ({deletingUser.email})
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
                Warning: Removing this profile will revoke dashboard access. Attendance records remain catalogued with anonymized parameters.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete} disabled={deleteLoading}>
                  {deleteLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>Delete Account</span>
                    </>
                  )}
                </button>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeletingUser(null)} disabled={deleteLoading}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

export default UserManagement;
