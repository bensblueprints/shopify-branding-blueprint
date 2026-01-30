// Portal User Change Password with Neon database
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

        // Verify user session
        const sessions = await sql`
            SELECT s.*, u.id as user_id, u.password_hash
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ${token}
            AND s.expires_at > NOW()
            AND s.user_id IS NOT NULL
        `;

        if (sessions.length === 0) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired session' }) };
        }

        const session = sessions[0];
        const { currentPassword, newPassword } = JSON.parse(event.body);

        if (!newPassword) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'New password required' }) };
        }

        if (newPassword.length < 8) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
        }

        // If user has existing password, verify it
        if (session.password_hash && currentPassword) {
            const isValid = await bcrypt.compare(currentPassword, session.password_hash);
            if (!isValid) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Current password is incorrect' }) };
            }
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // Update password
        await sql`
            UPDATE users
            SET password_hash = ${newPasswordHash}, updated_at = NOW()
            WHERE id = ${session.user_id}
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
