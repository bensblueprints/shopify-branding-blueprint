const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
        const { data: authToken, error: tokenError } = await supabase
            .from('auth_tokens')
            .select('*')
            .eq('token', token)
            .eq('email', normalizedEmail)
            .eq('token_type', 'magic_link')
            .is('used_at', null)
            .single();

        if (tokenError || !authToken) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid or expired link' })
            };
        }

        // Check if token is expired
        if (new Date(authToken.expires_at) < new Date()) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Link has expired. Please request a new one.' })
            };
        }

        // Mark token as used
        await supabase
            .from('auth_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('id', authToken.id);

        // Get user
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, full_name, avatar_url')
            .eq('id', authToken.user_id)
            .single();

        if (userError || !user) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'User not found' })
            };
        }

        // Update user's email_verified and last_login
        await supabase
            .from('users')
            .update({
                email_verified: true,
                last_login_at: new Date().toISOString()
            })
            .eq('id', user.id);

        // Create session
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await supabase.from('sessions').insert({
            user_id: user.id,
            session_token: sessionToken,
            expires_at: expiresAt.toISOString(),
            ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip'],
            user_agent: event.headers['user-agent']
        });

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
