import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  User, 
  AlertOctagon, 
  RotateCcw,
  CheckCircle,
  Phone,
  CreditCard,
  BellRing,
  Heart,
  Activity,
  AlertTriangle,
  Pill,
  Save,
  QrCode,
  Clock,
  ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { API_BASE_URL, PC_IP, BACKEND_PORT } from '../config';

export default function OwnerPortal() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  // Profile Form state (user enters all details)
  const [fullName, setFullName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [healthCondition, setHealthCondition] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicines, setMedicines] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [trustedContact, setTrustedContact] = useState('');

  // Active Profile & Device state
  const [profile, setProfile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionLogs, setActionLogs] = useState([]);

  // Live QR state
  const [qrToken, setQrToken] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [qrExpiresIn, setQrExpiresIn] = useState(300);
  const [generatingQr, setGeneratingQr] = useState(false);

  // Auto-fill password according to hackathon rule: mobile + "1234"
  const handleMobileChange = (e) => {
    const val = e.target.value.trim();
    setMobile(val);
    setPassword(val ? val + '1234' : '');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!mobile) {
      setAuthError('Please enter your mobile number.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || 'Authentication failed. Please verify credentials.');
      } else {
        setIsLoggedIn(true);
        await loadProfile(data.mobile);
      }
    } catch (err) {
      console.error(err);
      setAuthError('Unable to connect to backend server. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (targetMobile) => {
    try {
      const res = await fetch(`${API_BASE_URL}/emergency-profile/${encodeURIComponent(targetMobile)}`);
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        // Fill form fields with user's saved data if present
        setFullName(data.profile.fullName || '');
        setBloodGroup(data.profile.bloodGroup || 'O+');
        setHealthCondition(data.profile.medicalCondition || '');
        setAllergies(data.profile.allergies || '');
        setMedicines(data.profile.medicines || '');
        setEmergencyContact(data.profile.emergencyContact || '');
        setTrustedContact(data.profile.trustedContact || '');

        // If profile has data and device not missing, auto generate QR
        if (data.profile.fullName && !data.profile.missingMode) {
          generateQrSession(targetMobile);
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Please enter your full name.');
      return;
    }
    if (!healthCondition.trim()) {
      alert('Please enter your health / medical condition (or "None").');
      return;
    }
    if (!emergencyContact.trim()) {
      alert('Please enter an emergency contact number.');
      return;
    }

    setLoading(true);
    setActionSuccess('');

    try {
      const payload = {
        mobile,
        fullName: fullName.trim(),
        bloodGroup,
        medicalCondition: healthCondition.trim(),
        allergies: allergies.trim(),
        medicines: medicines.trim(),
        emergencyContact: emergencyContact.trim(),
        trustedContact: trustedContact.trim(),
        emergencyQrEnabled: true,
        missingMode: false
      };

      const res = await fetch(`${API_BASE_URL}/emergency-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.profile);
        setActionSuccess('Medical profile saved! Generating updated emergency QR code...');
        await generateQrSession(mobile);
      } else {
        alert(data.error || 'Failed to save emergency profile.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const generateQrSession = async (targetMobile) => {
    setGeneratingQr(true);
    try {
      const res = await fetch(`${API_BASE_URL}/qr-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: targetMobile })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setQrToken(data.token);
        setQrExpiresIn(data.expiresInSeconds || 300);
        const origin = typeof window !== 'undefined' ? window.location.origin : `http://${PC_IP}:3000`;
        const fullUrl = `${origin}/?token=${data.token}`;
        setQrUrl(fullUrl);
      }
    } catch (err) {
      console.error('Failed to generate QR session:', err);
    } finally {
      setGeneratingQr(false);
    }
  };

  // 5-minute countdown for web QR preview
  useEffect(() => {
    if (!qrToken || qrExpiresIn <= 0) return;

    const timer = setInterval(() => {
      setQrExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto rotate if active
          if (profile && !profile.missingMode) {
            generateQrSession(mobile);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [qrToken, qrExpiresIn, profile?.missingMode]);

  const handleReportMissing = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/report-missing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        setActionSuccess('Phone successfully reported missing! All emergency access & QR revoked.');
        setActionLogs(data.actions || []);
        setQrToken('');
        setQrUrl('');
        loadProfile(mobile);
      } else {
        alert(data.error || 'Failed to report missing.');
      }
    } catch (err) {
      console.error(err);
      alert('Error contacting backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreDevice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/restore-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess('Device restored! Emergency QR is reactivated.');
        setActionLogs([`Device ${mobile} returned to active verified status.`]);
        await loadProfile(mobile);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Render Login Screen if not logged in
  // -------------------------------------------------------------
  if (!isLoggedIn) {
    return (
      <div className="main-content" style={{ maxWidth: '460px' }}>
        <div className="page-header">
          <div className="emergency-pill" style={{ borderColor: 'rgba(59, 130, 246, 0.4)', color: '#93c5fd' }}>
            Owner Setup & Security Portal
          </div>
          <h1 className="page-title" style={{ fontSize: '1.85rem' }}>Owner Login</h1>
          <p className="page-subtitle">Enter your mobile number to set up your profile and manage anti-theft lockdown</p>
        </div>

        <div className="card">
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Enter Mobile Number</label>
              <input
                type="tel"
                className="input-field"
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={handleMobileChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Password <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(Auto-calculated: mobile + 1234)</span>
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {authError && (
              <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '14px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                {authError}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              <Lock size={18} /> {loading ? 'Signing In...' : 'Sign In / Open Setup'}
            </button>

            <div style={{ marginTop: '16px', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Password must be exactly <code>mobileNumber + "1234"</code>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render Dashboard & Profile Setup Form
  // -------------------------------------------------------------
  const isMissing = profile?.missingMode === true;
  const isQrActive = profile?.emergencyQrEnabled === true && !isMissing;

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="main-content">
      {/* Dashboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Owner Emergency Setup & Security</h1>
          <p className="page-subtitle">Configure your personal health details, generate emergency QR, and control anti-theft lockdown</p>
        </div>
        <button 
          onClick={() => setIsLoggedIn(false)} 
          className="btn-outline" 
          style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Sign Out ({mobile})
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div style={{ 
          background: isMissing ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
          border: `1px solid ${isMissing ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
          padding: '16px 20px', 
          borderRadius: '12px', 
          marginBottom: '24px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', color: isMissing ? '#f87171' : '#34d399' }}>
            <CheckCircle size={20} /> {actionSuccess}
          </div>
        </div>
      )}

      {/* Status Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Device Information */}
        <div className="card" style={{ padding: '20px' }}>
          <span className="info-label"><Smartphone size={16} /> Device Information</span>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', marginTop: '6px' }}>
            EMLAY Protected Phone
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Registered Mobile: {mobile}
          </div>
        </div>

        {/* Device Security Status */}
        <div className="card" style={{ padding: '20px' }}>
          <span className="info-label"><ShieldAlert size={16} /> Security Mode</span>
          <div style={{ marginTop: '8px' }}>
            {isMissing ? (
              <span className="status-pill status-missing">
                <AlertOctagon size={14} /> REPORTED MISSING / LOCKED
              </span>
            ) : (
              <span className="status-pill status-active">
                <ShieldCheck size={14} /> NORMAL & ACTIVE
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            {isMissing ? 'Emergency QR disabled. UPI apps protected.' : 'Emergency profile ready for first responders.'}
          </div>
        </div>

        {/* Emergency QR Status */}
        <div className="card" style={{ padding: '20px' }}>
          <span className="info-label"><KeyRound size={16} /> Emergency QR Status</span>
          <div style={{ marginTop: '8px' }}>
            <span className={`status-pill ${isQrActive ? 'status-active' : 'status-missing'}`}>
              {isQrActive ? 'ACTIVE & ROTATING' : 'REVOKED / DISABLED'}
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            {isQrActive ? '5-minute rotating token active.' : 'Bystander access is blocked.'}
          </div>
        </div>
      </div>

      {/* Grid: Left = Health Form, Right = Summary & QR Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* 1. Enter Your Emergency & Health Details Form */}
        <div className="card card-emergency-border">
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart color="#ef4444" size={22} /> Enter Your Health & Emergency Details
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
            Enter your medical information below. The rotating QR code will be generated from these exact details.
          </p>

          <form onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Blood Group *</label>
              <select
                className="input-field"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#f87171', fontWeight: '700' }}>
                Medical / Health Condition * (Given by You)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Asthma, Diabetic Type 2, Hypertension, Heart Pacemaker, None"
                value={healthCondition}
                onChange={(e) => setHealthCondition(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Known Allergies</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Penicillin, Peanuts, Sulfa, Dust, None"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Medicines</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Inhaler, Metformin 500mg, Aspirin"
                value={medicines}
                onChange={(e) => setMedicines(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Emergency Contact Number *</label>
              <input
                type="tel"
                className="input-field"
                placeholder="e.g. +91 9876543210"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Trusted Contact (Optional)</label>
              <input
                type="tel"
                className="input-field"
                placeholder="e.g. +91 9123456780"
                value={trustedContact}
                onChange={(e) => setTrustedContact(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
              <Save size={18} /> {loading ? 'Saving to Firestore...' : 'Save Profile & Generate QR'}
            </button>
          </form>
        </div>

        {/* 2. QR Code Preview & Medical Summary Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Live Rotating Emergency QR Card */}
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <QrCode size={20} color="#ef4444" /> Live Generated Emergency QR
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Generated from the health details you entered above
            </p>

            {isMissing ? (
              <div style={{ padding: '30px 16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <ShieldAlert size={48} color="#ef4444" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontWeight: '800', color: '#f87171', fontSize: '1.1rem' }}>Emergency Access Disabled</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>This device is marked missing. QR is deactivated.</div>
              </div>
            ) : qrUrl ? (
              <div>
                <div style={{ display: 'inline-block', padding: '14px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', position: 'relative' }}>
                  <QRCodeSVG value={qrUrl} size={190} level="M" />
                </div>

                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#f87171', fontWeight: '700', fontSize: '0.9rem' }}>
                  <Clock size={16} /> Token auto-rotates in: <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>{formatCountdown(qrExpiresIn)}</span>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', fontSize: '0.88rem', textDecoration: 'none' }}>
                    <ExternalLink size={16} /> Open & Test Scanned Responder Page
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ padding: '36px 16px', color: 'var(--text-muted)' }}>
                <Activity size={36} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                <div>Fill in your details and click "Save Profile & Generate QR" above to generate your live emergency QR.</div>
              </div>
            )}
          </div>

          {/* Registered Medical Profile Summary with Health Condition */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '14px' }}>
              Registered Medical Profile Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div className="info-box">
                <span className="info-label"><User size={12} /> Full Name</span>
                <span className="info-value" style={{ fontSize: '1rem' }}>{profile?.fullName || 'Not entered yet'}</span>
              </div>

              <div className="info-box">
                <span className="info-label"><Heart size={12} color="#ef4444" /> Blood Group</span>
                <span className="info-value" style={{ fontSize: '1rem', color: '#ef4444' }}>{profile?.bloodGroup || 'Not entered'}</span>
              </div>

              {/* HEALTH CONDITION - Explicitly highlighted */}
              <div className="info-box" style={{ gridColumn: 'span 2', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <span className="info-label" style={{ color: '#f87171' }}>
                  <Activity size={12} /> Health / Medical Condition
                </span>
                <span className="info-value" style={{ fontSize: '1.05rem', color: '#ffffff' }}>
                  {profile?.medicalCondition || 'None reported'}
                </span>
              </div>

              <div className="info-box">
                <span className="info-label"><AlertTriangle size={12} color="#f59e0b" /> Allergies</span>
                <span className="info-value" style={{ fontSize: '0.95rem' }}>{profile?.allergies || 'None'}</span>
              </div>

              <div className="info-box">
                <span className="info-label"><Pill size={12} color="#10b981" /> Medicines</span>
                <span className="info-value" style={{ fontSize: '0.95rem' }}>{profile?.medicines || 'None'}</span>
              </div>

              <div className="info-box">
                <span className="info-label"><Phone size={12} /> Emergency Contact</span>
                <span className="info-value" style={{ fontSize: '0.95rem' }}>{profile?.emergencyContact || 'Not entered'}</span>
              </div>

              <div className="info-box">
                <span className="info-label"><Phone size={12} /> Trusted Contact</span>
                <span className="info-value" style={{ fontSize: '0.95rem' }}>{profile?.trustedContact || 'None'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Remote Anti-Theft & Lockdown Zone */}
      <div className="card card-emergency-border" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertOctagon color="#ef4444" size={24} /> Remote Anti-Theft & Lockdown Zone
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.95rem' }}>
          If your smartphone is lost, stolen, or misplaced, trigger lockdown immediately to protect your personal identity and UPI digital banking apps.
        </p>

        {!isMissing ? (
          <button 
            onClick={() => setShowModal(true)} 
            className="btn-primary btn-danger"
            style={{ padding: '16px 28px', fontSize: '1.1rem', maxWidth: '340px' }}
          >
            <ShieldAlert size={22} /> Report Phone Missing
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              onClick={handleRestoreDevice} 
              className="btn-primary" 
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', width: 'auto', padding: '12px 24px' }}
              disabled={loading}
            >
              <RotateCcw size={18} /> Restore / Unfreeze Device
            </button>
            <span style={{ fontSize: '0.9rem', color: '#fca5a5' }}>
              Device is currently locked in Missing Mode. All responder access is disabled.
            </span>
          </div>
        )}

        {/* Action Logs */}
        {actionLogs.length > 0 && (
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '18px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Execution Protection Audit Log
            </div>
            {actionLogs.map((log, i) => (
              <div key={i} className="log-item">
                <CheckCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{log}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444', marginBottom: '16px' }}>
              <ShieldAlert size={32} />
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Confirm Report Missing</h2>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '18px', fontSize: '0.95rem' }}>
              Reporting your device as missing will immediately execute the following security measures:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <KeyRound size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Revoke Emergency QR</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Invalidates all active tokens so no medical data or phone info is exposed to thieves.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <CreditCard size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Trigger Mock UPI Protection</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Freezes digital payments (Google Pay, PhonePe, Paytm) to prevent unauthorized transactions.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <BellRing size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Alert Emergency Contacts</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Dispatches automated distress alert to your emergency and trusted contacts.</div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                onClick={() => setShowModal(false)} 
                className="btn-outline" 
                style={{ flex: 1, padding: '12px' }}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={handleReportMissing} 
                className="btn-primary btn-danger" 
                style={{ flex: 1, padding: '12px' }}
                disabled={loading}
              >
                {loading ? 'Executing...' : 'Confirm & Lock Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
