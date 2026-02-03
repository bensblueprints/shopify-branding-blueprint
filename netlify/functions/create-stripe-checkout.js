// Unified Stripe Checkout - Works for ALL products
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

// Main course definition (entry product)
const MAIN_COURSE = {
    id: 0,
    product_key: 'main_course',
    name: '7-Day Shopify Branding Blueprint',
    description: 'Complete 7-day system for building a 6-7 figure Shopify brand',
    price_cents: 2700,
    is_active: true
};

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
        const body = JSON.parse(event.body || '{}');
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
            product.description = `Digital product - ${product.name}`;
        }

        const siteUrl = process.env.URL || 'https://shopifycourse.advancedmarketing.co';

        // Determine success URL based on product type
        let successUrl;
        if (productKey === 'main_course') {
            successUrl = `${siteUrl}/upsell.html?session_id={CHECKOUT_SESSION_ID}`;
        } else {
            successUrl = `${siteUrl}/thank-you.html?product=${product.product_key}&session_id={CHECKOUT_SESSION_ID}`;
        }

        // Create or get existing Stripe customer
        let customerId = null;
        const normalizedEmail = email.toLowerCase().trim();

        const existingCustomers = await stripe.customers.list({
            email: normalizedEmail,
            limit: 1
        });

        if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
        } else {
            const customer = await stripe.customers.create({
                email: normalizedEmail,
                metadata: {
                    source: 'checkout',
                    product: productKey
                }
            });
            customerId = customer.id;
        }

        // Create Stripe Checkout Session
        const sessionConfig = {
            payment_method_types: ['card'],
            mode: 'payment',
            customer: customerId,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: product.name,
                            description: product.description || `Digital product - ${product.name}`,
                        },
                        unit_amount: product.price_cents,
                    },
                    quantity: 1,
                }
            ],
            success_url: successUrl,
            cancel_url: `${siteUrl}/?cancelled=true`,
            metadata: {
                product_key: productKey,
                email: normalizedEmail
            },
            payment_intent_data: {
                setup_future_usage: 'off_session', // Save card for upsells
            }
        };

        const session = await stripe.checkout.sessions.create(sessionConfig);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sessionId: session.id,
                url: session.url
            })
        };

    } catch (error) {
        console.error('Stripe checkout error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to create checkout' })
        };
    }
};
