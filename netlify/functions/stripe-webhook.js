// Stripe Webhook Handler
// Receives Stripe events and sends webhooks to GoHighLevel

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

async function handleCheckoutComplete(session) {
  const email = session.customer_email || session.customer_details?.email;
  const customerName = session.customer_details?.name || '';
  const productKey = session.metadata?.product || 'main_course';
  const product = PRODUCTS[productKey];

  console.log('Checkout completed:', { email, productKey, amount: session.amount_total });

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
  const productKey = subscription.metadata?.productKey;
  const product = PRODUCTS[productKey];

  console.log('Subscription created:', { email, productKey });

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
