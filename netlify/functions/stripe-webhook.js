// Stripe Webhook Handler
// Receives Stripe events, creates users in Supabase, and sends webhooks to GoHighLevel

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Product mapping - matches the upsell products
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

// GoHighLevel webhook URLs - set these in Netlify environment variables
// GHL_WEBHOOK_BASE_URL = Your GHL webhook URL base
// You'll create webhooks in GHL for each product/combination

async function sendGHLWebhook(webhookUrl, payload) {
  if (!webhookUrl) {
    console.log('No GHL webhook URL configured, skipping...');
    return null;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
  const headers = {
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Verify the webhook signature
    if (webhookSecret && sig) {
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    } else {
      // For testing without signature verification
      stripeEvent = JSON.parse(event.body);
      console.warn('⚠️ Webhook signature not verified - set STRIPE_WEBHOOK_SECRET');
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

  // Handle the event
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

// =====================================
// SUPABASE HELPER FUNCTIONS
// =====================================

async function getOrCreateUser(email, stripeCustomerId, customerName = '') {
    if (!email) return null;

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

    if (user) {
        // Update Stripe customer ID if not set
        if (!user.stripe_customer_id && stripeCustomerId) {
            await supabase
                .from('users')
                .update({ stripe_customer_id: stripeCustomerId })
                .eq('id', user.id);
        }
        return user;
    }

    // Create new user
    const { data: newUser, error } = await supabase
        .from('users')
        .insert({
            email: normalizedEmail,
            full_name: customerName,
            stripe_customer_id: stripeCustomerId,
            email_verified: true
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to create user:', error);
        return null;
    }

    console.log('Created new user:', newUser.id);
    return newUser;
}

async function getProductByKey(productKey) {
    const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('product_key', productKey)
        .single();
    return product;
}

async function createPurchase(userId, productId, data) {
    const { data: purchase, error } = await supabase
        .from('purchases')
        .insert({
            user_id: userId,
            product_id: productId,
            stripe_payment_intent_id: data.paymentIntentId,
            stripe_checkout_session_id: data.sessionId,
            stripe_subscription_id: data.subscriptionId,
            amount_cents: data.amountCents,
            is_upsell: data.isUpsell || false,
            source: data.source || 'checkout',
            status: 'completed'
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to create purchase:', error);
        return null;
    }

    return purchase;
}

async function createEnrollment(userId, courseId, purchaseId) {
    // Check if enrollment exists
    const { data: existing } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

    if (existing) {
        // Reactivate if revoked
        await supabase
            .from('enrollments')
            .update({ status: 'active', purchase_id: purchaseId })
            .eq('id', existing.id);
        return existing;
    }

    // Create new enrollment
    const { data: enrollment, error } = await supabase
        .from('enrollments')
        .insert({
            user_id: userId,
            course_id: courseId,
            purchase_id: purchaseId,
            status: 'active'
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to create enrollment:', error);
        return null;
    }

    console.log('Created enrollment for user', userId, 'in course', courseId);
    return enrollment;
}

// =====================================
// CHECKOUT HANDLER
// =====================================

async function handleCheckoutComplete(session) {
  const email = session.customer_email || session.customer_details?.email;
  const customerName = session.customer_details?.name || '';
  const productKey = session.metadata?.product || 'main_course';
  const product = PRODUCTS[productKey];

  console.log('Checkout completed:', { email, productKey, amount: session.amount_total });

  // =====================================
  // SUPABASE: Create user, purchase, and enrollment
  // =====================================
  try {
      const user = await getOrCreateUser(email, session.customer, customerName);

      if (user) {
          const dbProduct = await getProductByKey(productKey);

          if (dbProduct) {
              const purchase = await createPurchase(user.id, dbProduct.id, {
                  paymentIntentId: session.payment_intent,
                  sessionId: session.id,
                  amountCents: session.amount_total,
                  source: 'checkout'
              });

              // Create enrollments for any courses linked to this product
              if (dbProduct.course_ids && dbProduct.course_ids.length > 0) {
                  for (const courseId of dbProduct.course_ids) {
                      await createEnrollment(user.id, courseId, purchase?.id);
                  }
              }
          }
      }
  } catch (supabaseError) {
      console.error('Supabase error:', supabaseError);
      // Continue with GHL webhook even if Supabase fails
  }

  // =====================================
  // GHL WEBHOOKS (existing logic)
  // =====================================

  // Build the webhook payload
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

  // Send to main purchase webhook
  const mainWebhookUrl = process.env.GHL_WEBHOOK_PURCHASE;
  await sendGHLWebhook(mainWebhookUrl, payload);

  // Send to product-specific webhook
  const productWebhookUrl = process.env[`GHL_WEBHOOK_${productKey.toUpperCase()}`];
  if (productWebhookUrl) {
    await sendGHLWebhook(productWebhookUrl, payload);
  }
}

async function handlePaymentSuccess(paymentIntent) {
  // This handles one-click upsell payments
  const email = paymentIntent.metadata?.email;
  const productKey = paymentIntent.metadata?.productKey;
  const source = paymentIntent.metadata?.source;

  if (source !== 'one_click_upsell') {
    return; // Only handle upsell payments here
  }

  const product = PRODUCTS[productKey];

  console.log('Upsell payment succeeded:', { email, productKey, amount: paymentIntent.amount });

  // =====================================
  // SUPABASE: Create purchase and enrollment for upsell
  // =====================================
  try {
      const user = await getOrCreateUser(email, paymentIntent.customer);

      if (user) {
          const dbProduct = await getProductByKey(productKey);

          if (dbProduct) {
              const purchase = await createPurchase(user.id, dbProduct.id, {
                  paymentIntentId: paymentIntent.id,
                  amountCents: paymentIntent.amount,
                  isUpsell: true,
                  source: 'one_click_upsell'
              });

              // Create enrollments for any courses linked to this product
              if (dbProduct.course_ids && dbProduct.course_ids.length > 0) {
                  for (const courseId of dbProduct.course_ids) {
                      await createEnrollment(user.id, courseId, purchase?.id);
                  }
              }
          }
      }
  } catch (supabaseError) {
      console.error('Supabase upsell error:', supabaseError);
  }

  // =====================================
  // GHL WEBHOOKS (existing logic)
  // =====================================

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

  // Send to upsell webhook
  const upsellWebhookUrl = process.env.GHL_WEBHOOK_UPSELL;
  await sendGHLWebhook(upsellWebhookUrl, payload);

  // Send to product-specific webhook
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

  // =====================================
  // SUPABASE: Create purchase for subscription
  // =====================================
  try {
      const user = await getOrCreateUser(email, subscription.customer);

      if (user) {
          const dbProduct = await getProductByKey(productKey);

          if (dbProduct) {
              await createPurchase(user.id, dbProduct.id, {
                  subscriptionId: subscription.id,
                  amountCents: subscription.items?.data[0]?.price?.unit_amount || 4700,
                  isUpsell: true,
                  source: 'subscription'
              });
          }
      }
  } catch (supabaseError) {
      console.error('Supabase subscription error:', supabaseError);
  }

  // =====================================
  // GHL WEBHOOKS (existing logic)
  // =====================================

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

  // Send to subscription webhook
  const subscriptionWebhookUrl = process.env.GHL_WEBHOOK_SUBSCRIPTION;
  await sendGHLWebhook(subscriptionWebhookUrl, payload);

  // Send to inner circle specific webhook
  const innerCircleWebhookUrl = process.env.GHL_WEBHOOK_INNER_CIRCLE;
  if (innerCircleWebhookUrl) {
    await sendGHLWebhook(innerCircleWebhookUrl, payload);
  }
}
