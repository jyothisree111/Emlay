const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const config = require('./config');
const db = require('./db');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ============================================================
// 1. AUTH API
// ============================================================
// POST /api/auth/login
// Body: { mobile, password }
// Validate: password === mobile + "1234"
app.post('/api/auth/login', async (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return res.status(400).json({
      success: false,
      error: 'Mobile number and password are required.'
    });
  }

  const cleanMobile = String(mobile).trim();
  const cleanPassword = String(password).trim();
  const expectedPassword = cleanMobile + '1234';

  if (cleanPassword !== expectedPassword) {
    return res.status(401).json({
      success: false,
      error: 'Invalid password. Password must be mobileNumber + "1234".'
    });
  }

  // Check if profile exists, if not initialize with default empty values
  let profile = await db.getProfile(cleanMobile);
  if (!profile) {
    profile = await db.saveProfile(cleanMobile, {
      fullName: '',
      bloodGroup: '',
      allergies: '',
      medicines: '',
      medicalCondition: '',
      emergencyContact: '',
      emergencyQrEnabled: true,
      missingMode: false
    });
  }

  return res.json({
    success: true,
    mobile: cleanMobile,
    profile
  });
});

// ============================================================
// 2. EMERGENCY PROFILE APIS
// ============================================================
// POST /api/emergency-profile
// Body: { mobile, fullName, bloodGroup, allergies, medicines, medicalCondition, emergencyContact }
app.post('/api/emergency-profile', async (req, res) => {
  const {
    mobile,
    fullName,
    bloodGroup,
    allergies,
    medicines,
    medicalCondition,
    emergencyContact,
    trustedContact,
    emergencyQrEnabled
  } = req.body;

  if (!mobile) {
    return res.status(400).json({
      success: false,
      error: 'Mobile number is required.'
    });
  }

  const cleanMobile = String(mobile).trim();

  // Save to Firestore emergencyProfiles/{mobile}
  // Setting emergencyQrEnabled: true, missingMode: false
  const updatedProfile = await db.saveProfile(cleanMobile, {
    fullName: fullName || '',
    bloodGroup: bloodGroup || '',
    allergies: allergies || '',
    medicines: medicines || '',
    medicalCondition: medicalCondition || '',
    emergencyContact: emergencyContact || '',
    trustedContact: trustedContact || '',
    emergencyQrEnabled: emergencyQrEnabled !== undefined ? Boolean(emergencyQrEnabled) : true,
    missingMode: false
  });

  console.log(`[Profile] Saved profile for mobile: ${cleanMobile}`);

  return res.json({
    success: true,
    profile: updatedProfile
  });
});

// GET /api/emergency-profile/:mobile
app.get('/api/emergency-profile/:mobile', async (req, res) => {
  const { mobile } = req.params;
  const cleanMobile = String(mobile).trim();

  const profile = await db.getProfile(cleanMobile);
  if (!profile) {
    return res.status(404).json({
      success: false,
      error: 'Emergency profile not found.'
    });
  }

  return res.json({
    success: true,
    profile
  });
});

// ============================================================
// 3. QR SESSION APIS
// ============================================================
// POST /api/qr-session
// Body: { mobile }
// Creates a 5-minute rotating token
app.post('/api/qr-session', async (req, res) => {
  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({
      success: false,
      error: 'Mobile number is required to generate a QR session.'
    });
  }

  const cleanMobile = String(mobile).trim();
  const profile = await db.getProfile(cleanMobile);

  if (profile && (profile.missingMode === true || profile.emergencyQrEnabled === false)) {
    return res.status(403).json({
      success: false,
      error: 'Emergency access is currently disabled for this device.'
    });
  }

  // Generate random token string
  const token = 'EMLAY-' + crypto.randomBytes(12).toString('hex');
  const now = Date.now();
  const expiresAt = new Date(now + config.QR_TOKEN_EXPIRY_SECONDS * 1000).toISOString();

  await db.saveQrSession(token, {
    token,
    mobile: cleanMobile,
    expiresAt,
    active: true
  });

  const qrUrl = `${config.RESPONDER_BASE_URL}/?token=${token}`;

  console.log(`[QR Session] Created token: ${token} for ${cleanMobile} (Expires in 5m)`);

  return res.json({
    success: true,
    token,
    expiresInSeconds: config.QR_TOKEN_EXPIRY_SECONDS,
    expiresAt,
    qrUrl
  });
});

