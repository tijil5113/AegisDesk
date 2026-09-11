// YouTube Data API proxy — YOUTUBE_API_KEY is read server-side only.

import { applyCors } from './cors.js';

function mapYouTubeFailure(status, data) {
  const reason = String(data?.error?.errors?.[0]?.reason || data?.error?.status || '');
  const message = String(data?.error?.message || '');
  const blob = `${reason} ${message}`;
  if (/quota/i.test(blob) || status === 429) {
    return { status: 429, error: 'Quota reached', code: 'quota_exceeded' };
  }
  if (/accessNotConfigured|has not been used|disabled|API_KEY_SERVICE_BLOCKED/i.test(blob)) {
    return { status: 503, error: 'API is not configured', code: 'api_disabled' };
  }
  if (/keyInvalid|API_KEY_INVALID|invalid API key|IP.*referer|referer/i.test(blob) || status === 400) {
    return { status: 503, error: 'API is not configured', code: 'invalid_key' };
  }
  return { status: 502, error: 'Service temporarily unavailable', code: 'provider_error' };
}

function parseDuration(duration) {
  if (!duration) return null;
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return null;
  const hours = parseInt(match[1], 10) || 0;
  const minutes = parseInt(match[2], 10) || 0;
  const seconds = parseInt(match[3], 10) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function detectLanguage(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  if (text.includes('tamil') || /[\u0B80-\u0BFF]/.test(text)) return 'tamil';
  if (text.includes('hindi') || /[\u0900-\u097F]/.test(text)) return 'hindi';
  if (text.includes('telugu') || /[\u0C00-\u0C7F]/.test(text)) return 'telugu';
  if (text.includes('malayalam') || /[\u0D00-\u0D7F]/.test(text)) return 'malayalam';
  if (text.includes('kannada') || /[\u0C80-\u0CFF]/.test(text)) return 'kannada';
  return 'english';
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'API is not configured',
      code: 'not_configured'
    });
  }

  try {
    const body = req.body || {};
    const type = String(body.type || '');
    const query = typeof body.query === 'string' ? body.query.trim().slice(0, 200) : '';
    const language = typeof body.language === 'string' ? body.language.slice(0, 32) : '';
    const safeMax = Math.min(Math.max(Number(body.maxResults) || 20, 1), 25);
    const safeRegion = /^[A-Za-z]{2}$/.test(String(body.region)) ? String(body.region).toUpperCase() : 'IN';
    const pageToken = typeof body.pageToken === 'string' ? body.pageToken.slice(0, 64) : '';

    if (!type) {
      return res.status(400).json({ error: 'Type is required (trending, search, playlist, artist)' });
    }

    let items = [];
    let nextPageToken = null;

    if (type === 'trending') {
      const base = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics';
      let url = `${base}&chart=mostPopular&regionCode=${encodeURIComponent(safeRegion)}&videoCategoryId=10&maxResults=${safeMax}&key=${encodeURIComponent(apiKey)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;

      let response = await fetch(url);
      let data = await response.json().catch(() => ({}));

      if (response.ok && (!data.items || data.items.length === 0)) {
        url = `${base}&chart=mostPopular&regionCode=${encodeURIComponent(safeRegion)}&maxResults=${safeMax}&key=${encodeURIComponent(apiKey)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        response = await fetch(url);
        data = await response.json().catch(() => ({}));
      }

      if (!response.ok) {
        console.error('YouTube API error status:', response.status);
        const mapped = mapYouTubeFailure(response.status, data);
        return res.status(mapped.status).json({ error: mapped.error, code: mapped.code, items: [] });
      }

      items = (data.items || []).map((item) => ({
        videoId: item.id,
        title: item.snippet?.title,
        artist: item.snippet?.channelTitle,
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || item.snippet?.thumbnails?.high?.url,
        duration: parseDuration(item.contentDetails?.duration),
        language: detectLanguage(item.snippet?.title, item.snippet?.description || ''),
        viewCount: item.statistics?.viewCount,
        publishedAt: item.snippet?.publishedAt
      }));
      nextPageToken = data.nextPageToken || null;
    } else if (type === 'search') {
      if (!query) {
        return res.status(400).json({ error: 'Query is required for search' });
      }

      let searchQuery = query;
      if (language && language !== 'all') {
        const langTerms = {
          tamil: 'tamil songs',
          hindi: 'hindi songs bollywood',
          telugu: 'telugu songs',
          malayalam: 'malayalam songs',
          kannada: 'kannada songs',
          english: 'english songs latest'
        };
        searchQuery = `${langTerms[language] || ''} ${query}`.trim();
      }

      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=${safeMax}&key=${encodeURIComponent(apiKey)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('YouTube API error status:', response.status);
        const mapped = mapYouTubeFailure(response.status, data);
        return res.status(mapped.status).json({ error: mapped.error, code: mapped.code, items: [] });
      }

      if (!Array.isArray(data.items)) {
        return res.status(502).json({ error: 'Service temporarily unavailable', code: 'invalid_response', items: [] });
      }

      const videoIds = data.items.map((item) => item.id?.videoId).filter(Boolean).join(',');

      if (videoIds) {
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${encodeURIComponent(apiKey)}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json().catch(() => ({}));
        const durationMap = {};
        (detailsData.items || []).forEach((item) => {
          durationMap[item.id] = parseDuration(item.contentDetails?.duration);
        });

        items = data.items.map((item) => ({
          videoId: item.id?.videoId,
          title: item.snippet?.title,
          artist: item.snippet?.channelTitle,
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
          duration: durationMap[item.id?.videoId] || null,
          language: language || detectLanguage(item.snippet?.title, item.snippet?.description),
          publishedAt: item.snippet?.publishedAt
        })).filter((item) => item.videoId);
      }

      nextPageToken = data.nextPageToken || null;
    } else if (type === 'playlist') {
      return res.status(400).json({ error: 'Playlist type requires playlist ID' });
    } else if (type === 'artist') {
      if (!query) {
        return res.status(400).json({ error: 'Query (artist name) is required' });
      }

      const searchQuery = `${query} songs`;
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=${safeMax}&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const mapped = mapYouTubeFailure(response.status, data);
        return res.status(mapped.status).json({ error: mapped.error, code: mapped.code, items: [] });
      }

      items = (data.items || []).map((item) => ({
        videoId: item.id?.videoId,
        title: item.snippet?.title,
        artist: item.snippet?.channelTitle,
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
        duration: null,
        language: detectLanguage(item.snippet?.title, item.snippet?.description),
        publishedAt: item.snippet?.publishedAt
      })).filter((item) => item.videoId);

      nextPageToken = data.nextPageToken || null;
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    return res.status(200).json({
      items,
      nextPageToken,
      totalResults: items.length
    });
  } catch (error) {
    console.error('YouTube Music API error:', error?.name || 'request_failed');
    return res.status(502).json({
      error: 'Network error',
      code: 'network_error',
      items: []
    });
  }
}
