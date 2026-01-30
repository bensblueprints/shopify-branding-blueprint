// Create Airwallex Payment Intent

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

        const clientId = process.env.AIRWALLEX_CLIENT_ID;
        const apiKey = process.env.AIRWALLEX_API_KEY;

        if (!clientId || !apiKey) {
            console.error('Missing Airwallex credentials');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Payment provider not configured' })
            };
        }

        // Get access token
        const accessToken = await getAccessToken(clientId, apiKey);

        const siteUrl = process.env.URL || 'http://localhost:8888';
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create PaymentIntent
        const paymentIntentData = {
            request_id: requestId,
            amount: 27.00,
            currency: 'USD',
            merchant_order_id: orderId,
            return_url: `${siteUrl}/thank-you.html?provider=airwallex&order_id=${orderId}`,
            metadata: {
                email: email,
                product: 'main_course'
            },
            order: {
                products: [
                    {
                        name: '7-Day Shopify Branding Blueprint',
                        quantity: 1,
                        unit_price: 27.00,
                        desc: 'Complete course with lifetime access',
                        type: 'digital'
                    }
                ]
            }
        };

        // Step 1: Create PaymentIntent
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

        // Return data for frontend SDK redirect
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                intentId: piResult.id,
                clientSecret: piResult.client_secret,
                currency: 'USD',
                orderId: orderId,
                env: process.env.AIRWALLEX_ENV === 'production' ? 'prod' : 'demo',
                successUrl: `${siteUrl}/thank-you.html?provider=airwallex&order_id=${orderId}`,
                failUrl: `${siteUrl}/?payment=failed`
            })
        };

    } catch (error) {
        console.error('Airwallex payment error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to create payment' })
        };
    }
};
