// Stripe Checkout Session Creator
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = {
  main_course: {
    name: '7-Day Shopify Branding Blueprint',
    price: 2700, // $27.00
    description: 'Complete 7-day system for building a 6-7 figure Shopify brand'
  }
};

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
    const { email } = JSON.parse(event.body || '{}');
    const product = PRODUCTS.main_course;

    // Get the site URL for redirects
    const siteUrl = process.env.URL || 'https://shopify-branding-blueprint.netlify.app';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.price,
          },
          quantity: 1,
        }
      ],
      success_url: `${siteUrl}/upsell.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#pricing`,
      metadata: {
        product: 'main_course',
        source: 'landing_page'
      },
      // Save payment method for future upsells
      payment_intent_data: {
        setup_future_usage: 'off_session',
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url
      })
    };

  } catch (error) {
    console.error('Checkout error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create checkout session' })
    };
  }
};
