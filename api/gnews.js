// GNews API Proxy Server - Handles GNews.io requests server-side
// This prevents CORS issues and keeps API key secure

// Express-style handler
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
  const apiKey = process.env.GNEWS_API_KEY || '308ced4410c459bb053b289a8c4cf3c5'; // Fallback for local dev
  
  console.log('[GNews] Using API key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING');
  
  if (!apiKey) {
    console.error('[GNews] GNEWS_API_KEY environment variable is not set');
    return res.status(500).json({ 
      status: 'error',
      message: 'Server configuration error: Missing GNEWS_API_KEY environment variable'
    });
  }

  try {
    // Get parameters from request body
    const {
      mode = 'top', // 'top' | 'category' | 'search'
      topic, // 'world' | 'nation' | 'business' | 'technology' | 'entertainment' | 'sports' | 'science' | 'health'
      q, // query string for search
      lang = 'en', // 'en' | 'hi' | 'ta'
      country = 'in',
      max = 20,
      page = 1
    } = req.body || {};

    // Validate inputs
    if (mode !== 'top' && mode !== 'category' && mode !== 'search') {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid mode. Use "top", "category", or "search"' 
      });
    }

    if (mode === 'search' && !q) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Search query (q) is required when mode is "search"' 
      });
    }

    if (max > 100) {
      return res.status(400).json({ 
        status: 'error',
        message: 'max cannot exceed 100' 
      });
    }

    if (page < 1) {
      return res.status(400).json({ 
        status: 'error',
        message: 'page must be >= 1' 
      });
    }

    // Build GNews URL based on mode
    let apiUrl = '';
    const params = new URLSearchParams({
      token: apiKey,
      lang: lang,
      country: country,
      max: String(max)
    });

    if (mode === 'search') {
      // Use search endpoint
      apiUrl = 'https://gnews.io/api/v4/search';
      params.append('q', q);
    } else {
      // Use top-headlines endpoint
      apiUrl = 'https://gnews.io/api/v4/top-headlines';
      if (topic) {
        params.append('topic', topic);
      }
    }

    const fullUrl = `${apiUrl}?${params.toString()}`;
    console.log(`[GNews] Fetching: ${mode} - page ${page}, max ${max}, lang ${lang}`);
    if (topic) console.log(`[GNews] Topic: ${topic}`);
    if (q) console.log(`[GNews] Query: ${q}`);
    console.log(`[GNews] URL: ${apiUrl} (params: ${params.toString().split('&').length} total)`);

    // Call GNews API
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'AegisDesk-NewsHub/1.0',
        'Accept': 'application/json'
      }
    });

    console.log(`[GNews] Response status: ${response.status} ${response.statusText}`);

    const data = await response.json();
    
    console.log(`[GNews] Response: totalArticles=${data.totalArticles || 0}, articles=${data.articles?.length || 0}`);
    
    // Log first article title if available for debugging
    if (data.articles && data.articles.length > 0) {
      console.log(`[GNews] First article: ${data.articles[0].title?.substring(0, 60)}...`);
    } else if (response.ok) {
      console.warn('[GNews] ⚠️ Status is ok but no articles returned!');
    }

    // Handle GNews errors
    if (!response.ok) {
      console.error('[GNews] Error response:', response.status, JSON.stringify(data, null, 2));
      
      let errorMessage = data.message || data.errors?.[0] || 'GNews API error';
      let errorDetails = data;

      // Handle specific error cases
      if (response.status === 401 || errorMessage.includes('API key') || errorMessage.includes('Invalid')) {
        errorMessage = 'Invalid GNews API key. The API key may be incorrect or expired.';
      } else if (response.status === 429) {
        errorMessage = 'GNews rate limit exceeded. Please wait a moment and try again.';
      } else if (response.status === 426) {
        errorMessage = 'GNews API upgrade required. Please check your account.';
      }

      return res.status(response.status).json({
        status: 'error',
        message: errorMessage,
        details: errorDetails
      });
    }

    // Normalize response format
    const normalizedResponse = {
      status: 'ok',
      totalArticles: data.totalArticles || (data.articles?.length || 0),
      articles: (data.articles || []).map(article => ({
        title: article.title || '',
        description: article.description || '',
        content: article.content || article.description || '',
        url: article.url || '',
        image: article.image || '',
        publishedAt: article.publishedAt || article.pubDate || '',
        source: {
          name: article.source?.name || 'Unknown',
          url: article.source?.url || ''
        }
      }))
    };

    console.log(`[GNews] ✅ Successfully normalized ${normalizedResponse.articles.length} articles`);

    return res.json(normalizedResponse);

  } catch (error) {
    console.error('[GNews] ❌ Server error:', error);
    return res.status(500).json({
      status: 'error',
      message: `Server error: ${error.message}`,
      details: {
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
}
