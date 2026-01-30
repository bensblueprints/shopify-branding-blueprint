// Portal Reset Password with Neon database
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
        const { token, newPassword } = JSON.parse(event.body);

        if (!token || !newPassword) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token and new password required' }) };
        }

        if (newPassword.length < 8) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
        }

        // Find valid reset token
        const resetRecords = await sql`
            SELECT at.*, u.id as user_id, u.email
            FROM auth_tokens at
            JOIN users u ON at.user_id = u.id
            WHERE at.token = ${token}
            AND at.token_type = 'password_reset'
            AND at.expires_at > NOW()
            AND at.used_at IS NULL
        `;

        if (resetRecords.length === 0) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid or expired reset link' }) };
        }

        const resetRecord = resetRecords[0];

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // Update user password
        await sql`
            UPDATE users
            SET password_hash = ${newPasswordHash}, updated_at = NOW()
            WHERE id = ${resetRecord.user_id}
        `;

        // Mark token as used
        await sql`
            UPDATE auth_tokens
            SET used_at = NOW()
            WHERE id = ${resetRecord.id}
        `;

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
