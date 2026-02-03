// AUTH API - AWS Lambda Function
// Handles authentication endpoints

exports.handler = async (event) => {
    const { httpMethod, path, headers, body } = event;
    const route = path.replace('/api/auth', '');
    
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };
    
    // Handle OPTIONS preflight
    if (httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }
    
    try {
        let response;
        
        switch (route) {
            case '/google':
                response = await handleGoogleAuth(event);
                break;
            case '/apple':
                response = await handleAppleAuth(event);
                break;
            case '/phone/send-otp':
                response = await handleSendOTP(event);
                break;
            case '/phone/verify-otp':
                response = await handleVerifyOTP(event);
                break;
            case '/signin':
                response = await handleSignIn(event);
                break;
            case '/signup':
                response = await handleSignUp(event);
                break;
            case '/signout':
                response = await handleSignOut(event);
                break;
            case '/forgot-password':
                response = await handleForgotPassword(event);
                break;
            default:
                response = {
                    statusCode: 404,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Not found' })
                };
        }
        
        return {
            ...response,
            headers: {
                ...corsHeaders,
                ...response.headers
            }
        };
    } catch (error) {
        console.error('[Auth API] Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

// Google OAuth Handler
async function handleGoogleAuth(event) {
    // In production, redirect to Google OAuth
    // For now, return mock response for local dev
    const { code } = JSON.parse(body || '{}');
    
    // Exchange code for token (would use Google OAuth API)
    // const token = await exchangeGoogleCode(code);
    
    // Create or get user from DynamoDB
    // const user = await getUserOrCreate(userId, { provider: 'google' });
    
    // Generate JWT token
    // const jwt = await generateJWT(user);
    
    return {
        statusCode: 200,
        body: JSON.stringify({
            token: 'mock_jwt_token',
            user: {
                userId: 'google_user_123',
                name: 'Google User',
                email: 'user@gmail.com',
                provider: 'google'
            }
        })
    };
}

// Apple OAuth Handler
async function handleAppleAuth(event) {
    // Similar to Google OAuth
    return {
        statusCode: 200,
        body: JSON.stringify({
            token: 'mock_jwt_token',
            user: {
                userId: 'apple_user_123',
                name: 'Apple User',
                email: 'user@icloud.com',
                provider: 'apple'
            }
        })
    };
}

// Send OTP Handler
async function handleSendOTP(event) {
    const { phone } = JSON.parse(event.body || '{}');
    
    if (!phone) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Phone number required' })
        };
    }
    
    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in DynamoDB with TTL (5 minutes)
    // await storeOTP(phone, otp);
    
    // Send OTP via SMS (AWS SNS)
    // await sendSMS(phone, `Your AegisDesk verification code is: ${otp}`);
    
    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'OTP sent' })
    };
}

// Verify OTP Handler
async function handleVerifyOTP(event) {
    const { phone, code } = JSON.parse(event.body || '{}');
    
    if (!phone || !code) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Phone and code required' })
        };
    }
    
    // Verify OTP from DynamoDB
    // const isValid = await verifyOTP(phone, code);
    
    // if (!isValid) {
    //     return {
    //         statusCode: 401,
    //         body: JSON.stringify({ error: 'Invalid OTP' })
    //     };
    // }
    
    // Create or get user
    // const user = await getUserOrCreate(phone, { provider: 'phone' });
    
    // Generate JWT token
    // const jwt = await generateJWT(user);
    
    return {
        statusCode: 200,
        body: JSON.stringify({
            token: 'mock_jwt_token',
            user: {
                userId: `phone_${phone}`,
                name: phone,
                phone: phone,
                provider: 'phone'
            }
        })
    };
}

// Sign In Handler
async function handleSignIn(event) {
    const { email, password } = JSON.parse(event.body || '{}');
    
    if (!email || !password) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Email and password required' })
        };
    }
    
    // Verify credentials (would check against DynamoDB/Cognito)
    // const user = await verifyCredentials(email, password);
    
    // if (!user) {
    //     return {
    //         statusCode: 401,
    //         body: JSON.stringify({ error: 'Invalid credentials' })
    //     };
    // }
    
    // Generate JWT token
    // const jwt = await generateJWT(user);
    
    return {
        statusCode: 200,
        body: JSON.stringify({
            token: 'mock_jwt_token',
            user: {
                userId: `email_${email}`,
                name: email.split('@')[0],
                email: email,
                provider: 'email'
            }
        })
    };
}

// Sign Up Handler
async function handleSignUp(event) {
    const { name, email, password } = JSON.parse(event.body || '{}');
    
    if (!name || !email || !password) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Name, email, and password required' })
        };
    }
    
    if (password.length < 8) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Password must be at least 8 characters' })
        };
    }
    
    // Check if user exists
    // const existingUser = await getUserByEmail(email);
    // if (existingUser) {
    //     return {
    //         statusCode: 409,
    //         body: JSON.stringify({ error: 'User already exists' })
    //     };
    // }
    
    // Create user in DynamoDB/Cognito
    // const user = await createUser({ name, email, password });
    
    // Generate JWT token
    // const jwt = await generateJWT(user);
    
    return {
        statusCode: 201,
        body: JSON.stringify({
            token: 'mock_jwt_token',
            user: {
                userId: `email_${Date.now()}`,
                name: name,
                email: email,
                provider: 'email'
            }
        })
    };
}

// Sign Out Handler
async function handleSignOut(event) {
    const token = event.headers.Authorization?.replace('Bearer ', '');
    
    if (token) {
        // Invalidate token (add to blacklist in DynamoDB)
        // await invalidateToken(token);
    }
    
    return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
    };
}

// Forgot Password Handler
async function handleForgotPassword(event) {
    const { email } = JSON.parse(event.body || '{}');
    
    if (!email) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Email required' })
        };
    }
    
    // Generate reset token
    // const resetToken = await generateResetToken(email);
    
    // Send reset email via AWS SES
    // await sendResetEmail(email, resetToken);
    
    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Reset link sent' })
    };
}
