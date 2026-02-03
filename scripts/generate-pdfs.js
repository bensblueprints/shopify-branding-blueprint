const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../downloads/pdfs');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Color palette
const colors = {
    gold: '#d4a853',
    black: '#0a0a0a',
    darkGray: '#1a1a1a',
    lightGray: '#666666',
    white: '#ffffff',
    promptText: '#333333'
};

// Helper function to add header
function addHeader(doc, title, subtitle) {
    doc.rect(0, 0, 612, 100).fill(colors.black);
    doc.fillColor(colors.gold).fontSize(24).font('Helvetica-Bold')
        .text(title, 50, 35, { width: 512 });
    doc.fillColor(colors.white).fontSize(11).font('Helvetica')
        .text(subtitle, 50, 70, { width: 512 });
    doc.y = 120;
}

// Helper function to add section title
function addSectionTitle(doc, title) {
    doc.moveDown(0.5);
    doc.fillColor(colors.gold).fontSize(14).font('Helvetica-Bold')
        .text(title);
    doc.moveDown(0.3);
}

// Helper function for body text
function addBodyText(doc, text) {
    doc.fillColor(colors.promptText).fontSize(10).font('Helvetica')
        .text(text, { lineGap: 3 });
    doc.moveDown(0.5);
}

// Helper function for copyable prompt/code blocks - NO background, just indented text
function addCopyableBlock(doc, title, content) {
    doc.moveDown(0.5);
    doc.fillColor(colors.gold).fontSize(11).font('Helvetica-Bold')
        .text('--- ' + title + ' (Copy Below) ---');
    doc.moveDown(0.3);

    // Add the content as regular selectable text
    doc.fillColor(colors.promptText).fontSize(9).font('Courier')
        .text(content, {
            indent: 20,
            lineGap: 2
        });

    doc.fillColor(colors.gold).fontSize(11).font('Helvetica-Bold')
        .text('--- End of ' + title + ' ---');
    doc.moveDown(0.5);
}

// Helper for bullet lists
function addBulletList(doc, items) {
    items.forEach(item => {
        doc.fillColor(colors.promptText).fontSize(10).font('Helvetica')
            .text('• ' + item, { indent: 15 });
    });
    doc.moveDown(0.5);
}

// Helper for numbered lists
function addNumberedList(doc, items) {
    items.forEach((item, i) => {
        doc.fillColor(colors.promptText).fontSize(10).font('Helvetica')
            .text((i + 1) + '. ' + item, { indent: 15 });
    });
    doc.moveDown(0.5);
}

// Check if we need a new page
function checkNewPage(doc, neededSpace = 150) {
    if (doc.y > 700 - neededSpace) {
        doc.addPage();
        doc.y = 50;
    }
}

