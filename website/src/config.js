// EMLAY Website Configuration
// Detects network hostname automatically so it works whether loaded via localhost or network IP (e.g. 172.25.185.197)

const hostname = typeof window !== 'undefined' ? window.location.hostname : '172.25.185.197';
export const PC_IP = hostname === 'localhost' || hostname === '127.0.0.1' ? '172.25.185.197' : hostname;
export const BACKEND_PORT = 5000;
export const API_BASE_URL = `http://${hostname}:5000/api`;

export default {
  PC_IP,
  BACKEND_PORT,
  API_BASE_URL
};
