// NewsAPI Proxy Server - Handles NewsAPI.org requests server-side
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

  // Get API key from environment variable or use provided key
  const apiKey = process.env.NEWS_API_KEY || '0517aafda5474d6e8fa980387126bb62'; // Fallback for local dev
  
  console.log('[NewsAPI] Using API key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING');
  
  if (!apiKey) {
    console.error('NEWS_API_KEY environment variable is not set');
    return res.status(500).json({ 
      error: 'Server configuration error: Missing NEWS_API_KEY environment variable',
      details: {
        hint: 'Please add your NewsAPI key as an environment variable',
        check: 'Go to Vercel Dashboard > Your Project > Settings > Environment Variables'
      }
    });
  }

  try {
    // Get parameters from request body
    const {
      mode = 'top', // 'top' or 'everything'
      country = 'in',
      category,
      q, // query string for search
      sources,
      language = 'en',
      page = 1,
      pageSize = 24,
      sortBy = 'publishedAt' // publishedAt, relevancy, popularity
    } = req.body || {};

    // Validate inputs
    if (mode !== 'top' && mode !== 'everything') {
      return res.status(400).json({ error: 'Invalid mode. Use "top" or "everything"' });
    }

    if (pageSize > 100) {
      return res.status(400).json({ error: 'pageSize cannot exceed 100' });
    }

    if (page < 1) {
      return res.status(400).json({ error: 'page must be >= 1' });
    }

    // Build NewsAPI URL based on mode
    let apiUrl = '';
    const params = new URLSearchParams({
      apiKey,
      language,
      page: String(page),
      pageSize: String(pageSize)
    });

    if (mode === 'top') {
      // Use top-headlines endpoint
      apiUrl = 'https://newsapi.org/v2/top-headlines';
      
      if (country) params.append('country', country);
      if (category) params.append('category', category);
      if (sources) params.append('sources', sources);
      
      // If no category specified for top headlines, default to general
      if (!category && !sources) {
        // Top headlines without category - this is valid
      }
    } else {
      // Use everything endpoint
      apiUrl = 'https://newsapi.org/v2/everything';
      
      // For everything endpoint, we MUST have a query
      if (q) {
        params.append('q', q);
      } else if (category) {
        // If category provided but no query, use category as query
        params.append('q', category);
      } else {
        // Default query if nothing specified
        params.append('q', 'news');
      }
      
      if (sources) params.append('sources', sources);
      if (sortBy) params.append('sortBy', sortBy);
    }

    const fullUrl = `${apiUrl}?${params.toString()}`;
    console.log(`[NewsAPI] Fetching: ${mode} - page ${page}, pageSize ${pageSize}`);
    console.log(`[NewsAPI] URL: ${apiUrl} (with ${params.toString().split('&').length} params)`);

    // Call NewsAPI
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'AegisDesk-NewsHub/1.0',
        'Accept': 'application/json'
      }
    });

    console.log(`[NewsAPI] Response status: ${response.status} ${response.statusText}`);

    const data = await response.json();
    
    console.log(`[NewsAPI] Response: status=${data.status}, totalResults=${data.totalResults}, articles=${data.articles?.length || 0}`);
    
    // Log first article title if available for debugging
    if (data.articles && data.articles.length > 0) {
      console.log(`[NewsAPI] First article: ${data.articles[0].title?.substring(0, 60)}...`);
    } else if (data.status === 'ok') {
      console.warn('[NewsAPI] ⚠️ Status is ok but no articles returned!');
    }

    // Handle NewsAPI errors
    if (!response.ok) {
      console.error('[NewsAPI] Error response:', response.status, JSON.stringify(data, null, 2));
      
      let errorMessage = data.message || data.error || 'NewsAPI error';
      let errorDetails = data;

      // Handle specific error cases
      if (response.status === 401 || errorMessage.includes('API key') || errorMessage.includes('Invalid API key')) {
        errorMessage = 'Invalid NewsAPI key. The API key may be incorrect or expired.';
        errorDetails = {
          hint: 'Check your API key at https://newsapi.org/account',
          check: 'Make sure the API key is correct and active'
        };
      } else if (response.status === 429) {
        errorMessage = 'NewsAPI rate limit exceeded. Please wait a moment and try again.';
        errorDetails = {
          hint: 'Free tier allows 100 requests per day',
          check: 'Wait a few minutes before retrying or upgrade your plan'
        };
      } else if (response.status === 426) {
        errorMessage = 'NewsAPI upgrade required. Your plan does not support this request.';
        errorDetails = {
          hint: 'Some endpoints require a paid plan',
          check: 'Check your plan at https://newsapi.org/pricing'
        };
      }

      return res.status(response.status).json({
        error: errorMessage,
        details: errorDetails,
        status: response.status,
        rawResponse: data
      });
    }
    
    // Check if status is 'ok' in response
    if (data.status && data.status !== 'ok') {
      console.warn('[NewsAPI] Non-ok status:', data.status, data);
    }

    // Check if we got articles
    let articles = data.articles || [];
    let totalResults = data.totalResults || 0;
    
    // FALLBACK: If top-headlines returns 0 articles for India, try everything endpoint
    if (mode === 'top' && articles.length === 0 && country === 'in') {
      console.log('[NewsAPI] Top-headlines returned 0 articles for India, trying everything endpoint...');
      
      const fallbackParams = new URLSearchParams({
        apiKey,
        language: 'en',
        page: String(page),
        pageSize: String(pageSize),
        sortBy: 'publishedAt'
      });
      
      // Build query based on category or general India news
      let query = 'india';
      if (category) {
        query = `india ${category}`;
      }
      fallbackParams.append('q', query);
      
      const fallbackUrl = `https://newsapi.org/v2/everything?${fallbackParams.toString()}`;
      console.log('[NewsAPI] Fallback URL:', fallbackUrl);
      
      try {
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'AegisDesk-NewsHub/1.0',
            'Accept': 'application/json'
          }
        });
        
        const fallbackData = await fallbackResponse.json();
        console.log(`[NewsAPI] Fallback response: ${fallbackData.articles?.length || 0} articles`);
        
        if (fallbackData.articles && fallbackData.articles.length > 0) {
          articles = fallbackData.articles;
          totalResults = fallbackData.totalResults || 0;
          console.log('[NewsAPI] ✅ Fallback successful!');
        }
      } catch (fallbackError) {
        console.error('[NewsAPI] Fallback failed:', fallbackError);
      }
    }
    
    console.log(`[NewsAPI] Final result: ${articles.length} articles, ${totalResults} total results`);
    
    // Log first article title if available for debugging
    if (articles.length > 0) {
      console.log(`[NewsAPI] Sample article: ${articles[0].title?.substring(0, 60)}...`);
    } else {
      console.warn('[NewsAPI] ⚠️ No articles returned! Response status:', data.status);
    }
    
    // Success response - ensure we always return an array
    return res.status(200).json({
      status: data.status || 'ok',
      totalResults: totalResults || 0,
      articles: articles || [],
      page: page,
      pageSize: pageSize,
      totalPages: totalResults > 0 ? Math.ceil(totalResults / pageSize) : 0
    });

  } catch (error) {
    console.error('NewsAPI proxy error:', error);
    
    // Handle timeout
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return res.status(504).json({ 
        error: 'Request timeout. NewsAPI is taking too long to respond. Please try again.',
        message: 'Timeout after 30 seconds'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to communicate with NewsAPI',
      message: error.message,
      details: {
        hint: 'Check your internet connection and NewsAPI status',
        check: 'Visit https://newsapi.org/status to check API status'
      }
    });
  }
}
