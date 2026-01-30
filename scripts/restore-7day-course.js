// Restore 7-Day Course with Full Content
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function restoreWithContent() {
    console.log('=== RESTORING 7-DAY COURSE WITH FULL CONTENT ===\n');

    // Get the course
    const courses = await sql`SELECT id FROM courses WHERE slug = 'shopify-branding-blueprint'`;
    let courseId;

    if (courses.length > 0) {
        courseId = courses[0].id;
        // Clear old structure
        await sql`DELETE FROM lesson_progress WHERE lesson_id IN (SELECT id FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = ${courseId}))`;
        await sql`DELETE FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = ${courseId})`;
        await sql`DELETE FROM modules WHERE course_id = ${courseId}`;
        console.log('Cleared old structure\n');
    } else {
        const result = await sql`
            INSERT INTO courses (slug, title, description, status, created_at, updated_at)
            VALUES ('shopify-branding-blueprint', '7-Day Shopify Branding Blueprint', 'Complete branding system', 'ACTIVE', NOW(), NOW())
            RETURNING id
        `;
        courseId = result[0].id;
    }

    // 7 days with full content
    const days = [
        {
            title: 'Day 1: What Is a Brand?',
            description: 'The brutal truth about dropshipping & why brands always win',
            lessons: [
                {
                    title: 'Welcome & Course Overview',
                    description: 'Introduction to the course and what you will learn.',
                    content: `<h2>Welcome to the 7-Day Shopify Branding Blueprint!</h2>
<p>Congratulations on taking the first step toward building a real brand on Shopify. Over the next 7 days, you'll learn the exact system used by 7-figure stores to transform generic dropshipping operations into premium brands.</p>
<h3>What You'll Learn:</h3>
<ul>
<li>Why 95% of dropshippers fail and how brands always win</li>
<li>The asset mindset that separates business owners from operators</li>
<li>How to create perfect branding (logo, colors, voice, story)</li>
<li>Finding products and suppliers that fit your brand</li>
<li>Customization strategies from POD to private label</li>
<li>Industry-specific roadmaps for clothing, coffee, and supplements</li>
<li>Your complete launch plan</li>
</ul>
<h3>How to Use This Course:</h3>
<p>Each day builds on the previous, so go through them in order. Complete the exercises before moving on. By Day 7, you'll have a complete brand strategy ready to launch.</p>`
                },
                {
                    title: 'The Dropshipping Illusion',
                    description: 'Why 95% of dropshippers fail and the fundamental flaw in the winning product model.',
                    content: `<h2>The Dropshipping Illusion</h2>
<p>Let's be honest: the "winning product" model is broken. Here's why 95% of dropshippers fail:</p>
<h3>The Race to the Bottom</h3>
<ul>
<li>Everyone selling the same products from the same suppliers</li>
<li>Competing purely on price (a losing game)</li>
<li>No customer loyalty - they'll buy from whoever is cheapest</li>
<li>Constantly chasing the next "winning product"</li>
</ul>
<h3>The Fundamental Flaw</h3>
<p>When you build around products instead of brand, you're renting attention instead of building equity. Every ad dollar spent is gone forever. There's no compounding effect.</p>
<h3>The Brand Difference</h3>
<p>Brands create customers who come back. Brands build communities. Brands have pricing power. Brands can be sold as valuable assets.</p>`
                },
                {
                    title: 'What Is a Brand, Really?',
                    description: 'Understanding what separates a forgettable store from a memorable brand.',
                    content: `<h2>What Is a Brand, Really?</h2>
<p>A brand is NOT just a logo. A brand is the complete experience customers have with your business.</p>
<h3>The Components of a Brand:</h3>
<ul>
<li><strong>Visual Identity:</strong> Logo, colors, typography, photography style</li>
<li><strong>Brand Voice:</strong> How you communicate, your personality</li>
<li><strong>Brand Story:</strong> Your origin, mission, and values</li>
<li><strong>Customer Experience:</strong> Every touchpoint from discovery to post-purchase</li>
<li><strong>Brand Promise:</strong> What customers can always expect from you</li>
</ul>
<h3>Why This Matters</h3>
<p>When all these elements work together consistently, customers develop trust. Trust leads to purchases. Purchases lead to loyalty. Loyalty leads to referrals. This is the brand flywheel.</p>`
                },
                {
                    title: 'The Brand Advantage',
                    description: 'The compounding benefits of building a brand vs chasing products.',
                    content: `<h2>The Brand Advantage</h2>
<p>Here's what changes when you build a brand instead of just a store:</p>
<h3>1. Pricing Power</h3>
<p>Brands can charge premium prices. Nike sells shoes for 10x the cost to make them. Why? Because of the brand.</p>
<h3>2. Customer Lifetime Value</h3>
<p>Brand customers come back 3-5x more often than commodity buyers. Your customer acquisition cost gets amortized over multiple purchases.</p>
<h3>3. Lower Ad Costs</h3>
<p>Branded search terms cost less. Retargeting converts higher. Word of mouth reduces paid acquisition needs.</p>
<h3>4. Exit Value</h3>
<p>A brand is a sellable asset. Generic dropshipping stores sell for 1-2x annual profit. Brands sell for 3-5x or more.</p>
<h3>5. Competitive Moat</h3>
<p>Products can be copied overnight. Brands cannot. Your brand becomes your unfair advantage.</p>`
                }
            ]
        },
        {
            title: 'Day 2: What It Means to Own a Brand',
            description: 'The asset mindset & owning vs. renting your business',
            lessons: [
                {
                    title: 'The Owner vs Operator Mindset',
                    description: 'Shifting from business operator to business owner thinking.',
                    content: `<h2>The Owner vs Operator Mindset</h2>
<p>Most entrepreneurs are stuck in operator mode - trading time for money, reacting to daily fires, never building real value.</p>
<h3>Operator Mindset:</h3>
<ul>
<li>"How do I make money this month?"</li>
<li>Focuses on revenue</li>
<li>Chases tactics and hacks</li>
<li>Works IN the business</li>
</ul>
<h3>Owner Mindset:</h3>
<ul>
<li>"How do I build value that compounds?"</li>
<li>Focuses on equity</li>
<li>Builds systems and brand</li>
<li>Works ON the business</li>
</ul>
<p>The shift happens when you start asking: "What am I building that will be worth something in 3 years?"</p>`
                },
                {
                    title: 'Building an Asset vs Renting One',
                    description: 'Understanding the difference between building equity and generating income.',
                    content: `<h2>Building an Asset vs Renting One</h2>
<p>Every business decision falls into one of two categories:</p>
<h3>Renting (No Lasting Value):</h3>
<ul>
<li>Paid ads with no brand building</li>
<li>Selling generic products</li>
<li>Chasing trends</li>
<li>Building on rented platforms only</li>
</ul>
<h3>Building (Creates Equity):</h3>
<ul>
<li>Building an email list</li>
<li>Creating unique products</li>
<li>Developing brand recognition</li>
<li>Building owned channels (website, email)</li>
<li>Creating content that ranks</li>
</ul>
<p>Every dollar and hour should go toward activities that create lasting value, not just immediate revenue.</p>`
                },
                {
                    title: 'The Brand Equity Formula',
                    description: 'How brand equity compounds over time and increases your business value.',
                    content: `<h2>The Brand Equity Formula</h2>
<p>Brand equity is the commercial value that comes from customer perception of your brand name.</p>
<h3>Brand Equity = (Awareness + Associations) x Trust</h3>
<h3>Building Awareness:</h3>
<ul>
<li>Consistent visual identity across all touchpoints</li>
<li>Content marketing and SEO</li>
<li>Social media presence</li>
<li>PR and partnerships</li>
</ul>
<h3>Building Associations:</h3>
<ul>
<li>What do customers think of when they see your brand?</li>
<li>Quality? Innovation? Value? Luxury?</li>
<li>Every interaction shapes these associations</li>
</ul>
<h3>Building Trust:</h3>
<ul>
<li>Consistency in delivery</li>
<li>Customer service excellence</li>
<li>Social proof and reviews</li>
<li>Transparency and authenticity</li>
</ul>`
                },
                {
                    title: 'Your Brand Vision Exercise',
                    description: 'Defining your 3-year brand vision and reverse-engineering the path.',
                    content: `<h2>Your Brand Vision Exercise</h2>
<p>Let's create your 3-year brand vision. Close your eyes and imagine your brand in 3 years...</p>
<h3>Answer These Questions:</h3>
<ol>
<li><strong>Revenue:</strong> How much is your brand generating annually?</li>
<li><strong>Customers:</strong> How many loyal customers do you have?</li>
<li><strong>Products:</strong> What's your product line look like?</li>
<li><strong>Team:</strong> Who's working with you?</li>
<li><strong>Recognition:</strong> What is your brand known for?</li>
<li><strong>Impact:</strong> How are you changing customers' lives?</li>
</ol>
<h3>Reverse Engineer:</h3>
<p>Now work backwards. If that's Year 3, what needs to be true by Year 2? Year 1? 6 months? Today?</p>
<p>Write down 3 things you need to start doing THIS WEEK to move toward that vision.</p>`
                }
            ]
        },
        {
            title: 'Day 3: Create Perfect Branding',
            description: 'Logo, colors, fonts, voice, story - your complete brand identity',
            lessons: [
                {
                    title: 'Brand Positioning & Differentiation',
                    description: 'Finding your unique position in the market.',
                    content: `<h2>Brand Positioning & Differentiation</h2>
<p>Positioning is about owning a specific place in your customer's mind.</p>
<h3>The Positioning Statement:</h3>
<p>For [target customer] who [customer need], [brand name] is the [category] that [key benefit] because [reason to believe].</p>
<h3>Finding Your Differentiation:</h3>
<ul>
<li><strong>Product:</strong> Unique features, quality, design</li>
<li><strong>Service:</strong> Better support, faster shipping, guarantees</li>
<li><strong>Price:</strong> Premium or value positioning</li>
<li><strong>Story:</strong> Founder story, mission, values</li>
<li><strong>Audience:</strong> Serving a specific niche better than anyone</li>
</ul>
<h3>Exercise:</h3>
<p>Complete this sentence: "We're the only [category] that [unique thing]."</p>`
                },
                {
                    title: 'Crafting Your Brand Story',
                    description: 'Creating a compelling origin story that connects emotionally.',
                    content: `<h2>Crafting Your Brand Story</h2>
<p>Stories create emotional connections. Your brand story answers: Why does this brand exist?</p>
<h3>The Story Framework:</h3>
<ol>
<li><strong>The Problem:</strong> What frustration or gap did you experience?</li>
<li><strong>The Moment:</strong> What was the turning point?</li>
<li><strong>The Solution:</strong> How did you solve it?</li>
<li><strong>The Mission:</strong> Why do you want to help others?</li>
<li><strong>The Vision:</strong> What future are you creating?</li>
</ol>
<h3>Tips for Great Brand Stories:</h3>
<ul>
<li>Be authentic - customers can smell BS</li>
<li>Include specific details</li>
<li>Focus on transformation</li>
<li>Make the customer the hero</li>
</ul>`
                },
                {
                    title: 'Defining Your Brand Voice',
                    description: 'Developing a consistent voice that resonates with your audience.',
                    content: `<h2>Defining Your Brand Voice</h2>
<p>Your brand voice is the personality that comes through in all communications.</p>
<h3>Voice Dimensions:</h3>
<ul>
<li><strong>Funny vs Serious</strong></li>
<li><strong>Formal vs Casual</strong></li>
<li><strong>Respectful vs Irreverent</strong></li>
<li><strong>Enthusiastic vs Matter-of-fact</strong></li>
</ul>
<h3>Creating Voice Guidelines:</h3>
<ol>
<li>Choose 3-5 adjectives that describe your voice</li>
<li>Write "We are... We are not..." statements</li>
<li>Create example sentences for common situations</li>
<li>List words to use and words to avoid</li>
</ol>
<h3>Consistency is Key:</h3>
<p>Your voice should be the same across website, emails, social media, customer service, and packaging.</p>`
                },
                {
                    title: 'Visual Identity - Logo Design',
                    description: 'Creating or sourcing a professional logo.',
                    content: `<h2>Visual Identity - Logo Design</h2>
<p>Your logo is the visual cornerstone of your brand. Here are three approaches:</p>
<h3>Option 1: AI + Canva (Free)</h3>
<p>Use Google Gemini to generate concepts, then refine in Canva. Fast and free.</p>
<h3>Option 2: Freelancer ($50-300)</h3>
<p>Fiverr, 99designs, or Upwork. Look for 4.8+ stars and check portfolios.</p>
<h3>Option 3: Agency ($1,000+)</h3>
<p>For serious brands ready to invest in strategic design.</p>
<h3>Logo Checklist:</h3>
<ul>
<li>Works at any size (favicon to billboard)</li>
<li>Simple and memorable</li>
<li>Works on light and dark backgrounds</li>
<li>Reflects your brand personality</li>
<li>Timeless (avoid trends)</li>
</ul>`
                },
                {
                    title: 'Visual Identity - Colors & Typography',
                    description: 'Choosing brand colors and fonts.',
                    content: `<h2>Visual Identity - Colors & Typography</h2>
<h3>Color Psychology:</h3>
<ul>
<li><strong>Red:</strong> Passion, urgency, excitement</li>
<li><strong>Blue:</strong> Trust, stability, professionalism</li>
<li><strong>Green:</strong> Growth, health, nature</li>
<li><strong>Yellow:</strong> Optimism, creativity, warmth</li>
<li><strong>Purple:</strong> Luxury, creativity, wisdom</li>
<li><strong>Black:</strong> Sophistication, luxury, power</li>
</ul>
<h3>Your Color Palette:</h3>
<ul>
<li>Primary color (main brand color)</li>
<li>Secondary color (complement)</li>
<li>Accent color (CTAs, highlights)</li>
<li>Neutral colors (backgrounds, text)</li>
</ul>
<h3>Typography:</h3>
<ul>
<li>Heading font (personality)</li>
<li>Body font (readability)</li>
<li>Stick to 2-3 fonts maximum</li>
</ul>`
                }
            ]
        },
        {
            title: 'Day 4: Find Products & Suppliers',
            description: 'Product selection framework & building supplier relationships',
            lessons: [
                {
                    title: 'The Brand-First Product Framework',
                    description: 'Selecting products that fit your brand.',
                    content: `<h2>The Brand-First Product Framework</h2>
<p>Instead of finding products then building a brand, start with brand then find products that fit.</p>
<h3>Product Selection Criteria:</h3>
<ol>
<li><strong>Brand Fit:</strong> Does this product align with our brand identity?</li>
<li><strong>Margin Potential:</strong> Can we charge premium prices?</li>
<li><strong>Customization:</strong> Can we make it uniquely ours?</li>
<li><strong>Quality:</strong> Does it meet our brand standards?</li>
<li><strong>Scalability:</strong> Can we get consistent supply?</li>
</ol>
<h3>The Product-Brand Matrix:</h3>
<p>Rate each potential product 1-5 on each criterion. Only pursue products scoring 20+ out of 25.</p>`
                },
                {
                    title: 'Product Research Deep Dive',
                    description: 'Advanced product research techniques.',
                    content: `<h2>Product Research Deep Dive</h2>
<h3>Research Methods:</h3>
<ul>
<li><strong>Amazon Best Sellers:</strong> What's selling in your category?</li>
<li><strong>Social Listening:</strong> What are customers complaining about?</li>
<li><strong>Competitor Analysis:</strong> What gaps exist in current offerings?</li>
<li><strong>Google Trends:</strong> Is demand growing or declining?</li>
<li><strong>Reddit/Forums:</strong> What do enthusiasts want?</li>
</ul>
<h3>Validation Checklist:</h3>
<ul>
<li>Search volume exists</li>
<li>Competition is beatable</li>
<li>Margins are healthy (aim for 60%+)</li>
<li>Product can be improved or differentiated</li>
<li>Fits your brand positioning</li>
</ul>`
                },
                {
                    title: 'Finding Quality Suppliers',
                    description: 'Sourcing reliable suppliers.',
                    content: `<h2>Finding Quality Suppliers</h2>
<h3>Supplier Sources:</h3>
<ul>
<li><strong>Alibaba:</strong> Largest B2B marketplace</li>
<li><strong>1688:</strong> Chinese domestic (better prices, needs agent)</li>
<li><strong>Trade Shows:</strong> Canton Fair, industry events</li>
<li><strong>Domestic:</strong> Local manufacturers</li>
<li><strong>Maker's Row:</strong> US-based manufacturing</li>
</ul>
<h3>Vetting Suppliers:</h3>
<ol>
<li>Years in business (3+ preferred)</li>
<li>Trade assurance or verified status</li>
<li>Response time and communication quality</li>
<li>Sample quality</li>
<li>MOQ flexibility</li>
<li>References from other buyers</li>
</ol>`
                },
                {
                    title: 'Building Supplier Relationships',
                    description: 'Negotiation and long-term partnerships.',
                    content: `<h2>Building Supplier Relationships</h2>
<p>Great suppliers become competitive advantages. Invest in these relationships.</p>
<h3>Negotiation Tips:</h3>
<ul>
<li>Always get multiple quotes</li>
<li>Start with smaller orders, grow together</li>
<li>Ask for payment terms after proving reliability</li>
<li>Negotiate on more than just price (shipping, MOQ, samples)</li>
</ul>
<h3>Building Long-Term Partnership:</h3>
<ul>
<li>Pay on time, every time</li>
<li>Communicate clearly and professionally</li>
<li>Share your growth plans</li>
<li>Visit them if possible</li>
<li>Give them steady, predictable orders</li>
</ul>
<p>A supplier who trusts you will prioritize your orders, hold inventory, and work with you on custom products.</p>`
                }
            ]
        },
        {
            title: 'Day 5: Get Products Customized',
            description: 'POD, private label, Alibaba deep dive & packaging design',
            lessons: [
                {
                    title: 'Customization Strategy Overview',
                    description: 'Choosing the right approach for your stage.',
                    content: `<h2>Customization Strategy Overview</h2>
<p>There's a spectrum of customization, from zero to fully custom products.</p>
<h3>Level 1: No Customization</h3>
<p>Dropshipping generic products. Lowest barrier but no differentiation.</p>
<h3>Level 2: Packaging Only</h3>
<p>Same product, your branded packaging. Quick win for brand perception.</p>
<h3>Level 3: Print-on-Demand</h3>
<p>Your designs on base products. No inventory risk.</p>
<h3>Level 4: Private Label</h3>
<p>Existing product with your branding throughout. Requires MOQ.</p>
<h3>Level 5: Custom Manufacturing</h3>
<p>Products designed to your specifications. Highest barrier, highest differentiation.</p>
<p><strong>Recommendation:</strong> Start at Level 2-3, graduate to 4-5 as you validate demand.</p>`
                },
                {
                    title: 'Print-on-Demand for Brand Builders',
                    description: 'Using POD strategically.',
                    content: `<h2>Print-on-Demand for Brand Builders</h2>
<p>POD isn't just for side hustles - it's a powerful tool for brand testing.</p>
<h3>Best POD Platforms:</h3>
<ul>
<li><strong>Printful:</strong> Best quality, US/EU fulfillment</li>
<li><strong>Printify:</strong> More options, variable quality</li>
<li><strong>Gooten:</strong> Good for specific products</li>
<li><strong>SPOD:</strong> Fast shipping</li>
</ul>
<h3>POD Strategy for Brands:</h3>
<ol>
<li>Use POD to test designs before bulk ordering</li>
<li>Validate demand with zero inventory risk</li>
<li>Build email list and customer base</li>
<li>Graduate winning designs to private label</li>
</ol>
<h3>Making POD Premium:</h3>
<ul>
<li>Use highest quality blanks available</li>
<li>Add custom packaging inserts</li>
<li>Include handwritten-style thank you cards</li>
</ul>`
                },
                {
                    title: 'Private Label Deep Dive',
                    description: 'Complete guide to private label products.',
                    content: `<h2>Private Label Deep Dive</h2>
<p>Private label means putting your brand on existing products, with your customizations.</p>
<h3>Private Label Process:</h3>
<ol>
<li><strong>Find Base Product:</strong> Identify products that fit your brand</li>
<li><strong>Source Suppliers:</strong> Get samples from 3-5 suppliers</li>
<li><strong>Customize:</strong> Logo, colors, materials, packaging</li>
<li><strong>Order Sample:</strong> Full production sample with all customizations</li>
<li><strong>Place MOQ:</strong> Minimum order quantity (usually 100-500 units)</li>
<li><strong>Quality Control:</strong> Inspect before shipping</li>
</ol>
<h3>Customization Options:</h3>
<ul>
<li>Logo placement (embroidery, print, deboss, hang tags)</li>
<li>Color matching</li>
<li>Material upgrades</li>
<li>Custom packaging</li>
<li>Bundle configurations</li>
</ul>`
                },
                {
                    title: 'Alibaba Masterclass',
                    description: 'Advanced Alibaba sourcing techniques.',
                    content: `<h2>Alibaba Masterclass</h2>
<h3>Finding the Right Suppliers:</h3>
<ul>
<li>Use specific product keywords</li>
<li>Filter by "Verified Supplier" and "Trade Assurance"</li>
<li>Check years in business (3+ years)</li>
<li>Look at transaction history</li>
<li>Read reviews carefully</li>
</ul>
<h3>The Inquiry Process:</h3>
<ol>
<li>Contact 5-10 suppliers initially</li>
<li>Ask specific questions about customization</li>
<li>Request product catalogs and MOQ info</li>
<li>Get quotes with shipping estimates</li>
<li>Order samples from top 3</li>
</ol>
<h3>Sample Inquiry Script:</h3>
<p>"Hello, I'm interested in [product]. We're a brand in [country] looking for a long-term supplier. Can you provide: 1) Your best price for [quantity], 2) MOQ for custom logo, 3) Sample cost and shipping time, 4) Production time for full order. Thank you!"</p>`
                },
                {
                    title: 'Packaging Design for Brands',
                    description: 'Creating memorable unboxing experiences.',
                    content: `<h2>Packaging Design for Brands</h2>
<p>Packaging is a key brand touchpoint. It's your first physical impression.</p>
<h3>Packaging Elements:</h3>
<ul>
<li><strong>Outer Box:</strong> Protection and first impression</li>
<li><strong>Inner Packaging:</strong> Tissue paper, crinkle fill</li>
<li><strong>Product Wrap:</strong> Sleeve, bag, or wrapper</li>
<li><strong>Inserts:</strong> Thank you card, instructions, discount code</li>
<li><strong>Stickers/Tape:</strong> Branded sealing</li>
</ul>
<h3>Budget-Friendly Upgrades:</h3>
<ol>
<li>Custom stickers (cheapest way to brand anything)</li>
<li>Branded tissue paper</li>
<li>Thank you cards with personality</li>
<li>Custom poly mailers</li>
</ol>
<h3>The Unboxing Test:</h3>
<p>Would a customer want to share this unboxing on social media? If not, upgrade.</p>`
                }
            ]
        },
        {
            title: 'Day 6: 3 Profitable Industries',
            description: 'Complete roadmaps for Clothing, Coffee & Supplements brands',
            lessons: [
                {
                    title: 'Industry Selection Framework',
                    description: 'How to evaluate industries.',
                    content: `<h2>Industry Selection Framework</h2>
<p>Choose an industry that matches your resources, interests, and goals.</p>
<h3>Evaluation Criteria:</h3>
<ul>
<li><strong>Market Size:</strong> Is the market big enough?</li>
<li><strong>Growth Trend:</strong> Growing or declining?</li>
<li><strong>Competition:</strong> Who are the major players?</li>
<li><strong>Barriers to Entry:</strong> Regulations, capital requirements?</li>
<li><strong>Margin Potential:</strong> Can you make money?</li>
<li><strong>Your Interest:</strong> Do you care about this space?</li>
</ul>
<h3>The Three Industries We'll Cover:</h3>
<ol>
<li><strong>Clothing:</strong> High margin, very competitive, fashion-forward</li>
<li><strong>Coffee:</strong> Consumable, repeat purchases, lifestyle brand potential</li>
<li><strong>Supplements:</strong> High margin, regulatory requirements, trust-dependent</li>
</ol>`
                },
                {
                    title: 'Clothing Brand Roadmap',
                    description: 'Step-by-step guide to launching a clothing brand.',
                    content: `<h2>Clothing Brand Roadmap</h2>
<h3>Phase 1: Foundation (Month 1-2)</h3>
<ul>
<li>Define niche (streetwear, athleisure, workwear, etc.)</li>
<li>Create brand identity</li>
<li>Design initial collection (3-5 pieces)</li>
<li>Source blanks and printing/embroidery</li>
</ul>
<h3>Phase 2: Launch (Month 3-4)</h3>
<ul>
<li>Start with POD to test designs</li>
<li>Build social media presence (Instagram essential)</li>
<li>Seed to micro-influencers</li>
<li>Launch with limited drop</li>
</ul>
<h3>Phase 3: Scale (Month 5+)</h3>
<ul>
<li>Move winning designs to private label</li>
<li>Expand collection</li>
<li>Build email list aggressively</li>
<li>Consider paid advertising</li>
</ul>
<h3>Key Success Factors:</h3>
<p>Design quality, brand story, community building, scarcity/drops model.</p>`
                },
                {
                    title: 'Coffee Brand Roadmap',
                    description: 'Complete guide to starting a coffee brand.',
                    content: `<h2>Coffee Brand Roadmap</h2>
<h3>Phase 1: Foundation (Month 1-2)</h3>
<ul>
<li>Choose positioning (specialty, convenience, niche)</li>
<li>Find roaster partner (private label roasters exist)</li>
<li>Develop 2-3 initial blends</li>
<li>Design packaging</li>
</ul>
<h3>Phase 2: Launch (Month 3-4)</h3>
<ul>
<li>Start with small batch orders</li>
<li>Build content around coffee culture</li>
<li>Subscription model from day one</li>
<li>Sample program for customer acquisition</li>
</ul>
<h3>Phase 3: Scale (Month 5+)</h3>
<ul>
<li>Expand product line (equipment, accessories)</li>
<li>Wholesale to offices/cafes</li>
<li>Build community and content</li>
</ul>
<h3>Key Success Factors:</h3>
<p>Product quality, subscription retention, brand lifestyle, content marketing.</p>`
                },
                {
                    title: 'Supplements Brand Roadmap',
                    description: 'Navigating the supplements industry.',
                    content: `<h2>Supplements Brand Roadmap</h2>
<h3>Phase 1: Foundation (Month 1-3)</h3>
<ul>
<li>Choose specific niche (fitness, wellness, beauty, cognitive)</li>
<li>Research regulations (FDA, FTC guidelines)</li>
<li>Find FDA-registered manufacturer</li>
<li>Develop formulations with proper testing</li>
</ul>
<h3>Phase 2: Launch (Month 4-6)</h3>
<ul>
<li>Start with 1-2 hero products</li>
<li>Build trust through transparency</li>
<li>Collect testimonials and before/afters</li>
<li>Influencer seeding (carefully vetted)</li>
</ul>
<h3>Phase 3: Scale (Month 7+)</h3>
<ul>
<li>Subscription model essential</li>
<li>Expand product line based on customer feedback</li>
<li>Build educational content</li>
</ul>
<h3>Key Success Factors:</h3>
<p>Product quality, regulatory compliance, trust building, subscription retention.</p>
<p><strong>Warning:</strong> This industry requires more capital and has strict regulations. Don't make health claims you can't support.</p>`
                }
            ]
        },
        {
            title: 'Day 7: Launch Your Brand',
            description: 'Pre-launch checklist, launch strategies & 30-day game plan',
            lessons: [
                {
                    title: 'Pre-Launch Checklist',
                    description: 'Everything you need before announcing your brand.',
                    content: `<h2>Pre-Launch Checklist</h2>
<h3>Brand Assets:</h3>
<ul>
<li>Logo (all variations)</li>
<li>Color palette defined</li>
<li>Typography selected</li>
<li>Brand voice guidelines</li>
<li>Brand story written</li>
</ul>
<h3>Website:</h3>
<ul>
<li>Domain purchased</li>
<li>Shopify store set up</li>
<li>Products uploaded with descriptions</li>
<li>Professional product photos</li>
<li>About page complete</li>
<li>Policies (shipping, returns)</li>
<li>Payment processing working</li>
</ul>
<h3>Marketing:</h3>
<ul>
<li>Social media accounts created</li>
<li>Email capture set up</li>
<li>Launch email sequence ready</li>
<li>Content calendar for first month</li>
</ul>`
                },
                {
                    title: 'Launch Strategy Options',
                    description: 'Different launch approaches.',
                    content: `<h2>Launch Strategy Options</h2>
<h3>Option 1: Soft Launch</h3>
<p>Open quietly, test everything, gather feedback, then announce.</p>
<ul>
<li>Lower risk</li>
<li>Time to fix issues</li>
<li>Less pressure</li>
</ul>
<h3>Option 2: Big Bang Launch</h3>
<p>Build anticipation, launch with event, push all channels at once.</p>
<ul>
<li>Maximum impact</li>
<li>PR opportunities</li>
<li>Momentum building</li>
</ul>
<h3>Option 3: Limited Drop</h3>
<p>Release limited quantity, create urgency and exclusivity.</p>
<ul>
<li>Creates scarcity</li>
<li>Builds hype</li>
<li>Tests demand safely</li>
</ul>
<h3>Recommendation:</h3>
<p>For first-time brand builders, soft launch then transition to limited drops.</p>`
                },
                {
                    title: 'Your 30-Day Launch Plan',
                    description: 'Day-by-day action plan for your first month.',
                    content: `<h2>Your 30-Day Launch Plan</h2>
<h3>Week 1: Foundation</h3>
<ul>
<li>Days 1-2: Finalize all brand assets</li>
<li>Days 3-4: Complete website setup</li>
<li>Days 5-7: Test everything, soft launch to friends/family</li>
</ul>
<h3>Week 2: Build Audience</h3>
<ul>
<li>Post daily on primary social channel</li>
<li>Reach out to 10 micro-influencers</li>
<li>Run email capture campaign</li>
<li>Join and contribute to relevant communities</li>
</ul>
<h3>Week 3: Generate Buzz</h3>
<ul>
<li>Announce launch date</li>
<li>Share behind-the-scenes content</li>
<li>Tease products</li>
<li>Build launch email list</li>
</ul>
<h3>Week 4: Launch!</h3>
<ul>
<li>Send launch emails</li>
<li>Go live on all social channels</li>
<li>Reach out to press/blogs</li>
<li>Run launch promotion</li>
<li>Engage with every customer</li>
</ul>`
                },
                {
                    title: 'What Comes Next & Course Conclusion',
                    description: 'Your roadmap beyond the 7 days.',
                    content: `<h2>What Comes Next</h2>
<p>Congratulations! You now have the complete framework for building a brand on Shopify.</p>
<h3>Your Immediate Next Steps:</h3>
<ol>
<li>Complete the exercises from each day if you haven't</li>
<li>Set your brand launch date (put it on the calendar!)</li>
<li>Join our community for support and accountability</li>
</ol>
<h3>Your 90-Day Goals:</h3>
<ul>
<li>Launch your brand</li>
<li>Get your first 100 customers</li>
<li>Achieve your first $10,000 in revenue</li>
<li>Build an email list of 1,000+ subscribers</li>
</ul>
<h3>Remember:</h3>
<p>Building a brand is a marathon, not a sprint. Focus on consistency over perfection. Every successful brand started exactly where you are now.</p>
<h3>Additional Resources:</h3>
<ul>
<li>Done-For-You Canva Brand Kit</li>
<li>Email Sequence Swipe Files</li>
<li>Facebook Ads Masterclass</li>
<li>Brand Builders Inner Circle</li>
</ul>
<p><strong>You've got this. Now go build something amazing.</strong></p>`
                }
            ]
        }
    ];

    let totalLessons = 0;

    for (let i = 0; i < days.length; i++) {
        const day = days[i];

        const moduleResult = await sql`
            INSERT INTO modules (id, course_id, title, description, sort_order, created_at)
            VALUES (gen_random_uuid(), ${courseId}, ${day.title}, ${day.description}, ${i + 1}, NOW())
            RETURNING id
        `;
        const moduleId = moduleResult[0].id;
        console.log('Day', i + 1 + ':', day.title, '(' + day.lessons.length + ' lessons)');

        for (let j = 0; j < day.lessons.length; j++) {
            const lesson = day.lessons[j];
            await sql`
                INSERT INTO lessons (id, module_id, title, description, video_url, video_duration, content, sort_order, created_at)
                VALUES (
                    gen_random_uuid(),
                    ${moduleId},
                    ${lesson.title},
                    ${lesson.description},
                    'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    600,
                    ${lesson.content},
                    ${j + 1},
                    NOW()
                )
            `;
            totalLessons++;
        }
    }

    console.log('\nTotal lessons created:', totalLessons);

    // Re-enroll ben
    const benUsers = await sql`SELECT id FROM users WHERE email = 'ben@justfeatured.com'`;
    if (benUsers.length > 0) {
        await sql`DELETE FROM enrollments WHERE user_id = ${benUsers[0].id}::uuid AND course_id = ${courseId}`;
        await sql`
            INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at)
            VALUES (gen_random_uuid(), ${benUsers[0].id}::uuid, ${courseId}, 'active', NOW())
        `;
        console.log('ben@justfeatured.com enrolled');
    }

    console.log('\n=== 7-DAY COURSE WITH FULL CONTENT RESTORED ===');
}

restoreWithContent().catch(console.error);
