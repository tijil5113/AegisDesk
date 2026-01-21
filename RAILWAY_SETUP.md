# Railway Deployment Guide for AEGIS DESK

This guide will help you deploy your AEGIS DESK application to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. GitHub repository with your code (or use Railway's Git integration)
3. API keys for the services you want to use (OpenAI, GNews, YouTube)

## Quick Deploy

### Option 1: Deploy from GitHub (Recommended)

1. **Create a Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your AEGIS DESK repository

3. **Railway will automatically:**
   - Detect it's a Node.js application
   - Install dependencies from `package.json`
   - Run `npm start` (which runs `server.js`)

4. **Configure Environment Variables**
   - Go to your project → Variables tab
   - Add the following required environment variables:

### Required Environment Variables

| Variable Name | Description | Example | Required |
|--------------|-------------|---------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key for AI chat | `sk-...` | Yes (for AI features) |
| `GNEWS_API_KEY` | GNews.io API key for news | `308ced...` | Yes (for news features) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | `AIzaSy...` | Yes (for music features) |

### Optional Environment Variables

| Variable Name | Description | Default |
|--------------|-------------|---------|
| `PORT` | Server port | `3000` (Railway sets this automatically) |
| `NODE_ENV` | Environment mode | `production` |
| `API_BASE_URL` | Base URL for API endpoints | Auto-detected by Railway |
| `ALLOWED_ORIGIN` | CORS allowed origin | `*` |

### Mail Service (Optional)

If you want to use the mail features:

| Variable Name | Description |
|--------------|-------------|
| `GMAIL_CLIENT_ID` | Google OAuth Client ID for Gmail |
| `OUTLOOK_CLIENT_ID` | Microsoft OAuth Client ID for Outlook |
| `SES_REGION` | AWS SES region | `us-east-1` |
| `SES_FROM_EMAIL` | Email address for sending emails | `noreply@aegisdesk.com` |

## Setting Up Environment Variables

1. In Railway dashboard, go to your project
2. Click on "Variables" tab
3. Click "New Variable" for each environment variable
4. Enter the variable name and value
5. Click "Add"

**Important:** Railway will automatically restart your service when you add/update environment variables.

## Getting Your API Keys

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy and paste it into Railway variables as `OPENAI_API_KEY`

### GNews API Key
1. Go to https://gnews.io/
2. Sign up for an account
3. Get your API key from the dashboard
4. Copy and paste it into Railway variables as `GNEWS_API_KEY`

### YouTube Data API Key
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable YouTube Data API v3
4. Create credentials (API key)
5. Copy and paste it into Railway variables as `YOUTUBE_API_KEY`

## Deployment Process

Railway will automatically:
1. Clone your repository
2. Install dependencies (`npm install`)
3. Build your application
4. Start your server (`npm start`)
5. Assign a public URL

## Accessing Your Application

1. After deployment, Railway will provide a public URL
2. It will look like: `https://your-project-name.up.railway.app`
3. Click on the URL or use the "Open" button in Railway dashboard
4. Your AEGIS DESK application will be live!

## Custom Domain (Optional)

1. Go to your project → Settings → Domains
2. Click "Generate Domain" or add your custom domain
3. Follow Railway's DNS configuration instructions
4. Your app will be accessible via your custom domain

## Monitoring and Logs

- **Logs:** Click "View Logs" in Railway dashboard to see real-time logs
- **Metrics:** Railway provides CPU, memory, and network metrics
- **Health Checks:** Railway automatically monitors your service

## Updating Your Application

Railway automatically deploys when you push to your connected branch:
1. Make changes to your code
2. Commit and push to GitHub
3. Railway detects the push
4. Automatically rebuilds and redeploys
5. Your changes go live (usually within 1-2 minutes)

## Troubleshooting

### Application Not Starting
- Check logs in Railway dashboard
- Verify all required environment variables are set
- Ensure `package.json` has correct `start` script

### API Errors
- Verify API keys are correct in Railway variables
- Check API service status (OpenAI, GNews, YouTube)
- Review logs for specific error messages

### Port Issues
- Railway automatically sets `PORT` environment variable
- Your `server.js` already uses `process.env.PORT || 3000`
- No configuration needed

### Build Failures
- Check that `package.json` is valid
- Verify all dependencies can be installed
- Review build logs for specific errors

## Cost

- Railway offers a free tier with $5/month credit
- For small applications, this is usually sufficient
- Check Railway pricing for production needs

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

---

**Your AEGIS DESK is now ready to deploy to Railway! 🚀**
