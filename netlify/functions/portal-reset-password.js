// Portal Reset Password (using token from email)
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

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
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { token, newPassword } = JSON.parse(event.body);

        if (!token || !newPassword) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token and new password required' }) };
        }

        if (newPassword.length < 8) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Find valid reset token
        const { data: resetRecord, error: resetError } = await supabase
            .from('password_resets')
            .select('*, users(*)')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .is('used_at', null)
            .single();

        if (resetError || !resetRecord) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid or expired reset link' }) };
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // Update user password
        await supabase
            .from('users')
            .update({
                password_hash: newPasswordHash,
                updated_at: new Date().toISOString()
            })
            .eq('id', resetRecord.user_id);

        // Mark token as used
        await supabase
            .from('password_resets')
            .update({ used_at: new Date().toISOString() })
            .eq('id', resetRecord.id);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Password reset successfully' })
        };

    } catch (error) {
        console.error('Password reset error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to reset password' })
        };
    }
};
