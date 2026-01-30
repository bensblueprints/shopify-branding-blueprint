// Get Stripe session details for upsell flow - with database storage
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

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

    // Retrieve the checkout session with expanded data
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'payment_intent', 'payment_intent.payment_method']
    });

    if (session.payment_status !== 'paid') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Payment not completed' })
      };
    }

    // Get customer and payment method for one-click upsells
    let customerId = session.customer;
    let paymentMethodId = null;
    const email = session.customer_email || session.customer_details?.email;

    // If customer is an object (expanded), get the ID
    if (typeof customerId === 'object' && customerId !== null) {
      customerId = customerId.id;
    }

    // Get payment method from payment intent
    if (session.payment_intent) {
      const paymentIntent = typeof session.payment_intent === 'object'
        ? session.payment_intent
        : await stripe.paymentIntents.retrieve(session.payment_intent, {
            expand: ['payment_method']
          });

      if (paymentIntent.payment_method) {
        paymentMethodId = typeof paymentIntent.payment_method === 'object'
          ? paymentIntent.payment_method.id
          : paymentIntent.payment_method;
      }
    }

    // If no customer ID, try to find/create one
    if (!customerId && email) {
      const normalizedEmail = email.toLowerCase().trim();

      // Check Stripe for existing customer
      const existingCustomers = await stripe.customers.list({
        email: normalizedEmail,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      }
    }

    // If we have payment method but no customer, attach it to a new customer
    if (paymentMethodId && !customerId && email) {
      const normalizedEmail = email.toLowerCase().trim();

      const customer = await stripe.customers.create({
        email: normalizedEmail,
        name: session.customer_details?.name || undefined,
        metadata: { source: 'post_checkout' }
      });
      customerId = customer.id;

      // Attach the payment method to the customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId }
      });

      console.log('Created customer and attached payment method:', customerId, paymentMethodId);
    }

    // Store payment data in database for later retrieval (24+ hours)
    if (email && (customerId || paymentMethodId)) {
      const normalizedEmail = email.toLowerCase().trim();

      try {
        const existingCustomers = await sql`
          SELECT id FROM customers WHERE email = ${normalizedEmail}
        `;

        if (existingCustomers.length > 0) {
          await sql`
            UPDATE customers
            SET
              stripe_customer_id = COALESCE(${customerId}, stripe_customer_id),
              payment_provider = 'stripe',
              updated_at = NOW()
            WHERE email = ${normalizedEmail}
          `;
        } else {
          await sql`
            INSERT INTO customers (email, full_name, stripe_customer_id, payment_provider, products_purchased)
            VALUES (${normalizedEmail}, ${session.customer_details?.name || ''}, ${customerId}, 'stripe', ARRAY['main_course'])
          `;
        }

        console.log('Stored payment data for:', normalizedEmail, 'Customer:', customerId);
      } catch (dbError) {
        console.error('Database error (non-fatal):', dbError);
      }
    }

    // If still no customer or payment method, return error
    if (!customerId && !paymentMethodId) {
      console.error('No payment data found for session:', sessionId);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No payment data found. Please contact support.',
          email: email
        })
      };
    }

    // Create a token for the upsell flow (valid for 24 hours)
    const tokenData = {
      cid: customerId,
      pmid: paymentMethodId,
      email: email,
      ts: Date.now()
    };

    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');

    console.log('Generated upsell token for:', email, 'Customer:', customerId, 'PaymentMethod:', paymentMethodId ? 'yes' : 'no');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token,
        email: email,
        customerName: session.customer_details?.name,
        hasPaymentMethod: !!paymentMethodId
      })
    };

  } catch (error) {
    console.error('Session retrieval error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve session: ' + error.message })
    };
  }
};
