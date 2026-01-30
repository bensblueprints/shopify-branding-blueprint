// Complete Course Seeding Script for Shopify Branding Blueprint
//
// ⚠️  WARNING: This script ONLY deletes course content (lessons, modules, etc.)
// ⚠️  It does NOT and should NEVER delete user records.
// ⚠️  User deletion is ONLY permitted manually from the admin dashboard.
//
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const sql = neon(process.env.DATABASE_URL);

function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'blueprint_salt').digest('hex');
}

async function seedDatabase() {
    console.log('Starting complete database seed...\n');

    // =====================================================
    // 1. CREATE ADMIN USER
    // =====================================================
    console.log('=== Creating Admin User ===');
    const adminEmail = 'admin@advancedmarketing.co';
    const adminPassword = 'Blueprint2024!';
    const hashedPassword = hashPassword(adminPassword);

    await sql`
        INSERT INTO admin_users (email, password_hash, full_name, role)
        VALUES (${adminEmail}, ${hashedPassword}, 'Ben Admin', 'super_admin')
        ON CONFLICT (email) DO UPDATE SET password_hash = ${hashedPassword}
    `;
    console.log('✓ Admin: admin@advancedmarketing.co / Blueprint2024!\n');

    // =====================================================
    // 2. CREATE UPSELL PRODUCTS
    // =====================================================
    console.log('=== Creating Upsell Products ===');
    const products = [
        {
            key: 'canva_kit',
            title: 'Done-For-You Canva Brand Kit',
            price: 2700,
            features: ['50+ Professional Templates', 'Logo Variations', 'Social Media Posts', 'Story Templates', 'Business Cards', 'Email Headers', 'Promo Banners']
        },
        {
            key: 'email_swipe',
            title: 'Email Sequence Swipe File',
            price: 1900,
            features: ['Welcome Sequence (5 emails)', 'Abandoned Cart Recovery', 'Post-Purchase Follow-up', 'Win-Back Campaign', 'Product Launch Templates', 'Holiday Promotions']
        },
        {
            key: 'seo_checklist',
            title: 'Ultimate Shopify SEO Checklist',
            price: 2700,
            features: ['77 SEO Checkpoints', 'Technical SEO Guide', 'On-Page Optimization', 'Collection Page SEO', 'Blog SEO Strategy', 'Link Building Tips']
        },
        {
            key: 'fb_ads',
            title: 'Facebook Ads for Brands Masterclass',
            price: 9700,
            features: ['Complete FB Ads Course', 'Audience Targeting Secrets', 'Ad Creative Templates', 'Retargeting Strategies', 'Scaling Frameworks', 'ROAS Optimization']
        },
        {
            key: 'inner_circle',
            title: 'Brand Builders Inner Circle',
            price: 4700,
            features: ['Private Discord Community', 'Weekly Live Q&A Calls', 'Member-Only Content', 'Networking Opportunities', 'Expert Guest Speakers', 'Accountability Partners']
        }
    ];

    for (const p of products) {
        await sql`
            INSERT INTO products (id, handle, product_key, title, name, price_cents, is_active, features, created_at, updated_at)
            VALUES (gen_random_uuid(), ${p.key}, ${p.key}, ${p.title}, ${p.title}, ${p.price}, true, ${JSON.stringify(p.features)}::jsonb, NOW(), NOW())
            ON CONFLICT (handle) DO UPDATE SET
                product_key = ${p.key},
                name = ${p.title},
                price_cents = ${p.price},
                features = ${JSON.stringify(p.features)}::jsonb,
                is_active = true,
                updated_at = NOW()
        `;
        console.log(`✓ ${p.title} ($${p.price/100})`);
    }
    console.log('');

    // =====================================================
    // 3. CREATE MAIN COURSE
    // =====================================================
    console.log('=== Creating Main Course ===');

    // Delete existing course data for fresh start
    // NOTE: These delete course CONTENT only, never user records!
    // User records (users, customers, admin_users) are PROTECTED.
    await sql`DELETE FROM lesson_progress WHERE lesson_id IN (SELECT id FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id IN (SELECT id FROM courses WHERE slug = 'shopify-branding-blueprint')))`;
    await sql`DELETE FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id IN (SELECT id FROM courses WHERE slug = 'shopify-branding-blueprint'))`;
    await sql`DELETE FROM modules WHERE course_id IN (SELECT id FROM courses WHERE slug = 'shopify-branding-blueprint')`;
    await sql`DELETE FROM enrollments WHERE course_id IN (SELECT id FROM courses WHERE slug = 'shopify-branding-blueprint')`;
    await sql`DELETE FROM courses WHERE slug = 'shopify-branding-blueprint'`;

    const courseResult = await sql`
        INSERT INTO courses (id, title, slug, description, thumbnail_url, status)
        VALUES (
            gen_random_uuid(),
            'Shopify Branding Blueprint',
            'shopify-branding-blueprint',
            'Transform your Shopify store into a powerful brand that stands out from the competition. Learn the exact strategies used by 7-figure stores to create memorable brand experiences, build customer loyalty, and increase conversions.',
            '/images/course-thumbnail.jpg',
            'published'
        )
        RETURNING id
    `;
    const courseId = courseResult[0].id;
    console.log('✓ Course created: Shopify Branding Blueprint\n');

    // =====================================================
    // 4. CREATE MODULES AND LESSONS
    // =====================================================
    console.log('=== Creating Modules and Lessons ===');

    const courseContent = [
        {
            title: 'Module 1: Brand Foundation',
            description: 'Establish the core elements of your brand identity that will guide every business decision.',
            lessons: [
                {
                    title: 'Welcome to the Blueprint',
                    description: 'An overview of what you will learn and how to get the most out of this course.',
                    content: `<h2>Welcome to the Shopify Branding Blueprint!</h2>
                    <p>Congratulations on taking the first step toward building a powerful brand on Shopify. In this course, you'll learn the exact strategies that 7-figure stores use to create memorable brand experiences.</p>
                    <h3>What You'll Learn:</h3>
                    <ul>
                        <li>How to define your brand's core identity</li>
                        <li>Creating a visual identity that stands out</li>
                        <li>Building customer trust and loyalty</li>
                        <li>Optimizing your store for conversions</li>
                        <li>Advanced growth strategies</li>
                    </ul>
                    <h3>How to Use This Course:</h3>
                    <p>Each module builds on the previous one, so we recommend going through them in order. Complete the exercises in each lesson before moving on.</p>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 720,
                    resources: { worksheet: '/downloads/welcome-worksheet.pdf' }
                },
                {
                    title: 'Defining Your Brand Purpose',
                    description: 'Discover your brand\'s "why" and create a mission that resonates with your target audience.',
                    content: `<h2>Your Brand's Purpose</h2>
                    <p>Every successful brand has a clear purpose that goes beyond making money. Your brand purpose is the reason your company exists and the impact you want to make in your customers' lives.</p>
                    <h3>The Golden Circle</h3>
                    <p>Simon Sinek's famous framework helps us understand brand purpose:</p>
                    <ul>
                        <li><strong>Why:</strong> Your purpose, cause, or belief</li>
                        <li><strong>How:</strong> Your unique approach or process</li>
                        <li><strong>What:</strong> Your products or services</li>
                    </ul>
                    <h3>Exercise: Define Your Why</h3>
                    <p>Answer these questions to uncover your brand's purpose:</p>
                    <ol>
                        <li>What problem does your brand solve?</li>
                        <li>What would the world lose if your brand didn't exist?</li>
                        <li>What drives you beyond profit?</li>
                    </ol>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 900,
                    resources: { worksheet: '/downloads/brand-purpose-worksheet.pdf' }
                },
                {
                    title: 'Identifying Your Target Audience',
                    description: 'Create detailed customer avatars that will guide all your marketing decisions.',
                    content: `<h2>Know Your Customer</h2>
                    <p>The most successful brands know their customers better than they know themselves. This lesson will help you create detailed customer avatars.</p>
                    <h3>Customer Avatar Framework</h3>
                    <ul>
                        <li><strong>Demographics:</strong> Age, gender, location, income</li>
                        <li><strong>Psychographics:</strong> Values, interests, lifestyle</li>
                        <li><strong>Pain Points:</strong> Problems they need solved</li>
                        <li><strong>Goals:</strong> What they want to achieve</li>
                        <li><strong>Objections:</strong> Why they might not buy</li>
                    </ul>
                    <h3>Research Methods</h3>
                    <p>Use these methods to gather customer insights:</p>
                    <ul>
                        <li>Customer surveys and interviews</li>
                        <li>Social media listening</li>
                        <li>Competitor review analysis</li>
                        <li>Google Analytics demographic data</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 1080,
                    resources: { worksheet: '/downloads/customer-avatar-worksheet.pdf' }
                },
                {
                    title: 'Competitive Analysis',
                    description: 'Analyze your competitors to find opportunities for differentiation.',
                    content: `<h2>Know Your Competition</h2>
                    <p>Understanding your competitive landscape helps you find gaps in the market and opportunities to stand out.</p>
                    <h3>Competitor Analysis Framework</h3>
                    <ol>
                        <li><strong>Identify Competitors:</strong> Direct and indirect</li>
                        <li><strong>Analyze Their Brand:</strong> Positioning, messaging, visuals</li>
                        <li><strong>Study Their Products:</strong> Features, pricing, reviews</li>
                        <li><strong>Evaluate Their Marketing:</strong> Channels, content, ads</li>
                        <li><strong>Find Gaps:</strong> What are they missing?</li>
                    </ol>
                    <h3>Tools for Research</h3>
                    <ul>
                        <li>SimilarWeb for traffic analysis</li>
                        <li>Facebook Ad Library for ad research</li>
                        <li>Google Trends for market trends</li>
                        <li>Review sites for customer feedback</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 840,
                    resources: { worksheet: '/downloads/competitive-analysis-worksheet.pdf' }
                }
            ]
        },
        {
            title: 'Module 2: Visual Identity',
            description: 'Create a cohesive visual brand that makes a lasting impression.',
            lessons: [
                {
                    title: 'Brand Color Psychology',
                    description: 'Choose colors that evoke the right emotions and connect with your audience.',
                    content: `<h2>The Power of Color</h2>
                    <p>Colors evoke emotions and can significantly impact how customers perceive your brand. Choose wisely!</p>
                    <h3>Color Meanings</h3>
                    <ul>
                        <li><strong>Red:</strong> Passion, urgency, excitement</li>
                        <li><strong>Blue:</strong> Trust, stability, professionalism</li>
                        <li><strong>Green:</strong> Growth, health, nature</li>
                        <li><strong>Yellow:</strong> Optimism, creativity, warmth</li>
                        <li><strong>Purple:</strong> Luxury, creativity, wisdom</li>
                        <li><strong>Orange:</strong> Energy, enthusiasm, adventure</li>
                        <li><strong>Black:</strong> Sophistication, luxury, power</li>
                    </ul>
                    <h3>Creating Your Palette</h3>
                    <p>A complete brand color palette includes:</p>
                    <ul>
                        <li>Primary color (main brand color)</li>
                        <li>Secondary color (complement)</li>
                        <li>Accent colors (CTAs, highlights)</li>
                        <li>Neutral colors (backgrounds, text)</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 780,
                    resources: { worksheet: '/downloads/color-palette-worksheet.pdf' }
                },
                {
                    title: 'Typography That Converts',
                    description: 'Select fonts that reflect your brand personality and improve readability.',
                    content: `<h2>Typography Fundamentals</h2>
                    <p>Your font choices communicate as much about your brand as your words do. The right typography builds trust and improves conversions.</p>
                    <h3>Font Categories</h3>
                    <ul>
                        <li><strong>Serif:</strong> Traditional, trustworthy, sophisticated (Times, Georgia)</li>
                        <li><strong>Sans-Serif:</strong> Modern, clean, friendly (Helvetica, Arial)</li>
                        <li><strong>Script:</strong> Elegant, creative, personal (Pacifico, Dancing Script)</li>
                        <li><strong>Display:</strong> Bold, attention-grabbing (Impact, Bebas)</li>
                    </ul>
                    <h3>Typography Best Practices</h3>
                    <ul>
                        <li>Use 2-3 fonts maximum</li>
                        <li>Ensure readability on all devices</li>
                        <li>Create clear hierarchy with sizes</li>
                        <li>Maintain consistent line heights</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 660,
                    resources: { worksheet: '/downloads/typography-guide.pdf' }
                },
                {
                    title: 'Logo Design Principles',
                    description: 'Create a memorable logo that works across all platforms and sizes.',
                    content: `<h2>Logo Design That Lasts</h2>
                    <p>Your logo is often the first touchpoint customers have with your brand. It should be memorable, versatile, and timeless.</p>
                    <h3>Principles of Great Logos</h3>
                    <ul>
                        <li><strong>Simple:</strong> Easy to recognize and remember</li>
                        <li><strong>Versatile:</strong> Works at any size, any medium</li>
                        <li><strong>Timeless:</strong> Avoids trendy elements</li>
                        <li><strong>Relevant:</strong> Connects to your industry</li>
                        <li><strong>Memorable:</strong> Stands out from competitors</li>
                    </ul>
                    <h3>Logo Variations You Need</h3>
                    <ul>
                        <li>Primary logo (full version)</li>
                        <li>Secondary logo (simplified)</li>
                        <li>Icon/favicon (smallest size)</li>
                        <li>Wordmark (text only)</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 900,
                    resources: { worksheet: '/downloads/logo-checklist.pdf' }
                },
                {
                    title: 'Brand Photography Guidelines',
                    description: 'Develop a consistent photography style that elevates your products.',
                    content: `<h2>Visual Content Strategy</h2>
                    <p>Consistent, high-quality imagery builds trust and showcases your products in the best light.</p>
                    <h3>Product Photography Tips</h3>
                    <ul>
                        <li>Use natural or studio lighting</li>
                        <li>Maintain consistent backgrounds</li>
                        <li>Show products from multiple angles</li>
                        <li>Include lifestyle shots</li>
                        <li>Ensure accurate colors</li>
                    </ul>
                    <h3>Creating a Shot List</h3>
                    <p>For each product, capture:</p>
                    <ol>
                        <li>Hero shot (main image)</li>
                        <li>Detail shots (close-ups)</li>
                        <li>Scale shots (size reference)</li>
                        <li>Lifestyle shots (in use)</li>
                        <li>Group shots (with related items)</li>
                    </ol>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 720,
                    resources: { worksheet: '/downloads/photography-guidelines.pdf' }
                }
            ]
        },
        {
            title: 'Module 3: Brand Voice & Messaging',
            description: 'Develop a unique voice that resonates with your audience across all channels.',
            lessons: [
                {
                    title: 'Developing Your Brand Voice',
                    description: 'Create a distinctive voice that reflects your brand personality.',
                    content: `<h2>Finding Your Voice</h2>
                    <p>Your brand voice is the personality that comes through in all your communications. It should be consistent, authentic, and memorable.</p>
                    <h3>Voice Dimensions</h3>
                    <ul>
                        <li><strong>Funny vs. Serious</strong></li>
                        <li><strong>Formal vs. Casual</strong></li>
                        <li><strong>Respectful vs. Irreverent</strong></li>
                        <li><strong>Enthusiastic vs. Matter-of-fact</strong></li>
                    </ul>
                    <h3>Voice Guidelines</h3>
                    <p>Document your voice with:</p>
                    <ul>
                        <li>3-5 voice characteristics</li>
                        <li>"Do" and "Don't" examples</li>
                        <li>Sample sentences for common situations</li>
                        <li>Words to use and avoid</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 840,
                    resources: { worksheet: '/downloads/brand-voice-worksheet.pdf' }
                },
                {
                    title: 'Crafting Your Brand Story',
                    description: 'Write a compelling origin story that connects emotionally with customers.',
                    content: `<h2>The Power of Story</h2>
                    <p>Humans are wired for stories. A compelling brand story creates emotional connection and makes your brand memorable.</p>
                    <h3>Story Framework</h3>
                    <ol>
                        <li><strong>The Struggle:</strong> What problem did you face?</li>
                        <li><strong>The Epiphany:</strong> What insight changed everything?</li>
                        <li><strong>The Solution:</strong> How did you solve it?</li>
                        <li><strong>The Mission:</strong> Why do you want to help others?</li>
                        <li><strong>The Vision:</strong> What future are you creating?</li>
                    </ol>
                    <h3>Writing Tips</h3>
                    <ul>
                        <li>Be authentic and vulnerable</li>
                        <li>Focus on transformation</li>
                        <li>Include specific details</li>
                        <li>Keep it concise</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 780,
                    resources: { worksheet: '/downloads/brand-story-template.pdf' }
                },
                {
                    title: 'Product Descriptions That Sell',
                    description: 'Write compelling product copy that converts browsers into buyers.',
                    content: `<h2>Copywriting for Conversions</h2>
                    <p>Great product descriptions do more than describe—they sell. Learn to write copy that converts.</p>
                    <h3>Product Copy Formula</h3>
                    <ol>
                        <li><strong>Hook:</strong> Grab attention with a benefit</li>
                        <li><strong>Problem:</strong> Acknowledge the pain point</li>
                        <li><strong>Solution:</strong> Introduce your product</li>
                        <li><strong>Features:</strong> List with benefit-driven copy</li>
                        <li><strong>Social Proof:</strong> Reviews and testimonials</li>
                        <li><strong>CTA:</strong> Clear call to action</li>
                    </ol>
                    <h3>Power Words to Use</h3>
                    <ul>
                        <li>Free, Exclusive, Limited</li>
                        <li>Guaranteed, Proven, Trusted</li>
                        <li>Instant, Quick, Easy</li>
                        <li>Premium, Luxury, Authentic</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 960,
                    resources: { worksheet: '/downloads/product-copy-template.pdf' }
                },
                {
                    title: 'Email & Social Media Copy',
                    description: 'Write engaging content for email marketing and social media.',
                    content: `<h2>Multi-Channel Copywriting</h2>
                    <p>Adapt your brand voice for different channels while maintaining consistency.</p>
                    <h3>Email Best Practices</h3>
                    <ul>
                        <li>Compelling subject lines (under 50 chars)</li>
                        <li>Personal, conversational tone</li>
                        <li>One clear CTA per email</li>
                        <li>Mobile-optimized formatting</li>
                    </ul>
                    <h3>Social Media Guidelines</h3>
                    <ul>
                        <li><strong>Instagram:</strong> Visual-first, inspirational</li>
                        <li><strong>Facebook:</strong> Community-focused, shareable</li>
                        <li><strong>TikTok:</strong> Authentic, entertaining</li>
                        <li><strong>Pinterest:</strong> Educational, aspirational</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 840,
                    resources: { worksheet: '/downloads/content-calendar-template.pdf' }
                }
            ]
        },
        {
            title: 'Module 4: Store Optimization',
            description: 'Transform your Shopify store into a conversion machine.',
            lessons: [
                {
                    title: 'Homepage That Converts',
                    description: 'Design a homepage that captures attention and drives action.',
                    content: `<h2>Homepage Best Practices</h2>
                    <p>Your homepage has 3 seconds to make an impression. Make every element count.</p>
                    <h3>Essential Homepage Elements</h3>
                    <ol>
                        <li><strong>Hero Section:</strong> Clear value proposition</li>
                        <li><strong>Social Proof:</strong> Trust badges, reviews</li>
                        <li><strong>Featured Products:</strong> Best sellers</li>
                        <li><strong>Brand Story:</strong> Who you are</li>
                        <li><strong>Email Capture:</strong> Build your list</li>
                    </ol>
                    <h3>Above the Fold</h3>
                    <ul>
                        <li>Clear headline with benefit</li>
                        <li>Supporting subheadline</li>
                        <li>Strong CTA button</li>
                        <li>Hero image/video</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 1080,
                    resources: { worksheet: '/downloads/homepage-checklist.pdf' }
                },
                {
                    title: 'Product Page Optimization',
                    description: 'Create product pages that overcome objections and close sales.',
                    content: `<h2>Product Page Framework</h2>
                    <p>The product page is where buying decisions happen. Optimize every element for conversion.</p>
                    <h3>Essential Elements</h3>
                    <ul>
                        <li>High-quality product images</li>
                        <li>Clear pricing and variants</li>
                        <li>Compelling product description</li>
                        <li>Customer reviews</li>
                        <li>Trust badges</li>
                        <li>Clear Add to Cart button</li>
                        <li>Shipping and returns info</li>
                    </ul>
                    <h3>Conversion Boosters</h3>
                    <ul>
                        <li>Urgency (limited stock, sale timer)</li>
                        <li>Social proof (reviews, testimonials)</li>
                        <li>Related products</li>
                        <li>FAQ section</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 1200,
                    resources: { worksheet: '/downloads/product-page-checklist.pdf' }
                },
                {
                    title: 'Navigation & User Experience',
                    description: 'Create intuitive navigation that guides customers to purchase.',
                    content: `<h2>UX That Sells</h2>
                    <p>Great user experience removes friction and guides customers toward purchase.</p>
                    <h3>Navigation Best Practices</h3>
                    <ul>
                        <li>Keep main menu under 7 items</li>
                        <li>Use clear, descriptive labels</li>
                        <li>Include search functionality</li>
                        <li>Make cart easily accessible</li>
                        <li>Mobile-first design</li>
                    </ul>
                    <h3>Reducing Friction</h3>
                    <ul>
                        <li>Fast page load times</li>
                        <li>Clear breadcrumbs</li>
                        <li>Filters and sorting options</li>
                        <li>Persistent cart</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 720,
                    resources: { worksheet: '/downloads/ux-audit-checklist.pdf' }
                },
                {
                    title: 'Checkout Optimization',
                    description: 'Reduce cart abandonment with a frictionless checkout process.',
                    content: `<h2>Checkout That Converts</h2>
                    <p>The average cart abandonment rate is 70%. Let's fix that.</p>
                    <h3>Checkout Best Practices</h3>
                    <ul>
                        <li>Guest checkout option</li>
                        <li>Progress indicator</li>
                        <li>Multiple payment options</li>
                        <li>Clear shipping costs upfront</li>
                        <li>Trust badges at checkout</li>
                        <li>Mobile-optimized forms</li>
                    </ul>
                    <h3>Abandoned Cart Recovery</h3>
                    <ul>
                        <li>Email sequence (1hr, 24hr, 72hr)</li>
                        <li>Exit-intent popups</li>
                        <li>Retargeting ads</li>
                        <li>SMS reminders</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 900,
                    resources: { worksheet: '/downloads/checkout-optimization-guide.pdf' }
                }
            ]
        },
        {
            title: 'Module 5: Growth & Scaling',
            description: 'Advanced strategies to grow your brand and increase revenue.',
            lessons: [
                {
                    title: 'Email Marketing for Brands',
                    description: 'Build and monetize your email list with automated sequences.',
                    content: `<h2>Email Marketing Mastery</h2>
                    <p>Email remains the highest ROI marketing channel. Build systems that generate revenue on autopilot.</p>
                    <h3>Essential Email Flows</h3>
                    <ol>
                        <li><strong>Welcome Series:</strong> 5-7 emails introducing your brand</li>
                        <li><strong>Abandoned Cart:</strong> 3 emails recovering lost sales</li>
                        <li><strong>Post-Purchase:</strong> Thank you, review request, cross-sell</li>
                        <li><strong>Win-Back:</strong> Re-engage inactive subscribers</li>
                        <li><strong>Browse Abandonment:</strong> Remind of viewed products</li>
                    </ol>
                    <h3>List Building Strategies</h3>
                    <ul>
                        <li>Popup offers (10-15% off)</li>
                        <li>Spin-to-win wheels</li>
                        <li>Content upgrades</li>
                        <li>Giveaways and contests</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 1320,
                    resources: { worksheet: '/downloads/email-marketing-playbook.pdf' }
                },
                {
                    title: 'Social Media Strategy',
                    description: 'Build an engaged community that drives organic traffic and sales.',
                    content: `<h2>Social Media for Brands</h2>
                    <p>Social media builds brand awareness, community, and organic traffic when done strategically.</p>
                    <h3>Platform Strategy</h3>
                    <ul>
                        <li><strong>Instagram:</strong> Visual content, Reels, Stories</li>
                        <li><strong>TikTok:</strong> Authentic, trending content</li>
                        <li><strong>Pinterest:</strong> Evergreen product pins</li>
                        <li><strong>Facebook:</strong> Community groups, ads</li>
                    </ul>
                    <h3>Content Pillars</h3>
                    <ul>
                        <li>Educational (tips, how-tos)</li>
                        <li>Inspirational (lifestyle, aspirational)</li>
                        <li>Entertaining (behind-the-scenes)</li>
                        <li>Promotional (products, offers)</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 1080,
                    resources: { worksheet: '/downloads/social-media-strategy.pdf' }
                },
                {
                    title: 'Influencer Partnerships',
                    description: 'Partner with influencers to reach new audiences and build credibility.',
                    content: `<h2>Influencer Marketing</h2>
                    <p>The right influencer partnerships can dramatically expand your reach and credibility.</p>
                    <h3>Finding the Right Influencers</h3>
                    <ul>
                        <li>Alignment with brand values</li>
                        <li>Engaged audience (not just followers)</li>
                        <li>Authentic content style</li>
                        <li>Relevant niche</li>
                    </ul>
                    <h3>Partnership Models</h3>
                    <ul>
                        <li><strong>Gifting:</strong> Free products for content</li>
                        <li><strong>Affiliate:</strong> Commission on sales</li>
                        <li><strong>Sponsored:</strong> Paid content creation</li>
                        <li><strong>Ambassador:</strong> Long-term partnership</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 960,
                    resources: { worksheet: '/downloads/influencer-outreach-template.pdf' }
                },
                {
                    title: 'Scaling with Paid Ads',
                    description: 'Introduction to paid advertising for accelerated growth.',
                    content: `<h2>Paid Advertising Fundamentals</h2>
                    <p>When you're ready to scale, paid ads can accelerate growth exponentially.</p>
                    <h3>Platforms to Consider</h3>
                    <ul>
                        <li><strong>Meta (FB/IG):</strong> Best for prospecting</li>
                        <li><strong>Google:</strong> Capture search intent</li>
                        <li><strong>TikTok:</strong> Reach Gen Z audiences</li>
                        <li><strong>Pinterest:</strong> High purchase intent</li>
                    </ul>
                    <h3>Getting Started</h3>
                    <ol>
                        <li>Install tracking pixels</li>
                        <li>Define your ideal customer</li>
                        <li>Start with retargeting</li>
                        <li>Test creative variations</li>
                        <li>Scale what works</li>
                    </ol>
                    <p><em>For a deep dive into Facebook Ads, check out our Facebook Ads Masterclass upsell!</em></p>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 1200,
                    resources: { worksheet: '/downloads/paid-ads-starter-guide.pdf' }
                },
                {
                    title: 'Course Wrap-Up & Next Steps',
                    description: 'Review what you\'ve learned and create your action plan.',
                    content: `<h2>Congratulations!</h2>
                    <p>You've completed the Shopify Branding Blueprint! Let's review what you've learned and create your action plan.</p>
                    <h3>Key Takeaways</h3>
                    <ul>
                        <li>Your brand is more than just a logo—it's the experience you create</li>
                        <li>Consistency across all touchpoints builds trust</li>
                        <li>Know your customer deeply to serve them better</li>
                        <li>Great brands are built one day at a time</li>
                    </ul>
                    <h3>Your 30-Day Action Plan</h3>
                    <ol>
                        <li><strong>Week 1:</strong> Complete brand foundation exercises</li>
                        <li><strong>Week 2:</strong> Finalize visual identity</li>
                        <li><strong>Week 3:</strong> Optimize store pages</li>
                        <li><strong>Week 4:</strong> Launch marketing campaigns</li>
                    </ol>
                    <h3>Continue Your Journey</h3>
                    <p>Check out our additional resources:</p>
                    <ul>
                        <li>Canva Brand Kit Templates</li>
                        <li>Email Sequence Swipe File</li>
                        <li>Facebook Ads Masterclass</li>
                        <li>Brand Builders Inner Circle</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    video_duration: 600,
                    resources: { worksheet: '/downloads/30-day-action-plan.pdf' }
                }
            ]
        }
    ];

    for (let mi = 0; mi < courseContent.length; mi++) {
        const module = courseContent[mi];

        const moduleResult = await sql`
            INSERT INTO modules (id, course_id, title, description, sort_order)
            VALUES (gen_random_uuid(), ${courseId}, ${module.title}, ${module.description}, ${mi + 1})
            RETURNING id
        `;
        const moduleId = moduleResult[0].id;
        console.log(`✓ ${module.title}`);

        for (let li = 0; li < module.lessons.length; li++) {
            const lesson = module.lessons[li];

            await sql`
                INSERT INTO lessons (id, module_id, title, description, video_url, video_duration, content, resources, sort_order)
                VALUES (
                    gen_random_uuid(),
                    ${moduleId},
                    ${lesson.title},
                    ${lesson.description},
                    ${lesson.video_url},
                    ${lesson.video_duration},
                    ${lesson.content},
                    ${JSON.stringify(lesson.resources)}::jsonb,
                    ${li + 1}
                )
            `;
            console.log(`  - ${lesson.title}`);
        }
    }

    // =====================================================
    // 5. SUMMARY
    // =====================================================
    console.log('\n=== Database Seeding Complete ===');
    console.log('\nAdmin Login:');
    console.log('  Email: admin@advancedmarketing.co');
    console.log('  Password: Blueprint2024!');
    console.log('\nCourse: Shopify Branding Blueprint');
    console.log('  5 Modules, 21 Lessons');
    console.log('\nProducts: 5 Upsell Products Created');
}

seedDatabase().catch(console.error);
