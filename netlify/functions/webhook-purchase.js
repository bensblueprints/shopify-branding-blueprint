// Webhook receiver for GHL purchase events
// Captures Stripe customer ID for one-click upsells

const customers = new Map(); // In production, use a database like Redis or DynamoDB

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const payload = JSON.parse(event.body);

    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    // Extract customer data from GHL webhook
    // GHL sends different payload structures, so we check multiple paths
    const email = payload.email ||
                  payload.contact?.email ||
                  payload.customer?.email ||
                  payload.data?.email;

    const stripeCustomerId = payload.stripeCustomerId ||
                              payload.stripe_customer_id ||
                              payload.contact?.stripeCustomerId ||
                              payload.data?.stripeCustomerId ||
                              payload.payment?.customerId;

    const paymentMethodId = payload.paymentMethodId ||
                            payload.payment_method_id ||
                            payload.payment?.paymentMethodId ||
                            payload.data?.paymentMethodId;

    if (email && (stripeCustomerId || paymentMethodId)) {
      // Store customer data (in production, use a real database)
      const customerData = {
        email,
        stripeCustomerId,
        paymentMethodId,
        purchasedAt: new Date().toISOString(),
        products: ['main_course']
      };

      // For this demo, we'll return a token that encodes the customer info
      // In production, store in database and return a session token
      const token = Buffer.from(JSON.stringify({
        email,
        cid: stripeCustomerId,
        pmid: paymentMethodId,
        ts: Date.now()
      })).toString('base64');

      console.log('Customer data captured:', { email, stripeCustomerId: stripeCustomerId?.slice(0, 10) + '...' });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Purchase recorded',
          upsellToken: token
        })
      };
    }

    // If we can't extract the needed data, still return success
    // (don't break the GHL webhook flow)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Webhook received but missing customer data for upsells'
      })
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 200, // Return 200 to not break GHL webhook
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
