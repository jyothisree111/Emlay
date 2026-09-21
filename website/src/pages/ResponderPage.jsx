import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  AlertTriangle, 
  Pill, 
  Activity, 
  PhoneCall, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  RefreshCw,
  User
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function ResponderPage() {
  const [token, setToken] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Extract token from URL query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token');
    if (queryToken) {
      setToken(queryToken);
      fetchResponderData(queryToken);
    } else {
      setLoading(false);
      setError('No emergency session token provided. Please scan a valid EMLAY Emergency QR code.');
    }
  }, []);

  // Countdown timer for session expiration
  useEffect(() => {
    if (!profile?.expiresAt) return;

    const interval = setInterval(() => {
      const remainingMs = new Date(profile.expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeRemaining('Expired');
        setError('This emergency QR session has expired.');
        setProfile(null);
        clearInterval(interval);
      } else {
        const totalSeconds = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        setTimeRemaining(`${mins.toString().padLeft ? mins.toString().padStart(2, '0') : mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [profile?.expiresAt]);

  const fetchResponderData = async (sessionToken) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/responder/${encodeURIComponent(sessionToken)}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'This emergency QR is currently unavailable.');
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Unable to reach emergency server. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      {/* Page Header */}
      <div className="page-header">
        <div className="emergency-pill">
          <span className="pulse-dot"></span>
          EMLAY Emergency Responder Mode
        </div>
        <h1 className="page-title">EMLAY Emergency Profile</h1>
        <p className="page-subtitle">
          Critical medical identity presented for first responders and bystanders
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card unavailable-card">
          <RefreshCw className="unavailable-icon" style={{ animation: 'spin 1.5s linear infinite' }} />
          <h2 className="unavailable-title">Verifying Emergency Token...</h2>
          <p className="unavailable-desc">
            Decrypting time-bound emergency health profile...
          </p>
        </div>
      )}

      {/* Error / Unavailable / Missing State */}
      {!loading && error && (
        <div className="card unavailable-card card-emergency-border">
          <div className="unavailable-icon">
            <ShieldAlert size={36} />
          </div>
          <h2 className="unavailable-title">
            This emergency QR is currently unavailable.
          </h2>
          <p className="unavailable-desc">
            {error.includes('disabled') || error.includes('unavailable') 
              ? 'Access has been suspended by the device owner, or the device was reported missing.'
              : error}
          </p>
          {token && (
            <div style={{ marginTop: '24px' }}>
              <button 
                onClick={() => fetchResponderData(token)} 
                className="btn-primary" 
                style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}
              >
                <RefreshCw size={16} /> Retry Verification
              </button>
            </div>
          )}
        </div>
      )}

      {/* Valid Emergency Profile State */}
      {!loading && profile && (
        <div className="card card-emergency-border">
          {/* Top meta strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="status-pill status-active">
                <CheckCircle2 size={14} /> Active Emergency ID
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Session: {token.slice(0, 10)}...
              </span>
            </div>

            {timeRemaining && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: '700', fontSize: '0.9rem' }}>
                <Clock size={16} /> Token expires in: <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>{timeRemaining}</span>
              </div>
            )}
          </div>

          {/* Primary Profile Grid */}
          <div className="medical-grid">
            {/* Full Name */}
            <div className="info-box">
              <span className="info-label">
                <User size={14} /> Full Name
              </span>
              <span className="info-value">
                {profile.fullName || 'Not provided'}
              </span>
            </div>

            {/* Blood Group */}
            <div className="info-box" style={{ gridRow: 'span 2' }}>
              <span className="info-label">
                <Heart size={14} color="#ef4444" /> Blood Group
              </span>
              <div style={{ margin: 'auto 0' }}>
                <div className="blood-badge">
                  {profile.bloodGroup || 'Unknown'}
                </div>
              </div>
            </div>

            {/* Medical Condition */}
            <div className="info-box">
              <span className="info-label">
                <Activity size={14} color="#3b82f6" /> Medical Condition
              </span>
              <span className={`info-value ${!profile.medicalCondition ? 'empty' : ''}`}>
                {profile.medicalCondition || 'None reported'}
              </span>
            </div>

            {/* Allergies */}
            <div className="info-box">
              <span className="info-label">
                <AlertTriangle size={14} color="#f59e0b" /> Known Allergies
              </span>
              <div style={{ marginTop: '4px' }}>
                {profile.allergies ? (
                  profile.allergies.split(',').map((allergy, index) => (
                    <span key={index} className="tag-chip">
                      {allergy.trim()}
                    </span>
                  ))
                ) : (
                  <span className="info-value empty">None reported</span>
                )}
              </div>
            </div>

            {/* Medicines */}
            <div className="info-box">
              <span className="info-label">
                <Pill size={14} color="#10b981" /> Current Medicines
              </span>
              <span className={`info-value ${!profile.medicines ? 'empty' : ''}`}>
                {profile.medicines || 'None reported'}
              </span>
            </div>
          </div>

          {/* Emergency Contact Action */}
          <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
            <span className="info-label" style={{ marginBottom: '8px', display: 'block' }}>
              Primary Emergency Contact
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>
              {profile.emergencyContact || 'Not provided'}
            </div>

            {profile.emergencyContact && (
              <a href={`tel:${profile.emergencyContact.replace(/[^0-9+]/g, '')}`} className="call-btn">
                <PhoneCall size={24} /> Call Emergency Contact ({profile.emergencyContact})
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
