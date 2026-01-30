// One-click upsell charge function with Neon database
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const AIRWALLEX_API_URL = process.env.AIRWALLEX_ENV === 'production'
    ? 'https://api.airwallex.com'
    : 'https://api-demo.airwallex.com';

// Product prices in cents
const PRODUCTS = {
    canva_kit: {
        name: 'Done-For-You Canva Brand Kit',
        price: 2700,
        ghlTag: 'purchased_canva_kit'
    },
    email_swipe: {
        name: 'Email Sequence Swipe File',
        price: 1900,
        ghlTag: 'purchased_email_swipe'
    },
    fb_ads: {
        name: 'Facebook Ads for Brands Masterclass',
        price: 9700,
        ghlTag: 'purchased_fb_ads'
    },
    inner_circle: {
        name: 'Brand Builders Inner Circle (Monthly)',
        price: 4700,
        ghlTag: 'purchased_inner_circle',
        recurring: true
    }
};

async function getAirwallexToken() {
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

async function chargeAirwallex(customerId, paymentConsentId, amount, product, email) {
    const accessToken = await getAirwallexToken();
    const requestId = `req_upsell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const piResponse = await fetch(`${AIRWALLEX_API_URL}/api/v1/pa/payment_intents/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            request_id: requestId,
            amount: amount / 100,
            currency: 'USD',
            merchant_order_id: `upsell_${Date.now()}`,
            metadata: {
                email: email,
                product: product.name,
                source: 'one_click_upsell'
            }
        })
    });

    const piResult = await piResponse.json();
    if (!piResponse.ok) {
        throw new Error(piResult.message || 'Failed to create payment intent');
    }

    const confirmResponse = await fetch(
        `${AIRWALLEX_API_URL}/api/v1/pa/payment_intents/${piResult.id}/confirm`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                request_id: `confirm_${requestId}`,
                payment_consent_id: paymentConsentId
            })
        }
    );

    const confirmResult = await confirmResponse.json();
    if (!confirmResponse.ok) {
        throw new Error(confirmResult.message || 'Failed to confirm payment');
    }

    return {
        id: confirmResult.id,
        amount: amount,
        status: confirmResult.status,
        type: 'one_time',
        provider: 'airwallex'
    };
}

