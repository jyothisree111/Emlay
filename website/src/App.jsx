import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Smartphone, 
  HeartPulse, 
  AlertTriangle, 
  QrCode, 
  X, 
  Clock, 
  ExternalLink,
  ShieldCheck,
  PhoneCall
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import ResponderPage from './pages/ResponderPage';
import OwnerPortal from './pages/OwnerPortal';
import { API_BASE_URL, PC_IP } from './config';

export default function App() {
  const [currentTab, setCurrentTab] = useState('responder');
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [qrExpiresIn, setQrExpiresIn] = useState(300);
  const [loadingQr, setLoadingQr] = useState(false);

  useEffect(() => {
    // Check initial path
    const path = window.location.pathname;
    if (path.includes('owner')) {
      setCurrentTab('owner');
    } else {
      setCurrentTab('responder');
    }

    const onPopState = () => {
      if (window.location.pathname.includes('owner')) {
        setCurrentTab('owner');
      } else {
        setCurrentTab('responder');
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = (tab) => {
    setCurrentTab(tab);
    const newPath = tab === 'owner' ? '/owner' : '/';
    window.history.pushState(null, '', newPath);
  };

  // Triggered when user clicks the Notification Bar
  const handleNotificationBarClick = async () => {
    setShowQrModal(true);
    setLoadingQr(true);

    try {
      // Create fresh QR session from default registered demo mobile (or last saved)
      const res = await fetch(`${API_BASE_URL}/qr-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '8520981975' })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setQrToken(data.token);
        setQrExpiresIn(data.expiresInSeconds || 300);

        const host = typeof window !== 'undefined' ? window.location.hostname : PC_IP;
        const port = typeof window !== 'undefined' ? window.location.port : '3000';
        const fullUrl = `http://${host}${port ? ':' + port : ''}/?token=${data.token}`;
        setQrUrl(fullUrl);
      }
    } catch (err) {
      console.error('Failed to generate QR on notification bar tap:', err);
    } finally {
      setLoadingQr(false);
    }
  };

  // QR Countdown
  useEffect(() => {
    if (!showQrModal || qrExpiresIn <= 0) return;

    const interval = setInterval(() => {
      setQrExpiresIn((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [showQrModal, qrExpiresIn]);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      {/* ======================================================== */}
      {/* TOP EMERGENCY NOTIFICATION BAR (Click to show QR)       */}
      {/* ======================================================== */}
      <div 
        className="emergency-notification-bar" 
        onClick={handleNotificationBarClick}
        title="Click this notification bar to open Emergency QR"
      >
        <div className="notif-content">
          <span className="notif-badge">
            <span className="pulse-dot" style={{ width: '6px', height: '6px' }}></span>
            ACTIVE
          </span>
          <span className="notif-text">🚨 EMLAY Emergency ID active</span>
          <span className="notif-subtext">• Tap notification bar to display Emergency QR</span>
        </div>
        <div className="notif-cta">
          <QrCode size={15} />
          <span>TAP FOR QR ➔</span>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="navbar">
        <a href="/" className="brand" onClick={(e) => { e.preventDefault(); navigateTo('responder'); }}>
          <div className="brand-icon">
            <Shield size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-name">EMLAY</span>
              <span className="brand-tag">v1.0</span>
            </div>
          </div>
        </a>

        <div className="nav-links">
          <button 
            className={`nav-button ${currentTab === 'responder' ? 'active' : ''}`}
            onClick={() => navigateTo('responder')}
          >
            <HeartPulse size={18} />
            <span>Responder View</span>
          </button>

          <button 
            className={`nav-button ${currentTab === 'owner' ? 'active' : ''}`}
            onClick={() => navigateTo('owner')}
          >
            <Smartphone size={18} />
            <span>Owner Portal</span>
          </button>
        </div>
      </nav>

      {/* Dynamic View Rendering */}
      {currentTab === 'responder' ? <ResponderPage /> : <OwnerPortal />}

      {/* ======================================================== */}
      {/* MODAL: QR CODE DISPLAYED ON NOTIFICATION BAR CLICK      */}
      {/* ======================================================== */}
      {showQrModal && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '800', fontSize: '1.2rem' }}>
                <QrCode size={24} /> Emergency Medical QR
              </div>
              <button 
                onClick={() => setShowQrModal(false)}
                className="btn-outline" 
                style={{ padding: '6px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Scan this QR code with any smartphone camera to open the emergency health profile
            </p>

            {loadingQr ? (
              <div style={{ padding: '40px 0', color: 'var(--text-muted)' }}>
                Generating dynamic 5-minute emergency token...
              </div>
            ) : qrUrl ? (
              <div>
                {/* QR Container */}
                <div style={{ 
                  display: 'inline-block', 
                  padding: '16px', 
                  background: '#ffffff', 
                  borderRadius: '16px', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)' 
                }}>
                  <QRCodeSVG value={qrUrl} size={220} level="M" />
                </div>

                {/* Expiry Countdown */}
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#f87171', fontWeight: '700', fontSize: '0.9rem' }}>
                  <Clock size={16} /> Token auto-rotates in: <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>{formatCountdown(qrExpiresIn)}</span>
                </div>

                {/* Direct Action Link */}
                <div style={{ marginTop: '20px' }}>
                  <a 
                    href={qrUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-primary"
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <ExternalLink size={18} /> Open Scanned Medical Details
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ color: '#f87171', padding: '20px' }}>
                Unable to generate QR. Please ensure backend server is running.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ 
        textAlign: 'center', 
        padding: '24px 20px', 
        color: 'var(--text-muted)', 
        fontSize: '0.85rem', 
        borderTop: '1px solid var(--border-subtle)',
        marginTop: 'auto'
      }}>
        EMLAY &copy; 2026 Emergency Layer & Rapid Response Infrastructure • Built for Hackathon
      </footer>
    </div>
  );
}
