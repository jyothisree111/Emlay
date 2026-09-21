const os = require('os');
require('dotenv').config();

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  // Priority 1: Wi-Fi or Wireless
  for (const name of Object.keys(interfaces)) {
    const lower = name.toLowerCase();
    if (lower.includes('vmware') || lower.includes('virtual') || lower.includes('vethernet')) continue;
    if (lower.includes('wi-fi') || lower.includes('wlan') || lower.includes('wireless')) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  }
  // Priority 2: Standard non-virtual local interfaces
  for (const name of Object.keys(interfaces)) {
    const lower = name.toLowerCase();
    if (lower.includes('vmware') || lower.includes('virtual') || lower.includes('vethernet')) continue;
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '172.25.185.197';
}

const detectedIp = getLocalIpAddress();
const PC_IP = process.env.PC_IP || detectedIp || '172.25.185.197';
const PORT = parseInt(process.env.PORT || '5000', 10);
const RESPONDER_PORT = parseInt(process.env.RESPONDER_PORT || '3000', 10);
const QR_TOKEN_EXPIRY_SECONDS = parseInt(process.env.QR_TOKEN_EXPIRY_SECONDS || '300', 10); // 5 minutes

module.exports = {
  PORT,
  PC_IP,
  RESPONDER_PORT,
  QR_TOKEN_EXPIRY_SECONDS,
  RESPONDER_BASE_URL: process.env.RESPONDER_BASE_URL || `http://${PC_IP}:${RESPONDER_PORT}`
};