// ============================================
// 1. EMAIL SEQUENCE SWIPE FILE
// ============================================
function generateEmailSwipeFile() {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(path.join(outputDir, 'email-sequence-swipe-file.pdf')));

    // Cover Page
    doc.rect(0, 0, 612, 792).fill(colors.black);
    doc.fillColor(colors.gold).fontSize(36).font('Helvetica-Bold')
        .text('EMAIL SEQUENCE', 50, 200, { align: 'center' });
    doc.fontSize(36).text('SWIPE FILE', { align: 'center' });
    doc.moveDown(2);
    doc.fillColor(colors.white).fontSize(16).font('Helvetica')
        .text('Complete Email Templates + AI Prompt Framework', { align: 'center' });
    doc.moveDown(1);
    doc.fillColor(colors.lightGray).fontSize(12)
        .text('By Advanced Marketing | Shopify Branding Blueprint', { align: 'center' });
    doc.moveDown(3);
    doc.fillColor(colors.gold).fontSize(11)
        .text('All prompts and templates are fully copyable', { align: 'center' });

    // Page 2 - Introduction
    doc.addPage();
    addHeader(doc, 'How to Use This Swipe File', 'Maximize your email marketing with proven templates');

    addBodyText(doc, `This Email Sequence Swipe File contains battle-tested email templates used by 7-figure Shopify brands. Each template includes the complete email copy you can customize, plus an AI prompt to generate variations using your brand voice.

IMPORTANT: Before generating emails with AI, upload your Brand Guidelines document to ChatGPT, Claude, or Gemini to ensure consistent voice, tone, and messaging.`);

    addSectionTitle(doc, 'The AI Prompt Framework');
    addNumberedList(doc, [
        'Upload your Brand Guidelines PDF to ChatGPT/Claude/Gemini',
        'Copy the prompt provided with each email template',
        'Customize the variables (product name, offer details, etc.)',
        'Generate and refine until it matches your brand voice',
        'Export to Canva for beautiful email designs'
    ]);

    // Page 3 - Welcome Email 1
    doc.addPage();
    addHeader(doc, 'Welcome Email Sequence', '5 emails to turn subscribers into customers');

    addSectionTitle(doc, 'EMAIL 1: The Warm Welcome (Send Immediately)');

    addCopyableBlock(doc, 'Email Template', `SUBJECT: Welcome to [Brand Name] - Here's your [discount/gift]

Hey [First Name],

Welcome to the [Brand Name] family! We're so excited you're here.

As a thank you for joining us, here's your exclusive [X]% off code: WELCOME[X]

At [Brand Name], we believe [core brand belief/mission]. Every product we create is designed to [key benefit].

Here's what you can expect from us:
- Exclusive offers before anyone else
- Behind-the-scenes content
- Tips on [relevant topic]
- First access to new drops

Ready to shop? Use code WELCOME[X] at checkout.

[CTA Button: Shop Now]

Talk soon,
[Founder Name]

P.S. This code expires in 48 hours - don't miss out!`);

    checkNewPage(doc, 200);

    addCopyableBlock(doc, 'AI Prompt for Welcome Email', `You are an expert email copywriter. Using the brand guidelines I've uploaded, write a warm welcome email for new subscribers.

Variables to include:
- Brand name: [YOUR BRAND]
- Discount code: [YOUR CODE]
- Discount amount: [X]%
- Expiration: 48 hours

Tone: Match my brand guidelines (warm/playful/professional)
Length: 150-200 words
Include: Subject line, preview text, and clear CTA

Make it feel personal and genuine, not salesy.`);

    // Page 4 - Welcome Email 2
    doc.addPage();
    addHeader(doc, 'Welcome Sequence Continued', 'Emails 2-3: Build Trust & Desire');

    addSectionTitle(doc, 'EMAIL 2: Our Story (Send Day 2)');

    addCopyableBlock(doc, 'Email Template', `SUBJECT: Why I started [Brand Name]...

Hey [First Name],

I wanted to share something personal with you.

[Brand Name] didn't start in a boardroom. It started [origin story - problem you faced].

I was frustrated because [pain point]. Every solution I tried [what failed]. That's when I decided to create something different.

[Product/Brand] was born from [key insight or breakthrough moment].

Today, we've helped [number] customers [achieve outcome], and we're just getting started.

Here's what makes us different:
- [Differentiator 1]
- [Differentiator 2]
- [Differentiator 3]

Your welcome discount is still active! Use code WELCOME[X] before it expires.

[CTA: Shop Our Bestsellers]

Cheers,
[Founder Name]`);

    // Page 5 - Welcome Email 3
    doc.addPage();
    addHeader(doc, 'Welcome Email 3', 'Social Proof');

    addSectionTitle(doc, 'EMAIL 3: Social Proof (Send Day 4)');

    addCopyableBlock(doc, 'Email Template', `SUBJECT: See what [Number]+ customers are saying...

Hey [First Name],

Don't just take our word for it...

"[Customer testimonial 1 - specific result]" - [Name], [Location]

"[Customer testimonial 2 - emotional benefit]" - [Name], [Location]

"[Customer testimonial 3 - comparison to alternatives]" - [Name], [Location]

Join [number]+ happy customers who've discovered [key benefit].

Still have your welcome discount? It expires [timeframe]!

[CTA: Join Them - Shop Now]`);

    checkNewPage(doc, 250);

    addCopyableBlock(doc, 'AI Prompt for Social Proof Email', `Using my brand guidelines, create a social proof email featuring customer testimonials.

Include:
- Subject line that highlights the number of happy customers
- 3 testimonial slots (I'll fill in real reviews)
- Each testimonial should highlight: specific result, emotional benefit, or comparison
- Reminder about welcome discount
- Clear CTA

Tone: Confident but not boastful
Length: 100-150 words`);

    // Page 6 - Abandoned Cart 1
    doc.addPage();
    addHeader(doc, 'Abandoned Cart Recovery', '3-email sequence to recover 15-30% of lost sales');

    addSectionTitle(doc, 'CART EMAIL 1: The Gentle Reminder (1 Hour After)');

    addCopyableBlock(doc, 'Email Template', `SUBJECT: Did something go wrong?

Hey [First Name],

I noticed you left something behind...

[Product Image]
[Product Name] - $[Price]

No worries - your cart is saved and waiting for you.

Was there something holding you back?
- Questions about the product?
- Shipping concerns?
- Just got distracted?

Whatever it is, I'm here to help. Just reply to this email!

[CTA: Complete Your Order]

- [Name/Brand]

P.S. Items in your cart aren't reserved and could sell out!`);

    // Page 7 - Abandoned Cart 2
    doc.addPage();
    addHeader(doc, 'Abandoned Cart Continued', 'Email 2: Add Value');

    addSectionTitle(doc, 'CART EMAIL 2: Add Value (24 Hours After)');

    addCopyableBlock(doc, 'Email Template', `SUBJECT: [Product Name] is getting lonely in your cart

Hey [First Name],

Your [Product Name] is still waiting...

Here's why [number]+ customers love it:

✓ [Key benefit 1]
✓ [Key benefit 2]
✓ [Key benefit 3]

Plus, you'll get:
- Free shipping on orders over $[X]
- [Guarantee] guarantee
- [Bonus if applicable]

[CTA: Finish Checking Out]

Still on the fence? Check out these reviews:
"[Short powerful review]" - Verified Buyer`);

    // Page 8 - Abandoned Cart 3
    doc.addPage();
    addHeader(doc, 'Abandoned Cart Final', 'Email 3: Create Urgency');

    addSectionTitle(doc, 'CART EMAIL 3: Create Urgency (48-72 Hours After)');

    addCopyableBlock(doc, 'Email Template', `SUBJECT: Last chance: [X]% off expires tonight

[First Name],

I wanted to give you one last heads up...

Your cart (and your exclusive [X]% discount) expires at midnight.

[Product Image]
[Product Name] - $[Original] → $[Discounted]

Use code: CART[X]

After tonight, it's back to full price.

[CTA: Claim Your Discount Now]

Not ready yet? No problem - but I'd hate for you to miss out on these savings.

See you on the inside,
[Name]`);

    checkNewPage(doc, 250);

    addCopyableBlock(doc, 'AI Prompt for Abandoned Cart Sequence', `Using my brand guidelines, create a 3-email abandoned cart sequence.

Email 1 (1 hour): Helpful, no discount, just remind
Email 2 (24 hours): Add social proof and benefits
Email 3 (48-72 hours): Urgency with discount code

Product: [PRODUCT NAME]
Price: [PRICE]
Discount code: CART[X] for [X]% off
Brand voice: Reference uploaded brand guidelines

For each email include:
- Subject line (under 50 chars)
- Preview text
- Body copy (100-150 words)
- Clear CTA

Make it feel personal, not salesy.`);

    // Page 9 - Post-Purchase
    doc.addPage();
    addHeader(doc, 'Post-Purchase Follow-Up', 'Turn buyers into repeat customers');

    addSectionTitle(doc, 'POST-PURCHASE EMAIL 1: Order Confirmation+ (Immediately)');

    addCopyableBlock(doc, 'Email Template', `SUBJECT: You made an amazing choice!

Hey [First Name]!

Your order is confirmed and we're doing a happy dance over here!

Order #[Number]
[Product details]

What happens next:
1. We're preparing your order with care
2. You'll get a shipping notification with tracking
3. Your [product] arrives in [X-X] days

While you wait, here's how to get the most out of your purchase:
- [Tip 1 - how to use/style/apply]
- [Tip 2]
- [Bonus resource link]

Questions? Just reply to this email - I read every one.

Thank you for supporting [Brand Name]!

[Founder signature]`);

    // Page 10 - Review Request
    doc.addPage();
    addHeader(doc, 'Review Request & Win-Back', 'Get reviews and re-engage customers');

    addSectionTitle(doc, 'REVIEW REQUEST (7-14 Days After Delivery)');

    addCopyableBlock(doc, 'Email Template', `SUBJECT: How's your [Product Name]?

Hey [First Name],

It's been about a week since your [Product Name] arrived...

How are you liking it?

Your feedback helps us improve AND helps other customers make confident decisions.

Would you take 30 seconds to leave a review?

[CTA: Leave a Review] → [Direct link to review page]

As a thank you, here's [X]% off your next order: THANKYOU[X]

Your honest opinion means the world to us!

[Founder Name]

P.S. Snap a photo with your [product] and tag us @[handle] - we love featuring our customers!`);

    checkNewPage(doc, 200);

    addSectionTitle(doc, 'WIN-BACK EMAIL (60-90 Days Inactive)');

    addCopyableBlock(doc, 'Email Template', `SUBJECT: We miss you, [First Name]...

Hey [First Name],

It's been a while since we've seen you, and honestly? We miss you.

A lot has happened since your last visit:
- [New product/collection launch]
- [Improvement or update]
- [Exciting news]

We'd love to welcome you back with something special:

[X]% OFF your next order
Code: MISSYOU[X]

Valid for the next 7 days.

[CTA: See What's New]

Hope to see you soon!

[Brand Name] Team`);

    // Page 11 - Product Launch
    doc.addPage();
    addHeader(doc, 'Product Launch Sequence', '3-email sequence to maximize launch sales');

    addSectionTitle(doc, 'LAUNCH EMAIL 1: The Teaser (3-5 Days Before)');

    addCopyableBlock(doc, 'Email Template', `SUBJECT: Something big is coming...

[First Name],

I've been keeping a secret, and I can't hold it in anymore.

We've been working on something special for the past [timeframe]...

[Hint about the product without revealing everything]

It's designed for [target customer] who wants [key desire].

Mark your calendar: [Launch Date]

Subscribers get EARLY ACCESS + an exclusive launch discount.

Want a sneak peek?

[CTA: Get on the VIP List]

More details coming soon...

[Founder Name]

P.S. Reply and tell me - what would make this product perfect for you?`);

    // Page 12 - Launch Email 2
    doc.addPage();
    addHeader(doc, 'Product Launch Continued', 'The Reveal');

    addSectionTitle(doc, 'LAUNCH EMAIL 2: The Reveal (Launch Day)');

    addCopyableBlock(doc, 'Email Template', `SUBJECT: IT'S HERE: Introducing [Product Name]

[First Name], the wait is over!

Introducing [Product Name] - [one-line description]

[Hero product image]

I created this because [problem it solves].

Here's what makes it special:
- [Feature 1] → [Benefit 1]
- [Feature 2] → [Benefit 2]
- [Feature 3] → [Benefit 3]

LAUNCH SPECIAL: First 48 hours only
[X]% off with code LAUNCH[X]

[CTA: Shop Now - Limited Time]

[Number] already sold in the first hour!`);

    // Page 13 - Holiday Templates
    doc.addPage();
    addHeader(doc, 'Holiday & Promotional Templates', 'Ready-to-customize seasonal campaigns');

    addSectionTitle(doc, 'BLACK FRIDAY / MAJOR SALE');

    addCopyableBlock(doc, 'Email Template', `SUBJECT: [X]% OFF EVERYTHING - Our biggest sale ever

[First Name],

This is it. Our BIGGEST sale of the year.

[X]% OFF SITEWIDE
No exclusions. No minimum.
Code: [SALECODE]

Shop by category:
→ [Category 1] - up to [X]% off
→ [Category 2] - up to [X]% off
→ [Category 3] - up to [X]% off

[CTA: Shop the Sale]

⏰ Ends [Date] at midnight
🚚 Free shipping on $[X]+

Don't wait - bestsellers sell out FAST.

[Brand Name]`);

    checkNewPage(doc, 200);

    addSectionTitle(doc, 'FLASH SALE (24-48 Hours)');

    addCopyableBlock(doc, 'Email Template', `SUBJECT: ⚡ FLASH SALE: [X]% off for 24 hours only

[First Name],

Surprise! We're doing something we almost never do...

FLASH SALE: [X]% OFF
Starts NOW. Ends tomorrow at [Time].

Why the random sale? [Give a fun/honest reason]

Use code: FLASH[X]

[CTA: Shop Before It's Gone]

Set your alarm - this won't last!

[Brand Name]`);

    // Page 14 - Master AI Prompt
    doc.addPage();
    addHeader(doc, 'Master AI Prompt Framework', 'Generate unlimited email variations');

    addBodyText(doc, `This master prompt works with ChatGPT, Claude, and Gemini. Always start by uploading your Brand Guidelines document for consistent voice.`);

    addCopyableBlock(doc, 'Master Email Generation Prompt', `You are an expert email copywriter specializing in ecommerce and Shopify brands. I've uploaded my Brand Guidelines - use them to match my voice, tone, and messaging style.

TASK: Create a [EMAIL TYPE] email for my Shopify store.

BRAND DETAILS:
- Brand name: [YOUR BRAND]
- Industry: [YOUR NICHE]
- Target audience: [DESCRIBE YOUR IDEAL CUSTOMER]
- Brand voice: [Reference the uploaded brand guidelines]
- Unique selling proposition: [WHAT MAKES YOU DIFFERENT]

EMAIL SPECIFICS:
- Purpose: [GOAL - welcome, recover cart, promote, etc.]
- Product/Offer: [WHAT YOU'RE PROMOTING]
- Discount (if any): [CODE AND AMOUNT]
- Urgency: [DEADLINE IF APPLICABLE]
- Key benefits to highlight: [TOP 3 BENEFITS]

REQUIREMENTS:
1. Subject line (under 50 characters, create 3 options)
2. Preview text (under 90 characters)
3. Email body (150-250 words)
4. Single clear CTA
5. P.S. line for extra urgency or value
6. Match the exact voice from my brand guidelines

FORMAT: Write in a conversational, scannable format with short paragraphs. Make it feel personal, not corporate.`);

    // Page 15 - Canva Export Guide
    doc.addPage();
    addHeader(doc, 'Exporting to Canva', 'Turn your email copy into beautiful designs');

    addSectionTitle(doc, 'Step-by-Step Canva Workflow');
    addNumberedList(doc, [
        'Generate your email copy using the AI prompts above',
        'Open Canva and search for "Email Newsletter" templates',
        'Choose a template that matches your brand aesthetic',
        'Replace placeholder text with your AI-generated copy',
        'Upload your brand assets (logo, fonts, colors)',
        'Add product images from your Shopify store',
        'Export as HTML for Klaviyo/Mailchimp, or as image'
    ]);

    addSectionTitle(doc, 'Gemini Image Generation Tip');
    addBodyText(doc, `Use Google Gemini to generate custom email graphics with this prompt:`);

    addCopyableBlock(doc, 'Gemini Image Prompt', `Create a [style] email header image for a [niche] brand promoting [offer].
Use colors: [your brand colors].
Style: [modern/minimal/bold/playful].
Include text: [headline].
Dimensions: 600x200 pixels.`);

    // Final page
    doc.addPage();
    doc.rect(0, 0, 612, 792).fill(colors.black);
    doc.fillColor(colors.gold).fontSize(24).font('Helvetica-Bold')
        .text('Start Sending Emails That Convert', 50, 300, { align: 'center' });
    doc.moveDown(2);
    doc.fillColor(colors.white).fontSize(14).font('Helvetica')
        .text('Remember: Upload your Brand Guidelines before generating.', { align: 'center' });
    doc.moveDown(1);
    doc.text('Consistency is key to building trust.', { align: 'center' });
    doc.moveDown(3);
    doc.fillColor(colors.lightGray).fontSize(12)
        .text('© Shopify Branding Blueprint | Advanced Marketing', { align: 'center' });

    doc.end();
    console.log('Created: email-sequence-swipe-file.pdf');
}