async function sendGHLWebhook(webhookUrl, payload) {
    if (!webhookUrl) {
        console.log('No GHL webhook URL configured, skipping...');
        return null;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error('GHL webhook failed:', response.status);
            return null;
        }

        console.log('GHL webhook sent successfully');
        return true;
    } catch (error) {
        console.error('GHL webhook error:', error);
        return null;
    }
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const { token, productKey } = JSON.parse(event.body);

        if (!token || !productKey) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Missing token or product' })
            };
        }

        let customerData;
        try {
            customerData = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Invalid token' })
            };
        }

        // Extend token validity to 24 hours for upsells
        if (Date.now() - customerData.ts > 24 * 60 * 60 * 1000) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Session expired. Please start over.' })
            };
        }

        const product = PRODUCTS[productKey];
        if (!product) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Invalid product' })
            };
        }

        let {
            cid: stripeCustomerId,
            pmid: paymentMethodId,
            email,
            provider,
            awcid: airwallexCustomerId,
            pcid: paymentConsentId
        } = customerData;

        // If missing payment data, try to get from database
        if (email && (!stripeCustomerId || !paymentMethodId) && !airwallexCustomerId) {
            console.log('Token missing payment data, checking database for:', email);
            const normalizedEmail = email.toLowerCase().trim();

            const dbCustomers = await sql`
                SELECT stripe_customer_id, airwallex_customer_id, airwallex_payment_consent_id, payment_provider
                FROM customers
                WHERE email = ${normalizedEmail}
            `;

            if (dbCustomers.length > 0) {
                const dbCustomer = dbCustomers[0];
                console.log('Found customer in database:', dbCustomer);

                if (dbCustomer.payment_provider === 'airwallex' && dbCustomer.airwallex_customer_id) {
                    provider = 'airwallex';
                    airwallexCustomerId = dbCustomer.airwallex_customer_id;
                    paymentConsentId = dbCustomer.airwallex_payment_consent_id;
                } else if (dbCustomer.stripe_customer_id) {
                    stripeCustomerId = dbCustomer.stripe_customer_id;

                    // Get default payment method from Stripe
                    if (!paymentMethodId) {
                        try {
                            const customer = await stripe.customers.retrieve(stripeCustomerId);
                            paymentMethodId = customer.invoice_settings?.default_payment_method;

                            // If no default, get the most recent payment method
                            if (!paymentMethodId) {
                                const paymentMethods = await stripe.paymentMethods.list({
                                    customer: stripeCustomerId,
                                    type: 'card',
                                    limit: 1
                                });
                                if (paymentMethods.data.length > 0) {
                                    paymentMethodId = paymentMethods.data[0].id;
                                }
                            }
                            console.log('Retrieved payment method from Stripe:', paymentMethodId);
                        } catch (stripeErr) {
                            console.error('Error getting payment method from Stripe:', stripeErr);
                        }
                    }
                }
            }
        }

        let charge;
        let ghlPayload;

        // Handle Airwallex payments
        if (provider === 'airwallex' || airwallexCustomerId) {
            if (!airwallexCustomerId || !paymentConsentId) {
                // Try to get from database
                const customers = await sql`
                    SELECT airwallex_customer_id, airwallex_payment_consent_id
                    FROM customers
                    WHERE email = ${email}
                `;

                const customer = customers[0];

                if (!customer?.airwallex_customer_id || !customer?.airwallex_payment_consent_id) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ success: false, error: 'No saved payment method found' })
                    };
                }

                charge = await chargeAirwallex(
                    customer.airwallex_customer_id,
                    customer.airwallex_payment_consent_id,
                    product.price,
                    product,
                    email
                );
            } else {
                charge = await chargeAirwallex(
                    airwallexCustomerId,
                    paymentConsentId,
                    product.price,
                    product,
                    email
                );
            }

            ghlPayload = {
                event: 'upsell_purchase',
                timestamp: new Date().toISOString(),
                customer: {
                    email,
                    airwallexCustomerId: airwallexCustomerId || charge.customerId,
                },
                purchase: {
                    productKey,
                    productName: product.name,
                    amount: product.price / 100,
                    currency: 'USD',
                    paymentId: charge.id,
                    isUpsell: true,
                    provider: 'airwallex'
                },
                tags: [product.ghlTag, 'upsell_buyer'],
                source: 'one_click_upsell'
            };

        } else {
            // Handle Stripe payments
            if (!stripeCustomerId && !paymentMethodId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: 'No payment method available' })
                };
            }

            if (product.recurring) {
                const price = await stripe.prices.create({
                    unit_amount: product.price,
                    currency: 'usd',
                    recurring: { interval: 'month' },
                    product_data: { name: product.name },
                });

                const subscription = await stripe.subscriptions.create({
                    customer: stripeCustomerId,
                    items: [{ price: price.id }],
                    default_payment_method: paymentMethodId,
                    metadata: {
                        productKey,
                        email,
                        source: 'one_click_upsell'
                    }
                });

                charge = {
                    id: subscription.id,
                    amount: product.price,
                    status: subscription.status,
                    type: 'subscription'
                };

                ghlPayload = {
                    event: 'subscription_created',
                    timestamp: new Date().toISOString(),
                    customer: { email, stripeCustomerId },
                    subscription: {
                        subscriptionId: subscription.id,
                        productKey,
                        productName: product.name,
                        amount: product.price / 100,
                        interval: 'month',
                        status: subscription.status
                    },
                    tags: [product.ghlTag, 'upsell_buyer', 'subscriber'],
                    source: 'one_click_upsell'
                };

            } else {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: product.price,
                    currency: 'usd',
                    customer: stripeCustomerId,
                    payment_method: paymentMethodId,
                    off_session: true,
                    confirm: true,
                    description: product.name,
                    metadata: {
                        productKey,
                        email,
                        source: 'one_click_upsell'
                    }
                });

                charge = {
                    id: paymentIntent.id,
                    amount: paymentIntent.amount,
                    status: paymentIntent.status,
                    type: 'one_time'
                };

                ghlPayload = {
                    event: 'upsell_purchase',
                    timestamp: new Date().toISOString(),
                    customer: { email, stripeCustomerId },
                    purchase: {
                        productKey,
                        productName: product.name,
                        amount: product.price / 100,
                        currency: 'USD',
                        paymentId: paymentIntent.id,
                        isUpsell: true
                    },
                    tags: [product.ghlTag, 'upsell_buyer'],
                    source: 'one_click_upsell'
                };
            }
        }

        console.log('Charge successful:', { email, product: product.name, chargeId: charge.id });

        // Send webhooks to GoHighLevel
        const upsellWebhookUrl = process.env.GHL_WEBHOOK_UPSELL;
        if (upsellWebhookUrl) {
            await sendGHLWebhook(upsellWebhookUrl, ghlPayload);
        }

        const productWebhookUrl = process.env[`GHL_WEBHOOK_${productKey.toUpperCase()}`];
        if (productWebhookUrl) {
            await sendGHLWebhook(productWebhookUrl, ghlPayload);
        }

        if (product.recurring) {
            const subscriptionWebhookUrl = process.env.GHL_WEBHOOK_SUBSCRIPTION;
            if (subscriptionWebhookUrl) {
                await sendGHLWebhook(subscriptionWebhookUrl, ghlPayload);
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Successfully purchased ${product.name}!`,
                charge: {
                    id: charge.id,
                    amount: charge.amount / 100,
                    product: product.name
                }
            })
        };

    } catch (error) {
        console.error('Charge error:', error);

        if (error.type === 'StripeCardError') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Card declined. Please use a different payment method.'
                })
            };
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Payment failed. Please try again.'
            })
        };
    }
};
