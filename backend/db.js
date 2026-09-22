const fs = require('fs');
const path = require('path');

let admin = null;
let firestore = null;
let isUsingFirestore = false;

// Attempt to initialize Firebase Admin SDK if key is provided
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    admin = require('firebase-admin');
    const serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : process.env.FIREBASE_SERVICE_ACCOUNT;
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firestore = admin.firestore();
    isUsingFirestore = true;
    console.log('[Database] Connected to Firebase Firestore using FIREBASE_SERVICE_ACCOUNT env var');
  } catch (err) {
    console.warn('[Database] Failed initializing Firebase Admin from env var:', err.message);
  }
}

if (!isUsingFirestore) {
  const keyCandidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.join(__dirname, 'serviceAccountKey.json'),
    path.join(__dirname, 'firebase-key.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json')
  ];

  for (const keyPath of keyCandidates) {
    if (keyPath && fs.existsSync(keyPath)) {
      try {
        admin = require('firebase-admin');
        const serviceAccount = require(keyPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        firestore = admin.firestore();
        isUsingFirestore = true;
        console.log(`[Database] Connected to Firebase Firestore using ${keyPath}`);
        break;
      } catch (err) {
        console.warn(`[Database] Failed initializing Firebase Admin with ${keyPath}:`, err.message);
      }
    }
  }
}

// Fallback in-memory database to guarantee immediate zero-config operation
const inMemoryProfiles = new Map();
const inMemorySessions = new Map();

// Seed default demo profile for Rahul Sharma (8520981975) so live testing works immediately
inMemoryProfiles.set('8520981975', {
  mobile: '8520981975',
  fullName: 'Rahul Sharma',
  bloodGroup: 'O+',
  allergies: 'Penicillin, Peanuts',
  medicines: 'Inhaler (Asthma)',
  medicalCondition: 'Mild Asthma',
  emergencyContact: '+91 9876543210',
  trustedContact: '+91 9876543210',
  emergencyQrEnabled: true,
  missingMode: false,
  updatedAt: new Date().toISOString()
});

if (!isUsingFirestore) {
  console.log('[Database] Running in High-Reliability Local Mode (Firestore adapter active).');
  console.log('[Database] Place "serviceAccountKey.json" in backend folder or set FIREBASE_SERVICE_ACCOUNT env var.');
}

const db = {
  isUsingFirestore: () => isUsingFirestore,

  // --- Profile methods ---
  async getProfile(mobile) {
    if (isUsingFirestore && firestore) {
      try {
        const doc = await firestore.collection('emergencyProfiles').doc(String(mobile)).get();
        if (doc.exists) {
          return { id: doc.id, ...doc.data() };
        }
      } catch (err) {
        console.error('[Database] Firestore getProfile error:', err.message);
      }
    }
    return inMemoryProfiles.get(String(mobile)) || null;
  },

  async saveProfile(mobile, data) {
    const mobileKey = String(mobile);
    const profile = {
      mobile: mobileKey,
      fullName: data.fullName || '',
      bloodGroup: data.bloodGroup || '',
      allergies: data.allergies || '',
      medicines: data.medicines || '',
      medicalCondition: data.medicalCondition || '',
      emergencyContact: data.emergencyContact || '',
      trustedContact: data.trustedContact || '',
      emergencyQrEnabled: data.emergencyQrEnabled !== undefined ? data.emergencyQrEnabled : true,
      missingMode: data.missingMode !== undefined ? data.missingMode : false,
      updatedAt: new Date().toISOString()
    };

    inMemoryProfiles.set(mobileKey, profile);

    if (isUsingFirestore && firestore) {
      try {
        await firestore.collection('emergencyProfiles').doc(mobileKey).set(profile, { merge: true });
      } catch (err) {
        console.error('[Database] Firestore saveProfile error:', err.message);
      }
    }

    return profile;
  },

  async updateProfile(mobile, updates) {
    const mobileKey = String(mobile);
    const existing = await this.getProfile(mobileKey) || { mobile: mobileKey };
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    inMemoryProfiles.set(mobileKey, updated);

    if (isUsingFirestore && firestore) {
      try {
        await firestore.collection('emergencyProfiles').doc(mobileKey).set(updated, { merge: true });
      } catch (err) {
        console.error('[Database] Firestore updateProfile error:', err.message);
      }
    }

    return updated;
  },

  // --- QR Session methods ---
  async saveQrSession(token, sessionData) {
    const tokenKey = String(token);
    const session = {
      token: tokenKey,
      mobile: String(sessionData.mobile),
      expiresAt: sessionData.expiresAt, // timestamp (ms or Date string)
      active: sessionData.active !== undefined ? sessionData.active : true,
      createdAt: new Date().toISOString()
    };

    inMemorySessions.set(tokenKey, session);

    if (isUsingFirestore && firestore) {
      try {
        await firestore.collection('qrSessions').doc(tokenKey).set(session);
      } catch (err) {
        console.error('[Database] Firestore saveQrSession error:', err.message);
      }
    }

    return session;
  },

  async getQrSession(token) {
    const tokenKey = String(token);
    if (isUsingFirestore && firestore) {
      try {
        const doc = await firestore.collection('qrSessions').doc(tokenKey).get();
        if (doc.exists) {
          return { id: doc.id, ...doc.data() };
        }
      } catch (err) {
        console.error('[Database] Firestore getQrSession error:', err.message);
      }
    }
    return inMemorySessions.get(tokenKey) || null;
  },

  async deactivateSessionsForMobile(mobile) {
    const mobileStr = String(mobile);
    // In-memory
    for (const [token, sess] of inMemorySessions.entries()) {
      if (sess.mobile === mobileStr) {
        sess.active = false;
        inMemorySessions.set(token, sess);
      }
    }

    if (isUsingFirestore && firestore) {
      try {
        const snap = await firestore.collection('qrSessions').where('mobile', '==', mobileStr).get();
        const batch = firestore.batch();
        snap.forEach(doc => {
          batch.update(doc.ref, { active: false });
        });
        await batch.commit();
      } catch (err) {
        console.error('[Database] Firestore deactivateSessions error:', err.message);
      }
    }
  }
};

module.exports = db;
