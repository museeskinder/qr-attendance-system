import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle, 
  Camera, 
  CameraOff, 
  MapPin, 
  Navigation,
  Loader2, 
  RefreshCw, 
  Sliders,
  Sparkles,
  ClipboardList,
  Satellite
} from 'lucide-react';

// GMT+3 helper
const getGMT3Now = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3 * 60 * 60 * 1000);
};

const QRScanner = () => {
  const navigate = useNavigate();
  const [manualToken, setManualToken] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('Acquiring location...');
  const [mockMode, setMockMode] = useState(false);
  const [mockLat, setMockLat] = useState('40.7128');
  const [mockLon, setMockLon] = useState('-74.0060');

  // Camera state
  const [cameraState, setCameraState] = useState('initializing'); // initializing | active | denied | unavailable | success
  const [cameraError, setCameraError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const scannedRef = useRef(false); // prevent double-submit
  const sessionTimerRef = useRef(null);

  // Read locked session from localStorage
  const lockedSessionId = localStorage.getItem('selected_session_id');
  const lockedSessionCode = localStorage.getItem('selected_session_code');
  const lockedSessionRoom = localStorage.getItem('selected_session_room');
  const lockedEndTime = localStorage.getItem('selected_session_end');

  // ------- GPS -------
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('GPS not supported — using mock coordinates');
      setMockMode(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGpsStatus('Satellite location lock acquired ✓');
      },
      (err) => {
        console.warn('GPS denied:', err);
        setGpsStatus('Location denied — using mock coordinates');
        setMockMode(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // ------- Session end-time auto-termination -------
  useEffect(() => {
    if (!lockedEndTime) return;

    const checkExpiry = () => {
      const now = getGMT3Now();
      const [hours, minutes] = lockedEndTime.split(':').map(Number);
      const end = new Date(now);
      end.setHours(hours, minutes, 0, 0);

      if (now >= end) {
        setSessionExpired(true);
        stopScanner();
        setStatus({ type: 'error', message: 'Session has ended. Attendance is now closed.' });
      }
    };

    checkExpiry();
    sessionTimerRef.current = setInterval(checkExpiry, 10000); // check every 10s
    return () => clearInterval(sessionTimerRef.current);
  }, [lockedEndTime]);

  // ------- Camera / ZXing scanner -------
  const stopScanner = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (sessionExpired) return;

    setCameraState('initializing');
    setCameraError('');
    scannedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      stream.getTracks().forEach(t => t.stop());
    } catch (permErr) {
      console.error('Camera permission error:', permErr);
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setCameraError('Camera permissions were denied. Please allow site access in settings.');
      } else {
        setCameraState('unavailable');
        setCameraError('Camera module is currently unavailable on this device.');
      }
      return;
    }

    try {
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      const videoInputDevices = await codeReader.listVideoInputDevices();
      let selectedDeviceId = undefined;
      if (videoInputDevices.length > 1) {
        const backCamera = videoInputDevices.find(d =>
          /back|rear|environment/i.test(d.label)
        );
        selectedDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[videoInputDevices.length - 1].deviceId;
      } else if (videoInputDevices.length === 1) {
        selectedDeviceId = videoInputDevices[0].deviceId;
      }

      setCameraState('active');

      await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, err) => {
          if (result && !scannedRef.current && !loading) {
            scannedRef.current = true;
            stopScanner();
            submitAttendance(result.getText());
          }
          if (err && !(err instanceof NotFoundException)) {
            console.warn('ZXing decode error:', err);
          }
        }
      );
    } catch (scanErr) {
      console.error('ZXing start error:', scanErr);
      setCameraState('unavailable');
      setCameraError('Could not launch camera scanner. Try manual token submission.');
    }
  }, [sessionExpired, loading]);

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []);

  // ------- Attendance submission -------
  const submitAttendance = async (token) => {
    if (sessionExpired) {
      setStatus({ type: 'error', message: 'Session time limit exceeded. Access denied.' });
      return;
    }
    setLoading(true);
    setStatus({ type: '', message: '' });

    const latitude = mockMode ? parseFloat(mockLat) : (gpsCoords?.latitude ?? null);
    const longitude = mockMode ? parseFloat(mockLon) : (gpsCoords?.longitude ?? null);

    try {
      const res = await api.post('/attendance/scan', { qr_code: token, latitude, longitude });

      if (res.data.success) {
        const statusType = res.data.data?.status || 'Present';
        setCameraState('success');
        setStatus({
          type: 'success',
          message: `Attendance validated successfully! Status marked: ${statusType}`
        });

        localStorage.removeItem('selected_session_id');
        localStorage.removeItem('selected_session_code');
        localStorage.removeItem('selected_session_room');
        localStorage.removeItem('selected_session_end');

        clearInterval(sessionTimerRef.current);
        setTimeout(() => navigate('/student'), 2200);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to submit attendance token';
      setStatus({ type: 'error', message: errMsg });
      scannedRef.current = false;
      if (cameraState !== 'active') {
        startScanner();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualToken && !loading) submitAttendance(manualToken);
  };

  const handleRetryCamera = () => {
    setCameraError('');
    startScanner();
  };

  const renderCameraContent = () => {
    if (sessionExpired) {
      return (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <CameraOff size={42} />
          <h4 style={{ color: 'white', marginTop: '0.5rem' }}>Session Expired</h4>
          <p style={{ fontSize: '0.85rem' }}>The gate window for attendance submission is closed.</p>
        </div>
      );
    }

    if (cameraState === 'success') {
      return (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--success)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={42} className="live-success-pulse" />
          <h4 style={{ color: 'white', marginTop: '0.5rem' }}>Attendance Registered</h4>
          <p style={{ fontSize: '0.85rem' }}>Verified coordinates. Redirecting back to dashboard...</p>
        </div>
      );
    }

    if (cameraState === 'denied') {
      return (
        <div style={{ padding: '2rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <CameraOff size={36} style={{ color: 'var(--danger)' }} />
          <p style={{ color: 'var(--danger)', fontSize: '0.88rem', margin: 0 }}>{cameraError}</p>
          <button className="btn" onClick={handleRetryCamera}>
            <RefreshCw size={14} />
            <span>Retry Camera Access</span>
          </button>
        </div>
      );
    }

    if (cameraState === 'unavailable') {
      return (
        <div style={{ padding: '2rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <CameraOff size={36} style={{ color: 'var(--warning)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>{cameraError}</p>
          <button className="btn btn-secondary" onClick={handleRetryCamera}>
            <span>Try Again</span>
          </button>
        </div>
      );
    }

    if (cameraState === 'initializing') {
      return (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <Loader2 size={30} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>Requesting video capture permissions...</p>
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/student" className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', display: 'flex', minWidth: 'auto' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h2 style={{ margin: 0 }}>Scan Active QR</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Locate standard course QR code inside the room.</p>
          </div>
        </div>
      </div>

      {/* Locked banner alert */}
      {lockedSessionCode && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          borderRadius: '12px',
          padding: '0.75rem 1.25rem',
          fontSize: '0.9rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div>
            <strong style={{ color: 'white' }}>Locked: {lockedSessionCode}</strong>
            {lockedSessionRoom && <span style={{ color: 'var(--text-muted)' }}> — Hall {lockedSessionRoom}</span>}
          </div>
          {lockedEndTime && (
            <span style={{ fontSize: '0.82rem', color: sessionExpired ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>
              Ends at {lockedEndTime} (GMT+3)
            </span>
          )}
        </div>
      )}

      {/* API Status Alerts */}
      <AnimatePresence>
        {status.message && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: status.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
              color: status.type === 'success' ? 'var(--success)' : 'var(--danger)',
              border: status.type === 'success' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(244,63,94,0.2)',
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              textAlign: 'center',
              fontWeight: '500',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{status.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Satellite Status bar */}
      <div className="glass-panel" style={{ 
        padding: '0.85rem 1.25rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        fontSize: '0.85rem', 
        flexWrap: 'wrap', 
        gap: '0.75rem',
        borderWidth: '1px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Navigation size={14} style={{ color: gpsCoords ? 'var(--success)' : 'var(--warning)', transform: 'rotate(45deg)' }} />
          <Satellite size={14} style={{ color: 'var(--text-muted)' }} />
          <strong style={{ color: 'var(--text-primary)' }}>{gpsStatus}</strong>
        </div>
        
        {gpsCoords && (
          <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
            Lat: {gpsCoords.latitude.toFixed(5)} | Lon: {gpsCoords.longitude.toFixed(5)}
          </span>
        )}

        <button
          onClick={() => setMockMode(!mockMode)}
          className="btn"
          style={{ 
            padding: '0.3rem 0.75rem', 
            fontSize: '0.78rem', 
            background: mockMode ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
            border: '1px solid var(--glass-border)',
            minWidth: 'auto',
            boxShadow: 'none'
          }}
        >
          <Sliders size={12} />
          <span>Mock Coords</span>
        </button>
      </div>

      {/* Mock GPS Panel */}
      <AnimatePresence>
        {mockMode && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-panel" 
            style={{ padding: '1.25rem', border: '1px dashed var(--primary)', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.88rem', fontWeight: 700 }}>
              <MapPin size={14} />
              <span>Simulated Coordinates Override</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Mock Latitude</label>
                <input 
                  type="number" 
                  step="any" 
                  className="input-field" 
                  value={mockLat} 
                  onChange={e => setMockLat(e.target.value)} 
                  disabled={loading} 
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Mock Longitude</label>
                <input 
                  type="number" 
                  step="any" 
                  className="input-field" 
                  value={mockLon} 
                  onChange={e => setMockLon(e.target.value)} 
                  disabled={loading} 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Container Box */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', borderBottomWidth: '4px', borderBottomColor: cameraState === 'active' ? 'var(--primary)' : 'var(--glass-border)' }}>
        
        <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={16} style={{ color: 'var(--primary)' }} />
            <span>Camera Broadcast Scan</span>
          </h3>
          {cameraState === 'active' && (
            <span style={{ 
              fontSize: '0.78rem', 
              color: 'var(--success)', 
              background: 'var(--success-glow)',
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              border: '1.2px solid rgba(16, 185, 129, 0.2)'
            }}>
              <span className="scrolling-ping" />
              <span>Scanning</span>
            </span>
          )}
        </div>

        <div style={{ position: 'relative', background: '#02040a', minHeight: '280px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
          
          <video
            ref={videoRef}
            style={{
              width: '100%',
              maxHeight: '340px',
              objectFit: 'cover',
              display: cameraState === 'active' ? 'block' : 'none'
            }}
            autoPlay
            playsInline
            muted
          />

          {/* Holographic scanner laser overlay target frame */}
          {cameraState === 'active' && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '210px',
              height: '210px',
              border: '2px solid rgba(99,102,241,0.5)',
              borderRadius: '16px',
              boxShadow: '0 0 0 4000px rgba(0,0,0,0.45)',
              pointerEvents: 'none',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 24, height: 24, borderTop: '3.5px solid var(--primary)', borderLeft: '3.5px solid var(--primary)', borderRadius: '4px 0 0 0' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: 24, height: 24, borderTop: '3.5px solid var(--primary)', borderRight: '3.5px solid var(--primary)', borderRadius: '0 4px 0 0' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: 24, height: 24, borderBottom: '3.5px solid var(--primary)', borderLeft: '3.5px solid var(--primary)', borderRadius: '0 0 0 4px' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderBottom: '3.5px solid var(--primary)', borderRight: '3.5px solid var(--primary)', borderRadius: '0 0 4px 0' }} />
              
              {/* Laser animation */}
              <div className="scan-line" />
            </div>
          )}

          {/* Alerts rendering overlay inside camera screen */}
          {renderCameraContent()}
        </div>

        {cameraState === 'active' && (
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.75rem 0', margin: 0 }}>
            Position course code QR directly in center of frame
          </p>
        )}
      </div>

      {/* Manual Paste token panel */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardList size={16} style={{ color: 'var(--text-muted)' }} />
          <span>Manual Signature Override</span>
        </h3>
        
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            className="input-field"
            style={{ flex: 1, marginBottom: 0 }}
            placeholder="Paste token string here..."
            value={manualToken}
            onChange={e => setManualToken(e.target.value)}
            disabled={loading || sessionExpired}
          />
          <button 
            type="submit" 
            className="btn" 
            disabled={loading || !manualToken || sessionExpired}
            style={{ padding: '0.75rem 1.5rem', whiteSpace: 'nowrap' }}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Signing...</span>
              </>
            ) : (
              <span>Sign Session</span>
            )}
          </button>
        </form>
      </div>

      <style>{`
        .scrolling-ping {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: camera-ping 1.4s infinite;
        }
        .live-success-pulse {
          animation: success-pulse 2s infinite ease-in-out;
        }
        @keyframes camera-ping {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 5px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
        @keyframes success-pulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 0px var(--success-glow)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 8px var(--success)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0px var(--success-glow)); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

export default QRScanner;
