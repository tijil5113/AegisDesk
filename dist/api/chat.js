// Vercel Serverless Function for OpenAI API - OPTIMIZED FOR SPEED
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
        hint: "Please add your OpenAI API key as an environment variable in Vercel",
        check: "Go to Vercel Dashboard > Your Project > Settings > Environment Variables"
      }
    });
  }
  
  // Validate API key format
  if (!apiKey.startsWith('sk-')) {
    console.error("Invalid API key format - should start with 'sk-'");
    return res.status(500).json({ 
      error: "Invalid API key format. OpenAI API keys should start with 'sk-'",
      details: {
        hint: "Please check your environment variable in Vercel",
        check: "Make sure the API key value starts with 'sk-'"
      }
    });
  }

  // Get messages from request body
  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing or invalid messages array" });
  }

  try {
    // OPTIMIZED FOR SPEED: Use fastest model with minimal tokens
    let model = "gpt-3.5-turbo"; // Fastest model
    
    // Limit messages to last 5 for faster processing (reduced from 10)
    const limitedMessages = messages.length > 5 
      ? [messages[0], ...messages.slice(-4)] // Keep system message + last 4
      : messages;
    
    // Call OpenAI API with optimized settings for speed
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: limitedMessages,
        max_tokens: 500, // Reduced from 1000 for faster responses
        temperature: 0.5, // Lower for faster, more focused responses
        top_p: 0.8, // Reduced for faster generation
        frequency_penalty: 0.1, // Reduced
        presence_penalty: 0.1, // Reduced
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
        errorMessage = "Invalid API key. Please check your OPEN_API environment variable in Vercel.";
        errorDetails = {
          hint: "Make sure the API key starts with 'sk-' and is correctly set in Vercel project settings",
          check: "Go to Vercel Dashboard > Your Project > Settings > Environment Variables"
        };
      }
      
      return res.status(response.status).json({
        error: errorMessage,
        details: errorDetails
      });
    }

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