// ============================================
// 2. CANVA BRAND KIT
// ============================================
function generateCanvaBrandKit() {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(path.join(outputDir, 'canva-brand-kit-guide.pdf')));

    // Cover
    doc.rect(0, 0, 612, 792).fill(colors.black);
    doc.fillColor(colors.gold).fontSize(36).font('Helvetica-Bold')
        .text('DONE-FOR-YOU', 50, 200, { align: 'center' });
    doc.fontSize(36).text('CANVA BRAND KIT', { align: 'center' });
    doc.moveDown(2);
    doc.fillColor(colors.white).fontSize(16).font('Helvetica')
        .text('50+ Templates + AI Prompt System', { align: 'center' });
    doc.moveDown(1);
    doc.fillColor(colors.lightGray).fontSize(12)
        .text('Shopify Branding Blueprint | Advanced Marketing', { align: 'center' });

    // Page 2 - What's Included
    doc.addPage();
    addHeader(doc, 'What\'s Inside Your Brand Kit', 'Everything for professional brand presence');

    addSectionTitle(doc, 'Template Categories Included');
    addBulletList(doc, [
        'Logo Variations (5 layouts: full, icon, horizontal, vertical, favicon)',
        'Social Media Posts (15 templates: quotes, promos, testimonials)',
        'Instagram Stories (10 templates: announcements, polls, behind-scenes)',
        'Facebook/Instagram Ads (8 templates: carousel, single image)',
        'Email Headers (5 templates: newsletter, promo, welcome, cart)',
        'Business Cards (3 layouts: modern, minimal, classic)',
        'Thank You Cards (2 templates: insert cards for packages)',
        'Promotional Banners (4 sizes: hero, sidebar, leaderboard, square)'
    ]);

    addSectionTitle(doc, 'How to Access Your Templates');
    addNumberedList(doc, [
        'Click the Canva link provided in your purchase confirmation',
        'Click "Use Template" to copy to your Canva account',
        'Replace placeholder text and images with your brand assets',
        'Use Brand Kit feature in Canva to save your colors and fonts',
        'Export in the format you need (PNG, JPG, PDF, or video)'
    ]);

    // Page 3 - Brand Setup
    doc.addPage();
    addHeader(doc, 'Setting Up Your Brand in Canva', 'One-time setup for consistent branding');

    addSectionTitle(doc, 'Step 1: Create Your Brand Kit');
    addBodyText(doc, `In Canva, go to "Brand Kit" (requires Canva Pro, or use free trial):

1. Add Your Logo: Upload all logo variations (PNG with transparent background)

2. Set Brand Colors: Add your primary, secondary, and accent colors
   - Primary: Your main brand color (buttons, headings)
   - Secondary: Supporting color (backgrounds, borders)
   - Accent: Pop color (CTAs, highlights)
   - Neutral: Text color (usually dark gray or black)

3. Add Brand Fonts: Upload custom fonts or choose from Canva's library
   - Heading Font: Bold, attention-grabbing
   - Body Font: Clean, readable
   - Accent Font: Optional, for special emphasis

Once set up, these will auto-populate in all templates!`);

    addSectionTitle(doc, 'Step 2: Organize Your Brand Assets');
    addBodyText(doc, `Create folders in Canva for:
• Product Photos (high-res, white background + lifestyle)
• Lifestyle Images (brand aesthetic photos)
• Icons & Graphics (UI elements, arrows, badges)
• Team/Founder Photos (for about pages, emails)
• User Generated Content (customer photos with permission)
• Screenshots & Mockups (app previews, product in use)`);

    // Page 4 - AI Prompts
    doc.addPage();
    addHeader(doc, 'AI Prompts for Custom Graphics', 'Generate unique visuals with Gemini/DALL-E');

    addBodyText(doc, `Use these prompts with Google Gemini, ChatGPT (DALL-E), or Midjourney to create custom graphics, then import them into your Canva templates.`);

    addCopyableBlock(doc, 'Product Lifestyle Images Prompt', `Create a lifestyle product photography scene for a [PRODUCT TYPE].
Setting: [modern home/outdoor/studio/cafe]
Style: [minimal/cozy/luxurious/natural]
Lighting: soft natural light from the left
Color palette: [YOUR BRAND COLORS]
Mood: [aspirational/relaxed/energetic]
Leave space for product placement on the [left/right/center].`);

    addCopyableBlock(doc, 'Social Media Backgrounds Prompt', `Design an abstract background for social media in [BRAND STYLE].
Colors: gradient of [COLOR 1] to [COLOR 2]
Elements: subtle [geometric shapes/organic waves/texture]
Dimensions: 1080x1080 pixels
Leave the center area clean for text overlay.`);

    addCopyableBlock(doc, 'Brand Pattern/Texture Prompt', `Create a seamless repeating pattern for a [INDUSTRY] brand.
Style: [minimal/bold/organic/geometric]
Colors: [PRIMARY] and [SECONDARY] on [BACKGROUND]
Elements: [relevant icons or shapes]
Usage: backgrounds, packaging, website sections`);

    // Page 5 - Social Media Guide
    doc.addPage();
    addHeader(doc, 'Social Media Templates Guide', 'Best practices for each template type');

    addSectionTitle(doc, 'Instagram Feed Post Templates (1080x1080)');
    addBodyText(doc, `QUOTE POSTS: Share customer testimonials or brand values
• Keep text large and readable
• Use brand colors as background
• Add small logo watermark

PRODUCT SHOWCASE: Feature single products
• Clean white or lifestyle background
• Product name and key benefit
• Price or "Shop Now" CTA

TIPS/EDUCATIONAL: Share value with your audience
• Numbered lists work great
• "Save this post" encourages engagement
• Use consistent template style`);

    addSectionTitle(doc, 'Instagram Story Templates (1080x1920)');
    addBodyText(doc, `ANNOUNCEMENT STORIES: New products, sales, restocks
• Bold headline at top
• Product image centered
• Swipe up CTA (or link sticker)

POLL/QUIZ STORIES: Engagement boosters
• Simple question format
• Fun, brand-voice copy
• Leave room for poll sticker`);

    // Page 6 - Ad Templates
    doc.addPage();
    addHeader(doc, 'Facebook & Instagram Ad Templates', 'High-converting ad creative guidelines');

    addSectionTitle(doc, 'Single Image Ad (1200x628 for Feed)');
    addBodyText(doc, `ANATOMY OF HIGH-CONVERTING AD:

[EYE-CATCHING HEADLINE] ← Bold, benefit-focused
[PRODUCT IMAGE] ← High-quality, clear
[Supporting text or offer] ← Social proof or discount
[BRAND LOGO] [CTA BADGE] ← Small logo + "Shop Now"

TIPS:
• Text should be less than 20% of image
• Use contrasting colors for text
• Show the product in use when possible
• Include social proof numbers when available`);

    addSectionTitle(doc, 'Carousel Ad (1080x1080 per card)');
    addBodyText(doc, `CARD 1: Hook - "The Problem" or attention-grabber
CARD 2: Product introduction
CARD 3: Key Benefit #1
CARD 4: Key Benefit #2
CARD 5: Social Proof/Testimonial
CARD 6: Offer + CTA

Keep design consistent across all cards
Use visual flow that encourages swiping
Last card should have clear call-to-action`);

    // Final page
    doc.addPage();
    doc.rect(0, 0, 612, 792).fill(colors.black);
    doc.fillColor(colors.gold).fontSize(28).font('Helvetica-Bold')
        .text('Your Brand, Elevated', 50, 300, { align: 'center' });
    doc.moveDown(2);
    doc.fillColor(colors.white).fontSize(14).font('Helvetica')
        .text('Access your Canva templates with the link in your portal.', { align: 'center' });
    doc.moveDown(1);
    doc.text('Questions? Email support@advancedmarketing.co', { align: 'center' });
    doc.moveDown(3);
    doc.fillColor(colors.lightGray).fontSize(12)
        .text('© Shopify Branding Blueprint | Advanced Marketing', { align: 'center' });

    doc.end();
    console.log('Created: canva-brand-kit-guide.pdf');
}

