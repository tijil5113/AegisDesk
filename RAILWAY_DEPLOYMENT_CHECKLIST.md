# Railway Deployment Checklist ✅

## Pre-Deployment

- [x] Repository is connected to Railway
- [x] `package.json` has correct `start` script
- [x] `server.js` uses `process.env.PORT`
- [x] Dependencies are listed in `package.json`
- [x] `.gitignore` excludes sensitive files (`.env`)

## Environment Variables Setup

Add these in Railway Dashboard → Variables:

### Required for Core Features

- [ ] `OPENAI_API_KEY` - OpenAI API key for AI chat
- [ ] `GNEWS_API_KEY` - GNews.io API key for news
- [ ] `YOUTUBE_API_KEY` - YouTube Data API v3 key

### Optional

- [ ] `NODE_ENV` - Set to `production`
- [ ] `API_BASE_URL` - Your Railway app URL (auto-set)
- [ ] `ALLOWED_ORIGIN` - CORS allowed origin (default: `*`)

### For Mail Features (Optional)

- [ ] `GMAIL_CLIENT_ID` - Google OAuth Client ID
- [ ] `OUTLOOK_CLIENT_ID` - Microsoft OAuth Client ID
- [ ] `SES_REGION` - AWS SES region
- [ ] `SES_FROM_EMAIL` - Email sender address

## Deployment Steps

1. [ ] Create Railway account at https://railway.app
2. [ ] Create new project
3. [ ] Connect GitHub repository
4. [ ] Add environment variables
5. [ ] Wait for deployment to complete
6. [ ] Test the application at Railway-provided URL
7. [ ] (Optional) Set up custom domain

## Post-Deployment Testing

- [ ] Application loads at Railway URL
- [ ] AI Chat feature works (if API key set)
- [ ] News feature works (if API key set)
- [ ] Music feature works (if API key set)
- [ ] All static files load correctly
- [ ] API endpoints respond correctly

## Quick Commands

```bash
# View logs
railway logs

# Open app in browser
railway open

# Check status
railway status
```

## Support Resources

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- This project's RAILWAY_SETUP.md for detailed guide

---

**Ready to deploy? Follow the steps above! 🚀**
