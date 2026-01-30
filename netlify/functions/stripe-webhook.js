// Stripe Webhook Handler with Neon database
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

// Product mapping
const PRODUCTS = {
    main_course: {
        name: '7-Day Shopify Branding Blueprint',
        ghlTag: 'purchased_main_course',
        ghlProductId: 'main_course'
    },
    canva_kit: {
        name: 'Done-For-You Canva Brand Kit',
        ghlTag: 'purchased_canva_kit',
        ghlProductId: 'canva_kit'
    },
    email_swipe: {
        name: 'Email Sequence Swipe File',
        ghlTag: 'purchased_email_swipe',
        ghlProductId: 'email_swipe'
    },
    fb_ads: {
        name: 'Facebook Ads for Brands Masterclass',
        ghlTag: 'purchased_fb_ads',
        ghlProductId: 'fb_ads'
    },
    inner_circle: {
        name: 'Brand Builders Inner Circle',
        ghlTag: 'purchased_inner_circle',
        ghlProductId: 'inner_circle'
    }
};

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
            console.error('GHL webhook failed:', response.status, await response.text());
            return null;
        }

        console.log('GHL webhook sent successfully to:', webhookUrl);
        return await response.json().catch(() => ({ success: true }));
    } catch (error) {
        console.error('GHL webhook error:', error);
        return null;
    }
}

exports.handler = async (event, context) => {
    const headers = { 'Content-Type': 'application/json' };

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let stripeEvent;

    try {
        if (webhookSecret && sig) {
            stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
        } else {
            stripeEvent = JSON.parse(event.body);
            console.warn('Webhook signature not verified - set STRIPE_WEBHOOK_SECRET');
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
        };
    }

    console.log('Received Stripe event:', stripeEvent.type);

    switch (stripeEvent.type) {
        case 'checkout.session.completed': {
            const session = stripeEvent.data.object;
            await handleCheckoutComplete(session);
            break;
        }

        case 'payment_intent.succeeded': {
            const paymentIntent = stripeEvent.data.object;
            await handlePaymentSuccess(paymentIntent);
            break;
        }

        case 'customer.subscription.created': {
            const subscription = stripeEvent.data.object;
            await handleSubscriptionCreated(subscription);
            break;
        }

        default:
            console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ received: true })
    };
};

// Neon helper functions
async function getOrCreateUser(email, stripeCustomerId, customerName = '') {
    if (!email) return null;

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const users = await sql`
        SELECT * FROM users WHERE email = ${normalizedEmail}
    `;

    if (users.length > 0) {
        const user = users[0];
        // Update Stripe customer ID if not set
        if (!user.stripe_customer_id && stripeCustomerId) {
            await sql`
                UPDATE users SET stripe_customer_id = ${stripeCustomerId}
                WHERE id = ${user.id}
            `;
        }
        return user;
    }

    // Create new user
    const newUsers = await sql`
        INSERT INTO users (email, full_name, stripe_customer_id)
        VALUES (${normalizedEmail}, ${customerName}, ${stripeCustomerId})
        RETURNING *
    `;

    if (newUsers.length > 0) {
        console.log('Created new user:', newUsers[0].id);
        return newUsers[0];
    }

    return null;
}

async function getProductByKey(productKey) {
    const products = await sql`
        SELECT * FROM products WHERE product_key = ${productKey}
    `;
    return products[0] || null;
}

async function createPurchase(userId, productId, data) {
    try {
        const purchases = await sql`
            INSERT INTO purchases (user_id, product_id, amount_cents, is_upsell, status)
            VALUES (${userId}, ${productId}, ${data.amountCents}, ${data.isUpsell || false}, 'completed')
            RETURNING *
        `;
        return purchases[0] || null;
    } catch (error) {
        console.error('Failed to create purchase:', error);
        return null;
    }
}

async function createEnrollment(userId, courseId, purchaseId) {
    // Check if enrollment exists
    const existing = await sql`
        SELECT id FROM enrollments
        WHERE user_id = ${userId} AND course_id = ${courseId}
    `;

    if (existing.length > 0) {
        // Reactivate if revoked
        await sql`
            UPDATE enrollments SET status = 'active'
            WHERE id = ${existing[0].id}
        `;
        return existing[0];
    }

    // Create new enrollment
    try {
        const enrollments = await sql`
            INSERT INTO enrollments (user_id, course_id, status)
            VALUES (${userId}, ${courseId}, 'active')
            RETURNING *
        `;
        console.log('Created enrollment for user', userId, 'in course', courseId);
        return enrollments[0] || null;
    } catch (error) {
        console.error('Failed to create enrollment:', error);
        return null;
    }
}

