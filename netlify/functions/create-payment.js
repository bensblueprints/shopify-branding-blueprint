// Unified Airwallex Payment - Works for ALL products
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const AIRWALLEX_API_URL = process.env.AIRWALLEX_ENV === 'production'
    ? 'https://api.airwallex.com'
    : 'https://api-demo.airwallex.com';

// Main course definition (entry product, not in database)
const MAIN_COURSE = {
    id: 0,
    product_key: 'main_course',
    name: '7-Day Shopify Branding Blueprint',
    price_cents: 2700,
    is_active: true
};

// Exit intent offer - $7 flash sale (same product, discounted)
const EXIT_OFFER = {
    id: 0,
    product_key: 'exit_offer',
    name: '7-Day Shopify Branding Blueprint - Flash Sale',
    price_cents: 700,
    is_active: true
};

async function getAccessToken() {
    const response = await fetch(`${AIRWALLEX_API_URL}/api/v1/authentication/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-client-id': process.env.AIRWALLEX_CLIENT_ID,
            'x-api-key': process.env.AIRWALLEX_API_KEY
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to authenticate with Airwallex');
    }

    const data = await response.json();
    return data.token;
}

// Create or get existing Airwallex customer
async function getOrCreateCustomer(accessToken, email) {
    const merchantCustomerId = `cust_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Try to get existing customer
    const searchResponse = await fetch(
        `${AIRWALLEX_API_URL}/api/v1/pa/customers?merchant_customer_id=${encodeURIComponent(merchantCustomerId)}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        }
    );

    if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.items && searchResult.items.length > 0) {
            return searchResult.items[0];
        }
    }

    // Create new customer
    const createResponse = await fetch(`${AIRWALLEX_API_URL}/api/v1/pa/customers/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            request_id: `req_cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            merchant_customer_id: merchantCustomerId,
            email: email,
            metadata: {
                source: 'shopify_blueprint_checkout'
            }
        })
    });

    if (!createResponse.ok) {
        const error = await createResponse.json();
        console.error('Failed to create customer:', error);
        throw new Error(error.message || 'Failed to create customer');
    }

    return await createResponse.json();
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { email, product_key } = body;

        if (!email || !email.includes('@')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Valid email required' })
            };
        }

        // Determine which product to use
        let product;
        const productKey = product_key || 'main_course';

        if (productKey === 'main_course') {
            product = MAIN_COURSE;
        } else if (productKey === 'exit_offer') {
            product = EXIT_OFFER;
        } else {
            // Fetch from database
            const products = await sql`
                SELECT id, product_key, name, price_cents, is_active
                FROM products
                WHERE product_key = ${productKey} AND is_active = true
            `;

            if (products.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Product not found' })
                };
            }

            product = products[0];
        }

        // Get Airwallex access token
        const accessToken = await getAccessToken();

        // Create/get customer
        const customer = await getOrCreateCustomer(accessToken, email);

        const siteUrl = process.env.URL || 'https://shopifycourse.advancedmarketing.co';
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const orderId = `order_${product.product_key}_${Date.now()}`;
        const amount = product.price_cents / 100;

        // Determine success URL based on product type
        let successUrl;
        if (productKey === 'main_course' || productKey === 'exit_offer') {
            // Main course and exit offer go to upsell page
            successUrl = `${siteUrl}/upsell.html?provider=airwallex&order_id=${orderId}&cid=${customer.id}&source=${productKey}`;
        } else {
            // Other products go to thank you page
            successUrl = `${siteUrl}/thank-you.html?provider=airwallex&order_id=${orderId}&product=${product.product_key}`;
        }

        // Create PaymentIntent
        const paymentIntentData = {
            request_id: requestId,
            amount: amount,
            currency: 'USD',
            merchant_order_id: orderId,
            customer_id: customer.id,
            return_url: successUrl,
            metadata: {
                email: email,
                product_key: product.product_key,
                product_name: product.name,
                customer_id: customer.id
            },
            order: {
                products: [
                    {
                        name: product.name,
                        quantity: 1,
                        unit_price: amount,
                        desc: `Digital product - ${product.name}`,
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
            console.error('Airwallex PaymentIntent error:', piResult);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: piResult.message || 'Failed to create payment' })
            };
        }

        // Return data for frontend
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                intentId: piResult.id,
                clientSecret: piResult.client_secret,
                customerId: customer.id,
                currency: 'USD',
                amount: amount,
                orderId: orderId,
                productKey: product.product_key,
                productName: product.name,
                env: process.env.AIRWALLEX_ENV === 'production' ? 'prod' : 'demo',
                successUrl: successUrl,
                failUrl: `${siteUrl}/?payment=failed&product=${product.product_key}`
            })
        };

    } catch (error) {
        console.error('Payment creation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to create payment' })
        };
    }
};
