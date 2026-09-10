# Music System Setup & Troubleshooting

## Quick Start

1. **Start the server:**
   ```bash
   node server.js
   ```
   Or run `START_SERVER.bat`

2. **Open in browser:**
   ```
   http://localhost:3000/music.html
   ```

3. **Check console:**
   - Open browser DevTools (F12)
   - Look for console messages:
     - ✅ "Music Page initializing..."
     - ✅ "Loading content..."
     - ✅ "trending loaded: X items"

## API Key

## API Key

Set `YOUTUBE_API_KEY` in `.env`. Do not put API keys in frontend JavaScript or documentation.

## Testing the API

1. **Test server:**
   ```
   http://localhost:3000/api/test
   ```

2. **Test music API:**
   ```
   http://localhost:3000/api/music/test
   ```

3. **Test music endpoint (using curl or Postman):**
   ```bash
   curl -X POST http://localhost:3000/api/music \
     -H "Content-Type: application/json" \
     -d '{"type":"trending","region":"IN","maxResults":5}'
   ```

## Common Issues

### No songs displaying
- Check browser console for errors
- Verify server is running
- Check network tab for API calls
- Ensure `/api/music` endpoint returns data

### Player not working
- Check if YouTube iframe API loaded (console should show "YouTube API ready")
- Verify musicEngine is initialized
- Check for CORS errors

### API errors
- Verify API key is valid
- Check YouTube API quota
- Look at server console for detailed errors

## File Structure

```
/api/music.js          - Backend API proxy
/server.js             - Express server (includes /api/music route)
/music.html            - Main music page
/styles/music.css      - Spotify-style styling
/js/core/music-engine.js - YouTube player wrapper
/js/apps/music-page.js  - Frontend logic
```

## Debug Mode

Open browser console and look for:
- 🎵 Music Page initializing...
- 📥 Loading content...
- 📡 Fetching trending...
- ✅ trending loaded: 20 items
- ▶️ Playing track: [song name]

If you see errors, they will be prefixed with ❌
