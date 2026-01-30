// Confirm Upsell Purchase - Mark purchase as completed
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
        const { order_id, product_key } = JSON.parse(event.body);

        if (!product_key) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Product key required' }) };
        }

        // Get product
        const products = await sql`
            SELECT id FROM products WHERE product_key = ${product_key}
        `;

        if (products.length === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) };
        }

        const productId = products[0].id;

        // Check if purchase already confirmed
        const existingPurchase = await sql`
            SELECT id, status FROM purchases
            WHERE user_id = ${userId} AND product_id = ${productId}
            ORDER BY created_at DESC LIMIT 1
        `;

        if (existingPurchase.length > 0 && existingPurchase[0].status === 'completed') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Already confirmed', already_purchased: true })
            };
        }

        // Update pending purchase to completed, or create new completed purchase
        if (existingPurchase.length > 0) {
            await sql`
                UPDATE purchases
                SET status = 'completed', purchased_at = NOW()
                WHERE id = ${existingPurchase[0].id}
            `;
        } else {
            // Get product price for new purchase
            const productDetails = await sql`
                SELECT price_cents FROM products WHERE id = ${productId}
            `;

            await sql`
                INSERT INTO purchases (user_id, product_id, amount_cents, currency, status, is_upsell, purchased_at)
                VALUES (${userId}, ${productId}, ${productDetails[0].price_cents}, 'USD', 'completed', true, NOW())
            `;
        }

        console.log('Upsell purchase confirmed:', { userId, productKey, orderId: order_id });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Purchase confirmed' })
        };

    } catch (error) {
        console.error('Confirm upsell purchase error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to confirm purchase' })
        };
    }
};
