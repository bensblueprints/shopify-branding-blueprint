// Admin Change Password with Neon database
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const sql = neon(process.env.DATABASE_URL);

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

        // Verify admin session
        const sessions = await sql`
            SELECT s.*, a.id as admin_id, a.password_hash
            FROM sessions s
            JOIN admin_users a ON s.admin_id = a.id
            WHERE s.session_token = ${token}
            AND s.expires_at > NOW()
            AND s.admin_id IS NOT NULL
        `;

        if (sessions.length === 0) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired session' }) };
        }

        const session = sessions[0];
        const { currentPassword, newPassword } = JSON.parse(event.body);

        if (!currentPassword || !newPassword) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Current and new passwords required' }) };
        }

        if (newPassword.length < 8) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'New password must be at least 8 characters' }) };
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, session.password_hash);
        if (!isValid) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Current password is incorrect' }) };
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // Update password
        await sql`
            UPDATE admin_users
            SET password_hash = ${newPasswordHash}, updated_at = NOW()
            WHERE id = ${session.admin_id}
        `;

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
