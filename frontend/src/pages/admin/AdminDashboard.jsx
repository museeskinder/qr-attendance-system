import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Activity, 
  Clock, 
  Calendar, 
  PlusCircle, 
  ListTodo, 
  ArrowRight,
  Loader2
} from 'lucide-react';

// GMT+3 clock helper
const getGMT3Now = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3 * 60 * 60 * 1000);
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({ instructors: 0, students: 0, courses: 0, sessions: 0 });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(getGMT3Now());

  // Live GMT+3 clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(getGMT3Now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [instructorsRes, usersRes, analyticsRes] = await Promise.all([
          api.get('/auth/instructors'),
          api.get('/admin/users?role=student'),
          api.get('/reports/attendance-analytics')
        ]);

        setStats({
          instructors: instructorsRes.data.success ? instructorsRes.data.data.length : 0,
          students: usersRes.data.success ? usersRes.data.data.length : 0,
          courses: analyticsRes.data.success ? analyticsRes.data.data.total_courses : 0,
          sessions: analyticsRes.data.success ? analyticsRes.data.data.total_sessions : 0,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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

  const statCards = [
    { label: 'Instructors', value: stats.instructors, icon: <Users size={22} />, color: '#6366f1', glow: 'rgba(99, 102, 241, 0.15)', link: '/admin/instructors' },
    { label: 'Students', value: stats.students, icon: <GraduationCap size={22} />, color: '#10b981', glow: 'rgba(16, 185, 129, 0.15)', link: '/admin/users' },
    { label: 'Courses', value: stats.courses, icon: <BookOpen size={22} />, color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.15)', link: '/admin/courses' },
    { label: 'Total Sessions', value: stats.sessions, icon: <Activity size={22} />, color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.15)', link: null },
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* ── GMT+3 Time Banner ── */}
      <motion.div 
        variants={itemVariants}
        style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          borderRadius: '16px',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
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
      </motion.div>

      {/* Header Info */}
      <motion.div variants={itemVariants}>
        <h2>Admin Dashboard</h2>
        <p style={{ color: 'var(--text-muted)' }}>Real-time overview of active instructors, students, and course counts.</p>
      </motion.div>

      {/* Stats Cards Grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '2rem 0' }}>
          <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Loading analytics statistics...</span>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {statCards.map((card, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="glass-panel"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '1.5rem',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{card.label}</span>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{card.value}</span>
                {card.link && (
                  <Link 
                    to={card.link} 
                    style={{ 
                      fontSize: '0.8rem', 
                      color: card.color, 
                      textDecoration: 'none', 
                      marginTop: '0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      fontWeight: 600
                    }}
                  >
                    <span>Manage</span> <ArrowRight size={12} />
                  </Link>
                )}
              </div>
              <div style={{ 
                background: card.glow, 
                color: card.color,
                padding: '1rem', 
                borderRadius: '14px',
                display: 'flex',
                boxShadow: `0 8px 24px -6px ${card.glow}`
              }}>
                {card.icon}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick Links Menu Grid */}
      <motion.div 
        variants={itemVariants}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <h3 style={{ margin: 0 }}>Quick Management Actions</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '1.25rem' 
        }}>
          {[
            { to: '/admin/users', label: 'Manage Accounts', desc: 'Edit & delete student/instructor profiles', icon: <Users size={18} />, color: '#10b981' },
            { to: '/admin/instructors', label: 'Add Instructor', desc: 'Register instructors & assign courses', icon: <PlusCircle size={18} />, color: '#6366f1' },
            { to: '/admin/courses', label: 'Courses Catalogue', desc: 'Create, assign, or edit active courses', icon: <BookOpen size={18} />, color: '#06b6d4' },
            { to: '/admin/activity', label: 'Activity Logs', desc: 'Review security actions & history logs', icon: <ListTodo size={18} />, color: '#f59e0b' },
          ].map((item, i) => (
            <Link key={i} to={item.to} style={{ textDecoration: 'none' }}>
              <div 
                className="glass-panel" 
                style={{ 
                  cursor: 'pointer', 
                  height: '100%', 
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  borderWidth: '1.2px',
                  borderColor: 'var(--glass-border)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = item.color;
                  e.currentTarget.style.boxShadow = `0 4px 20px -5px ${item.color}33`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: item.color }}>
                  {item.icon}
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.label}</h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
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

export default AdminDashboard;
