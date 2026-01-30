// Get Airwallex session data with Neon database
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

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
        const { customerId, orderId } = JSON.parse(event.body);

        if (!customerId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Customer ID required' })
            };
        }

        // Find customer by Airwallex customer ID
        const customers = await sql`
            SELECT email, airwallex_customer_id, airwallex_payment_consent_id
            FROM customers
            WHERE airwallex_customer_id = ${customerId}
        `;

        if (customers.length === 0) {
            console.log('Customer not found by Airwallex ID, may still be processing');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Customer not found yet',
                    email: null
                })
            };
        }

        const customer = customers[0];

        // Create token for 1-click upsell
        const tokenData = {
            provider: 'airwallex',
            awcid: customer.airwallex_customer_id,
            pcid: customer.airwallex_payment_consent_id,
            email: customer.email,
            ts: Date.now()
        };

        const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                token: token,
                email: customer.email,
                hasPaymentConsent: !!customer.airwallex_payment_consent_id
            })
        };

    } catch (error) {
        console.error('Get Airwallex session error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to get session' })
        };
    }
};
