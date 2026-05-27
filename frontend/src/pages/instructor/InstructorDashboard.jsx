import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, QrCode, ClipboardList, Award, ArrowRight } from 'lucide-react';

const InstructorDashboard = () => {
  const { user } = useContext(AuthContext);

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
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Manage Attendance Sessions</h4>
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
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Student Eligibility Reports</h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', flex: 1 }}>
                Monitor attendance percentages for students, check exam eligibility lists (&gt;= 75%), and export to PDF/Excel.
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
