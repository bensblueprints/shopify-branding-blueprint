// Create Embedded Stripe Checkout Session
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email } = JSON.parse(event.body);

        if (!email || !email.includes('@')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Valid email required' })
            };
        }

        const siteUrl = process.env.URL || 'http://localhost:8888';

        // Create embedded checkout session
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            ui_mode: 'embedded',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: '7-Day Shopify Branding Blueprint',
                            description: 'Complete course with lifetime access',
                        },
                        unit_amount: 2700, // $27.00
                    },
                    quantity: 1,
                },
            ],
            customer_email: email,
            payment_intent_data: {
                setup_future_usage: 'off_session', // Save card for one-click upsells
            },
            metadata: {
                product: 'main_course',
                email: email
            },
            return_url: `${siteUrl}/upsell.html?session_id={CHECKOUT_SESSION_ID}`,
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                clientSecret: session.client_secret
            })
        };

    } catch (error) {
        console.error('Embedded checkout error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to create checkout' })
        };
    }
};
