# GoHighLevel Integration Setup Guide

This guide walks you through connecting your landing page to GoHighLevel for payments and course delivery.

---

## Overview

The landing page is pre-built with GHL integration. You need to:
1. Create products in GHL
2. Create order forms with order bumps
3. Set up course/membership for delivery
4. Create automation workflow for fulfillment
5. Update the config in `index.html`

---

## Step 1: Create Products in GoHighLevel

Go to **Payments → Products** and create these products:

### Main Product
| Field | Value |
|-------|-------|
| Name | 7-Day Shopify Branding Blueprint |
| Price | $27.00 |
| Type | One-time |

### Order Bumps
| Name | Price | Type |
|------|-------|------|
| Brand Name Generator + Trademark Guide | $17.00 | One-time |
| Done-For-You Canva Brand Kit | $27.00 | One-time |
| Email Sequence Swipe File | $19.00 | One-time |

### Upsells
| Name | Price | Type |
|------|-------|------|
| Facebook Ads for Brands Masterclass | $97.00 | One-time |
| Brand Builder's Inner Circle | $47.00 | Recurring (monthly) |

---

## Step 2: Create Order Forms

Go to **Payments → Order Forms** → **+ New Order Form**

### Main Order Form (with bumps)

1. **Basic Settings**
   - Name: `Shopify Blueprint - Main Offer`
   - Select product: 7-Day Shopify Branding Blueprint

2. **Add Order Bumps**
   - Click "Add Bump"
   - Add each bump product:
     - Brand Name Generator + Trademark Guide ($17)
     - Done-For-You Canva Brand Kit ($27)
     - Email Sequence Swipe File ($19)
   - Set bump display text for each

3. **Customize Thank You Page**
   - Redirect to your course access URL or upsell page

4. **Save and copy the Order Form ID** (visible in URL or settings)

### Create separate order forms for upsells:
- FB Ads Masterclass Order Form
- Inner Circle Order Form (recurring)

---

## Step 3: Set Up Course/Membership

Go to **Memberships → Courses**

### Create New Course
1. Click **+ New Course**
2. Name: `7-Day Shopify Branding Blueprint`
3. Add 7 modules (one for each day):
   - Day 1: What Is a Brand?
   - Day 2: What It Means to Own a Brand
   - Day 3: Create Perfect Branding
   - Day 4: Find Products & Suppliers
   - Day 5: Get Products Customized
   - Day 6: 3 Profitable Industries
   - Day 7: Launch Your Brand

4. Add lessons and content to each module
5. Set course to **Locked** (requires purchase)

### Create Offers for Each Product
Go to **Memberships → Offers**

Create offers that link products to course access:
- Main Course Offer → Grants access to main course
- FB Ads Offer → Grants access to FB Ads course
- Inner Circle Offer → Grants access to community/coaching area

---

## Step 4: Create Automation Workflow

Go to **Automations → Workflows** → **+ Create Workflow**

### Trigger: Order Submitted
1. Add trigger: **Order Form Submitted**
2. Select your main order form

### Actions:
1. **Create/Update Contact** (if needed)

2. **Add Tag**
   - Tag: `purchased-shopify-blueprint`

3. **Grant Course Access**
   - Select: 7-Day Shopify Branding Blueprint
   - Access Level: Full

4. **Send Email** (Welcome email)
   - Subject: "You're In! Access Your 7-Day Branding Blueprint"
   - Include course login link

5. **Conditional: Check for Bumps** (Optional)
   - If bump was purchased, add appropriate tags/access

### Example Workflow Structure:
```
[Order Form Submitted]
        ↓
[Add Contact to Pipeline: "Course Buyers"]
        ↓
[Add Tag: "purchased-shopify-blueprint"]
        ↓
[Grant Membership Access: "7-Day Blueprint"]
        ↓
[Send Email: "Welcome - Your Course Access"]
        ↓
[Wait: 1 day]
        ↓
[Send Email: "Day 1 Reminder"]
```

---

## Step 5: Update Landing Page Config

Open `index.html` and find the `GHL_CONFIG` section at the top:

```javascript
const GHL_CONFIG = {
    // Your GHL location URL
    // Find this in Settings → Business Info → Domain
    // Example: "https://app.gohighlevel.com/v2/location/abc123"
    // Or your white-label domain: "https://crm.yourdomain.com"
    locationUrl: "YOUR_GHL_LOCATION_URL",

    // Order Form IDs
    // Find in Payments → Order Forms → Click form → ID in URL
    orderForms: {
        mainCourse: "YOUR_MAIN_ORDER_FORM_ID",
        fbAdsMasterclass: "YOUR_FB_ADS_ORDER_FORM_ID",
        innerCircle: "YOUR_INNER_CIRCLE_ORDER_FORM_ID"
    },

    // Product IDs (for analytics/tracking)
    products: {
        mainCourse: "prod_xxxxx",
        brandNameGenerator: "prod_xxxxx",
        canvaBrandKit: "prod_xxxxx",
        emailSwipeFile: "prod_xxxxx",
        fbAdsMasterclass: "prod_xxxxx",
        innerCircle: "prod_xxxxx"
    },

    // After purchase redirects
    thankYouPage: "https://yourdomain.com/thank-you",
    courseAccessUrl: "https://yourdomain.com/courses"
};
```

### Finding Your Values:

**Location URL:**
- Go to Settings → Business Info
- Copy your location URL or custom domain

**Order Form IDs:**
- Go to Payments → Order Forms
- Click on a form
- The ID is in the URL: `/order-forms/FORM_ID_HERE`

**Product IDs:**
- Go to Payments → Products
- Click on a product
- Find the ID in the URL or API response

---

## Step 6: Deploy Updates

After updating the config, push to GitHub:

```bash
cd shopify-blueprint-landing
git add .
git commit -m "Add GHL configuration"
git push
```

Netlify will auto-deploy the changes.

---

## Testing Checklist

- [ ] Products created in GHL
- [ ] Order forms created with bumps
- [ ] Course content uploaded
- [ ] Automation workflow active
- [ ] Config updated in index.html
- [ ] Test purchase with Stripe test mode
- [ ] Verify course access granted
- [ ] Verify welcome email sent
- [ ] Test all order bumps
- [ ] Test upsell purchases

---

## Optional Enhancements

### 1. One-Time Offer (OTO) Page
After main purchase, redirect to an upsell page before the thank you page.

### 2. Abandoned Cart Recovery
Create automation triggered when someone starts but doesn't complete checkout.

### 3. Email Sequences
- Welcome sequence (Days 1-7 course reminders)
- Upsell sequence (promote FB Ads course after Day 3)
- Re-engagement sequence (inactive users)

### 4. Analytics/Tracking
Add Facebook Pixel, Google Analytics, and conversion tracking to measure funnel performance.

---

## Support

For GHL-specific questions, refer to:
- [GoHighLevel Documentation](https://help.gohighlevel.com/)
- [GHL Community](https://community.gohighlevel.com/)
