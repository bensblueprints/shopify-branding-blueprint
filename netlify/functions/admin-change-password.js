// Admin Change Password
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

        // Verify admin session (auth-admin-login saves to 'sessions' table with 'session_token' field)
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('session_token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (sessionError || !session || !session.admin_id) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired session' }) };
        }

        const { currentPassword, newPassword } = JSON.parse(event.body);

        if (!currentPassword || !newPassword) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Current and new passwords required' }) };
        }

        if (newPassword.length < 8) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'New password must be at least 8 characters' }) };
        }

        // Verify current password
        const { data: admin } = await supabase
            .from('admin_users')
            .select('password_hash')
            .eq('id', session.admin_id)
            .single();

        const isValid = await bcrypt.compare(currentPassword, admin.password_hash);
        if (!isValid) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Current password is incorrect' }) };
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // Update password
        await supabase
            .from('admin_users')
            .update({
                password_hash: newPasswordHash,
                updated_at: new Date().toISOString()
            })
            .eq('id', session.admin_id);

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
