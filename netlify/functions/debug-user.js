// Debug function to check user/customer existence with Neon database
const { neon } = require('@neondatabase/serverless');

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

    try {
        const { email } = JSON.parse(event.body || '{}');
        const normalizedEmail = (email || 'ben@justfeatured.com').toLowerCase().trim();

        // Check users table
        const users = await sql`
            SELECT * FROM users WHERE email = ${normalizedEmail}
        `;

        // Check customers table
        const customers = await sql`
            SELECT * FROM customers WHERE email = ${normalizedEmail}
        `;

        // Check auth_tokens table
        const tokens = await sql`
            SELECT * FROM auth_tokens
            WHERE email = ${normalizedEmail}
            ORDER BY created_at DESC
            LIMIT 5
        `;

        // Check sessions table
        const sessions = await sql`
            SELECT * FROM sessions
            ORDER BY created_at DESC
            LIMIT 5
        `;

        // Check admin_users table
        const adminUsers = await sql`
            SELECT * FROM admin_users WHERE email = ${normalizedEmail}
        `;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                email: normalizedEmail,
                user: users[0] || null,
                customer: customers[0] || null,
                recentTokens: tokens || [],
                sessions: sessions || [],
                adminUser: adminUsers[0] || null
            }, null, 2)
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
