# GoHighLevel + Stripe Integration Setup Guide

This guide walks you through setting up 1-click upsells with Stripe and GoHighLevel webhooks.

---

## 1. Netlify Environment Variables

Add these environment variables in Netlify Dashboard → Site Settings → Environment Variables:

### Required - Stripe Keys
```
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_... (get this from Stripe Dashboard after creating webhook)
```

### GoHighLevel Webhook URLs
Create webhooks in GHL and add their URLs here:

```
# Main webhooks (recommended to set up all of these)
GHL_WEBHOOK_PURCHASE=https://services.leadconnectorhq.com/hooks/your-hook-id
GHL_WEBHOOK_UPSELL=https://services.leadconnectorhq.com/hooks/your-hook-id
GHL_WEBHOOK_ORDER_COMPLETE=https://services.leadconnectorhq.com/hooks/your-hook-id
GHL_WEBHOOK_SUBSCRIPTION=https://services.leadconnectorhq.com/hooks/your-hook-id

# Product-specific webhooks (optional - for granular automations)
GHL_WEBHOOK_MAIN_COURSE=https://services.leadconnectorhq.com/hooks/your-hook-id
GHL_WEBHOOK_CANVA_KIT=https://services.leadconnectorhq.com/hooks/your-hook-id
GHL_WEBHOOK_EMAIL_SWIPE=https://services.leadconnectorhq.com/hooks/your-hook-id
GHL_WEBHOOK_FB_ADS=https://services.leadconnectorhq.com/hooks/your-hook-id
GHL_WEBHOOK_INNER_CIRCLE=https://services.leadconnectorhq.com/hooks/your-hook-id

# Bundle-specific webhooks (for specific product combinations)
GHL_WEBHOOK_BUNDLE_MAIN_ONLY=https://...    # Bought main course only, no upsells
GHL_WEBHOOK_BUNDLE_CANVA=https://...         # Main + Canva Kit
GHL_WEBHOOK_BUNDLE_EMAIL=https://...         # Main + Email Swipe
GHL_WEBHOOK_BUNDLE_FB=https://...            # Main + FB Ads
GHL_WEBHOOK_BUNDLE_CIRCLE=https://...        # Main + Inner Circle
GHL_WEBHOOK_BUNDLE_CANVA_EMAIL=https://...   # Main + Canva + Email
GHL_WEBHOOK_BUNDLE_CANVA_FB=https://...      # Main + Canva + FB
GHL_WEBHOOK_BUNDLE_CANVA_CIRCLE=https://...  # Main + Canva + Circle
GHL_WEBHOOK_BUNDLE_EMAIL_FB=https://...      # Main + Email + FB
GHL_WEBHOOK_BUNDLE_EMAIL_CIRCLE=https://...  # Main + Email + Circle
GHL_WEBHOOK_BUNDLE_FB_CIRCLE=https://...     # Main + FB + Circle
GHL_WEBHOOK_BUNDLE_CANVA_EMAIL_FB=https://...       # Main + Canva + Email + FB
GHL_WEBHOOK_BUNDLE_CANVA_EMAIL_CIRCLE=https://...   # Main + Canva + Email + Circle
GHL_WEBHOOK_BUNDLE_CANVA_FB_CIRCLE=https://...      # Main + Canva + FB + Circle
GHL_WEBHOOK_BUNDLE_EMAIL_FB_CIRCLE=https://...      # Main + Email + FB + Circle
GHL_WEBHOOK_BUNDLE_ALL=https://...           # Bought everything (whale!)

# VIP buyer webhook (total spend >= $100)
GHL_WEBHOOK_VIP_BUYER=https://services.leadconnectorhq.com/hooks/your-hook-id
```

---

## 2. Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://shopify-branding-blueprint.netlify.app/webhooks/stripe`
4. Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `customer.subscription.created`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Add it to Netlify as `STRIPE_WEBHOOK_SECRET`

---

## 3. Webhook Payloads

