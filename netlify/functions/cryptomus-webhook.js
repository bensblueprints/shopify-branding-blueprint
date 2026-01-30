// Cryptomus Webhook Handler
const crypto = require('crypto');

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

            // Create customer in Supabase (similar to Stripe webhook)
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            // Check if customer exists
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('*')
                .eq('email', customerEmail)
                .single();

            if (!existingCustomer && customerEmail) {
                // Create new customer
                await supabase.from('customers').insert({
                    email: customerEmail,
                    payment_provider: 'cryptomus',
                    payment_id: txid,
                    order_id: order_id,
                    amount_paid: parseFloat(amount),
                    currency: currency,
                    products_purchased: [product],
                    created_at: new Date().toISOString()
                });
            } else if (existingCustomer) {
                // Update existing customer
                const updatedProducts = [...(existingCustomer.products_purchased || []), product];
                await supabase.from('customers').update({
                    products_purchased: updatedProducts,
                    updated_at: new Date().toISOString()
                }).eq('email', customerEmail);
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
