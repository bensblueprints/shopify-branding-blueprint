// Admin Grant Course Access with Neon database
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function validateAdminSession(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const sessionToken = authHeader.replace('Bearer ', '');

    const sessions = await sql`
        SELECT s.*, a.id as admin_id, a.email, a.full_name, a.role
        FROM sessions s
        JOIN admin_users a ON s.admin_id = a.id
        WHERE s.session_token = ${sessionToken}
        AND s.expires_at > NOW()
        AND s.admin_id IS NOT NULL
    `;

    if (sessions.length === 0) return null;
    return {
        id: sessions[0].admin_id,
        email: sessions[0].email,
        full_name: sessions[0].full_name,
        role: sessions[0].role
    };
}

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
        const authHeader = event.headers.authorization || event.headers.Authorization;
        const admin = await validateAdminSession(authHeader);

        if (!admin) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        const { userId, courseId } = JSON.parse(event.body);

        if (!userId || !courseId) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'User ID and Course ID required' }) };
        }

        // Check if enrollment already exists
        const existing = await sql`
            SELECT id FROM enrollments
            WHERE user_id = ${userId} AND course_id = ${courseId}
        `;

        if (existing.length > 0) {
            // Update existing enrollment to active
            await sql`
                UPDATE enrollments
                SET status = 'active'
                WHERE id = ${existing[0].id}
            `;
        } else {
            // Create new enrollment
            await sql`
                INSERT INTO enrollments (user_id, course_id, status)
                VALUES (${userId}, ${courseId}, 'active')
            `;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Course access granted' })
        };

    } catch (error) {
        console.error('Grant access error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to grant access' })
        };
    }
};
