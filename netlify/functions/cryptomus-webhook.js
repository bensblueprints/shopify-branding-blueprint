// Cryptomus Webhook Handler with Neon database
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

function verifySign(data, receivedSign, apiKey) {
    const dataWithoutSign = { ...data };
    delete dataWithoutSign.sign;
    const jsonData = JSON.stringify(dataWithoutSign);
    const base64Data = Buffer.from(jsonData).toString('base64');
    const expectedSign = crypto.createHash('md5').update(base64Data + apiKey).digest('hex');
    return expectedSign === receivedSign;
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
        const apiKey = process.env.CRYPTOMUS_PAYMENT_API_KEY;

        // Verify webhook signature
        if (!verifySign(payload, payload.sign, apiKey)) {
            console.error('Invalid webhook signature');
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid signature' }) };
        }

        console.log('Cryptomus webhook received:', JSON.stringify(payload, null, 2));

        const { status, order_id, amount, currency, txid, additional_data } = payload;

        // Parse additional data to get email
        let customerEmail = '';
        let product = 'main_course';
        try {
            const additionalInfo = JSON.parse(additional_data || '{}');
            customerEmail = additionalInfo.email || '';
            product = additionalInfo.product || 'main_course';
        } catch (e) {
            console.error('Failed to parse additional_data:', e);
        }

        // Handle different payment statuses
        if (status === 'paid' || status === 'paid_over') {
            console.log(`Payment successful for order ${order_id}`);

            if (customerEmail) {
                const normalizedEmail = customerEmail.toLowerCase().trim();

                // Check if customer exists
                const existingCustomers = await sql`
                    SELECT * FROM customers WHERE email = ${normalizedEmail}
                `;

                if (existingCustomers.length === 0) {
                    // Create new customer
                    await sql`
                        INSERT INTO customers (email, payment_provider, payment_id, order_id, amount_paid, currency, products_purchased)
                        VALUES (${normalizedEmail}, 'cryptomus', ${txid}, ${order_id}, ${parseFloat(amount)}, ${currency}, ARRAY[${product}])
                    `;
                } else {
                    // Update existing customer
                    const existingCustomer = existingCustomers[0];
                    const updatedProducts = [...(existingCustomer.products_purchased || []), product];
                    await sql`
                        UPDATE customers
                        SET products_purchased = ${updatedProducts}, updated_at = NOW()
                        WHERE email = ${normalizedEmail}
                    `;
                }

                // Also create/update user for portal access
                const existingUsers = await sql`
                    SELECT * FROM users WHERE email = ${normalizedEmail}
                `;

                if (existingUsers.length === 0) {
                    await sql`
                        INSERT INTO users (email, full_name)
                        VALUES (${normalizedEmail}, ${normalizedEmail.split('@')[0]})
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
                        payment_provider: 'cryptomus',
                        transaction_id: txid,
                        order_id: order_id
                    })
                });
            }

            return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
        }

        if (status === 'cancel' || status === 'fail' || status === 'system_fail') {
            console.log(`Payment failed/cancelled for order ${order_id}: ${status}`);
            return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
        }

        if (status === 'wrong_amount') {
            console.log(`Wrong amount received for order ${order_id}`);
            return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
        }

        // For other statuses (confirm_check, etc.), just acknowledge
        return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };

    } catch (error) {
        console.error('Webhook processing error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Webhook processing failed' }) };
    }
};
