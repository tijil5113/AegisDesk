# News App Setup Guide

## Quick Start

1. **Start the Server**
   ```bash
   node server.js
   ```
   You should see: `AegisDesk server running on port 3000`

2. **Open News App**
   - Click the News icon on the desktop, OR
   - Open `news.html` directly in your browser

3. **Check for Errors**
   - Open browser console (F12)
   - Look for `[News]` prefixed logs
   - Check the debug panel (red button at bottom-left)

## Troubleshooting

### "No News Showing" / "Loading Forever"

**Most Common Issue: Server Not Running**

1. Check if server is running:
   ```bash
   # Windows PowerShell
   Get-Process -Name node -ErrorAction SilentlyContinue
   
   # Or check if port 3000 is in use
   netstat -ano | findstr :3000
   ```

2. Start the server:
   ```bash
   node server.js
   ```

3. Verify server is responding:
   - Open: http://localhost:3000/api/test
   - Should see: `{"status":"ok","message":"Server is running!",...}`

### "Cannot connect to server" Error

- **Server not started**: Run `node server.js`
- **Wrong port**: Check if server is on port 3000
- **Firewall blocking**: Check Windows Firewall settings
- **CORS issues**: Server should handle CORS automatically

### "API key invalid" Error

- The API key is hardcoded in `api/news.js` as fallback
- If you see this error, the NewsAPI key may be expired
- Check NewsAPI account: https://newsapi.org/account

### "No articles returned"

- NewsAPI free tier has limits (100 requests/day)
- Try a different category
- Wait a few minutes and retry
- Check debug panel for API response details

## Debug Panel

Click the red "🐛 Debug Info" button at the bottom-left to see:
- Last request parameters
- API response status
- Article count
- Current page / max pages
- Last error (if any)

## API Endpoint

The news app uses: `POST /api/news`

Request body:
```json
{
  "mode": "top" | "everything",
  "category": "business" | "technology" | "science" | ...,
  "country": "in",
  "page": 1,
  "pageSize": 24
}
```

## Files

- `news.html` - Main news page
- `js/apps/news-reader-app.js` - Frontend logic
- `api/news.js` - Backend proxy (server-side)
- `styles/news.css` - Styling
- `server.js` - Express server

## Still Not Working?

1. Check browser console (F12) for errors
2. Check server console for errors
3. Verify Node.js is installed: `node --version`
4. Verify server.js exists and is correct
5. Try accessing http://localhost:3000/api/test directly