// GET /api/responder/:token
// Validates token & returns strictly public emergency info
app.get('/api/responder/:token', async (req, res) => {
  const { token } = req.params;
  const session = await db.getQrSession(token);

  if (!session) {
    return res.status(404).json({
      error: 'Emergency access is currently disabled.'
    });
  }

  // Check expiration
  const isExpired = new Date(session.expiresAt).getTime() <= Date.now();
  if (isExpired || !session.active) {
    return res.status(403).json({
      error: 'Emergency access is currently disabled.'
    });
  }

  // Check emergency profile status
  const profile = await db.getProfile(session.mobile);
  if (!profile) {
    return res.status(404).json({
      error: 'Emergency access is currently disabled.'
    });
  }

  if (profile.missingMode === true || profile.emergencyQrEnabled === false) {
    return res.status(403).json({
      error: 'Emergency access is currently disabled.'
    });
  }

  // Return strictly needed medical details (no private passwords or internal credentials)
  return res.json({
    fullName: profile.fullName || 'Not provided',
    bloodGroup: profile.bloodGroup || 'Not provided',
    allergies: profile.allergies || 'None reported',
    medicines: profile.medicines || 'None reported',
    medicalCondition: profile.medicalCondition || 'None reported',
    emergencyContact: profile.emergencyContact || 'Not provided',
    expiresAt: session.expiresAt
  });
});

// ============================================================
// 4. REPORT MISSING API
// ============================================================
// POST /api/report-missing
// Body: { mobile }
// Sets missingMode: true, emergencyQrEnabled: false, revokes tokens, logs mock protections
app.post('/api/report-missing', async (req, res) => {
  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({
      success: false,
      error: 'Mobile number is required.'
    });
  }

  const cleanMobile = String(mobile).trim();

  // Set missingMode: true, emergencyQrEnabled: false
  const updatedProfile = await db.updateProfile(cleanMobile, {
    missingMode: true,
    emergencyQrEnabled: false
  });

  // Deactivate all active QR sessions
  await db.deactivateSessionsForMobile(cleanMobile);

  const mockActions = [
    `Emergency QR revoked for ${cleanMobile}. All responder tokens immediately invalidated.`,
    `[Mock UPI Protection] Digital banking apps locked: GPay, PhonePe, and Paytm transaction lock triggered.`,
    `[Mock Contact Alert] Emergency SMS broadcast dispatched to trusted contact: ${updatedProfile.emergencyContact || updatedProfile.trustedContact || 'registered contact'}.`
  ];

  console.log(`\n================== [SECURITY ALERT] ==================`);
  console.log(`[Device Missing] Phone reported missing: ${cleanMobile}`);
  mockActions.forEach(action => console.log(`  -> ${action}`));
  console.log(`======================================================\n`);

  return res.json({
    success: true,
    message: 'Device reported missing. Emergency QR disabled, UPI payments protected, emergency contact alerted.',
    actions: mockActions,
    profile: updatedProfile
  });
});

// POST /api/restore-device
// Helper to unfreeze / restore device during testing
app.post('/api/restore-device', async (req, res) => {
  const { mobile } = req.body;
  if (!mobile) {
    return res.status(400).json({ success: false, error: 'Mobile number required' });
  }

  const cleanMobile = String(mobile).trim();
  const restoredProfile = await db.updateProfile(cleanMobile, {
    missingMode: false,
    emergencyQrEnabled: true
  });

  console.log(`[Device Restored] Device ${cleanMobile} marked active again.`);

  return res.json({
    success: true,
    message: 'Device restored to normal status.',
    profile: restoredProfile
  });
});

// Health check and environment info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EMLAY Backend',
    pcIp: config.PC_IP,
    port: config.PORT,
    responderBaseUrl: config.RESPONDER_BASE_URL,
    isUsingFirestore: db.isUsingFirestore(),
    time: new Date().toISOString()
  });
});

// Root API info endpoint
app.get(['/', '/api'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'EMLAY Emergency API',
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

// Start Server if not running in serverless environment (e.g. Vercel)
let server = null;
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  server = app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`
======================================================
  EMLAY Backend Server Running!
  Local:       http://localhost:${config.PORT}
  Network:     http://${config.PC_IP}:${config.PORT}
  Responder:   ${config.RESPONDER_BASE_URL}
  Database:    ${db.isUsingFirestore() ? 'Firebase Firestore (Cloud)' : 'Local High-Speed In-Memory Adapter'}
======================================================
    `);
  });
}

module.exports = { app, server };
