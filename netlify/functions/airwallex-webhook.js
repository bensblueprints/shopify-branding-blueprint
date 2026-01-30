// Airwallex Webhook Handler with Neon database
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const AIRWALLEX_API_URL = process.env.AIRWALLEX_ENV === 'production'
    ? 'https://api.airwallex.com'
    : 'https://api-demo.airwallex.com';

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
        throw new Error('Failed to authenticate with Airwallex');
    }

    const data = await response.json();
    return data.token;
}

async function getPaymentConsent(accessToken, customerId) {
    try {
        const response = await fetch(
            `${AIRWALLEX_API_URL}/api/v1/pa/payment_consents?customer_id=${customerId}&page_size=1`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (response.ok) {
            const result = await response.json();
            if (result.items && result.items.length > 0) {
                return result.items[0];
            }
        }
        return null;
    } catch (error) {
        console.error('Error fetching payment consent:', error);
        return null;
    }
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const payload = JSON.parse(event.body);

        console.log('Airwallex webhook received:', JSON.stringify(payload, null, 2));

        const { name, data } = payload;

        // Handle payment_intent.succeeded event
        if (name === 'payment_intent.succeeded') {
            const { id, merchant_order_id, amount, currency, metadata, customer_id, latest_payment_attempt } = data;
            const customerEmail = metadata?.email || '';
            const product = metadata?.product || 'main_course';
            const airwallexCustomerId = customer_id || metadata?.customer_id;

            console.log(`Payment successful for order ${merchant_order_id}, customer: ${airwallexCustomerId}`);

            // Try to get payment consent for 1-click upsells
            let paymentConsentId = null;
            if (airwallexCustomerId) {
                try {
                    const accessToken = await getAccessToken();
                    const consent = await getPaymentConsent(accessToken, airwallexCustomerId);
                    if (consent) {
                        paymentConsentId = consent.id;
                        console.log('Found payment consent:', paymentConsentId);
                    }
                } catch (err) {
                    console.error('Error getting payment consent:', err);
                }
            }

            if (customerEmail) {
                const normalizedEmail = customerEmail.toLowerCase().trim();

                // Check if customer exists
                const existingCustomers = await sql`
                    SELECT * FROM customers WHERE email = ${normalizedEmail}
                `;

                if (existingCustomers.length === 0) {
                    // Create new customer with Airwallex IDs for 1-click
                    await sql`
                        INSERT INTO customers (email, payment_provider, payment_id, order_id, amount_paid, currency, products_purchased, airwallex_customer_id, airwallex_payment_consent_id)
                        VALUES (${normalizedEmail}, 'airwallex', ${id}, ${merchant_order_id}, ${amount}, ${currency}, ARRAY[${product}], ${airwallexCustomerId}, ${paymentConsentId})
                    `;
                } else {
                    // Update existing customer
                    const existingCustomer = existingCustomers[0];
                    const updatedProducts = [...(existingCustomer.products_purchased || []), product];

                    await sql`
                        UPDATE customers
                        SET products_purchased = ${updatedProducts},
                            airwallex_customer_id = COALESCE(${airwallexCustomerId}, airwallex_customer_id),
                            airwallex_payment_consent_id = COALESCE(${paymentConsentId}, airwallex_payment_consent_id),
                            updated_at = NOW()
                        WHERE email = ${normalizedEmail}
                    `;
                }

                // Also create/update user for portal access
                const existingUsers = await sql`
                    SELECT * FROM users WHERE email = ${normalizedEmail}
                `;

                if (existingUsers.length === 0) {
                    await sql`
                        INSERT INTO users (email, full_name, airwallex_customer_id)
                        VALUES (${normalizedEmail}, ${normalizedEmail.split('@')[0]}, ${airwallexCustomerId})
                    `;
                } else if (airwallexCustomerId) {
                    await sql`
                        UPDATE users SET airwallex_customer_id = ${airwallexCustomerId}
                        WHERE email = ${normalizedEmail}
                    `;
                }

                // Create enrollment
                const users = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;
                const courses = await sql`SELECT id FROM courses LIMIT 1`;

                if (users.length > 0 && courses.length > 0) {
                    const userId = users[0].id;
                    const courseId = courses[0].id;

                    const existingEnrollment = await sql`
                        SELECT id FROM enrollments WHERE user_id = ${userId} AND course_id = ${courseId}
                    `;

                    if (existingEnrollment.length === 0) {
                        await sql`
                            INSERT INTO enrollments (user_id, course_id, status)
                            VALUES (${userId}, ${courseId}, 'active')
                        `;
                    }
                }
            }

            // Trigger GHL webhook if configured
            const ghlWebhook = process.env.GHL_WEBHOOK_PURCHASE;
            if (ghlWebhook) {
                await fetch(ghlWebhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: customerEmail,
                        product: product,
                        amount: amount,
                        currency: currency,
                        payment_provider: 'airwallex',
                        transaction_id: id,
                        order_id: merchant_order_id
                    })
                });
            }

            return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
        }

        // Handle payment_consent.created event for 1-click upsells
        if (name === 'payment_consent.created' || name === 'payment_consent.verified') {
            const { customer_id, id: consentId } = data;
            console.log(`Payment consent ${name}: ${consentId} for customer ${customer_id}`);

            // Update customer with consent ID
            await sql`
                UPDATE customers
                SET airwallex_payment_consent_id = ${consentId}, updated_at = NOW()
                WHERE airwallex_customer_id = ${customer_id}
            `;

            return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
        }

        // Handle payment_intent.payment_failed event
        if (name === 'payment_intent.payment_failed') {
            console.log(`Payment failed for order ${data.merchant_order_id}`);
            return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
        }

        // Acknowledge other events
        return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };

    } catch (error) {
        console.error('Webhook processing error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Webhook processing failed' }) };
    }
};
