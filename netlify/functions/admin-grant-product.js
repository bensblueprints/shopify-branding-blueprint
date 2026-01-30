// Admin Grant Product/Upsell Access with Neon database
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

        const { userId, productId } = JSON.parse(event.body);

        if (!userId || !productId) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'User ID and Product ID required' }) };
        }

        // Verify user exists
        const users = await sql`SELECT id, email FROM users WHERE id = ${userId}`;
        if (users.length === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };
        }

        // Verify product exists
        const products = await sql`SELECT id, name, price_cents FROM products WHERE id = ${productId}`;
        if (products.length === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) };
        }

        const user = users[0];
        const product = products[0];

        // Check if purchase already exists
        const existing = await sql`
            SELECT id FROM purchases
            WHERE user_id = ${userId} AND product_id = ${productId} AND status = 'completed'
        `;

        if (existing.length > 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'User already has access to this product' })
            };
        }

        // Create purchase record (admin-granted, no payment)
        await sql`
            INSERT INTO purchases (user_id, product_id, amount_cents, currency, status, is_upsell, payment_provider)
            VALUES (${userId}, ${productId}, 0, 'USD', 'completed', false, 'admin_granted')
        `;

        console.log(`Admin ${admin.email} granted product "${product.name}" to user ${user.email}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Product access granted: ${product.name}`
            })
        };

    } catch (error) {
        console.error('Grant product access error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to grant product access' })
        };
    }
};
