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
        // Note: Using title/handle instead of name/product_key in some cases
        const products = await sql`
            SELECT id,
                   COALESCE(product_key, handle) as product_key,
                   COALESCE(name, title) as name,
                   COALESCE(body_html, '') as description,
                   COALESCE(price_cents, 0) as price_cents,
                   features,
                   product_type,
                   is_active
            FROM products
            WHERE (product_key IS NULL OR product_key != 'main_course')
            AND (is_active IS NULL OR is_active = true)
            ORDER BY price_cents ASC NULLS LAST
        `;

        // Get user's purchases (user_id needs cast, product_id is uuid but products.id is text)
        const purchases = await sql`
            SELECT product_id, status, purchased_at
            FROM purchases
            WHERE user_id = ${userId}::uuid AND status = 'completed'
        `;

        const purchasedProductIds = purchases.map(p => p.product_id);

        // Map products with purchase status
        // Note: products.id is TEXT but purchases.product_id is UUID - compare as strings
        const upsells = products.map(product => ({
            id: product.id,
            product_key: product.product_key,
            name: product.name,
            description: product.description,
            price: (product.price_cents || 0) / 100,
            price_cents: product.price_cents || 0,
            features: product.features || [],
            product_type: product.product_type,
            is_purchased: purchasedProductIds.some(pid => pid?.toString() === product.id?.toString()),
            purchased_at: purchases.find(p => p.product_id?.toString() === product.id?.toString())?.purchased_at || null
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
