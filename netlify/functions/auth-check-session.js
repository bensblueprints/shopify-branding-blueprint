const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Exported helper for other functions
async function validateSession(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    const { data: session, error } = await supabase
        .from('sessions')
        .select('*, users(*), admin_users(*)')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !session) {
        return null;
    }

    // Return appropriate user type
    if (session.admin_id && session.admin_users) {
        return {
            type: 'admin',
            session: session,
            admin: session.admin_users
        };
    } else if (session.user_id && session.users) {
        return {
            type: 'user',
            session: session,
            user: session.users
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