### Purchase Complete (Initial checkout)
```json
{
  "event": "purchase_complete",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "customer": {
    "email": "customer@example.com",
    "name": "John Doe",
    "stripeCustomerId": "cus_xxx"
  },
  "purchase": {
    "productKey": "main_course",
    "productName": "7-Day Shopify Branding Blueprint",
    "amount": 27,
    "currency": "USD",
    "paymentId": "pi_xxx",
    "sessionId": "cs_xxx"
  },
  "tags": ["purchased_main_course"],
  "source": "stripe_checkout"
}
```

### Upsell Purchase
```json
{
  "event": "upsell_purchase",
  "timestamp": "2024-01-15T10:32:00.000Z",
  "customer": {
    "email": "customer@example.com",
    "stripeCustomerId": "cus_xxx"
  },
  "purchase": {
    "productKey": "canva_kit",
    "productName": "Done-For-You Canva Brand Kit",
    "amount": 27,
    "currency": "USD",
    "paymentId": "pi_xxx",
    "isUpsell": true
  },
  "tags": ["purchased_canva_kit", "upsell_buyer"],
  "source": "one_click_upsell"
}
```

### Order Complete (End of funnel)
```json
{
  "event": "order_complete",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "customer": {
    "email": "customer@example.com",
    "stripeCustomerId": "cus_xxx"
  },
  "order": {
    "totalValue": 170,
    "currency": "USD",
    "productCount": 4,
    "products": [
      { "key": "main_course", "name": "7-Day Shopify Branding Blueprint", "price": 27 },
      { "key": "canva_kit", "name": "Done-For-You Canva Brand Kit", "price": 27 },
      { "key": "email_swipe", "name": "Email Sequence Swipe File", "price": 19 },
      { "key": "fb_ads", "name": "Facebook Ads for Brands Masterclass", "price": 97 }
    ],
    "upsellCount": 3,
    "hasSubscription": false,
    "bundleKey": "canva_kit,email_swipe,fb_ads"
  },
  "tags": [
    "purchased_main_course",
    "purchased_canva_kit",
    "purchased_email_swipe",
    "purchased_fb_ads",
    "high_value_buyer"
  ],
  "source": "funnel_complete"
}
```

### Subscription Created
```json
{
  "event": "subscription_created",
  "timestamp": "2024-01-15T10:33:00.000Z",
  "customer": {
    "email": "customer@example.com",
    "stripeCustomerId": "cus_xxx"
  },
  "subscription": {
    "subscriptionId": "sub_xxx",
    "productKey": "inner_circle",
    "productName": "Brand Builders Inner Circle",
    "amount": 47,
    "interval": "month",
    "status": "active"
  },
  "tags": ["purchased_inner_circle", "subscriber", "inner_circle_member"],
  "source": "one_click_upsell"
}
```

---

## 4. GHL Workflow Examples

### Workflow 1: Grant Course Access (Main Purchase)
**Trigger:** Webhook - `GHL_WEBHOOK_PURCHASE`
**Filter:** `event` equals `purchase_complete`
**Actions:**
1. Add Tag: `{{tags}}` (loops through all tags)
2. Create/Update Contact with email
3. Add to Course/Membership
4. Send Welcome Email

### Workflow 2: Upsell Buyer Follow-up
**Trigger:** Webhook - `GHL_WEBHOOK_UPSELL`
**Actions:**
1. Add Tags from payload
2. Grant access to purchased product
3. Send delivery email

### Workflow 3: VIP Buyer Treatment
**Trigger:** Webhook - `GHL_WEBHOOK_VIP_BUYER`
**Filter:** `order.totalValue` >= 100
**Actions:**
1. Add Tag: `vip_customer`
2. Add to VIP segment
3. Send personal thank you from founder
4. Add to priority support queue

