// Get Stripe session details for upsell flow
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    const { sessionId } = JSON.parse(event.body || '{}');

    if (!sessionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Session ID required' })
      };
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'payment_intent.payment_method']
    });

    if (session.payment_status !== 'paid') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Payment not completed' })
      };
    }

    // Get customer and payment method for one-click upsells
    const customerId = session.customer;
    const paymentMethodId = session.payment_intent?.payment_method?.id;

    // Create a token for the upsell flow (valid for 30 minutes)
    const tokenData = {
      cid: customerId,
      pmid: paymentMethodId,
      email: session.customer_email,
      ts: Date.now()
    };

    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token,
        email: session.customer_email,
        customerName: session.customer_details?.name
      })
    };

  } catch (error) {
    console.error('Session retrieval error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve session' })
    };
  }
};