// ============================================
// 3. SEO CHECKLIST
// ============================================
function generateSEOChecklist() {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(path.join(outputDir, 'shopify-seo-checklist.pdf')));

    // Cover
    doc.rect(0, 0, 612, 792).fill(colors.black);
    doc.fillColor(colors.gold).fontSize(36).font('Helvetica-Bold')
        .text('ULTIMATE SHOPIFY', 50, 180, { align: 'center' });
    doc.fontSize(36).text('SEO CHECKLIST', { align: 'center' });
    doc.moveDown(1);
    doc.fillColor(colors.white).fontSize(48).font('Helvetica-Bold')
        .text('77', { align: 'center' });
    doc.fontSize(18).font('Helvetica')
        .text('Actionable Checkpoints', { align: 'center' });
    doc.moveDown(2);
    doc.fillColor(colors.lightGray).fontSize(12)
        .text('Rank Higher • Get Found • Drive Organic Traffic', { align: 'center' });

    // Page 2 - Technical SEO
    doc.addPage();
    addHeader(doc, 'Part 1: Technical SEO Foundation', 'Infrastructure for search engines');

    addSectionTitle(doc, 'Site Structure & Crawlability');
    addBodyText(doc, `□ 1. Submit sitemap to Google Search Console (yourdomain.com/sitemap.xml)
□ 2. Submit sitemap to Bing Webmaster Tools
□ 3. Check robots.txt isn't blocking important pages
□ 4. Verify no duplicate content with canonical tags
□ 5. Ensure HTTPS is enabled on all pages
□ 6. Set up 301 redirects for any changed URLs
□ 7. Fix all broken links (404 errors)
□ 8. Create custom 404 page with navigation
□ 9. Implement breadcrumb navigation
□ 10. Keep URL structure clean and logical`);

    addSectionTitle(doc, 'Site Speed Optimization');
    addBodyText(doc, `□ 11. Test site speed with Google PageSpeed Insights (aim for 90+)
□ 12. Compress all images before uploading (TinyPNG or Squoosh)
□ 13. Use WebP image format where possible
□ 14. Lazy load images below the fold
□ 15. Minimize third-party apps (each one slows your site)
□ 16. Remove unused apps completely
□ 17. Use system fonts or limit custom font weights
□ 18. Enable browser caching
□ 19. Minimize JavaScript and CSS
□ 20. Use a fast, optimized Shopify theme`);

    // Page 3 - Mobile & Schema
    doc.addPage();
    addHeader(doc, 'Technical SEO Continued', 'Mobile & Structured Data');

    addSectionTitle(doc, 'Mobile Optimization');
    addBodyText(doc, `□ 21. Test with Google Mobile-Friendly Test tool
□ 22. Ensure tap targets are large enough (48x48px minimum)
□ 23. Text is readable without zooming (16px minimum)
□ 24. No horizontal scrolling required
□ 25. Buttons and CTAs are thumb-friendly
□ 26. Forms are easy to complete on mobile
□ 27. Images resize properly on all devices
□ 28. Navigation works well on small screens
□ 29. Checkout is mobile-optimized
□ 30. Page speed is fast on 3G/4G connections`);

    addSectionTitle(doc, 'Structured Data / Schema Markup');
    addBodyText(doc, `□ 31. Implement Product schema on all product pages
□ 32. Add Organization schema to homepage
□ 33. Include BreadcrumbList schema
□ 34. Add FAQ schema to FAQ pages
□ 35. Implement Review/Rating schema for products
□ 36. Add LocalBusiness schema if you have physical location
□ 37. Test schemas with Google Rich Results Test
□ 38. Verify schema in Search Console`);

    // Page 4 - On-Page SEO
    doc.addPage();
    addHeader(doc, 'Part 2: On-Page SEO', 'Optimizing content for search engines');

    addSectionTitle(doc, 'Homepage Optimization');
    addBodyText(doc, `□ 39. Title tag includes primary keyword + brand (under 60 chars)
□ 40. Meta description is compelling with CTA (under 155 chars)
□ 41. H1 tag contains primary keyword
□ 42. Homepage has at least 300 words of content
□ 43. Internal links to key category/collection pages
□ 44. Social proof visible (reviews, trust badges)
□ 45. Clear value proposition above the fold
□ 46. Contact information easily accessible`);

    addSectionTitle(doc, 'Product Page Optimization');
    addBodyText(doc, `□ 47. Unique title tag for each product (Product Name | Category | Brand)
□ 48. Unique meta description highlighting key benefit + CTA
□ 49. Product title (H1) includes target keyword naturally
□ 50. Product description is unique (not manufacturer copy)
□ 51. Product descriptions are 200+ words with keywords
□ 52. Include bullet points for key features/benefits
□ 53. All images have descriptive alt text
□ 54. Image file names include keywords (blue-running-shoes.jpg)
□ 55. Customer reviews displayed on page
□ 56. Related products linked for internal linking
□ 57. Size guides, FAQs, or additional content where relevant
□ 58. Clean URL structure (/products/product-name)`);

    // Page 5 - Collection & Blog
    doc.addPage();
    addHeader(doc, 'Collection & Blog SEO', 'Categories and content');

    addSectionTitle(doc, 'Collection Page Optimization');
    addBodyText(doc, `□ 59. Unique title tag with collection keyword
□ 60. Unique meta description for each collection
□ 61. Collection description with 150+ words of content
□ 62. H1 matches collection name and target keyword
□ 63. Filter/sort options don't create duplicate URLs
□ 64. Pagination handled properly (rel=prev/next or load more)
□ 65. Subcollection linking structure is logical
□ 66. Collection images are optimized with alt text`);

    addSectionTitle(doc, 'Blog SEO Strategy');
    addBodyText(doc, `□ 67. Blog posts target long-tail keywords
□ 68. Each post has unique, keyword-rich title tag
□ 69. Meta descriptions encourage clicks from search
□ 70. Posts are 1000+ words for comprehensive coverage
□ 71. Include internal links to products/collections
□ 72. Use H2 and H3 subheadings with keywords
□ 73. Add images with descriptive alt text
□ 74. Include table of contents for long posts
□ 75. Add schema markup for articles
□ 76. Promote new posts on social media
□ 77. Update old posts with fresh content annually`);

    // Page 6 - Keyword Research
    doc.addPage();
    addHeader(doc, 'Bonus: Keyword Research Guide', 'Find the right keywords');

    addBodyText(doc, `Effective SEO starts with understanding what your customers are searching for.`);

    addSectionTitle(doc, 'Free Keyword Research Tools');
    addBodyText(doc, `1. Google Keyword Planner (ads.google.com)
   - Shows search volume and competition
   - Free with Google Ads account

2. Ubersuggest (neilpatel.com/ubersuggest)
   - Free tier available
   - Shows keyword difficulty

3. Google Search Autocomplete
   - Type your seed keyword, see what Google suggests
   - These are real searches people make

4. "People Also Ask" boxes in Google
   - Great for finding question-based keywords
   - Perfect for blog content ideas

5. Amazon Search Suggestions
   - Shows product-related searches
   - High commercial intent keywords`);

    addCopyableBlock(doc, 'AI Prompt for Keyword Research', `I run a Shopify store selling [YOUR PRODUCT CATEGORY].
My target customer is [DESCRIBE YOUR IDEAL CUSTOMER].

Generate 20 keyword ideas I should target, organized by:
1. Product keywords (what people search to buy)
2. Problem keywords (what issues they're trying to solve)
3. Comparison keywords (vs. competitors or alternatives)
4. Long-tail keywords (specific, lower competition)

For each keyword, estimate search intent (buy/research/compare).`);

    // Page 7 - Monthly Checklist
    doc.addPage();
    addHeader(doc, 'Monthly SEO Maintenance', 'Keep your SEO on track');

    addSectionTitle(doc, 'Weekly Tasks');
    addBodyText(doc, `□ Check Google Search Console for errors or warnings
□ Monitor keyword rankings for your top 10 terms
□ Review and respond to new customer reviews
□ Publish 1-2 blog posts targeting new keywords
□ Share blog content on social media`);

    addSectionTitle(doc, 'Monthly Tasks');
    addBodyText(doc, `□ Run full site speed test and address issues
□ Check for broken links and fix them
□ Update 2-3 old blog posts with fresh content
□ Analyze competitor SEO strategies
□ Review Search Console performance report
□ Optimize 5-10 product descriptions
□ Add new products with fully optimized content
□ Check mobile usability in Search Console
□ Review and update title tags/meta descriptions
□ Build 2-3 new quality backlinks`);

    addSectionTitle(doc, 'Quarterly Tasks');
    addBodyText(doc, `□ Full SEO audit using this checklist
□ Competitive analysis and keyword gap analysis
□ Review and update site structure if needed
□ Audit and clean up redirect chains
□ Check Core Web Vitals and address issues
□ Update schema markup as needed
□ Review and refresh cornerstone content`);

    // Final page
    doc.addPage();
    doc.rect(0, 0, 612, 792).fill(colors.black);
    doc.fillColor(colors.gold).fontSize(28).font('Helvetica-Bold')
        .text('SEO is a Marathon, Not a Sprint', 50, 300, { align: 'center' });
    doc.moveDown(2);
    doc.fillColor(colors.white).fontSize(14).font('Helvetica')
        .text('Implement these 77 checkpoints systematically.', { align: 'center' });
    doc.moveDown(0.5);
    doc.text('Track your progress. See results in 3-6 months.', { align: 'center' });
    doc.moveDown(3);
    doc.fillColor(colors.lightGray).fontSize(12)
        .text('© Shopify Branding Blueprint | Advanced Marketing', { align: 'center' });

    doc.end();
    console.log('Created: shopify-seo-checklist.pdf');
}

