// Create Airwallex Payment for Upsell Products
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const AIRWALLEX_API_URL = process.env.AIRWALLEX_ENV === 'production'
    ? 'https://api.airwallex.com'
    : 'https://api-demo.airwallex.com';

async function getAccessToken(clientId, apiKey) {
    const response = await fetch(`${AIRWALLEX_API_URL}/api/v1/authentication/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-client-id': clientId,
            'x-api-key': apiKey
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to authenticate with Airwallex');
    }

    const data = await response.json();
    return data.token;
}

// Customer creation removed - not needed for simple payments

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

        // Verify session and get user
        const sessions = await sql`
            SELECT s.user_id, u.email, u.full_name
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ${sessionToken}
            AND s.expires_at > NOW()
        `;

        if (sessions.length === 0) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid session' }) };
        }

        const user = sessions[0];
        const { product_id } = JSON.parse(event.body);

        if (!product_id) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Product ID required' }) };
        }

        // Get product details
        const products = await sql`
            SELECT id, product_key, name, price_cents, is_active
            FROM products
            WHERE id = ${product_id} AND is_active = true
        `;

        if (products.length === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) };
        }

        const product = products[0];

        // Check if already purchased
        const existingPurchase = await sql`
            SELECT id FROM purchases
            WHERE user_id = ${user.user_id} AND product_id = ${product_id} AND status = 'completed'
        `;

        if (existingPurchase.length > 0) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'You already own this product' }) };
        }

        // Setup Airwallex
        const clientId = process.env.AIRWALLEX_CLIENT_ID;
        const apiKey = process.env.AIRWALLEX_API_KEY;

        if (!clientId || !apiKey) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Payment provider not configured' }) };
        }

        const accessToken = await getAccessToken(clientId, apiKey);

        const siteUrl = process.env.URL || 'http://localhost:8888';
        const requestId = `req_upsell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const orderId = `upsell_${product.product_key}_${Date.now()}`;
        const amount = product.price_cents / 100;

        // Create PaymentIntent
        const paymentIntentData = {
            request_id: requestId,
            amount: amount,
            currency: 'USD',
            merchant_order_id: orderId,
            return_url: `${siteUrl}/portal/upsell-success.html?order_id=${orderId}&product=${product.product_key}`,
            metadata: {
                email: user.email,
                user_id: user.user_id,
                product_id: product.id,
                product_key: product.product_key,
                type: 'upsell'
            },
            order: {
                products: [
                    {
                        name: product.name,
                        quantity: 1,
                        unit_price: amount,
                        type: 'digital'
                    }
                ]
            }
        };

        const piResponse = await fetch(`${AIRWALLEX_API_URL}/api/v1/pa/payment_intents/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(paymentIntentData)
        });

        const piResult = await piResponse.json();

        if (!piResponse.ok) {
            console.error('Airwallex error:', piResult);
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create payment' }) };
        }

        // Create pending purchase record
        await sql`
            INSERT INTO purchases (user_id, product_id, amount_cents, currency, status, is_upsell)
            VALUES (${user.user_id}, ${product.id}, ${product.price_cents}, 'USD', 'pending', true)
        `;

        // Return data for frontend to use with Airwallex SDK
        const env = process.env.AIRWALLEX_ENV === 'production' ? 'prod' : 'demo';

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                intentId: piResult.id,
                clientSecret: piResult.client_secret,
                orderId: orderId,
                productKey: product.product_key,
                env: env,
                successUrl: `${siteUrl}/portal/upsell-success.html?order_id=${orderId}&product=${product.product_key}`,
                failUrl: `${siteUrl}/portal/resources.html?payment=failed`
            })
        };

    } catch (error) {
        console.error('Upsell payment error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to create payment' })
        };
    }
};
