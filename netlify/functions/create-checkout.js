// Stripe Checkout Session Creator - with customer creation for 1-click upsells
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

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
    const { email, name } = JSON.parse(event.body || '{}');
    const product = PRODUCTS.main_course;

    // Get the site URL for redirects
    const siteUrl = process.env.URL || 'https://shopifycourse.advancedmarketing.co';

    let customerId = null;

    // If email provided, create or get existing Stripe customer
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();

      // Check if customer exists in Stripe
      const existingCustomers = await stripe.customers.list({
        email: normalizedEmail,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        console.log('Found existing Stripe customer:', customerId);
      } else {
        // Create new Stripe customer
        const customer = await stripe.customers.create({
          email: normalizedEmail,
          name: name || undefined,
          metadata: {
            source: 'checkout',
            product: 'main_course'
          }
        });
        customerId = customer.id;
        console.log('Created new Stripe customer:', customerId);
      }

      // Store/update customer in database for later retrieval
      try {
        const existingDbCustomers = await sql`
          SELECT id FROM customers WHERE email = ${normalizedEmail}
        `;

        if (existingDbCustomers.length > 0) {
          await sql`
            UPDATE customers
            SET stripe_customer_id = ${customerId}, updated_at = NOW()
            WHERE email = ${normalizedEmail}
          `;
        } else {
          await sql`
            INSERT INTO customers (email, full_name, stripe_customer_id, payment_provider)
            VALUES (${normalizedEmail}, ${name || ''}, ${customerId}, 'stripe')
          `;
        }
      } catch (dbError) {
        console.error('Database error (non-fatal):', dbError);
      }
    }

    // Create Stripe Checkout Session
    const sessionConfig = {
      payment_method_types: ['card'],
      mode: 'payment',
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
    };

    // Add customer if we have one
    if (customerId) {
      sessionConfig.customer = customerId;
    } else if (email) {
      sessionConfig.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

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
