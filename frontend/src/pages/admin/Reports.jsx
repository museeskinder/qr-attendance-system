import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  FileSpreadsheet, 
  FileDown, 
  Filter, 
  ListOrdered,
  AlertCircle,
  Loader2
} from 'lucide-react';

const Reports = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering and Sorting state
  const [selectedYear, setSelectedYear] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');

  const fetchStudentReports = async (yearVal = selectedYear) => {
    try {
      setLoading(true);
      setError('');
      const url = yearVal ? `/reports/student-reports?year=${encodeURIComponent(yearVal)}` : '/reports/student-reports';
      const res = await api.get(url);
      if (res.data.success) {
        setStudents(res.data.data);
      } else {
        setError(res.data.error || 'Failed to fetch student reports');
      }
    } catch (err) {
      console.error(err);
      setError('Server error while fetching student reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentReports();
  }, [selectedYear]);

  const downloadPDF = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/reports/export/pdf?token=${token}&year=${encodeURIComponent(selectedYear)}&sortBy=${encodeURIComponent(sortBy)}`, '_blank');
  };

  const downloadExcel = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/reports/export/excel?token=${token}&year=${encodeURIComponent(selectedYear)}&sortBy=${encodeURIComponent(sortBy)}`, '_blank');
  };


  const handleRefresh = () => {
    setSelectedYear('');
    setSortBy('name_asc');
    setError('');
    fetchStudentReports('');
  };

  // Sorting Logic
  const getSortedStudents = () => {
    let sorted = [...students];
    switch (sortBy) {
      case 'eligibility_asc':
        sorted.sort((a, b) => (a.is_eligible === b.is_eligible ? 0 : a.is_eligible ? 1 : -1));
        break;
      case 'eligibility_desc':
        sorted.sort((a, b) => (a.is_eligible === b.is_eligible ? 0 : a.is_eligible ? -1 : 1));
        break;
      case 'present_asc':
        sorted.sort((a, b) => a.present_count - b.present_count);
        break;
      case 'present_desc':
        sorted.sort((a, b) => b.present_count - a.present_count);
        break;
      case 'late_asc':
        sorted.sort((a, b) => a.late_count - b.late_count);
        break;
      case 'late_desc':
        sorted.sort((a, b) => b.late_count - a.late_count);
        break;
      case 'absent_asc':
        sorted.sort((a, b) => a.absent_count - b.absent_count);
        break;
      case 'absent_desc':
        sorted.sort((a, b) => b.absent_count - a.absent_count);
        break;
      case 'name_asc':
      default:
        sorted.sort((a, b) => a.student_name.localeCompare(b.student_name));
        break;
    }
    return sorted;
  };

  const sortedStudents = getSortedStudents();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}
    >
      {/* Title & Exports Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h2>Student Attendance Reports</h2>
          <p style={{ color: 'var(--text-muted)' }}>Generate attendance audits and test eligibility sheets filtered by year catalogue.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-danger" 
            onClick={downloadPDF} 
            style={{ padding: '0.75rem 1.25rem' }}
          >
            <FileDown size={16} />
            <span>Export PDF</span>
          </button>
          <button 
            className="btn btn-success" 
            onClick={downloadExcel} 
            style={{ padding: '0.75rem 1.25rem' }}
          >
            <FileSpreadsheet size={16} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          background: 'rgba(244, 63, 94, 0.12)', 
          color: 'var(--danger)', 
          padding: '0.85rem 1.25rem', 
          borderRadius: '12px',
          border: '1px solid rgba(244, 63, 94, 0.2)',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Options Bar */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <select 
              id="yearFilter"
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input-field"
              style={{ width: 'auto', marginBottom: 0, padding: '0.55rem 1.75rem 0.55rem 1rem', appearance: 'none', background: 'rgba(10, 15, 30, 0.8)' }}
            >
              <option value="">All Academic Years</option>
              <option value="Year 1">Year 1</option>
              <option value="Year 2">Year 2</option>
              <option value="Year 3">Year 3</option>
              <option value="Year 4">Year 4</option>
              <option value="Year 5">Year 5</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ListOrdered size={15} style={{ color: 'var(--text-muted)' }} />
            <select 
              id="sortSelect"
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
              style={{ width: 'auto', marginBottom: 0, padding: '0.55rem 1.75rem 0.55rem 1rem', appearance: 'none', background: 'rgba(10, 15, 30, 0.8)' }}
            >
              <option value="name_asc">Name (A-Z)</option>
              <option value="eligibility_desc">Eligible First</option>
              <option value="eligibility_asc">Ineligible First</option>
              <option value="present_desc">Presents (High-Low)</option>
              <option value="present_asc">Presents (Low-High)</option>
              <option value="late_desc">Lates (High-Low)</option>
              <option value="late_asc">Lates (Low-High)</option>
              <option value="absent_desc">Absents (High-Low)</option>
              <option value="absent_asc">Absents (Low-High)</option>
            </select>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={handleRefresh} style={{ padding: '0.65rem 1.25rem' }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* Reports Data list */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.25rem' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '0.5rem' }}>
            <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Compiling student reports data...</span>
          </div>
        ) : sortedStudents.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>No student logs registered under these filters.</p>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Course Code</th>
                  <th>Presents</th>
                  <th>Lates</th>
                  <th>Absents</th>
                  <th>Attendance %</th>
                  <th style={{ textAlign: 'right' }}>Exam Eligibility</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((s, i) => (
                  <tr key={`${s.student_id}-${s.course_code}-${i}`}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.student_code}</td>
                    <td style={{ fontWeight: 600 }}>{s.student_name}</td>
                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{s.course_code}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>{s.present_count}</td>
                    <td style={{ color: 'var(--warning)', fontWeight: 700 }}>{s.late_count}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: 700 }}>{s.absent_count}</td>
                    <td style={{ fontWeight: 600 }}>{s.attendance_percentage}%</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {s.is_eligible ? (
                          <span className="status-badge status-present">
                            <CheckCircle size={12} />
                            <span>Eligible</span>
                          </span>
                        ) : (
                          <span className="status-badge status-absent">
                            <XCircle size={12} />
                            <span>Ineligible</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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

export default Reports;
