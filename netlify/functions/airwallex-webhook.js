// Airwallex Webhook Handler

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
            const { id, merchant_order_id, amount, currency, metadata } = data;
            const customerEmail = metadata?.email || '';
            const product = metadata?.product || 'main_course';

            console.log(`Payment successful for order ${merchant_order_id}`);

            // Create customer in Supabase
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
                    payment_provider: 'airwallex',
                    payment_id: id,
                    order_id: merchant_order_id,
                    amount_paid: amount,
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
                        payment_provider: 'airwallex',
                        transaction_id: id,
                        order_id: merchant_order_id
                    })
                });
            }

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
