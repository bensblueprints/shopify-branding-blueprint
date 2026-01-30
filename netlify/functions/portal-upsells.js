// Portal Upsells - Get available upsells and user's purchases
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

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        // Get session token from header
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        const sessionToken = authHeader.replace('Bearer ', '');

        // Verify session
        const sessions = await sql`
            SELECT user_id FROM sessions
            WHERE session_token = ${sessionToken}
            AND expires_at > NOW()
        `;

        if (sessions.length === 0) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid session' }) };
        }

        const userId = sessions[0].user_id;

        // Get all upsell products (excluding main_course)
        const products = await sql`
            SELECT id, product_key, name, description, price_cents, features, product_type, thumbnail_url, download_url, is_recurring
            FROM products
            WHERE product_key != 'main_course' AND is_active = true
            ORDER BY price_cents ASC
        `;

        // Get user's purchases
        const purchases = await sql`
            SELECT product_id, status, purchased_at
            FROM purchases
            WHERE user_id = ${userId} AND status = 'completed'
        `;

        const purchasedProductIds = purchases.map(p => p.product_id);

        // Map products with purchase status
        const upsells = products.map(product => ({
            id: product.id,
            product_key: product.product_key,
            name: product.name,
            description: product.description,
            price: product.price_cents / 100,
            price_cents: product.price_cents,
            features: product.features || [],
            product_type: product.product_type,
            thumbnail_url: product.thumbnail_url,
            download_url: product.download_url,
            is_recurring: product.is_recurring,
            is_purchased: purchasedProductIds.includes(product.id),
            purchased_at: purchases.find(p => p.product_id === product.id)?.purchased_at || null
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ upsells })
        };

    } catch (error) {
        console.error('Portal upsells error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to load resources' })
        };
    }
};
