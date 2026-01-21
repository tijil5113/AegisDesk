// YouTube Music API Proxy - Server-side proxy for YouTube Data API
// This keeps the API key secure and handles CORS

export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Get API key from environment variable
  const apiKey = process.env.YOUTUBE_API_KEY || 'AIzaSyC3nFF2-7I9lnHF9zZpeQj7guPEw6y-pHQ';
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Server configuration error: Missing YOUTUBE_API_KEY environment variable'
    });
  }

  try {
    const { type, query, language, region = 'IN', pageToken, maxResults = 20 } = req.body || {};

    if (!type) {
      return res.status(400).json({ error: 'Type is required (trending, search, playlist, artist)' });
    }

    let items = [];
    let nextPageToken = null;

    if (type === 'trending') {
      // Get trending music videos - try category 10 (music) first
      let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=${region}&videoCategoryId=10&maxResults=${maxResults}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      
      let response = await fetch(url);
      let data = await response.json();

      // If category 10 fails or returns no results, try without category filter
      if (!response.ok || !data.items || data.items.length === 0) {
        console.log('Category 10 failed, trying without category filter...');
        url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=${region}&maxResults=${maxResults}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
        response = await fetch(url);
        data = await response.json();
      }

      if (!response.ok) {
        console.error('YouTube API error:', data);
        throw new Error(data.error?.message || `YouTube API error: ${response.status}`);
      }

      items = (data.items || []).map(item => ({
        videoId: item.id,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || item.snippet.thumbnails?.high?.url,
        duration: parseDuration(item.contentDetails?.duration),
        language: detectLanguage(item.snippet.title, item.snippet.description || ''),
        viewCount: item.statistics?.viewCount,
        publishedAt: item.snippet.publishedAt
      }));

      nextPageToken = data.nextPageToken || null;

    } else if (type === 'search') {
      if (!query) {
        return res.status(400).json({ error: 'Query is required for search' });
      }

      // Build search query with language-specific terms
      let searchQuery = query;
      if (language && language !== 'all') {
        const langTerms = {
          'tamil': 'tamil songs',
          'hindi': 'hindi songs bollywood',
          'telugu': 'telugu songs',
          'malayalam': 'malayalam songs',
          'kannada': 'kannada songs',
          'english': 'english songs latest'
        };
        searchQuery = `${langTerms[language] || ''} ${query}`.trim();
      }

      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=${maxResults}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'YouTube API error');
      }

      // Get video details for duration
      const videoIds = (data.items || []).map(item => item.id.videoId).join(',');
      
      if (videoIds) {
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        const durationMap = {};
        (detailsData.items || []).forEach(item => {
          durationMap[item.id] = parseDuration(item.contentDetails?.duration);
        });

        items = (data.items || []).map(item => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          duration: durationMap[item.id.videoId] || null,
          language: language || detectLanguage(item.snippet.title, item.snippet.description),
          publishedAt: item.snippet.publishedAt
        }));
      }

      nextPageToken = data.nextPageToken || null;

    } else if (type === 'playlist') {
      // Get playlist items (would need playlist ID)
      return res.status(400).json({ error: 'Playlist type requires playlist ID' });
    } else if (type === 'artist') {
      if (!query) {
        return res.status(400).json({ error: 'Query (artist name) is required' });
      }

      const searchQuery = `${query} songs`;
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=${maxResults}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'YouTube API error');
      }

      items = (data.items || []).map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        duration: null,
        language: detectLanguage(item.snippet.title, item.snippet.description),
        publishedAt: item.snippet.publishedAt
      }));

      nextPageToken = data.nextPageToken || null;
    }

    return res.status(200).json({
      items,
      nextPageToken,
      totalResults: items.length
    });

  } catch (error) {
    console.error('YouTube Music API error:', error);
    console.error('Error stack:', error.stack);
    
    // Return detailed error for debugging
    return res.status(500).json({ 
      error: 'Failed to fetch music data',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      details: {
        hint: 'Check your internet connection and YouTube API status',
        check: 'Visit https://status.youtube.com to check API status',
        apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING'
      }
    });
  }
}

// Helper function to parse ISO 8601 duration
function parseDuration(duration) {
  if (!duration) return null;
  
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return null;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Helper function to detect language from text
function detectLanguage(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // Simple keyword-based detection
  if (text.includes('tamil') || /[\u0B80-\u0BFF]/.test(text)) return 'tamil';
  if (text.includes('hindi') || /[\u0900-\u097F]/.test(text)) return 'hindi';
  if (text.includes('telugu') || /[\u0C00-\u0C7F]/.test(text)) return 'telugu';
  if (text.includes('malayalam') || /[\u0D00-\u0D7F]/.test(text)) return 'malayalam';
  if (text.includes('kannada') || /[\u0C80-\u0CFF]/.test(text)) return 'kannada';
  
  return 'english';
}
