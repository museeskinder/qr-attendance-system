import React, { useContext, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  UserPlus,
  Users,
  Activity,
  PieChart,
  List,
  QrCode,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ClipboardCheck
} from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getLinks = () => {
    if (user?.role === 'admin') {
      return [
        { to: '/admin',             label: 'Dashboard',     icon: <LayoutDashboard size={18} /> },
        { to: '/admin/courses',     label: 'Courses',       icon: <BookOpen size={18} /> },
        { to: '/admin/instructors', label: 'Instructors',   icon: <UserPlus size={18} /> },
        { to: '/admin/users',       label: 'Manage Users',  icon: <Users size={18} /> },
        { to: '/admin/activity',    label: 'Activity Logs', icon: <Activity size={18} /> },
        { to: '/admin/reports',     label: 'Reports',       icon: <PieChart size={18} /> },
      ];
    }
    if (user?.role === 'instructor') {
      return [
        { to: '/instructor',          label: 'Dashboard',       icon: <LayoutDashboard size={18} /> },
        { to: '/instructor/sessions', label: 'Sessions',        icon: <List size={18} /> },
        { to: '/instructor/reports',  label: 'Student Reports', icon: <PieChart size={18} /> },
      ];
    }
    return [
      { to: '/student',      label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      { to: '/student/scan', label: 'Scan QR',   icon: <QrCode size={18} /> },
    ];
  };

  const renderNavLinks = () => (
    <>
      {getLinks().map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/admin' || link.to === '/instructor' || link.to === '/student'}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          {link.icon}
          <span>{link.label}</span>
        </NavLink>
      ))}
    </>
  );

  /* ─── Sidebar shared content ─── */
  const SidebarBrand = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
      <div style={{
        background: 'var(--primary-glow)',
        color: 'var(--primary)',
        padding: '0.5rem',
        borderRadius: '10px',
        display: 'flex'
      }}>
        <ClipboardCheck size={20} />
      </div>
      <div>
        <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 800, WebkitTextFillColor: 'var(--text-primary)' }}>
          Attendance
        </h2>
        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          System
        </span>
      </div>
    </div>
  );

  const UserCard = ({ compact = false }) => (
    <div style={{
      marginBottom: compact ? '1.25rem' : '1.75rem',
      padding: '0.9rem 1rem',
      background: 'var(--primary-glow)',
      borderRadius: '12px',
      border: '1px solid rgba(99,102,241,0.12)'
    }}>
      <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: compact ? '0.88rem' : '0.95rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {user?.name}
      </p>
      <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, margin: '0.15rem 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {user?.role}
      </p>
    </div>
  );

  const ThemeBtn = () => (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );

  return (
    <div className="dashboard-layout">

      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SidebarBrand />
          <ThemeBtn />
        </div>

        <UserCard />

        <nav className="sidebar-nav">
          {renderNavLinks()}
        </nav>

        <button
          onClick={handleLogout}
          className="btn btn-danger"
          style={{ marginTop: 'auto', width: '100%', padding: '0.8rem 1rem' }}
        >
          <LogOut size={16} /> <span>Logout</span>
        </button>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <div
        className="mobile-header-bar"
        style={{
          display: 'none',
          width: '100%',
          background: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--glass-border)',
          padding: '0.85rem 1.25rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.35rem', borderRadius: '8px', display: 'flex' }}>
            <ClipboardCheck size={18} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>Attendance</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ThemeBtn />
          <button
            onClick={() => setMobileOpen(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 998 }}
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              style={{
                position: 'fixed',
                top: 0, bottom: 0, left: 0,
                width: '82%', maxWidth: '300px',
                background: 'var(--bg-sidebar)',
                borderRight: '1px solid var(--glass-border)',
                padding: '2rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 999
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <SidebarBrand />
                <button
                  onClick={() => setMobileOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={20} />
                </button>
              </div>

              <UserCard compact />

              <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, overflowY: 'auto' }}>
                {renderNavLinks()}
              </nav>

              <button
                onClick={handleLogout}
                className="btn btn-danger"
                style={{ width: '100%', padding: '0.8rem', marginTop: '1.5rem' }}
              >
                <LogOut size={16} /> <span>Logout</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="main-content">
        <Outlet />
      </main>

      <style>{`
        @media (max-width: 1024px) {
          .mobile-header-bar { display: flex !important; }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
