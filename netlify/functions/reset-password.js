// Reset Password - Handle password reset for both admin and users
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

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
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { token, newPassword, type } = JSON.parse(event.body);

        if (!token || !newPassword) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token and new password required' }) };
        }

        if (newPassword.length < 8) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
        }

        const isAdmin = type === 'admin';
        const tokenType = isAdmin ? 'admin_password_reset' : 'password_reset';

        // Find valid reset token
        const tokens = await sql`
            SELECT * FROM auth_tokens
            WHERE token = ${token}
            AND token_type = ${tokenType}
            AND expires_at > NOW()
            AND used_at IS NULL
        `;

        if (tokens.length === 0) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid or expired reset link. Please request a new one.' }) };
        }

        const resetToken = tokens[0];

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        if (isAdmin) {
            await sql`
                UPDATE admin_users
                SET password_hash = ${passwordHash}, updated_at = NOW()
                WHERE id = ${resetToken.user_id}
            `;
        } else {
            await sql`
                UPDATE users
                SET password_hash = ${passwordHash}, updated_at = NOW()
                WHERE id = ${resetToken.user_id}
            `;
        }

        // Mark token as used
        await sql`
            UPDATE auth_tokens SET used_at = NOW() WHERE id = ${resetToken.id}
        `;

        console.log('Password reset successful for:', resetToken.email, 'type:', type);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Password reset successfully' })
        };

    } catch (error) {
        console.error('Reset password error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to reset password' })
        };
    }
};
