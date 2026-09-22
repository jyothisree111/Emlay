// EMLAY Website Configuration
// Supports local development, custom env variable (VITE_API_BASE_URL), and production deployment (Vercel)

const isBrowser = typeof window !== 'undefined';
const protocol = isBrowser ? window.location.protocol : 'http:';
const hostname = isBrowser ? window.location.hostname : '172.25.185.197';
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

export const PC_IP = isLocal ? '172.25.185.197' : hostname;
export const BACKEND_PORT = 5000;

// Priority for API_BASE_URL:
// 1. Explicit environment variable VITE_API_BASE_URL
// 2. Production or Vercel (https: or vercel.app): same-origin '/api'
// 3. Local network / dev: `http://${hostname}:5000/api`
const envApiUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_BASE_URL : null;

export const API_BASE_URL = envApiUrl
  ? envApiUrl.replace(/\/$/, '')
  : (protocol === 'https:' || hostname.includes('vercel.app'))
    ? '/api'
    : `http://${hostname}:5000/api`;

export default {
  PC_IP,
  BACKEND_PORT,
  API_BASE_URL
};
