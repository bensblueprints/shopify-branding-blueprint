// Create Cryptomus Crypto Payment
const crypto = require('crypto');

const CRYPTOMUS_API_URL = 'https://api.cryptomus.com/v1/payment';

function generateSign(jsonBody, apiKey) {
    // Sign = MD5(base64(json_body) + api_key)
    const base64Data = Buffer.from(jsonBody).toString('base64');
    return crypto.createHash('md5').update(base64Data + apiKey).digest('hex');
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

        const merchantUuid = process.env.CRYPTOMUS_MERCHANT_UUID;
        const apiKey = process.env.CRYPTOMUS_PAYMENT_API_KEY;

        if (!merchantUuid || !apiKey) {
            console.error('Missing Cryptomus credentials');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Payment provider not configured' })
            };
        }

        const siteUrl = process.env.URL || 'http://localhost:8888';
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const paymentData = {
            amount: '27',
            currency: 'USD',
            order_id: orderId,
            url_return: `${siteUrl}/thank-you.html?provider=cryptomus&order_id=${orderId}`,
            url_callback: `${siteUrl}/.netlify/functions/cryptomus-webhook`,
            is_payment_multiple: false,
            lifetime: 3600,
            additional_data: JSON.stringify({
                email: email,
                product: 'main_course'
            })
        };

        // Create JSON body string first, then use it for both signing and sending
        const jsonBody = JSON.stringify(paymentData);
        const sign = generateSign(jsonBody, apiKey);

        console.log('Cryptomus request - Merchant UUID:', merchantUuid);
        console.log('Cryptomus request - API Key (first 8 chars):', apiKey.substring(0, 8));
        console.log('Cryptomus request - Order ID:', orderId);

        const response = await fetch(CRYPTOMUS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'merchant': merchantUuid,
                'sign': sign
            },
            body: jsonBody
        });

        const result = await response.json();

        if (!response.ok || result.state !== 0) {
            console.error('Cryptomus API error:', JSON.stringify(result));
            console.error('Cryptomus response status:', response.status);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: result.message || 'Failed to create crypto payment',
                    details: result
                })
            };
        }

        // Return the payment URL for redirect
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                paymentUrl: result.result.url,
                uuid: result.result.uuid,
                orderId: orderId
            })
        };

    } catch (error) {
        console.error('Cryptomus payment error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to create crypto payment' })
        };
    }
};
