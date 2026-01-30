// Magic link verification with Neon database (deprecated - use password login instead)
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { token, email } = JSON.parse(event.body);

        if (!token || !email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Token and email required' })
            };
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Find the token
        const authTokens = await sql`
            SELECT * FROM auth_tokens
            WHERE token = ${token}
            AND email = ${normalizedEmail}
            AND token_type = 'magic_link'
            AND used_at IS NULL
        `;

        if (authTokens.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid or expired link' })
            };
        }

        const authToken = authTokens[0];

        // Check if token is expired
        if (new Date(authToken.expires_at) < new Date()) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Link has expired. Please request a new one.' })
            };
        }

        // Mark token as used
        await sql`
            UPDATE auth_tokens SET used_at = NOW() WHERE id = ${authToken.id}
        `;

        // Get user
        const users = await sql`
            SELECT id, email, full_name, avatar_url FROM users WHERE id = ${authToken.user_id}
        `;

        if (users.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'User not found' })
            };
        }

        const user = users[0];

        // Update user's last_login
        await sql`
            UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}
        `;

        // Create session
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Get first IP from forwarded list
        const rawIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '';
        const ipAddress = rawIp.split(',')[0].trim().substring(0, 100);
        const userAgent = (event.headers['user-agent'] || '').substring(0, 500);

        await sql`
            INSERT INTO sessions (user_id, session_token, expires_at, ip_address, user_agent)
            VALUES (${user.id}, ${sessionToken}, ${expiresAt.toISOString()}, ${ipAddress}, ${userAgent})
        `;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                session_token: sessionToken,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    avatar_url: user.avatar_url
                }
            })
        };

    } catch (error) {
        console.error('Magic link verification error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Verification failed' })
        };
    }
};
