// One-click upsell charge function
// Charges customer's saved payment method via Stripe

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Product prices in cents
const PRODUCTS = {
  canva_kit: {
    name: 'Done-For-You Canva Brand Kit',
    price: 2700, // $27.00
    productId: '69781a65ca50037639df9f5a'
  },
  email_swipe: {
    name: 'Email Sequence Swipe File',
    price: 1900, // $19.00
    productId: '69781a667a096c97959ce1da'
  },
  fb_ads: {
    name: 'Facebook Ads for Brands Masterclass',
    price: 9700, // $97.00
    productId: '69781a68f4da0e6f334cb915'
  },
  inner_circle: {
    name: 'Brand Builders Inner Circle (Monthly)',
    price: 4700, // $47.00/month
    productId: '69781a6aa243f6c59b1ecead',
    recurring: true
  }
};

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { token, productKey } = JSON.parse(event.body);

    // Validate inputs
    if (!token || !productKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing token or product' })
      };
    }

    // Decode the customer token
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

    // Check token expiry (valid for 30 minutes)
    if (Date.now() - customerData.ts > 30 * 60 * 1000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Session expired. Please start over.' })
      };
    }

    // Get product details
    const product = PRODUCTS[productKey];
    if (!product) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid product' })
      };
    }

    const { cid: stripeCustomerId, pmid: paymentMethodId, email } = customerData;

    if (!stripeCustomerId && !paymentMethodId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'No payment method available' })
      };
    }

    let charge;

    if (product.recurring) {
      // Create a subscription for recurring products
      // First, create or get a price
      const price = await stripe.prices.create({
        unit_amount: product.price,
        currency: 'usd',
        recurring: { interval: 'month' },
        product_data: {
          name: product.name,
        },
      });

      // Create subscription
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

    } else {
      // Create a one-time payment intent
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
    }

    console.log('Charge successful:', {
      email,
      product: product.name,
      chargeId: charge.id
    });

    // TODO: Trigger GHL webhook/automation to grant access to the product
    // You can call GHL API here to add tags, grant course access, etc.

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

    // Handle specific Stripe errors
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
