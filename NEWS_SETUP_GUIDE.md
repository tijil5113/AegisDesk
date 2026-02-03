# 📰 Tamil Nadu News Reader - Setup Guide

## 🎯 Features
- **Tamil Nadu Focused News**: Automatically filters news from Tamil Nadu (Chennai, Coimbatore, Madurai, etc.)
- **Multi-language Translation**: Translate news to English, Tamil (தமிழ்), or Hindi (हिंदी)
- **Real-time Updates**: Fetch latest news from India-based sources
- **Smart Caching**: News cached for 5 minutes for instant loading

## 🔑 API Keys Setup

To get real news from India/Tamil Nadu, you need to add API keys. The app works with demo data without keys, but you'll need keys for live news.

### Option 1: NewsAPI.org (Recommended - Free Tier Available)

1. **Sign up**: Go to [https://newsapi.org/register](https://newsapi.org/register)
2. **Get your API key**: After registration, copy your API key from the dashboard
3. **Update the code**: Open `js/apps/news.js` and replace `YOUR_NEWSAPI_KEY` on line 17:

```javascript
apiKeys: {
    newsapi: 'YOUR_ACTUAL_API_KEY_HERE', // Replace this
    mediastack: 'YOUR_MEDIASTACK_KEY',
}
```

**Free Tier Limits**: 100 requests/day (plenty for personal use)

### Option 2: MediaStack API (Backup/Fallback)

1. **Sign up**: Go to [https://mediastack.com/signup](https://mediastack.com/signup)
2. **Get your API key**: Copy it from your dashboard
3. **Update the code**: Replace `YOUR_MEDIASTACK_KEY` on line 18

**Free Tier Limits**: 250 requests/month

### Option 3: Use Both (Best Experience)

Add both API keys - the app will try NewsAPI first, then fall back to MediaStack if needed.

## 📍 Tamil Nadu News Filtering

The app automatically filters news using these keywords:
- **Cities**: Chennai (சென்னை), Coimbatore (கோயம்புத்தூர்), Madurai (மதுரை), Trichy (திருச்சி), Salem (சேலம்), Tirunelveli (திருநெல்வேலி), Erode (ஈரோடு)
- **State**: Tamil Nadu, தமிழ்நாடு
- **Sources**: The Hindu, Times of India, The New Indian Express, DT Next, Dinamani, Daily Thanthi

## 🌐 Translation Features

The app uses **MyMemory Translation API** (free tier) to translate news:
- **English** → Tamil (தமிழ்)
- **English** → Hindi (हिंदी)
- Translations are cached to avoid repeated API calls

**Note**: Translation quality may vary. For better quality, you can integrate Google Translate API (paid).

## 🚀 How to Use

1. **Open News Reader**: Click the News app icon in your desktop
2. **Select Language**: Choose English, Tamil, or Hindi from the dropdown
3. **Select Category**: Filter by Business, Sports, Technology, etc.
4. **Click Refresh**: Get latest news updates
5. **Click Article**: Opens full article in new tab

## 🎨 Features

- ✅ Real-time Tamil Nadu news
- ✅ Multi-language support (EN/TA/HI)
- ✅ Category filtering
- ✅ Image previews
- ✅ Smart caching
- ✅ Responsive design
- ✅ Click to read full article

## 🔧 Troubleshooting

### No news showing?
1. Check if API keys are correctly added
2. Check browser console for errors
3. Verify internet connection
4. API might have reached daily limit (try tomorrow)

### Translation not working?
- MyMemory API has rate limits (1000 words/day free)
- Translation may take a few seconds
- Check browser console for errors

### Want to add more cities?
Edit `tamilNaduKeywords` array in `news.js` (line 32-36) to add more cities/keywords.

## 📝 Example API Calls

The app makes these API calls:

**NewsAPI Search (Tamil Nadu)**:
```
https://newsapi.org/v2/everything?q=Tamil+Nadu+OR+Chennai+OR+Coimbatore&language=en&sortBy=publishedAt&pageSize=50&apiKey=YOUR_KEY
```

**MediaStack (India with Tamil Nadu keywords)**:
```
https://api.mediastack.com/v1/news?access_key=YOUR_KEY&countries=in&keywords=Tamil+Nadu,+Chennai&limit=50
```

## 🎉 That's It!

Your Tamil Nadu News Reader is ready! Add your API keys and start reading the latest news from Tamil Nadu in your preferred language.

---

**Need Help?** Check the browser console (F12) for detailed error messages.
