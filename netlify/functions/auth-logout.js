// Logout with Neon database
const { neon } = require('@neondatabase/serverless');

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
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const authHeader = event.headers.authorization || event.headers.Authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
            };
        }

        const sessionToken = authHeader.replace('Bearer ', '');

        // Delete the session
        await sql`
            DELETE FROM sessions WHERE session_token = ${sessionToken}
        `;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error('Logout error:', error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true })
        };
    }
};
