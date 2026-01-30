// Portal User Change Password
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        const token = authHeader.substring(7);
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Verify user session (auth-verify-magic-link saves to 'sessions' with 'session_token' field)
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*, users(*)')
            .eq('session_token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (sessionError || !session) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired session' }) };
        }

        const { currentPassword, newPassword } = JSON.parse(event.body);

        if (!newPassword) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'New password required' }) };
        }

        if (newPassword.length < 8) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
        }

        // If user has existing password, verify it
        if (session.users.password_hash && currentPassword) {
            const isValid = await bcrypt.compare(currentPassword, session.users.password_hash);
            if (!isValid) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Current password is incorrect' }) };
            }
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // Update password
        await supabase
            .from('users')
            .update({
                password_hash: newPasswordHash,
                updated_at: new Date().toISOString()
            })
            .eq('id', session.user_id);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Password changed successfully' })
        };

    } catch (error) {
        console.error('Password change error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to change password' })
        };
    }
};
