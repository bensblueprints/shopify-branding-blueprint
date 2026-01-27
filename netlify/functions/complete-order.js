// Complete Order - Final webhook with all purchased products
// Called at the end of the upsell flow to send a comprehensive webhook to GHL

const PRODUCTS = {
  main_course: {
    name: '7-Day Shopify Branding Blueprint',
    price: 27,
    ghlTag: 'purchased_main_course'
  },
  canva_kit: {
    name: 'Done-For-You Canva Brand Kit',
    price: 27,
    ghlTag: 'purchased_canva_kit'
  },
  email_swipe: {
    name: 'Email Sequence Swipe File',
    price: 19,
    ghlTag: 'purchased_email_swipe'
  },
  fb_ads: {
    name: 'Facebook Ads for Brands Masterclass',
    price: 97,
    ghlTag: 'purchased_fb_ads'
  },
  inner_circle: {
    name: 'Brand Builders Inner Circle',
    price: 47,
    ghlTag: 'purchased_inner_circle',
    recurring: true
  }
};

// All possible product combinations and their webhook env keys
// This allows you to create specific automations in GHL for each bundle
const BUNDLE_WEBHOOKS = {
  // Single products (besides main course which everyone gets)
  'canva_kit': 'GHL_WEBHOOK_BUNDLE_CANVA',
  'email_swipe': 'GHL_WEBHOOK_BUNDLE_EMAIL',
  'fb_ads': 'GHL_WEBHOOK_BUNDLE_FB',
  'inner_circle': 'GHL_WEBHOOK_BUNDLE_CIRCLE',

  // Two product combos
  'canva_kit,email_swipe': 'GHL_WEBHOOK_BUNDLE_CANVA_EMAIL',
  'canva_kit,fb_ads': 'GHL_WEBHOOK_BUNDLE_CANVA_FB',
  'canva_kit,inner_circle': 'GHL_WEBHOOK_BUNDLE_CANVA_CIRCLE',
  'email_swipe,fb_ads': 'GHL_WEBHOOK_BUNDLE_EMAIL_FB',
  'email_swipe,inner_circle': 'GHL_WEBHOOK_BUNDLE_EMAIL_CIRCLE',
  'fb_ads,inner_circle': 'GHL_WEBHOOK_BUNDLE_FB_CIRCLE',

  // Three product combos
  'canva_kit,email_swipe,fb_ads': 'GHL_WEBHOOK_BUNDLE_CANVA_EMAIL_FB',
  'canva_kit,email_swipe,inner_circle': 'GHL_WEBHOOK_BUNDLE_CANVA_EMAIL_CIRCLE',
  'canva_kit,fb_ads,inner_circle': 'GHL_WEBHOOK_BUNDLE_CANVA_FB_CIRCLE',
  'email_swipe,fb_ads,inner_circle': 'GHL_WEBHOOK_BUNDLE_EMAIL_FB_CIRCLE',

  // All four upsells (whale buyer!)
  'canva_kit,email_swipe,fb_ads,inner_circle': 'GHL_WEBHOOK_BUNDLE_ALL',

  // No upsells purchased
  'none': 'GHL_WEBHOOK_BUNDLE_MAIN_ONLY'
};

async function sendGHLWebhook(webhookUrl, payload) {
  if (!webhookUrl) {
    console.log('No webhook URL configured, skipping...');
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
      console.error('GHL webhook failed:', response.status);
      return null;
    }

    console.log('GHL webhook sent successfully to:', webhookUrl);
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
    const { token, purchasedUpsells } = JSON.parse(event.body || '{}');

    // Decode customer token
    let customerData;
    try {
      customerData = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    } catch (e) {
      customerData = { email: 'unknown' };
    }

    const email = customerData.email;
    const stripeCustomerId = customerData.cid;

    // Parse purchased upsells (comma-separated string or array)
    let upsells = [];
    if (typeof purchasedUpsells === 'string' && purchasedUpsells.length > 0) {
      upsells = purchasedUpsells.split(',').filter(p => p.length > 0);
    } else if (Array.isArray(purchasedUpsells)) {
      upsells = purchasedUpsells;
    }

    // Sort for consistent bundle key lookup
    const sortedUpsells = [...upsells].sort();
    const bundleKey = sortedUpsells.length > 0 ? sortedUpsells.join(',') : 'none';

    // Calculate total order value
    let totalValue = PRODUCTS.main_course.price; // Everyone has main course
    const purchasedProductDetails = [{
      key: 'main_course',
      name: PRODUCTS.main_course.name,
      price: PRODUCTS.main_course.price
    }];

    // Build tags list
    const tags = ['purchased_main_course', 'customer'];

    upsells.forEach(key => {
      const product = PRODUCTS[key];
      if (product) {
        totalValue += product.price;
        purchasedProductDetails.push({
          key,
          name: product.name,
          price: product.price,
          recurring: product.recurring || false
        });
        tags.push(product.ghlTag);
      }
    });

    // Add buyer tier tags based on total spend
    if (totalValue >= 200) {
      tags.push('whale_buyer', 'vip_customer');
    } else if (totalValue >= 100) {
      tags.push('high_value_buyer');
    } else if (upsells.length > 0) {
      tags.push('upsell_buyer');
    }

    // Check for subscription
    const hasSubscription = upsells.includes('inner_circle');
    if (hasSubscription) {
      tags.push('subscriber', 'inner_circle_member');
    }

    // Build comprehensive payload
    const payload = {
      event: 'order_complete',
      timestamp: new Date().toISOString(),
      customer: {
        email,
        stripeCustomerId,
      },
      order: {
        totalValue,
        currency: 'USD',
        productCount: purchasedProductDetails.length,
        products: purchasedProductDetails,
        upsellCount: upsells.length,
        hasSubscription,
        bundleKey // Useful for segmentation
      },
      tags,
      source: 'funnel_complete'
    };

    console.log('Order complete:', {
      email,
      totalValue,
      products: upsells.length + 1,
      bundleKey
    });

    // 1. Send to main order complete webhook (catches all orders)
    const mainWebhookUrl = process.env.GHL_WEBHOOK_ORDER_COMPLETE;
    if (mainWebhookUrl) {
      await sendGHLWebhook(mainWebhookUrl, payload);
    }

    // 2. Send to bundle-specific webhook
    const bundleEnvKey = BUNDLE_WEBHOOKS[bundleKey];
    if (bundleEnvKey) {
      const bundleWebhookUrl = process.env[bundleEnvKey];
      if (bundleWebhookUrl) {
        await sendGHLWebhook(bundleWebhookUrl, payload);
      }
    }

    // 3. If high-value buyer, send to VIP webhook
    if (totalValue >= 100) {
      const vipWebhookUrl = process.env.GHL_WEBHOOK_VIP_BUYER;
      if (vipWebhookUrl) {
        await sendGHLWebhook(vipWebhookUrl, payload);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order: {
          totalValue,
          productCount: purchasedProductDetails.length,
          bundleKey
        }
      })
    };

  } catch (error) {
    console.error('Complete order error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to complete order'
      })
    };
  }
};
