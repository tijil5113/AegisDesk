# 🚂 Deploy AEGIS DESK to Railway

Your AEGIS DESK application is ready to deploy to Railway!

## Quick Start (3 Steps)

### 1. Create Railway Project
- Go to https://railway.app and sign up
- Click "New Project" → "Deploy from GitHub repo"
- Select your AEGIS DESK repository

### 2. Add Environment Variables
In Railway Dashboard → Variables, add:
- `OPENAI_API_KEY` (for AI chat)
- `GNEWS_API_KEY` (for news)
- `YOUTUBE_API_KEY` (for music)

### 3. Deploy
Railway automatically deploys! Your app will be live in ~1-2 minutes.

## 📋 What's Included

✅ **railway.json** - Railway configuration  
✅ **server.js** - Already configured for Railway (uses `process.env.PORT`)  
✅ **package.json** - Has correct `start` script  
✅ **RAILWAY_SETUP.md** - Complete deployment guide  
✅ **RAILWAY_DEPLOYMENT_CHECKLIST.md** - Step-by-step checklist  

## 🔑 Required Environment Variables

| Variable | Purpose | Get It From |
|----------|---------|-------------|
| `OPENAI_API_KEY` | AI Chat features | https://platform.openai.com/api-keys |
| `GNEWS_API_KEY` | News features | https://gnews.io/ |
| `YOUTUBE_API_KEY` | Music features | https://console.cloud.google.com/ |

## 📚 Full Documentation

For detailed instructions, see:
- **[RAILWAY_SETUP.md](./RAILWAY_SETUP.md)** - Complete setup guide
- **[RAILWAY_DEPLOYMENT_CHECKLIST.md](./RAILWAY_DEPLOYMENT_CHECKLIST.md)** - Deployment checklist

## 🎯 Your Railway URL

After deployment, Railway will provide a URL like:
```
https://your-project-name.up.railway.app
```

## 🔄 Auto-Deploy

Railway automatically deploys when you push to GitHub:
1. Make changes
2. Push to GitHub
3. Railway detects and redeploys
4. Changes go live automatically!

## 💡 Tips

- Railway provides $5/month free credit
- Check logs in Railway dashboard for debugging
- Environment variables can be updated anytime (app restarts automatically)
- Use custom domain for production (optional)

## 🆘 Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check `RAILWAY_SETUP.md` for troubleshooting

---

**Ready to deploy? Start with step 1 above! 🚀**
