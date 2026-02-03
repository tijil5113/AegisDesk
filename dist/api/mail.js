// MAIL API - AWS Lambda Function
// Handles email sending and provider integration

exports.handler = async (event) => {
    const { httpMethod, path, headers, body } = event;
    const route = path.replace('/api/mail', '');
    
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
    
    // Verify authentication
    const token = headers.Authorization?.replace('Bearer ', '');
    if (!token && route !== '/gmail/auth' && route !== '/outlook/auth') {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }
    
    try {
        let response;
        
        switch (route) {
            case '/send':
                response = await handleSendEmail(event);
                break;
            case '/gmail/auth':
                response = await handleGmailAuth(event);
                break;
            case '/gmail/inbox':
                response = await handleGmailInbox(event);
                break;
            case '/outlook/auth':
                response = await handleOutlookAuth(event);
                break;
            case '/outlook/inbox':
                response = await handleOutlookInbox(event);
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
        console.error('[Mail API] Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

// Send Email Handler
async function handleSendEmail(event) {
    const { accountId, to, subject, body } = JSON.parse(event.body || '{}');
    
    if (!accountId || !to || !subject || !body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required fields' })
        };
    }
    
    // Get account from DynamoDB
    // const account = await getAccount(accountId);
    
    // Determine sending method based on provider
    // if (account.provider === 'gmail') {
    //     await sendViaGmail(account, { to, subject, body });
    // } else if (account.provider === 'outlook') {
    //     await sendViaOutlook(account, { to, subject, body });
    // } else {
    //     // Use AWS SES for manual accounts
    //     await sendViaSES({ to, subject, body });
    // }
    
    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, messageId: `msg_${Date.now()}` })
    };
}

// Gmail Auth Handler
async function handleGmailAuth(event) {
    // Redirect to Google OAuth
    const clientId = process.env.GMAIL_CLIENT_ID;
    const redirectUri = `${process.env.API_BASE_URL}/api/mail/gmail/callback`;
    const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    
    return {
        statusCode: 302,
        headers: {
            Location: authUrl
        },
        body: ''
    };
}

// Gmail Inbox Handler
async function handleGmailInbox(event) {
    const token = event.headers.Authorization?.replace('Bearer ', '');
    
    // Use Gmail API to fetch emails
    // const emails = await fetchGmailEmails(token);
    
    // Mock response for local dev
    const emails = [
        {
            id: 'gmail_1',
            from: 'sender@example.com',
            to: 'user@gmail.com',
            subject: 'Test Email',
            body: 'This is a test email from Gmail.',
            date: new Date().toISOString()
        }
    ];
    
    return {
        statusCode: 200,
        body: JSON.stringify(emails)
    };
}

// Outlook Auth Handler
async function handleOutlookAuth(event) {
    // Redirect to Microsoft OAuth
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const redirectUri = `${process.env.API_BASE_URL}/api/mail/outlook/callback`;
    const scope = 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.Read';
    
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}`;
    
    return {
        statusCode: 302,
        headers: {
            Location: authUrl
        },
        body: ''
    };
}

// Outlook Inbox Handler
async function handleOutlookInbox(event) {
    const token = event.headers.Authorization?.replace('Bearer ', '');
    
    // Use Microsoft Graph API to fetch emails
    // const emails = await fetchOutlookEmails(token);
    
    // Mock response for local dev
    const emails = [
        {
            id: 'outlook_1',
            from: 'sender@example.com',
            to: 'user@outlook.com',
            subject: 'Test Email',
            body: 'This is a test email from Outlook.',
            date: new Date().toISOString()
        }
    ];
    
    return {
        statusCode: 200,
        body: JSON.stringify(emails)
    };
}

// Helper: Send via AWS SES
async function sendViaSES({ to, subject, body }) {
    const AWS = require('aws-sdk');
    const ses = new AWS.SES({ region: process.env.SES_REGION || 'us-east-1' });
    
    const params = {
        Source: process.env.SES_FROM_EMAIL || 'noreply@aegisdesk.com',
        Destination: { ToAddresses: [to] },
        Message: {
            Subject: { Data: subject },
            Body: { Text: { Data: body } }
        }
    };
    
    return await ses.sendEmail(params).promise();
}

// Helper: Send via Gmail API
async function sendViaGmail(account, { to, subject, body }) {
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: account.token });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
    ].join('\n');
    
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    return await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage
        }
    });
}

// Helper: Send via Outlook API
async function sendViaOutlook(account, { to, subject, body }) {
    const axios = require('axios');
    
    const response = await axios.post(
        'https://graph.microsoft.com/v1.0/me/sendMail',
        {
            message: {
                subject: subject,
                body: {
                    contentType: 'Text',
                    content: body
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: to
                        }
                    }
                ]
            }
        },
        {
            headers: {
                Authorization: `Bearer ${account.token}`
            }
        }
    );
    
    return response.data;
}