async function handleCheckoutComplete(session) {
    const email = session.customer_email || session.customer_details?.email;
    const customerName = session.customer_details?.name || '';
    const productKey = session.metadata?.product || 'main_course';
    const product = PRODUCTS[productKey];

    console.log('Checkout completed:', { email, productKey, amount: session.amount_total });

    // Create user, purchase, and enrollment
    try {
        const user = await getOrCreateUser(email, session.customer, customerName);

        if (user) {
            const dbProduct = await getProductByKey(productKey);

            if (dbProduct) {
                const purchase = await createPurchase(user.id, dbProduct.id, {
                    amountCents: session.amount_total,
                    source: 'checkout'
                });

                // Get main course for enrollment
                const courses = await sql`SELECT id FROM courses LIMIT 1`;
                if (courses.length > 0) {
                    await createEnrollment(user.id, courses[0].id, purchase?.id);
                }
            }
        }
    } catch (dbError) {
        console.error('Database error:', dbError);
    }

    // GHL Webhooks
    const payload = {
        event: 'purchase_complete',
        timestamp: new Date().toISOString(),
        customer: {
            email,
            name: customerName,
            stripeCustomerId: session.customer,
        },
        purchase: {
            productKey,
            productName: product?.name || productKey,
            amount: session.amount_total / 100,
            currency: session.currency?.toUpperCase() || 'USD',
            paymentId: session.payment_intent,
            sessionId: session.id
        },
        tags: [product?.ghlTag || `purchased_${productKey}`],
        source: 'stripe_checkout'
    };

    const mainWebhookUrl = process.env.GHL_WEBHOOK_PURCHASE;
    await sendGHLWebhook(mainWebhookUrl, payload);

    const productWebhookUrl = process.env[`GHL_WEBHOOK_${productKey.toUpperCase()}`];
    if (productWebhookUrl) {
        await sendGHLWebhook(productWebhookUrl, payload);
    }
}

async function handlePaymentSuccess(paymentIntent) {
    const email = paymentIntent.metadata?.email;
    const productKey = paymentIntent.metadata?.productKey;
    const source = paymentIntent.metadata?.source;

    if (source !== 'one_click_upsell') {
        return;
    }

    const product = PRODUCTS[productKey];

    console.log('Upsell payment succeeded:', { email, productKey, amount: paymentIntent.amount });

    try {
        const user = await getOrCreateUser(email, paymentIntent.customer);

        if (user) {
            const dbProduct = await getProductByKey(productKey);

            if (dbProduct) {
                await createPurchase(user.id, dbProduct.id, {
                    amountCents: paymentIntent.amount,
                    isUpsell: true,
                    source: 'one_click_upsell'
                });
            }
        }
    } catch (dbError) {
        console.error('Database upsell error:', dbError);
    }

    const payload = {
        event: 'upsell_purchase',
        timestamp: new Date().toISOString(),
        customer: {
            email,
            stripeCustomerId: paymentIntent.customer,
        },
        purchase: {
            productKey,
            productName: product?.name || productKey,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency?.toUpperCase() || 'USD',
            paymentId: paymentIntent.id,
            isUpsell: true
        },
        tags: [product?.ghlTag || `purchased_${productKey}`, 'upsell_buyer'],
        source: 'one_click_upsell'
    };

    const upsellWebhookUrl = process.env.GHL_WEBHOOK_UPSELL;
    await sendGHLWebhook(upsellWebhookUrl, payload);

    const productWebhookUrl = process.env[`GHL_WEBHOOK_${productKey.toUpperCase()}`];
    if (productWebhookUrl) {
        await sendGHLWebhook(productWebhookUrl, payload);
    }
}

async function handleSubscriptionCreated(subscription) {
    const email = subscription.metadata?.email;
    const productKey = subscription.metadata?.productKey || 'inner_circle';
    const product = PRODUCTS[productKey];

    console.log('Subscription created:', { email, productKey });

    try {
        const user = await getOrCreateUser(email, subscription.customer);

        if (user) {
            const dbProduct = await getProductByKey(productKey);

            if (dbProduct) {
                await createPurchase(user.id, dbProduct.id, {
                    amountCents: subscription.items?.data[0]?.price?.unit_amount || 4700,
                    isUpsell: true,
                    source: 'subscription'
                });
            }
        }
    } catch (dbError) {
        console.error('Database subscription error:', dbError);
    }

    const payload = {
        event: 'subscription_created',
        timestamp: new Date().toISOString(),
        customer: {
            email,
            stripeCustomerId: subscription.customer,
        },
        subscription: {
            subscriptionId: subscription.id,
            productKey,
            productName: product?.name || productKey,
            amount: subscription.items?.data[0]?.price?.unit_amount / 100,
            interval: subscription.items?.data[0]?.price?.recurring?.interval,
            status: subscription.status
        },
        tags: [product?.ghlTag || `purchased_${productKey}`, 'subscriber', 'inner_circle_member'],
        source: 'stripe_subscription'
    };

    const subscriptionWebhookUrl = process.env.GHL_WEBHOOK_SUBSCRIPTION;
    await sendGHLWebhook(subscriptionWebhookUrl, payload);

    const innerCircleWebhookUrl = process.env.GHL_WEBHOOK_INNER_CIRCLE;
    if (innerCircleWebhookUrl) {
        await sendGHLWebhook(innerCircleWebhookUrl, payload);
    }
}
