# 🚨 CRITICAL: Server Must Be Running for News App!

## The Problem
The News App **REQUIRES** the server to be running because:
- It uses `/api/news` endpoint (server-side proxy to NewsAPI.org)
- Direct file access (`file://`) won't work due to CORS and security restrictions
- API calls need to go through the Express server

## ✅ Quick Fix (3 Steps)

### Step 1: Open Terminal
Open PowerShell or Command Prompt in the project directory:
```
cd "C:\Users\tijil\OneDrive\Documents\AEGIS DESK"
```

### Step 2: Start Server
```bash
node server.js
```

You should see:
```
AegisDesk server running on port 3000
```

**KEEP THIS TERMINAL OPEN!** (The server must stay running)

### Step 3: Open News App
**Option A:** Click the News icon on your desktop
**Option B:** Open in browser: http://localhost:3000/news.html

## ⚠️ Common Mistakes

### ❌ DON'T:
- Double-click `news.html` directly (uses `file://` protocol)
- Close the terminal running `node server.js`
- Open `file:///C:/Users/.../news.html` in browser

### ✅ DO:
- Start server first: `node server.js`
- Open via server: http://localhost:3000/news.html
- Keep server running while using the app

## 🔍 Verify Server is Running

Open in browser: http://localhost:3000/api/test

Should see:
```json
{"status":"ok","message":"Server is running!",...}
```

## 📝 Alternative: Use the Batch File

Double-click `start-server.bat` to start the server (Windows only)
