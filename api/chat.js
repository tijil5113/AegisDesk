// OpenAI API proxy - uses OPENAI_API_KEY or OPEN_API from env (Render/Vercel)
// This keeps the API key secure on the server side

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Get API key from environment variable (supports both names)
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API;
  
  if (!apiKey) {
    console.error("OPENAI_API_KEY or OPEN_API environment variable is not set");
    return res.status(500).json({ 
      error: "Server configuration error: Missing OPENAI_API_KEY or OPEN_API environment variable",
      details: {
        hint: "Add OPENAI_API_KEY or OPEN_API in Render Dashboard > Environment",
        check: "Render Dashboard > Your Service > Environment > Add Variable"
      }
    });
  }
  
  // Validate API key format
  if (!apiKey.startsWith('sk-')) {
    console.error("Invalid API key format - should start with 'sk-'");
    return res.status(500).json({ 
      error: "Invalid API key format. OpenAI API keys should start with 'sk-'",
      details: {
        hint: "Check OPENAI_API_KEY or OPEN_API in Render Environment",
        check: "Make sure the API key value starts with 'sk-'"
      }
    });
  }

  // Get messages and options from request body
  const { messages, model: clientModel, max_tokens: clientMaxTokens } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing or invalid messages array" });
  }

  try {
    const limitedMessages = messages.length > 5 
      ? [messages[0], ...messages.slice(-4)] 
      : messages;
    
    const hasVision = limitedMessages.some(m => {
      const c = m.content;
      return Array.isArray(c) && c.some(p => p && (p.type === 'image_url' || p.image_url));
    });
    const model = hasVision ? "gpt-4o-mini" : (clientModel || "gpt-3.5-turbo");
    const maxTokens = clientMaxTokens || (hasVision ? 500 : 500);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: limitedMessages,
        max_tokens: maxTokens,
        temperature: 0.5,
        top_p: 0.8,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        stream: false
      })
    });

    const data = await response.json();

    // Handle OpenAI API errors
    if (!response.ok) {
      console.error("OpenAI API error:", JSON.stringify(data, null, 2));
      
      let errorMessage = data.error?.message || "OpenAI API error";
      let errorDetails = data.error;
      
      // Handle specific error cases
      if (data.error?.code === 'invalid_api_key' || errorMessage.includes('Incorrect API key')) {
        errorMessage = "Invalid API key. Check OPENAI_API_KEY or OPEN_API in Render Environment.";
        errorDetails = {
          hint: "Make sure the API key starts with 'sk-' and is set in Render Dashboard > Environment",
          check: "Render Dashboard > Your Service > Environment > Add Variable"
        };
      }
      
      return res.status(response.status).json({
        error: errorMessage,
        details: errorDetails
      });
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (error) {
    console.error("OpenAI API error:", error);
    
    // Handle timeout
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return res.status(504).json({ 
        error: "Request timeout. The AI is taking too long to respond. Please try again.",
        message: "Timeout after 25 seconds"
      });
    }
    
    return res.status(500).json({ 
      error: "Failed to communicate with OpenAI API",
      message: error.message,
      details: {
        hint: "Check your internet connection and OpenAI API status",
        check: "Visit https://status.openai.com to check API status"
      }
    });
  }
}
