// Check session with Neon database
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

// Exported helper for other functions
async function validateSession(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    // Check for admin session
    const adminSessions = await sql`
        SELECT s.*, a.id as admin_id, a.email, a.full_name, a.role
        FROM sessions s
        JOIN admin_users a ON s.admin_id = a.id
        WHERE s.session_token = ${sessionToken}
        AND s.expires_at > NOW()
        AND s.admin_id IS NOT NULL
    `;

    if (adminSessions.length > 0) {
        const session = adminSessions[0];
        return {
            type: 'admin',
            session: session,
            admin: {
                id: session.admin_id,
                email: session.email,
                full_name: session.full_name,
                role: session.role
            }
        };
    }

    // Check for user session
    const userSessions = await sql`
        SELECT s.*, u.id as user_id, u.email, u.full_name, u.avatar_url
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = ${sessionToken}
        AND s.expires_at > NOW()
        AND s.user_id IS NOT NULL
    `;

    if (userSessions.length > 0) {
        const session = userSessions[0];
        return {
            type: 'user',
            session: session,
            user: {
                id: session.user_id,
                email: session.email,
                full_name: session.full_name,
                avatar_url: session.avatar_url
            }
        };
    }

    return null;
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
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const authHeader = event.headers.authorization || event.headers.Authorization;
        const sessionData = await validateSession(authHeader);

        if (!sessionData) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Invalid or expired session' })
            };
        }

        if (sessionData.type === 'admin') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    valid: true,
                    type: 'admin',
                    admin: {
                        id: sessionData.admin.id,
                        email: sessionData.admin.email,
                        full_name: sessionData.admin.full_name,
                        role: sessionData.admin.role
                    }
                })
            };
        } else {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    valid: true,
                    type: 'user',
                    user: {
                        id: sessionData.user.id,
                        email: sessionData.user.email,
                        full_name: sessionData.user.full_name,
                        avatar_url: sessionData.user.avatar_url
                    }
                })
            };
        }

    } catch (error) {
        console.error('Session check error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Session check failed' })
        };
    }
};

// Export for use in other functions
exports.validateSession = validateSession;
