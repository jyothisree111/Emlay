# EMLAY: Emergency Layer & Rapid Response Infrastructure

EMLAY is an emergency identity and remote anti-theft lockdown platform built for hackathon demonstration.

## Three Connected Components:
1. **Flutter Android App (Person 2)**: Persistent lock-screen foreground notification, medical profile setup, and live rotating QR code with radar scan animation.
2. **Node.js + Express Backend (Person 1)**: REST APIs, Firestore integration, 5-minute time-bound rotating QR tokens, and remote missing lockdown.
3. **React + Vite Website (Person 3)**: Public bystander emergency profile page (`/?token=...`) and authenticated Owner Portal (`/owner`) to report device missing.

---

## ⚡ Quick Start:

### 1. Launch Everything in 1 Click (Windows):
Double click `start_all.bat` to launch both the Backend (Port 5000) and React Website (Port 3000) simultaneously in separate windows.

### 2. Manual Commands:
- **Backend**:
  ```bash
  cd backend
  node server.js
  ```
  Runs at `http://172.25.185.197:5000` (and `http://localhost:5000`).

- **React Website**:
  ```bash
  cd website
  npm.cmd run dev
  ```
  Runs at `http://172.25.185.197:3000` (and `http://localhost:3000`).

- **Flutter Android App**:
  ```bash
  flutter run
  ```

---

## 🔑 Login Credentials:
- **Mobile Number**: `8520981975` (or any mobile number)
- **Password Rule**: `mobileNumber + "1234"` (e.g., `85209819751234`)

---

## 🌐 Network Configuration:
- Detected Local Wi-Fi IP: `172.25.185.197`
- If you change Wi-Fi networks during the hackathon, tap the **Settings icon** in the Flutter app's top bar to change the PC IP address on the fly without recompiling!

---

## 🧪 Run Automated Integration Tests:
Double-click `test_system.bat` to verify all 6 APIs, token rotation, and remote missing lockdown.