### Workflow 4: Inner Circle Onboarding
**Trigger:** Webhook - `GHL_WEBHOOK_INNER_CIRCLE`
**Filter:** `event` equals `subscription_created`
**Actions:**
1. Add Tag: `inner_circle_member`
2. Grant community access
3. Send calendar invite for next coaching call
4. Add to Inner Circle email sequence

### Workflow 5: Bundle-Specific Onboarding
**Trigger:** Webhook - `GHL_WEBHOOK_BUNDLE_ALL`
**Actions:**
1. Add Tag: `whale_buyer`
2. Grant ALL product access
3. Send VIP welcome package
4. Personal outreach from team

---

## 5. Products & Pricing

| Product | Price | Product Key | GHL Tag |
|---------|-------|-------------|---------|
| 7-Day Branding Blueprint | $27 | `main_course` | `purchased_main_course` |
| Canva Brand Kit | $27 | `canva_kit` | `purchased_canva_kit` |
| Email Sequence Swipe File | $19 | `email_swipe` | `purchased_email_swipe` |
| Facebook Ads Masterclass | $97 | `fb_ads` | `purchased_fb_ads` |
| Inner Circle (Monthly) | $47/mo | `inner_circle` | `purchased_inner_circle` |

---

## 6. Customer Journey Flow

```
Landing Page ($27 checkout)
         │
         ▼
    [Stripe Checkout]
         │
         ▼ (webhook: purchase_complete)
         │
    Upsell 1: Canva Kit ($27)
    ├── Yes → (webhook: upsell_purchase) → Upsell 2
    └── No → Upsell 2
         │
    Upsell 2: Email Swipe ($19)
    ├── Yes → (webhook: upsell_purchase) → Upsell 3
    └── No → Upsell 3
         │
    Upsell 3: FB Ads ($97)
    ├── Yes → (webhook: upsell_purchase) → Upsell 4
    └── No → Upsell 4
         │
    Upsell 4: Inner Circle ($47/mo)
    ├── Yes → (webhook: subscription_created) → Thank You
    └── No → Thank You
         │
         ▼ (webhook: order_complete with full bundle info)
         │
    Thank You Page
```

---

## 7. Testing

1. Use Stripe test mode keys first
2. Use test card: `4242 4242 4242 4242`
3. Check Netlify Functions logs for webhook activity
4. Verify GHL receives webhooks in Automation → Webhook History

---

## 8. All Webhook Combinations Reference

The `order_complete` webhook includes a `bundleKey` field that tells you exactly which upsells were purchased:

| Bundle Key | Products Purchased |
|------------|-------------------|
| `none` | Main course only |
| `canva_kit` | Main + Canva Kit |
| `email_swipe` | Main + Email Swipe |
| `fb_ads` | Main + FB Ads |
| `inner_circle` | Main + Inner Circle |
| `canva_kit,email_swipe` | Main + Canva + Email |
| `canva_kit,fb_ads` | Main + Canva + FB Ads |
| `canva_kit,inner_circle` | Main + Canva + Inner Circle |
| `email_swipe,fb_ads` | Main + Email + FB Ads |
| `email_swipe,inner_circle` | Main + Email + Inner Circle |
| `fb_ads,inner_circle` | Main + FB Ads + Inner Circle |
| `canva_kit,email_swipe,fb_ads` | Main + Canva + Email + FB Ads |
| `canva_kit,email_swipe,inner_circle` | Main + Canva + Email + Inner Circle |
| `canva_kit,fb_ads,inner_circle` | Main + Canva + FB Ads + Inner Circle |
| `email_swipe,fb_ads,inner_circle` | Main + Email + FB Ads + Inner Circle |
| `canva_kit,email_swipe,fb_ads,inner_circle` | ALL PRODUCTS (whale!) |

Use these bundle keys in GHL workflow filters to create specific automations for each combination.

---

## Need Help?

- Netlify Functions logs: Dashboard → Functions → View logs
- Stripe webhook logs: Dashboard → Developers → Webhooks → Select endpoint → View logs
- GHL webhook history: Automation → Webhook History