// ============================================
// 4. FACEBOOK ADS MASTERCLASS
// ============================================
function generateFBAdsGuide() {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(path.join(outputDir, 'facebook-ads-masterclass.pdf')));

    // Cover
    doc.rect(0, 0, 612, 792).fill(colors.black);
    doc.fillColor(colors.gold).fontSize(36).font('Helvetica-Bold')
        .text('FACEBOOK ADS', 50, 180, { align: 'center' });
    doc.fontSize(36).text('FOR BRANDS', { align: 'center' });
    doc.fontSize(24).text('MASTERCLASS', { align: 'center' });
    doc.moveDown(2);
    doc.fillColor(colors.white).fontSize(16).font('Helvetica')
        .text('The Complete Guide to Profitable Shopify Advertising', { align: 'center' });
    doc.moveDown(1);
    doc.fillColor(colors.lightGray).fontSize(12)
        .text('From $0 to Scaling Profitably', { align: 'center' });

    // Page 2 - Introduction
    doc.addPage();
    addHeader(doc, 'Welcome to the Masterclass', 'Your roadmap to Facebook Ads success');

    addBodyText(doc, `This masterclass is designed for Shopify store owners who want to profitably scale their business with Facebook and Instagram advertising.

Whether you're spending $0 or $10,000/month, you'll learn:
• How to structure your ad account for success
• The exact audiences that convert
• Ad creative frameworks that stop the scroll
• How to optimize and scale winning campaigns
• Common mistakes and how to avoid them

Important: Facebook Ads work best when your brand foundation is solid. Complete your Brand Guidelines and have quality product photography before running ads.`);

    addSectionTitle(doc, 'What You\'ll Need Before Starting');
    addBulletList(doc, [
        'Facebook Business Manager account',
        'Facebook Pixel installed on your Shopify store',
        'At least 5-10 high-quality product images',
        'Clear understanding of your target customer',
        'Budget of at least $10-20/day to start testing',
        'Patience - profitable ads take 2-4 weeks to optimize'
    ]);

    // Page 3 - Account Structure
    doc.addPage();
    addHeader(doc, 'Chapter 1: Account Structure', 'Setting up for success');

    addSectionTitle(doc, 'The Proper Campaign Structure');
    addBodyText(doc, `CAMPAIGN (Objective Level)
├── AD SET 1 (Audience: Interest-based)
│   ├── Ad 1 (Image creative)
│   ├── Ad 2 (Video creative)
│   └── Ad 3 (Carousel creative)
├── AD SET 2 (Audience: Lookalike)
│   ├── Ad 1, Ad 2, Ad 3
└── AD SET 3 (Audience: Retargeting)
    ├── Ad 1, Ad 2, Ad 3

Key principle: Test ONE variable at a time.
- Different audiences? Same ads.
- Different ads? Same audience.`);

    addSectionTitle(doc, 'Campaign Objectives - When to Use Each');
    addBodyText(doc, `SALES (Conversions) - 90% of your campaigns
• Use for: Direct product sales
• Optimize for: Purchase
• When pixel has 50+ purchases, use this

TRAFFIC - Only for specific cases
• Use for: Blog content, building pixel data
• NOT recommended for direct sales

ENGAGEMENT - Social proof building
• Use for: Getting likes/comments on posts
• Then use those posts as ads`);

    // Page 4 - Audiences
    doc.addPage();
    addHeader(doc, 'Chapter 2: Audience Targeting', 'Finding your ideal customers');

    addSectionTitle(doc, 'The Three Audience Types');
    addBodyText(doc, `1. COLD AUDIENCES (People who don't know you)
   • Interest-based targeting
   • Lookalike audiences
   • Broad/no targeting (for large budgets)

2. WARM AUDIENCES (People who've engaged)
   • Video viewers (25%, 50%, 75%, 95%)
   • Social media engagers
   • Website visitors (no purchase)

3. HOT AUDIENCES (People ready to buy)
   • Add to cart abandoners
   • Checkout abandoners
   • Past purchasers (for upsells)`);

    addSectionTitle(doc, 'Interest Targeting Framework');
    addBodyText(doc, `Layer interests for more qualified audiences:

BEHAVIOR + INTEREST + DEMOGRAPHIC

Example for a yoga clothing brand:
• Behavior: Engaged shoppers
• Interest: Yoga Journal OR Lululemon OR Yoga
• Demographic: Women 25-45

Stack 3-5 interests per ad set (OR targeting)
Keep audience size 1-10 million for testing`);

    // Page 5 - Creative
    doc.addPage();
    addHeader(doc, 'Chapter 3: Ad Creative', 'Stop the scroll and drive action');

    addSectionTitle(doc, 'The Anatomy of a High-Converting Ad');
    addBodyText(doc, `PRIMARY TEXT (Above the image):
• Hook in first line - stop the scroll
• 2-3 lines about benefits (not features)
• Social proof if possible
• Clear CTA

CREATIVE (Image or Video):
• Product in use > product alone
• Faces outperform no faces
• Movement catches attention
• Text overlay <20% of image

HEADLINE (Below image):
• Offer or main benefit
• Keep under 40 characters

DESCRIPTION:
• Secondary benefit or offer detail`);

    addSectionTitle(doc, 'Ad Copy Frameworks');

    addCopyableBlock(doc, 'PAS Framework (Problem-Agitate-Solution)', `Tired of [PROBLEM]?
You've tried [failed solutions] but nothing works.
[PRODUCT] finally [SOLUTION].
Shop now: [LINK]`);

    addCopyableBlock(doc, 'Social Proof Framework', `[NUMBER] happy customers can't be wrong.
⭐⭐⭐⭐⭐ "[SHORT REVIEW]" - [NAME]
See why everyone's switching to [PRODUCT].
Shop: [LINK]`);

    // Page 6 - Testing
    doc.addPage();
    addHeader(doc, 'Chapter 4: Testing Framework', 'Find winners systematically');

    addSectionTitle(doc, 'The Testing Budget Framework');
    addBodyText(doc, `RULE OF THUMB:
Spend 2-3x your target CPA before judging an ad.

If your target CPA (cost per acquisition) is $30:
• Test budget: $60-90 per ad set
• At $20/day: 3-4 days of data

MINIMUM VIABLE TEST:
• 3 audiences x 3 ads = 9 ad sets
• $20/day each = $180/day
• Run for 4-7 days

SMALL BUDGET APPROACH ($20-50/day total):
• Test 1-2 audiences at a time
• 2-3 ads per audience
• Longer testing period (7-10 days)`);

    addSectionTitle(doc, 'Metrics to Watch');
    addBodyText(doc, `CTR (Click-through rate):
• Above 1% = Good creative
• Below 0.5% = Creative problem

CPC (Cost per click):
• Under $1 = Great
• $1-2 = Acceptable

ROAS (Return on ad spend):
• 2x+ = Profitable (depends on margins)
• 3x+ = Scale aggressively
• Below 1.5x = Needs optimization`);

    // Page 7 - Scaling
    doc.addPage();
    addHeader(doc, 'Chapter 5: Scaling Strategies', 'Go from profitable to printing money');

    addSectionTitle(doc, 'When to Scale');
    addBodyText(doc, `Only scale when you have:
✓ Consistent ROAS above target for 5-7 days
✓ At least 50 conversions in testing
✓ Multiple winning audiences
✓ Multiple winning creatives
✓ Landing page conversion rate above 2%

DON'T scale if:
✗ Only 1-2 days of good data
✗ Single winning ad (will fatigue)
✗ ROAS is inconsistent`);

    addSectionTitle(doc, 'Scaling Methods');
    addBodyText(doc, `1. VERTICAL SCALING (Increase budget)
   • Increase by 20-30% every 3-4 days
   • Never more than 2x in a single day
   • Watch for CPA increase

2. HORIZONTAL SCALING (More ad sets)
   • Duplicate winning ad sets
   • Test new lookalike percentages
   • Expand to new interests

3. CREATIVE SCALING
   • Create variations of winning ads
   • New hooks with same body
   • Same hook with new visuals`);

    // Page 8 - Retargeting
    doc.addPage();
    addHeader(doc, 'Chapter 6: Retargeting Mastery', 'Convert warm audiences');

    addSectionTitle(doc, 'Retargeting Funnel Structure');
    addBodyText(doc, `TIER 1: ABANDONED CART (Hottest)
Audience: Added to cart, no purchase (1-7 days)
Message: Reminder + incentive
Budget: 20-30% of retargeting budget

TIER 2: PRODUCT VIEWERS
Audience: Viewed product, no add to cart (1-14 days)
Message: Benefits + social proof
Budget: 30-40% of retargeting budget

TIER 3: WEBSITE VISITORS
Audience: Visited site, no product view (1-30 days)
Message: Brand story + bestsellers
Budget: 20-30% of retargeting budget

TIER 4: SOCIAL ENGAGERS
Audience: Engaged with social content (1-60 days)
Message: Introduction + offer
Budget: 10-20% of retargeting budget`);

    // Page 9 - AI Prompts
    doc.addPage();
    addHeader(doc, 'Bonus: AI Prompts for Ad Copy', 'Generate unlimited variations');

    addBodyText(doc, `Use these prompts with ChatGPT, Claude, or Gemini. Upload your Brand Guidelines first.`);

    addCopyableBlock(doc, 'Master Ad Copy Prompt', `You are a Facebook Ads expert who has managed $10M+ in ad spend. Using my brand guidelines, create Facebook ad copy.

PRODUCT: [NAME AND BRIEF DESCRIPTION]
TARGET AUDIENCE: [WHO THEY ARE, WHAT THEY WANT]
OFFER: [DISCOUNT, FREE SHIPPING, ETC.]
GOAL: [COLD TRAFFIC/RETARGETING/AWARENESS]

Create 5 variations of primary text, each using a different framework:
1. Problem-Agitate-Solution
2. Social proof focused
3. Direct response with strong CTA
4. Storytelling/emotional appeal
5. Curiosity-driven

For each, include:
- Hook (first line that stops the scroll)
- Body (2-3 lines)
- CTA

Also provide 3 headline options and 3 description options.`);

    addCopyableBlock(doc, 'Video Script Prompt', `Write a 30-second Facebook video ad script for [PRODUCT].

Structure:
- 0-3 sec: Hook (pattern interrupt or bold question)
- 3-15 sec: Problem and solution (show the transformation)
- 15-25 sec: Social proof and offer
- 25-30 sec: Clear CTA

Tone: [Casual/Professional/Playful per brand guidelines]
Format: Include visual directions in [brackets]`);

    // Page 10 - Common Mistakes
    doc.addPage();
    addHeader(doc, 'Chapter 7: Common Mistakes', 'Learn from others\' expensive lessons');

    addBodyText(doc, `MISTAKE #1: SCALING TOO FAST
The problem: Doubling budget overnight crashes performance.
The fix: Increase by max 20-30% every 3-4 days.

MISTAKE #2: NOT TESTING ENOUGH CREATIVES
The problem: Running 1-2 ads and expecting success.
The fix: Test 5-10 creatives to find 1-2 winners.

MISTAKE #3: OPTIMIZING FOR THE WRONG METRIC
The problem: Celebrating high CTR but no sales.
The fix: Optimize for purchase/ROAS, not engagement.

MISTAKE #4: AUDIENCE OVERLAP
The problem: Same person seeing ads from multiple ad sets.
The fix: Use exclusions and check overlap in Ads Manager.

MISTAKE #5: IGNORING THE LANDING PAGE
The problem: Great ads sending traffic to poor pages.
The fix: Match ad message to landing page. Optimize for mobile.

MISTAKE #6: GIVING UP TOO SOON
The problem: Turning off ads after 1-2 days.
The fix: Give ads 3-5 days and 50+ link clicks before judging.

MISTAKE #7: NOT USING THE PIXEL PROPERLY
The problem: Pixel not firing or tracking wrong events.
The fix: Use Facebook Pixel Helper extension to verify.`);

    // Final page
    doc.addPage();
    doc.rect(0, 0, 612, 792).fill(colors.black);
    doc.fillColor(colors.gold).fontSize(28).font('Helvetica-Bold')
        .text('Now Go Build Your Ad Empire', 50, 300, { align: 'center' });
    doc.moveDown(2);
    doc.fillColor(colors.white).fontSize(14).font('Helvetica')
        .text('Start small. Test everything. Scale what works.', { align: 'center' });
    doc.moveDown(1);
    doc.text('Questions? Email support@advancedmarketing.co', { align: 'center' });
    doc.moveDown(3);
    doc.fillColor(colors.lightGray).fontSize(12)
        .text('© Shopify Branding Blueprint | Advanced Marketing', { align: 'center' });

    doc.end();
    console.log('Created: facebook-ads-masterclass.pdf');
}

// Generate all PDFs
console.log('Generating PDFs with copyable text...');
generateEmailSwipeFile();
generateCanvaBrandKit();
generateSEOChecklist();
generateFBAdsGuide();
console.log('All PDFs generated in:', outputDir);
