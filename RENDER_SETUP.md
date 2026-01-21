# 🚀 Render Deployment Guide for AEGIS DESK

Your AEGIS DESK is ready to deploy to Render! You've already added the `OPEN_API` environment variable - perfect! ✅

## ✅ What's Already Done

1. ✅ **Server** (`server.js`) - Configured to use `process.env.PORT` (Render provides this)
2. ✅ **Chat API** (`api/chat.js`) - Uses `OPEN_API` environment variable
3. ✅ **Default Landing Page** - Routes to `welcome.html`
4. ✅ **All API Routes** - News, GNews, Music, Auth, Mail all ready
5. ✅ **package.json** - Has correct `start` script: `npm start`

## 🚀 Quick Deploy

### Option 1: Deploy from GitHub (Recommended)

1. **Go to Render**: https://render.com
2. **Sign up/Login** with GitHub
3. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Select "Build and deploy from a Git repository"
   - Connect your GitHub account if not already connected
   - Select your AEGIS DESK repository

4. **Configure Service**:
   - **Name**: `aegisdesk` (or whatever you prefer)
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (root is fine)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free tier is fine to start

5. **Environment Variables**:
   - Go to "Environment" tab
   - Add Environment Variable:
     - **Key**: `OPEN_API`
     - **Value**: Your ChatGPT API key (starts with `sk-`)
     - **Apply Changes**

6. **Advanced Settings** (Optional):
   - **Health Check Path**: `/` (or leave empty)
   - **Auto-Deploy**: Yes (automatically deploys on push)

7. **Create Web Service**:
   - Click "Create Web Service"
   - Render will start building and deploying
   - Wait 2-3 minutes for deployment to complete

8. **Your App is Live! 🎉**
   - Render will give you a URL like: `aegisdesk.onrender.com`
   - Visit the URL - you should see `welcome.html`!

### Option 2: Use render.yaml (Automatic)

If you pushed the `render.yaml` file I created:
1. Go to Render Dashboard
2. Click "New +" → "Blueprint"
3. Connect your repository
4. Render will detect `render.yaml` and use those settings
5. Just add your `OPEN_API` environment variable in the dashboard
6. Deploy!

## 🔑 Environment Variables Setup

### Required
- ✅ **OPEN_API** - Your ChatGPT API key (you already have this!)

### Optional (for full features)
Add these in Render Dashboard → Your Service → Environment:

- **GNEWS_API_KEY** - For news features (get from https://gnews.io/)
- **YOUTUBE_API_KEY** - For music features (get from Google Cloud Console)
- **NEWS_API_KEY** - Alternative news API key
- **ALLOWED_ORIGIN** - CORS allowed origin (default: `*`)

### For Mail Features (Optional)
- **GMAIL_CLIENT_ID** - Google OAuth Client ID
- **OUTLOOK_CLIENT_ID** - Microsoft OAuth Client ID
- **SES_REGION** - AWS SES region
- **SES_FROM_EMAIL** - Email sender address

## 📁 How It Works

### Render Deployment Flow:
1. **Build**: Runs `npm install` to install dependencies
2. **Start**: Runs `npm start` which executes `server.js`
3. **Server**: Express server serves static files + API routes
4. **Routing**: Root `/` serves `welcome.html` (configured in server.js)
5. **API Routes**: All `/api/*` routes handled by server.js

### Your Setup:
```
Render
  ↓
  npm install (installs express)
  ↓
  npm start (runs server.js)
  ↓
  Express Server:
    - Serves static files (HTML, CSS, JS)
    - Handles /api/chat (uses OPEN_API)
    - Handles /api/news, /api/gnews, /api/music
    - Root / → welcome.html
```

## 🔄 Updating Your App

Render automatically deploys when you push to GitHub:

1. **Make changes locally**
2. **Commit and push**:
   ```bash
   git add .
   git commit -m "Update features"
   git push origin main
   ```
3. **Render detects the push**
4. **Automatically rebuilds and redeploys** (if auto-deploy is enabled)
5. **New version goes live** in ~2-3 minutes

## 🧪 Testing Your Deployment

After deployment:

1. **Visit your Render URL** (e.g., `aegisdesk.onrender.com`)
2. **You should see `welcome.html`** (we configured this in server.js!)
3. **Test AI Chat**:
   - Go to desktop → AI Chat app
   - Send a message
   - Should work with your `OPEN_API` key! ✅

4. **Test API Endpoint**:
   ```bash
   curl -X POST https://aegisdesk.onrender.com/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello!"}]}'
   ```

## 🐛 Troubleshooting

### 404 Error / App Not Loading

1. **Check Build Logs**:
   - Go to Render Dashboard → Your Service → Logs
   - Look for build errors

2. **Check Runtime Logs**:
   - Go to Render Dashboard → Your Service → Logs
   - Look for runtime errors

3. **Verify Environment Variables**:
   - Go to Render Dashboard → Your Service → Environment
   - Verify `OPEN_API` is set correctly

4. **Check Start Command**:
   - Should be: `npm start`
   - This runs `node server.js`

### AI Chat Not Working

1. **Check Environment Variable**:
   - Render Dashboard → Your Service → Environment
   - Verify `OPEN_API` is set
   - Make sure it starts with `sk-`

2. **Check Server Logs**:
   - Look for errors about missing API key
   - Check if API calls are being made

3. **Verify API Route**:
   - Test `/api/chat` endpoint directly
   - Check server logs for errors

### Build Failures

1. **Check package.json**:
   - Ensure `dependencies` include `express`
   - Verify `start` script is correct

2. **Check Build Logs**:
   - Look for npm install errors
   - Check for missing dependencies

3. **Verify Node Version**:
   - Render uses Node 18+ by default
   - Your code should work fine

## 💰 Render Pricing

- **Free Tier**: 
  - 750 hours/month
  - Spins down after 15 min inactivity
  - Free SSL
  - Perfect for testing!

- **Paid Plans**: Start at $7/month for always-on service

## ✨ Features Enabled

With your `OPEN_API` environment variable:
- ✅ AI Chat app fully functional
- ✅ ChatGPT integration working
- ✅ Secure API key (never exposed to client)
- ✅ All static files served correctly
- ✅ Welcome page as landing page

## 📚 Render Resources

- **Render Docs**: https://render.com/docs
- **Node.js Guide**: https://render.com/docs/node
- **Environment Variables**: https://render.com/docs/environment-variables
- **Auto-Deploy**: https://render.com/docs/github

## 🎉 You're All Set!

Your AEGIS DESK is now configured for Render with:
- ✅ `server.js` configured for Render (uses `process.env.PORT`)
- ✅ `welcome.html` as default landing page
- ✅ `OPEN_API` environment variable ready to add
- ✅ All API routes working
- ✅ Auto-deployment from GitHub

**Just add `OPEN_API` in Render Dashboard and deploy! 🚀**
