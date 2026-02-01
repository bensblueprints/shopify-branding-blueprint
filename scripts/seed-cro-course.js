// Conversion Rate Optimization Course Seeding Script
// Based on real case study: 0.37% to 2% conversion rate in 3 months
//
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function seedCROCourse() {
    console.log('Starting CRO Course database seed...\n');

    // =====================================================
    // 1. CREATE CRO PRODUCT
    // =====================================================
    console.log('=== Creating CRO Course Product ===');

    // Generate a unique ID for the product
    const productId = 'cro-blueprint-' + Date.now();

    await sql`
        INSERT INTO products (id, handle, product_key, title, name, price_cents, is_active, features, created_at, updated_at, body_html)
        VALUES (
            ${productId},
            'cro-blueprint',
            'cro_blueprint',
            'E-commerce CRO Blueprint: 0.37% to 2% in 90 Days',
            'E-commerce CRO Blueprint',
            1900,
            true,
            ${JSON.stringify([
                '3-Month Step-by-Step System',
                'Real Case Study with Screenshots',
                'Theme Optimization Strategies',
                'Page-Level CRO Techniques',
                'Email & SEO Traffic Methods',
                'ROI Calculator & Tracking Templates',
                'Lifetime Access + Updates'
            ])}::jsonb,
            NOW(),
            NOW(),
            'The exact 3-month system we used to increase a client conversion rate by 432%'
        )
        ON CONFLICT (handle) DO UPDATE SET
            product_key = 'cro_blueprint',
            name = 'E-commerce CRO Blueprint',
            price_cents = 1900,
            features = ${JSON.stringify([
                '3-Month Step-by-Step System',
                'Real Case Study with Screenshots',
                'Theme Optimization Strategies',
                'Page-Level CRO Techniques',
                'Email & SEO Traffic Methods',
                'ROI Calculator & Tracking Templates',
                'Lifetime Access + Updates'
            ])}::jsonb,
            is_active = true,
            updated_at = NOW()
    `;
    console.log('✓ CRO Blueprint Product ($19 / $97)\n');

    // =====================================================
    // 2. CREATE CRO COURSE
    // =====================================================
    console.log('=== Creating CRO Course ===');

    // Delete existing course data for fresh start
    try {
        await sql`DELETE FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id IN (SELECT id FROM courses WHERE slug = 'cro-blueprint'))`;
        await sql`DELETE FROM modules WHERE course_id IN (SELECT id FROM courses WHERE slug = 'cro-blueprint')`;
        await sql`DELETE FROM courses WHERE slug = 'cro-blueprint'`;
    } catch (e) {
        console.log('No existing course to delete');
    }

    const courseResult = await sql`
        INSERT INTO courses (id, title, slug, description, thumbnail_url, status)
        VALUES (
            gen_random_uuid(),
            'E-commerce CRO Blueprint: 0.37% to 2% in 90 Days',
            'cro-blueprint',
            'The exact 3-month system we used to take a client''s e-commerce store from 0.37% conversion rate to nearly 2% - a 5X improvement. Learn the strategic approach of measuring first, rebuilding second, and optimizing third. No guessing, no wasted ad spend.',
            '/images/cro-course-thumbnail.jpg',
            'published'
        )
        RETURNING id
    `;
    const courseId = courseResult[0].id;
    console.log('✓ Course created: E-commerce CRO Blueprint\n');

    // =====================================================
    // 3. CREATE MODULES AND LESSONS
    // =====================================================
    console.log('=== Creating Modules and Lessons ===\n');

    const courseContent = [
        // =====================================================
        // MODULE 1: THE CRO FOUNDATION
        // =====================================================
        {
            title: 'Module 1: The CRO Foundation',
            description: 'Understand the strategic 3-month system and set up your measurement framework.',
            lessons: [
                {
                    title: 'Welcome: The 3-Month CRO System That Actually Works',
                    description: 'Introduction to our proven 90-day conversion rate optimization framework and why most stores optimize in the wrong order.',
                    content: `<h2>Welcome to the E-commerce CRO Blueprint</h2>
                    <p>Most store owners make a critical mistake: they spend money on ads before their store is optimized to convert. This course shows you the exact system we used to take a real client from <strong>0.37% to nearly 2% conversion rate</strong> in just 90 days.</p>

                    <h3>The 3-Month System Overview</h3>
                    <div class="case-study-highlight">
                        <p><strong>Month 1:</strong> Baseline Measurement - Run controlled traffic to understand your true conversion rate</p>
                        <p><strong>Month 2:</strong> Theme Rebuild - Complete store transformation with a conversion-focused design</p>
                        <p><strong>Month 3:</strong> Page Optimization - Fine-tune every page + diversify traffic sources</p>
                    </div>

                    <h3>Why This Order Matters</h3>
                    <p>We deliberately didn't want to spend ad budget until we knew the store could convert. Here's the math:</p>
                    <ul>
                        <li>At 0.37% conversion, you need 270 visitors per sale</li>
                        <li>At 2% conversion, you need only 50 visitors per sale</li>
                        <li>That's 5X more efficient - every dollar works harder</li>
                    </ul>

                    <h3>What You'll Learn</h3>
                    <ul>
                        <li>How to properly measure your baseline conversion rate</li>
                        <li>The exact theme optimization strategies that moved the needle</li>
                        <li>Page-by-page CRO techniques that compound</li>
                        <li>How email and SEO traffic contributed to our results</li>
                        <li>The complete tracking system to measure your progress</li>
                    </ul>

                    <p><em>By the end of this course, you'll have a clear 90-day roadmap to transform your store's conversion rate.</em></p>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 720,
                    resources: { worksheet: '/downloads/cro-90-day-roadmap.pdf' }
                },
                {
                    title: 'Understanding E-commerce Conversion Metrics',
                    description: 'Master the key metrics that matter: conversion rate, average order value, customer acquisition cost, and how they work together.',
                    content: `<h2>The Metrics That Actually Matter</h2>
                    <p>Before we optimize anything, you need to understand what we're measuring and why.</p>

                    <h3>Core Conversion Metrics</h3>
                    <ul>
                        <li><strong>Conversion Rate (CR):</strong> Purchases ÷ Sessions × 100</li>
                        <li><strong>Average Order Value (AOV):</strong> Total Revenue ÷ Number of Orders</li>
                        <li><strong>Customer Acquisition Cost (CAC):</strong> Ad Spend ÷ New Customers</li>
                        <li><strong>Revenue Per Visitor (RPV):</strong> Total Revenue ÷ Total Visitors</li>
                    </ul>

                    <h3>Industry Benchmarks</h3>
                    <table>
                        <tr><th>Metric</th><th>Poor</th><th>Average</th><th>Good</th><th>Excellent</th></tr>
                        <tr><td>Conversion Rate</td><td>&lt;1%</td><td>1-2%</td><td>2-3%</td><td>3%+</td></tr>
                        <tr><td>Add to Cart Rate</td><td>&lt;5%</td><td>5-10%</td><td>10-15%</td><td>15%+</td></tr>
                        <tr><td>Cart Abandonment</td><td>80%+</td><td>70-80%</td><td>60-70%</td><td>&lt;60%</td></tr>
                    </table>

                    <h3>Our Client's Starting Point</h3>
                    <p>When we started:</p>
                    <ul>
                        <li>Conversion Rate: 0.37%</li>
                        <li>Add to Cart Rate: 2.1%</li>
                        <li>Cart Abandonment: 84%</li>
                    </ul>
                    <p>Every metric was below industry average. But that's actually good news - it means massive room for improvement!</p>

                    <h3>The Compound Effect</h3>
                    <p>Small improvements compound dramatically:</p>
                    <ul>
                        <li>10% more visitors × 10% higher CR × 10% higher AOV = 33% more revenue</li>
                        <li>This is why CRO is the highest-ROI activity for most stores</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 840,
                    resources: { worksheet: '/downloads/cro-metrics-tracker.pdf' }
                },
                {
                    title: 'Setting Up Analytics & Tracking Properly',
                    description: 'Configure Google Analytics 4, Shopify Analytics, and heatmap tools to capture the data you need for optimization.',
                    content: `<h2>Your CRO Data Stack</h2>
                    <p>You can't optimize what you can't measure. Let's set up proper tracking.</p>

                    <h3>Essential Tools</h3>
                    <ol>
                        <li><strong>Shopify Analytics:</strong> Built-in, reliable for sales data</li>
                        <li><strong>Google Analytics 4:</strong> Traffic sources, user behavior</li>
                        <li><strong>Heatmap Tool:</strong> Hotjar, Lucky Orange, or Microsoft Clarity (free)</li>
                        <li><strong>Session Recording:</strong> Watch real users navigate your store</li>
                    </ol>

                    <h3>GA4 Setup Checklist</h3>
                    <ul>
                        <li>✓ Install GA4 tracking code correctly</li>
                        <li>✓ Enable Enhanced E-commerce tracking</li>
                        <li>✓ Set up conversion events (purchase, add_to_cart, begin_checkout)</li>
                        <li>✓ Connect Google Search Console</li>
                        <li>✓ Create custom audiences for retargeting</li>
                    </ul>

                    <h3>Heatmap Setup</h3>
                    <p>I recommend Microsoft Clarity - it's free and powerful:</p>
                    <ul>
                        <li>Click heatmaps show where users click</li>
                        <li>Scroll heatmaps show how far users scroll</li>
                        <li>Session recordings let you watch user journeys</li>
                        <li>Rage clicks identify frustration points</li>
                    </ul>

                    <h3>Creating Your Baseline Report</h3>
                    <p>Before any optimization, document:</p>
                    <ul>
                        <li>Current conversion rate (last 30 days)</li>
                        <li>Traffic sources breakdown</li>
                        <li>Device breakdown (mobile vs desktop CR)</li>
                        <li>Top landing pages and their CR</li>
                        <li>Checkout funnel drop-off points</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 960,
                    resources: { worksheet: '/downloads/analytics-setup-checklist.pdf' }
                },
                {
                    title: 'Baseline Audit: Analyzing Your Current Store',
                    description: 'Conduct a comprehensive audit of your store using our CRO checklist to identify the biggest opportunities for improvement.',
                    content: `<h2>The Complete Store Audit</h2>
                    <p>Before optimizing, we need to understand exactly where your store is losing conversions.</p>

                    <h3>The 5-Point CRO Audit</h3>

                    <h4>1. First Impression Audit (5-Second Test)</h4>
                    <ul>
                        <li>Is it clear what you sell within 5 seconds?</li>
                        <li>Does your value proposition stand out?</li>
                        <li>Is the design professional and trustworthy?</li>
                        <li>Is there a clear path to purchase?</li>
                    </ul>

                    <h4>2. Mobile Experience Audit</h4>
                    <ul>
                        <li>Does the site load in under 3 seconds on mobile?</li>
                        <li>Are buttons tap-friendly (at least 44px)?</li>
                        <li>Is text readable without zooming?</li>
                        <li>Does the checkout work smoothly on mobile?</li>
                    </ul>

                    <h4>3. Trust Signal Audit</h4>
                    <ul>
                        <li>Are customer reviews visible on product pages?</li>
                        <li>Do you display trust badges?</li>
                        <li>Is your return policy easy to find?</li>
                        <li>Do you have an About page with real photos?</li>
                    </ul>

                    <h4>4. Product Page Audit</h4>
                    <ul>
                        <li>High-quality images from multiple angles?</li>
                        <li>Compelling product descriptions?</li>
                        <li>Clear pricing and shipping info?</li>
                        <li>Visible reviews and ratings?</li>
                    </ul>

                    <h4>5. Checkout Funnel Audit</h4>
                    <ul>
                        <li>Guest checkout available?</li>
                        <li>Multiple payment options?</li>
                        <li>Shipping costs clear before checkout?</li>
                        <li>Progress indicator visible?</li>
                    </ul>

                    <h3>Prioritization Framework</h3>
                    <p>Score each issue on:</p>
                    <ul>
                        <li><strong>Impact:</strong> How much will fixing this improve CR?</li>
                        <li><strong>Effort:</strong> How hard is it to fix?</li>
                    </ul>
                    <p>Start with high-impact, low-effort fixes first!</p>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 1080,
                    resources: { worksheet: '/downloads/store-audit-checklist.pdf' }
                }
            ]
        },

        // =====================================================
        // MODULE 2: MONTH 1 - ESTABLISHING YOUR BASELINE
        // =====================================================
        {
            title: 'Module 2: Month 1 - Establishing Your Baseline',
            description: 'The critical first month: running controlled traffic to understand your true conversion rate before making any changes.',
            lessons: [
                {
                    title: 'Why Month 1 Is Pure Measurement',
                    description: 'Understand why we resist the urge to optimize immediately and focus on gathering accurate baseline data.',
                    content: `<h2>The Measurement-First Philosophy</h2>
                    <p>This is counterintuitive, but Month 1 is about <strong>not</strong> changing anything. Here's why.</p>

                    <h3>The Problem With Premature Optimization</h3>
                    <p>Most store owners:</p>
                    <ul>
                        <li>Change multiple things at once</li>
                        <li>Have no baseline to compare against</li>
                        <li>Can't attribute results to specific changes</li>
                        <li>Make decisions based on gut feel, not data</li>
                    </ul>

                    <h3>What We Did Different</h3>
                    <p>For our client, we spent the entire first month:</p>
                    <ul>
                        <li>Running consistent, controlled traffic</li>
                        <li>Measuring conversion rate daily</li>
                        <li>Recording user sessions</li>
                        <li>Building heatmaps on key pages</li>
                        <li>Documenting every issue we found</li>
                    </ul>

                    <h3>The Data We Collected</h3>
                    <table>
                        <tr><th>Metric</th><th>Week 1</th><th>Week 2</th><th>Week 3</th><th>Week 4</th><th>Average</th></tr>
                        <tr><td>Sessions</td><td>1,240</td><td>1,180</td><td>1,320</td><td>1,260</td><td>1,250</td></tr>
                        <tr><td>Orders</td><td>4</td><td>5</td><td>5</td><td>5</td><td>4.75</td></tr>
                        <tr><td>CR</td><td>0.32%</td><td>0.42%</td><td>0.38%</td><td>0.40%</td><td>0.37%</td></tr>
                    </table>

                    <h3>Why This Matters</h3>
                    <p>Now we had:</p>
                    <ul>
                        <li>A reliable baseline (0.37% CR)</li>
                        <li>Understanding of natural variance</li>
                        <li>100+ session recordings to analyze</li>
                        <li>Clear data on where users dropped off</li>
                    </ul>
                    <p>This informed everything we did in Month 2.</p>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 780,
                    resources: { worksheet: '/downloads/month1-tracking-template.pdf' }
                },
                {
                    title: 'Traffic Strategy for Accurate Testing',
                    description: 'How to run controlled traffic to get statistically significant conversion data without wasting ad spend.',
                    content: `<h2>Running Traffic for Measurement</h2>
                    <p>The goal isn't sales (yet) - it's data. Here's how to run traffic efficiently.</p>

                    <h3>Traffic Requirements</h3>
                    <p>For statistically significant data:</p>
                    <ul>
                        <li><strong>Minimum:</strong> 1,000 sessions over 2-4 weeks</li>
                        <li><strong>Ideal:</strong> 2,500+ sessions for reliable data</li>
                        <li><strong>Budget:</strong> Set aside $500-1,500 for measurement traffic</li>
                    </ul>

                    <h3>Keeping Variables Controlled</h3>
                    <ul>
                        <li>Same ad creative throughout the month</li>
                        <li>Same targeting parameters</li>
                        <li>Consistent daily budget</li>
                        <li>No promotional discounts</li>
                    </ul>

                    <h3>What Traffic to Run</h3>
                    <p>Options from most to least controlled:</p>
                    <ol>
                        <li><strong>Retargeting:</strong> People who know your brand</li>
                        <li><strong>Lookalike audiences:</strong> Similar to past customers</li>
                        <li><strong>Interest targeting:</strong> Broader cold traffic</li>
                    </ol>

                    <h3>Daily Tracking Protocol</h3>
                    <p>Every day during Month 1:</p>
                    <ol>
                        <li>Record sessions, add-to-carts, checkouts, purchases</li>
                        <li>Note any external factors (holidays, competitor sales)</li>
                        <li>Watch 5-10 session recordings</li>
                        <li>Document patterns and issues you notice</li>
                    </ol>

                    <h3>Our Client's Budget</h3>
                    <p>We spent $1,200 in Month 1:</p>
                    <ul>
                        <li>5,000 sessions total</li>
                        <li>19 orders</li>
                        <li>$63 per acquisition (high, but expected)</li>
                        <li>Tons of actionable data</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 900,
                    resources: { worksheet: '/downloads/traffic-testing-plan.pdf' }
                },
                {
                    title: 'Heatmaps & User Behavior Analysis',
                    description: 'Learn to read heatmaps and session recordings to identify exactly where and why users are abandoning your store.',
                    content: `<h2>Reading User Behavior Data</h2>
                    <p>Heatmaps and recordings show you what analytics can't: the WHY behind the numbers.</p>

                    <h3>Types of Heatmaps</h3>
                    <ul>
                        <li><strong>Click Heatmaps:</strong> Where users click (and try to click)</li>
                        <li><strong>Scroll Heatmaps:</strong> How far users scroll down pages</li>
                        <li><strong>Move Heatmaps:</strong> Where users move their cursor</li>
                        <li><strong>Attention Heatmaps:</strong> Where users spend time</li>
                    </ul>

                    <h3>What We Found on Our Client's Store</h3>

                    <h4>Homepage Issues:</h4>
                    <ul>
                        <li>80% of users never scrolled below the fold</li>
                        <li>Users were clicking on non-clickable images</li>
                        <li>CTA button had almost no clicks</li>
                        <li>Navigation was confusing (lots of "rage clicks")</li>
                    </ul>

                    <h4>Product Page Issues:</h4>
                    <ul>
                        <li>Users scrolled past Add to Cart button</li>
                        <li>Review section was never seen (below the fold)</li>
                        <li>Shipping info caused hesitation</li>
                        <li>Image gallery wasn't intuitive</li>
                    </ul>

                    <h3>Session Recording Insights</h3>
                    <p>Patterns we observed:</p>
                    <ul>
                        <li>Users abandoning after seeing shipping cost</li>
                        <li>Confusion about product variants</li>
                        <li>Mobile users struggling with small buttons</li>
                        <li>Users searching for size guides</li>
                    </ul>

                    <h3>Creating Your Issues List</h3>
                    <p>Document each issue with:</p>
                    <ol>
                        <li>Description of the problem</li>
                        <li>Evidence (screenshot/recording)</li>
                        <li>Estimated impact (High/Medium/Low)</li>
                        <li>Proposed solution</li>
                    </ol>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 1020,
                    resources: { worksheet: '/downloads/heatmap-analysis-guide.pdf' }
                },
                {
                    title: 'Identifying Your Biggest Conversion Killers',
                    description: 'Prioritize the issues you\'ve found and create a ranked list of optimizations for Month 2.',
                    content: `<h2>Prioritizing Your Optimization Roadmap</h2>
                    <p>You've found dozens of issues. Now let's prioritize ruthlessly.</p>

                    <h3>The ICE Framework</h3>
                    <p>Score each issue on a 1-10 scale:</p>
                    <ul>
                        <li><strong>I - Impact:</strong> How much will this improve conversion?</li>
                        <li><strong>C - Confidence:</strong> How sure are you it will work?</li>
                        <li><strong>E - Effort:</strong> How hard is it to implement? (inverted: 10 = easy)</li>
                    </ul>
                    <p>ICE Score = Impact × Confidence × Effort</p>

                    <h3>Our Client's Top 10 Issues (Prioritized)</h3>
                    <table>
                        <tr><th>Issue</th><th>I</th><th>C</th><th>E</th><th>Score</th></tr>
                        <tr><td>Theme looks outdated/untrustworthy</td><td>9</td><td>8</td><td>4</td><td>288</td></tr>
                        <tr><td>Mobile experience is broken</td><td>9</td><td>9</td><td>5</td><td>405</td></tr>
                        <tr><td>Shipping cost surprise at checkout</td><td>8</td><td>9</td><td>8</td><td>576</td></tr>
                        <tr><td>No customer reviews visible</td><td>7</td><td>8</td><td>7</td><td>392</td></tr>
                        <tr><td>Product images low quality</td><td>7</td><td>8</td><td>5</td><td>280</td></tr>
                        <tr><td>Slow page load time</td><td>8</td><td>7</td><td>6</td><td>336</td></tr>
                        <tr><td>Weak product descriptions</td><td>6</td><td>7</td><td>7</td><td>294</td></tr>
                        <tr><td>No trust badges</td><td>5</td><td>8</td><td>9</td><td>360</td></tr>
                        <tr><td>Confusing navigation</td><td>6</td><td>7</td><td>6</td><td>252</td></tr>
                        <tr><td>No email capture</td><td>5</td><td>7</td><td>8</td><td>280</td></tr>
                    </table>

                    <h3>The Big Decision: Theme Rebuild</h3>
                    <p>Looking at our issues, we realized:</p>
                    <ul>
                        <li>Multiple issues stemmed from the theme itself</li>
                        <li>Patching the old theme would take longer than rebuilding</li>
                        <li>A modern theme would solve 5+ issues at once</li>
                    </ul>
                    <p><strong>Decision: Month 2 would be a complete theme rebuild.</strong></p>

                    <h3>Your Month 1 Deliverable</h3>
                    <p>By end of Month 1, you should have:</p>
                    <ul>
                        <li>✓ Baseline conversion rate (with 4 weeks of data)</li>
                        <li>✓ Documented issues list (prioritized)</li>
                        <li>✓ Decision: Optimize existing theme or rebuild?</li>
                        <li>✓ Month 2 action plan ready</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 900,
                    resources: { worksheet: '/downloads/issue-prioritization-matrix.pdf' }
                }
            ]
        },

        // =====================================================
        // MODULE 3: MONTH 2 - THE THEME REBUILD
        // =====================================================
        {
            title: 'Module 3: Month 2 - The Theme Rebuild',
            description: 'The transformation month: rebuilding your store with a conversion-focused theme and design system.',
            lessons: [
                {
                    title: 'Why Theme Matters More Than You Think',
                    description: 'Understand how your theme impacts trust, usability, and ultimately conversion rate across your entire store.',
                    content: `<h2>The Theme is the Foundation</h2>
                    <p>Your theme isn't just aesthetics - it's the conversion infrastructure of your store.</p>

                    <h3>What a Bad Theme Costs You</h3>
                    <ul>
                        <li><strong>Trust Issues:</strong> Outdated design = untrustworthy brand</li>
                        <li><strong>Usability Problems:</strong> Confusing navigation loses sales</li>
                        <li><strong>Speed Penalties:</strong> Bloated themes kill mobile CR</li>
                        <li><strong>Limited Features:</strong> Missing conversion elements</li>
                        <li><strong>Poor Mobile UX:</strong> 70%+ of traffic is mobile</li>
                    </ul>

                    <h3>Our Client's Theme Problems</h3>
                    <p>The old theme had:</p>
                    <ul>
                        <li>4.2 second load time on mobile</li>
                        <li>Broken mobile navigation</li>
                        <li>No built-in review integration</li>
                        <li>Limited product page layouts</li>
                        <li>No sticky add-to-cart</li>
                        <li>Generic, unmemorable design</li>
                    </ul>

                    <h3>The Rebuild vs. Optimize Decision</h3>
                    <p><strong>Optimize existing theme if:</strong></p>
                    <ul>
                        <li>Theme is modern (built in last 2 years)</li>
                        <li>Issues are mostly content-related</li>
                        <li>Mobile experience is solid</li>
                        <li>You have limited budget</li>
                    </ul>

                    <p><strong>Rebuild with new theme if:</strong></p>
                    <ul>
                        <li>Theme is outdated (3+ years old)</li>
                        <li>Multiple structural issues</li>
                        <li>Mobile experience is poor</li>
                        <li>You're hitting theme limitations constantly</li>
                    </ul>

                    <h3>Investment Perspective</h3>
                    <p>A premium theme ($300-400) that increases CR by 0.5% pays for itself in days for most stores. Don't cheap out on your foundation.</p>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 840,
                    resources: { worksheet: '/downloads/theme-evaluation-checklist.pdf' }
                },
                {
                    title: 'Choosing a High-Converting Shopify Theme',
                    description: 'Criteria for selecting a theme optimized for conversions, plus our top theme recommendations for different store types.',
                    content: `<h2>Theme Selection Criteria</h2>
                    <p>Not all themes are created equal. Here's what to look for.</p>

                    <h3>Must-Have Features</h3>
                    <ul>
                        <li>✓ Mobile-first, responsive design</li>
                        <li>✓ Fast load times (under 2 seconds)</li>
                        <li>✓ Sticky add-to-cart option</li>
                        <li>✓ Built-in review display</li>
                        <li>✓ Mega menu support</li>
                        <li>✓ Quick view functionality</li>
                        <li>✓ Product filtering</li>
                        <li>✓ Trust badge sections</li>
                        <li>✓ Email popup builder</li>
                        <li>✓ Regular updates and support</li>
                    </ul>

                    <h3>Performance Checks</h3>
                    <p>Before buying, test the demo:</p>
                    <ol>
                        <li>Run through PageSpeed Insights (aim for 50+ mobile)</li>
                        <li>Test on your actual phone</li>
                        <li>Check load time with GTmetrix</li>
                        <li>Read recent reviews for bugs</li>
                    </ol>

                    <h3>Top Theme Recommendations (2024)</h3>

                    <h4>Best Overall:</h4>
                    <ul>
                        <li><strong>Dawn (Free):</strong> Shopify's official theme, excellent baseline</li>
                        <li><strong>Impulse:</strong> Feature-rich, great for larger catalogs</li>
                        <li><strong>Prestige:</strong> Premium feel, perfect for luxury brands</li>
                    </ul>

                    <h4>Best for Speed:</h4>
                    <ul>
                        <li><strong>Turbo:</strong> The fastest premium theme</li>
                        <li><strong>Flex:</strong> Lightweight and customizable</li>
                    </ul>

                    <h4>Best for Fashion:</h4>
                    <ul>
                        <li><strong>Broadcast:</strong> Instagram-style aesthetic</li>
                        <li><strong>Symmetry:</strong> Clean, modern look</li>
                    </ul>

                    <h3>What We Chose for Our Client</h3>
                    <p>We went with a premium conversion-focused theme because:</p>
                    <ul>
                        <li>Built-in conversion features saved app costs</li>
                        <li>Excellent mobile UX out of the box</li>
                        <li>Fast load times without optimization</li>
                        <li>Strong support and regular updates</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 960,
                    resources: { worksheet: '/downloads/theme-comparison-guide.pdf' }
                },
                {
                    title: 'Mobile-First Design Principles',
                    description: 'Design your store mobile-first since that\'s where most of your traffic (and conversions) come from.',
                    content: `<h2>Mobile-First Is Non-Negotiable</h2>
                    <p>70%+ of e-commerce traffic is mobile. If you're not optimizing for mobile first, you're leaving money on the table.</p>

                    <h3>Our Client's Mobile Stats</h3>
                    <table>
                        <tr><th>Metric</th><th>Before</th><th>After</th></tr>
                        <tr><td>Mobile Traffic %</td><td>72%</td><td>74%</td></tr>
                        <tr><td>Mobile CR</td><td>0.21%</td><td>1.6%</td></tr>
                        <tr><td>Desktop CR</td><td>0.68%</td><td>2.8%</td></tr>
                    </table>
                    <p>Mobile CR improved 7.6X - that's where the biggest gains were!</p>

                    <h3>Mobile Design Principles</h3>

                    <h4>1. Thumb-Friendly Navigation</h4>
                    <ul>
                        <li>Buttons at least 44px × 44px</li>
                        <li>Important CTAs in thumb reach zone</li>
                        <li>Hamburger menu that's easy to open/close</li>
                    </ul>

                    <h4>2. Content Hierarchy</h4>
                    <ul>
                        <li>Most important content above the fold</li>
                        <li>Scannable headings and bullet points</li>
                        <li>Images that load fast and look sharp</li>
                    </ul>

                    <h4>3. Simplified Forms</h4>
                    <ul>
                        <li>Minimal form fields</li>
                        <li>Appropriate keyboard types (email, phone)</li>
                        <li>Auto-fill enabled</li>
                    </ul>

                    <h4>4. Fast Load Times</h4>
                    <ul>
                        <li>Lazy loading for images</li>
                        <li>Compressed media files</li>
                        <li>Minimal JavaScript</li>
                    </ul>

                    <h3>Mobile Testing Protocol</h3>
                    <p>Test on actual devices, not just browser emulators:</p>
                    <ul>
                        <li>iPhone (latest + 2 generations back)</li>
                        <li>Android (Samsung + Pixel)</li>
                        <li>Different screen sizes</li>
                        <li>3G connection simulation</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 900,
                    resources: { worksheet: '/downloads/mobile-ux-checklist.pdf' }
                },
                {
                    title: 'Speed Optimization: Every Second Costs Sales',
                    description: 'Implement speed optimizations that have the biggest impact on conversion rate and user experience.',
                    content: `<h2>Speed = Money</h2>
                    <p>Every 1-second delay in page load time results in a 7% reduction in conversions. Let's make your store fast.</p>

                    <h3>Our Client's Speed Transformation</h3>
                    <table>
                        <tr><th>Metric</th><th>Before</th><th>After</th></tr>
                        <tr><td>Mobile Load Time</td><td>4.2s</td><td>1.8s</td></tr>
                        <tr><td>PageSpeed Score</td><td>34</td><td>72</td></tr>
                        <tr><td>Time to Interactive</td><td>5.1s</td><td>2.4s</td></tr>
                    </table>

                    <h3>Quick Wins (Do These First)</h3>
                    <ol>
                        <li><strong>Compress images:</strong> Use TinyPNG or Shopify's auto-compression</li>
                        <li><strong>Remove unused apps:</strong> Each app adds JavaScript</li>
                        <li><strong>Lazy load images:</strong> Only load what's visible</li>
                        <li><strong>Use system fonts:</strong> Avoid multiple custom fonts</li>
                        <li><strong>Minimize apps in theme:</strong> Each embedded app slows you down</li>
                    </ol>

                    <h3>Image Optimization</h3>
                    <p>Images are usually 60-80% of page weight:</p>
                    <ul>
                        <li>Use WebP format when possible</li>
                        <li>Size images appropriately (don't upload 4000px for a 400px display)</li>
                        <li>Compress to under 200KB per image</li>
                        <li>Use responsive images (srcset)</li>
                    </ul>

                    <h3>App Audit</h3>
                    <p>Every app you install:</p>
                    <ul>
                        <li>Adds JavaScript to your theme</li>
                        <li>May make external API calls</li>
                        <li>Can conflict with other apps</li>
                    </ul>
                    <p>Rule: If you're not actively using it, uninstall it.</p>

                    <h3>Advanced Optimizations</h3>
                    <ul>
                        <li>Enable browser caching</li>
                        <li>Minimize CSS and JavaScript</li>
                        <li>Use a CDN (Shopify includes this)</li>
                        <li>Defer non-critical JavaScript</li>
                        <li>Preload critical resources</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 1020,
                    resources: { worksheet: '/downloads/speed-optimization-checklist.pdf' }
                },
                {
                    title: 'Implementing Your New Theme: The Rebuild Process',
                    description: 'Step-by-step process for rebuilding your store on a new theme without losing SEO or disrupting sales.',
                    content: `<h2>The Safe Theme Migration Process</h2>
                    <p>Changing themes can be risky if done wrong. Here's how we did it safely.</p>

                    <h3>Pre-Migration Checklist</h3>
                    <ul>
                        <li>✓ Full backup of current theme</li>
                        <li>✓ Document all customizations and apps</li>
                        <li>✓ Export all redirects</li>
                        <li>✓ Screenshot every page for reference</li>
                        <li>✓ List all tracking codes and pixels</li>
                        <li>✓ Note all custom code snippets</li>
                    </ul>

                    <h3>The Migration Process</h3>

                    <h4>Step 1: Set Up in Development (Days 1-3)</h4>
                    <ul>
                        <li>Install new theme (don't publish)</li>
                        <li>Configure basic settings</li>
                        <li>Set up navigation structure</li>
                        <li>Import your content</li>
                    </ul>

                    <h4>Step 2: Customize (Days 4-10)</h4>
                    <ul>
                        <li>Build homepage sections</li>
                        <li>Configure product page layout</li>
                        <li>Set up collection pages</li>
                        <li>Add trust elements and badges</li>
                        <li>Configure email popup</li>
                    </ul>

                    <h4>Step 3: Test Everything (Days 11-14)</h4>
                    <ul>
                        <li>Test all pages on mobile and desktop</li>
                        <li>Complete a test purchase</li>
                        <li>Verify all tracking is working</li>
                        <li>Check page speed</li>
                        <li>Have others test and give feedback</li>
                    </ul>

                    <h4>Step 4: Launch (Day 15)</h4>
                    <ul>
                        <li>Publish during low-traffic hours</li>
                        <li>Monitor for issues immediately</li>
                        <li>Keep old theme as backup</li>
                        <li>Watch conversion rate closely</li>
                    </ul>

                    <h3>SEO Preservation</h3>
                    <ul>
                        <li>Keep same URL structure</li>
                        <li>Maintain all meta titles and descriptions</li>
                        <li>Set up 301 redirects if URLs change</li>
                        <li>Resubmit sitemap to Google</li>
                    </ul>

                    <h3>Our Client's Timeline</h3>
                    <p>We completed the full rebuild in 3 weeks:</p>
                    <ul>
                        <li>Week 1: Setup and basic customization</li>
                        <li>Week 2: Content migration and detailed customization</li>
                        <li>Week 3: Testing, optimization, and launch</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 1140,
                    resources: { worksheet: '/downloads/theme-migration-checklist.pdf' }
                },
                {
                    title: 'Month 2 Results: Measuring the Impact',
                    description: 'Analyzing the conversion rate changes from our theme rebuild and understanding what moved the needle.',
                    content: `<h2>Month 2 Results Analysis</h2>
                    <p>After the theme rebuild, we ran the same controlled traffic to measure improvement.</p>

                    <h3>The Numbers</h3>
                    <table>
                        <tr><th>Metric</th><th>Month 1 (Baseline)</th><th>Month 2 (Post-Rebuild)</th><th>Change</th></tr>
                        <tr><td>Conversion Rate</td><td>0.37%</td><td>0.89%</td><td>+140%</td></tr>
                        <tr><td>Add to Cart Rate</td><td>2.1%</td><td>5.8%</td><td>+176%</td></tr>
                        <tr><td>Mobile CR</td><td>0.21%</td><td>0.72%</td><td>+243%</td></tr>
                        <tr><td>Avg Session Duration</td><td>1:12</td><td>2:34</td><td>+113%</td></tr>
                        <tr><td>Bounce Rate</td><td>68%</td><td>52%</td><td>-24%</td></tr>
                    </table>

                    <h3>What Moved the Needle Most</h3>

                    <h4>1. Mobile Experience (+243% mobile CR)</h4>
                    <p>The new theme was built mobile-first. This alone accounted for significant gains since 72% of traffic was mobile.</p>

                    <h4>2. Page Speed (+140% overall CR)</h4>
                    <p>Going from 4.2s to 1.8s load time reduced bounce rate and kept users engaged.</p>

                    <h4>3. Trust Elements</h4>
                    <p>Adding reviews, trust badges, and a professional design increased perceived credibility.</p>

                    <h4>4. Improved Navigation</h4>
                    <p>Users could actually find products now. Collection page views increased 89%.</p>

                    <h3>Still Room for Improvement</h3>
                    <p>At 0.89% CR, we were better but not great. Our heatmaps showed:</p>
                    <ul>
                        <li>Product page still had drop-off issues</li>
                        <li>Checkout abandonment was still high</li>
                        <li>Some pages weren't optimized yet</li>
                    </ul>
                    <p>This set up our Month 3 plan: page-by-page optimization.</p>

                    <h3>ROI of the Theme Rebuild</h3>
                    <p>Investment:</p>
                    <ul>
                        <li>Premium theme: $350</li>
                        <li>Apps and integrations: $150</li>
                        <li>Our time (could be hired out): ~$2,000</li>
                    </ul>
                    <p>Return:</p>
                    <ul>
                        <li>CR increase from 0.37% to 0.89% = 2.4X improvement</li>
                        <li>On $10k/mo revenue, that's an extra $14k/mo</li>
                        <li>Payback period: Less than 1 week</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 960,
                    resources: { worksheet: '/downloads/month2-results-analysis.pdf' }
                }
            ]
        },

        // =====================================================
        // MODULE 4: MONTH 3 - PAGE-LEVEL OPTIMIZATION
        // =====================================================
        {
            title: 'Module 4: Month 3 - Page-Level Optimization',
            description: 'Fine-tuning every page of your store for maximum conversions with proven CRO techniques.',
            lessons: [
                {
                    title: 'Homepage Optimization for Conversions',
                    description: 'Transform your homepage from a pretty landing page into a conversion machine that drives visitors to purchase.',
                    content: `<h2>Your Homepage Has One Job</h2>
                    <p>Get visitors to the next step in the funnel. Every element should serve this purpose.</p>

                    <h3>Above-the-Fold Essentials</h3>
                    <ul>
                        <li><strong>Clear Value Proposition:</strong> What do you sell and why should they care?</li>
                        <li><strong>Hero Image/Video:</strong> Shows your best products in context</li>
                        <li><strong>Primary CTA:</strong> One clear action (Shop Now, See Collection)</li>
                        <li><strong>Trust Indicator:</strong> Reviews count, "As seen in", guarantee</li>
                    </ul>

                    <h3>Our Client's Homepage Changes</h3>

                    <h4>Before:</h4>
                    <ul>
                        <li>Vague headline: "Welcome to [Store Name]"</li>
                        <li>Low-quality hero image</li>
                        <li>3 competing CTAs</li>
                        <li>No trust elements visible</li>
                    </ul>

                    <h4>After:</h4>
                    <ul>
                        <li>Benefit-driven headline: "[Specific benefit] for [target audience]"</li>
                        <li>Professional lifestyle hero image</li>
                        <li>Single primary CTA with secondary link</li>
                        <li>Star rating + review count visible</li>
                    </ul>

                    <h3>Homepage Structure (Scroll Order)</h3>
                    <ol>
                        <li>Hero section with value prop and CTA</li>
                        <li>Trust bar (logos, guarantees, features)</li>
                        <li>Featured/bestselling products</li>
                        <li>Social proof section (reviews, UGC)</li>
                        <li>Category navigation</li>
                        <li>Brand story teaser</li>
                        <li>Email capture</li>
                        <li>Footer with key links</li>
                    </ol>

                    <h3>Key Metrics to Track</h3>
                    <ul>
                        <li>Homepage → Product page click rate</li>
                        <li>Homepage → Collection page click rate</li>
                        <li>Scroll depth (are they seeing your content?)</li>
                        <li>Email capture rate</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 1020,
                    resources: { worksheet: '/downloads/homepage-optimization-guide.pdf' }
                },
                {
                    title: 'Product Page CRO: Where Sales Are Won or Lost',
                    description: 'Optimize the most important page on your store - the product page - with proven conversion techniques.',
                    content: `<h2>The Product Page Is Everything</h2>
                    <p>This is where buying decisions happen. Every element needs to reduce friction and build confidence.</p>

                    <h3>Product Page Anatomy</h3>

                    <h4>Above the Fold:</h4>
                    <ul>
                        <li><strong>Product Images:</strong> High-quality, multiple angles, zoomable</li>
                        <li><strong>Product Title:</strong> Clear, benefit-oriented when possible</li>
                        <li><strong>Price:</strong> Clear, with compare-at if on sale</li>
                        <li><strong>Star Rating:</strong> Visible immediately</li>
                        <li><strong>Variants:</strong> Easy to select size/color</li>
                        <li><strong>Add to Cart:</strong> Prominent, sticky on scroll</li>
                        <li><strong>Trust Badges:</strong> Payment icons, guarantees</li>
                    </ul>

                    <h4>Below the Fold:</h4>
                    <ul>
                        <li><strong>Product Description:</strong> Benefits-focused, scannable</li>
                        <li><strong>Specifications:</strong> Collapsible for easy access</li>
                        <li><strong>Reviews:</strong> Real customer reviews with photos</li>
                        <li><strong>FAQ:</strong> Answers to common objections</li>
                        <li><strong>Related Products:</strong> Cross-sell opportunities</li>
                    </ul>

                    <h3>What We Changed for Our Client</h3>
                    <ul>
                        <li>Added sticky Add to Cart button</li>
                        <li>Moved reviews higher on page</li>
                        <li>Added shipping info below price</li>
                        <li>Included size guide with measurements</li>
                        <li>Added urgency element (stock counter)</li>
                        <li>Improved product photography</li>
                    </ul>

                    <h3>Product Description Formula</h3>
                    <ol>
                        <li><strong>Hook:</strong> Emotional benefit in first sentence</li>
                        <li><strong>Problem:</strong> Acknowledge the pain point</li>
                        <li><strong>Solution:</strong> How your product solves it</li>
                        <li><strong>Features:</strong> Bullet points with benefits</li>
                        <li><strong>Social Proof:</strong> Mini testimonial or stat</li>
                        <li><strong>CTA:</strong> Remind them to buy</li>
                    </ol>

                    <h3>Results</h3>
                    <p>Product page optimization alone increased our client's add-to-cart rate from 5.8% to 9.2% - a 59% improvement.</p>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 1200,
                    resources: { worksheet: '/downloads/product-page-cro-checklist.pdf' }
                },
                {
                    title: 'Collection Page Optimization',
                    description: 'Optimize your collection pages to help customers find what they\'re looking for and encourage browsing.',
                    content: `<h2>Collection Pages: The Unsung Heroes</h2>
                    <p>Good collection pages help users find products. Great collection pages help them discover products they didn't know they wanted.</p>

                    <h3>Collection Page Essentials</h3>
                    <ul>
                        <li><strong>Collection Title:</strong> Clear, SEO-optimized</li>
                        <li><strong>Collection Description:</strong> Brief, keyword-rich</li>
                        <li><strong>Filters:</strong> Price, size, color, etc.</li>
                        <li><strong>Sort Options:</strong> Best selling, price, newest</li>
                        <li><strong>Product Count:</strong> Shows breadth of selection</li>
                        <li><strong>Product Cards:</strong> Image, title, price, rating</li>
                    </ul>

                    <h3>Layout Optimization</h3>

                    <h4>Grid Options:</h4>
                    <ul>
                        <li>Desktop: 3-4 products per row</li>
                        <li>Mobile: 2 products per row</li>
                        <li>Quick view option for faster browsing</li>
                        <li>Infinite scroll vs. pagination (test both)</li>
                    </ul>

                    <h4>Filter Best Practices:</h4>
                    <ul>
                        <li>Most important filters at top</li>
                        <li>Show product count per filter option</li>
                        <li>Allow multiple filter selections</li>
                        <li>Clear "reset filters" option</li>
                    </ul>

                    <h3>Product Card Optimization</h3>
                    <p>Each product card should include:</p>
                    <ul>
                        <li>High-quality image (consistent sizing)</li>
                        <li>Image swap on hover (shows different angle)</li>
                        <li>Product name (not too long)</li>
                        <li>Price (and compare-at if on sale)</li>
                        <li>Star rating</li>
                        <li>Quick add button or quick view</li>
                    </ul>

                    <h3>Our Optimizations</h3>
                    <ul>
                        <li>Added image hover swap</li>
                        <li>Showed review count on cards</li>
                        <li>Implemented sticky filters on mobile</li>
                        <li>Added "Bestseller" badges</li>
                        <li>Optimized collection descriptions for SEO</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 840,
                    resources: { worksheet: '/downloads/collection-page-checklist.pdf' }
                },
                {
                    title: 'Cart & Checkout Optimization',
                    description: 'Reduce cart abandonment and streamline the checkout process to capture more sales.',
                    content: `<h2>Fixing the Checkout Leak</h2>
                    <p>Average cart abandonment is 70%. Every percentage point you recover is pure profit.</p>

                    <h3>Cart Page Optimization</h3>

                    <h4>Must-Haves:</h4>
                    <ul>
                        <li>Clear product images and details</li>
                        <li>Easy quantity adjustment</li>
                        <li>Remove item option</li>
                        <li>Order summary</li>
                        <li>Shipping estimate (before checkout)</li>
                        <li>Clear checkout button</li>
                    </ul>

                    <h4>Conversion Boosters:</h4>
                    <ul>
                        <li>Free shipping threshold bar</li>
                        <li>Cross-sell recommendations</li>
                        <li>Trust badges</li>
                        <li>Save for later option</li>
                        <li>Cart notes field</li>
                    </ul>

                    <h3>Checkout Optimization</h3>
                    <p>Shopify's checkout is limited, but you can still optimize:</p>
                    <ul>
                        <li>Enable express checkout (Shop Pay, Apple Pay, PayPal)</li>
                        <li>Offer guest checkout prominently</li>
                        <li>Minimize required fields</li>
                        <li>Show trust badges</li>
                        <li>Display clear shipping options with times</li>
                        <li>Show order summary throughout</li>
                    </ul>

                    <h3>Our Client's Cart Changes</h3>
                    <ul>
                        <li>Added "Free shipping at $X" progress bar</li>
                        <li>Showed shipping estimate in cart</li>
                        <li>Added trust badges below checkout button</li>
                        <li>Enabled all express payment options</li>
                        <li>Simplified to one-page checkout</li>
                    </ul>

                    <h3>Cart Abandonment Recovery</h3>
                    <p>For those who still abandon:</p>
                    <ul>
                        <li>Exit-intent popup (10% off to complete)</li>
                        <li>Abandoned cart emails (3-email sequence)</li>
                        <li>Retargeting ads (dynamic product ads)</li>
                        <li>SMS recovery (if opted in)</li>
                    </ul>

                    <h3>Results</h3>
                    <p>Cart abandonment decreased from 84% to 67% after our optimizations - recovering 17% more attempted purchases.</p>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 960,
                    resources: { worksheet: '/downloads/cart-checkout-checklist.pdf' }
                },
                {
                    title: 'Trust Elements & Social Proof That Convert',
                    description: 'Implement the trust signals and social proof that overcome objections and drive purchasing confidence.',
                    content: `<h2>Trust Is the Foundation of Conversion</h2>
                    <p>If visitors don't trust your store, nothing else matters. Here's how to build instant credibility.</p>

                    <h3>Types of Trust Elements</h3>

                    <h4>1. Security Trust</h4>
                    <ul>
                        <li>SSL certificate (HTTPS)</li>
                        <li>Payment method logos</li>
                        <li>Secure checkout badge</li>
                        <li>McAfee/Norton security badges (if applicable)</li>
                    </ul>

                    <h4>2. Quality Trust</h4>
                    <ul>
                        <li>Customer reviews and ratings</li>
                        <li>User-generated content (photos)</li>
                        <li>Testimonials</li>
                        <li>Case studies/before & after</li>
                    </ul>

                    <h4>3. Business Trust</h4>
                    <ul>
                        <li>Money-back guarantee</li>
                        <li>Clear return policy</li>
                        <li>Contact information</li>
                        <li>About page with real people</li>
                        <li>Physical address (if applicable)</li>
                    </ul>

                    <h4>4. Social Trust</h4>
                    <ul>
                        <li>Social media presence</li>
                        <li>Follower counts</li>
                        <li>"As seen in" media logos</li>
                        <li>Influencer endorsements</li>
                    </ul>

                    <h3>Where to Place Trust Elements</h3>
                    <ul>
                        <li><strong>Header:</strong> Shipping guarantee, contact link</li>
                        <li><strong>Product Page:</strong> Reviews, badges, guarantee</li>
                        <li><strong>Cart:</strong> Security badges, return policy</li>
                        <li><strong>Checkout:</strong> Payment logos, trust seal</li>
                        <li><strong>Footer:</strong> Policies, contact, social links</li>
                    </ul>

                    <h3>Review Strategy</h3>
                    <p>Reviews are your most powerful trust element:</p>
                    <ul>
                        <li>Use a review app with photo support</li>
                        <li>Send post-purchase review request emails</li>
                        <li>Incentivize photo reviews</li>
                        <li>Respond to negative reviews professionally</li>
                        <li>Display on homepage and product pages</li>
                    </ul>

                    <h3>Our Client's Trust Transformation</h3>
                    <p>Added:</p>
                    <ul>
                        <li>Review app with 4.8 star average displayed</li>
                        <li>30-day money-back guarantee badge</li>
                        <li>Free shipping + free returns messaging</li>
                        <li>Customer photos in gallery</li>
                        <li>Real About Us page with team photos</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 900,
                    resources: { worksheet: '/downloads/trust-elements-checklist.pdf' }
                }
            ]
        },

        // =====================================================
        // MODULE 5: TRAFFIC DIVERSIFICATION
        // =====================================================
        {
            title: 'Module 5: Traffic Diversification & Sustainable Growth',
            description: 'Reducing reliance on paid ads by building email and organic traffic channels.',
            lessons: [
                {
                    title: 'Email Marketing for CRO',
                    description: 'Build and leverage your email list to drive repeat purchases and higher lifetime value.',
                    content: `<h2>Email: Your Highest-Converting Traffic Source</h2>
                    <p>Email traffic typically converts 3-5X higher than cold traffic. Let's build this channel.</p>

                    <h3>Email Capture Strategy</h3>

                    <h4>Capture Points:</h4>
                    <ul>
                        <li>Homepage popup (10-15% off first order)</li>
                        <li>Embedded footer form</li>
                        <li>Spin-to-win wheel (for higher conversion)</li>
                        <li>Blog content upgrades</li>
                        <li>Exit-intent popup</li>
                    </ul>

                    <h4>Offer Types That Work:</h4>
                    <ul>
                        <li>Percentage discount (10-15% off)</li>
                        <li>Free shipping</li>
                        <li>Free gift with purchase</li>
                        <li>Early access to sales</li>
                        <li>Exclusive content/guides</li>
                    </ul>

                    <h3>Essential Email Flows</h3>
                    <ol>
                        <li><strong>Welcome Series (5-7 emails):</strong> Introduce brand, deliver offer, drive first purchase</li>
                        <li><strong>Abandoned Cart (3 emails):</strong> 1hr, 24hr, 72hr after abandonment</li>
                        <li><strong>Browse Abandonment:</strong> Reminder of viewed products</li>
                        <li><strong>Post-Purchase:</strong> Thank you, review request, cross-sell</li>
                        <li><strong>Win-Back:</strong> Re-engage inactive subscribers</li>
                    </ol>

                    <h3>Our Client's Email Results</h3>
                    <table>
                        <tr><th>Flow</th><th>Conversion Rate</th><th>Revenue Attribution</th></tr>
                        <tr><td>Welcome Series</td><td>8.2%</td><td>24%</td></tr>
                        <tr><td>Abandoned Cart</td><td>12.4%</td><td>18%</td></tr>
                        <tr><td>Post-Purchase</td><td>4.1%</td><td>11%</td></tr>
                    </table>
                    <p>Email drove 53% of Month 3 revenue from just 15% of traffic.</p>

                    <h3>Email Best Practices</h3>
                    <ul>
                        <li>Personalize with first name and products</li>
                        <li>Keep subject lines under 50 characters</li>
                        <li>One clear CTA per email</li>
                        <li>Mobile-optimized design</li>
                        <li>Send at optimal times (test for your audience)</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 1080,
                    resources: { worksheet: '/downloads/email-flow-templates.pdf' }
                },
                {
                    title: 'SEO & Organic Traffic Strategy',
                    description: 'Build sustainable organic traffic that converts at a high rate without ongoing ad spend.',
                    content: `<h2>SEO: The Long Game That Pays Off</h2>
                    <p>Organic search traffic typically converts 2-3X better than paid because of search intent.</p>

                    <h3>E-commerce SEO Fundamentals</h3>

                    <h4>On-Page SEO:</h4>
                    <ul>
                        <li>Optimized title tags (include keyword + brand)</li>
                        <li>Compelling meta descriptions</li>
                        <li>Clean URL structure</li>
                        <li>Header tag hierarchy (H1, H2, H3)</li>
                        <li>Alt text on all images</li>
                        <li>Internal linking between pages</li>
                    </ul>

                    <h4>Technical SEO:</h4>
                    <ul>
                        <li>Fast page speed (covered earlier)</li>
                        <li>Mobile-friendly design</li>
                        <li>XML sitemap submitted</li>
                        <li>No broken links (404s)</li>
                        <li>Canonical tags set correctly</li>
                    </ul>

                    <h4>Content SEO:</h4>
                    <ul>
                        <li>Product descriptions with keywords</li>
                        <li>Collection page descriptions</li>
                        <li>Blog content for informational queries</li>
                        <li>FAQ pages for long-tail keywords</li>
                    </ul>

                    <h3>Our Client's SEO Strategy</h3>
                    <ul>
                        <li>Optimized all product pages for "[product type]" keywords</li>
                        <li>Created collection pages targeting category keywords</li>
                        <li>Published 2 blog posts per week</li>
                        <li>Built buying guides for high-intent keywords</li>
                    </ul>

                    <h3>SEO Results (Month 3)</h3>
                    <p>Organic traffic grew 34% month-over-month. Key stats:</p>
                    <table>
                        <tr><th>Metric</th><th>Month 1</th><th>Month 3</th></tr>
                        <tr><td>Organic Sessions</td><td>420</td><td>680</td></tr>
                        <tr><td>Organic CR</td><td>0.48%</td><td>2.1%</td></tr>
                        <tr><td>Organic Revenue %</td><td>8%</td><td>22%</td></tr>
                    </table>

                    <h3>Quick SEO Wins</h3>
                    <ol>
                        <li>Add keywords to product titles</li>
                        <li>Write unique product descriptions</li>
                        <li>Optimize collection page titles/descriptions</li>
                        <li>Add alt text to all images</li>
                        <li>Fix any broken links</li>
                    </ol>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 960,
                    resources: { worksheet: '/downloads/seo-checklist.pdf' }
                },
                {
                    title: 'Measuring Progress Without Relying on Paid Ads',
                    description: 'How to evaluate your CRO success independent of paid traffic, focusing on true conversion improvements.',
                    content: `<h2>True CRO vs. Traffic Quality</h2>
                    <p>Here's the key insight: In Month 3, we turned OFF paid traffic to see the true conversion rate improvement.</p>

                    <h3>Why We Did This</h3>
                    <p>Paid traffic quality varies. To prove our CRO work was effective, we needed to isolate it from traffic changes.</p>

                    <h4>Month 3 Traffic Mix:</h4>
                    <ul>
                        <li>Email: 35%</li>
                        <li>Organic Search: 28%</li>
                        <li>Direct: 22%</li>
                        <li>Social (organic): 10%</li>
                        <li>Referral: 5%</li>
                    </ul>

                    <h3>The Results</h3>
                    <table>
                        <tr><th>Metric</th><th>Month 1 (Paid)</th><th>Month 2 (Paid)</th><th>Month 3 (Organic)</th></tr>
                        <tr><td>Sessions</td><td>5,000</td><td>5,200</td><td>3,100</td></tr>
                        <tr><td>Orders</td><td>19</td><td>46</td><td>61</td></tr>
                        <tr><td>CR</td><td>0.37%</td><td>0.89%</td><td>1.97%</td></tr>
                    </table>

                    <h3>Analysis</h3>
                    <p><strong>Even with less traffic, we had more orders.</strong></p>
                    <p>This proves:</p>
                    <ul>
                        <li>CRO work was genuinely effective</li>
                        <li>Organic/email traffic converts much higher</li>
                        <li>The store is now ready for scaled paid traffic</li>
                    </ul>

                    <h3>The Full Picture</h3>
                    <p>Conversion rate progression:</p>
                    <ul>
                        <li>Month 1: 0.37% (baseline)</li>
                        <li>Month 2: 0.89% (+140%)</li>
                        <li>Month 3: 1.97% (+432% from baseline)</li>
                    </ul>

                    <h3>What This Means for Paid Ads</h3>
                    <p>With a 1.97% CR instead of 0.37%, every ad dollar works 5X harder:</p>
                    <ul>
                        <li>Old: $100 ad spend → 270 visitors → 1 sale</li>
                        <li>New: $100 ad spend → 270 visitors → 5 sales</li>
                    </ul>
                    <p>NOW it makes sense to scale ad spend.</p>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 840,
                    resources: { worksheet: '/downloads/traffic-diversification-plan.pdf' }
                },
                {
                    title: 'The Compound Effect of CRO',
                    description: 'Understanding how small improvements compound over time to create massive business results.',
                    content: `<h2>Small Improvements, Massive Results</h2>
                    <p>CRO isn't about one big change. It's about many small improvements that compound.</p>

                    <h3>The Math of Compounding</h3>
                    <p>If you improve by just 10% in 5 areas:</p>
                    <ul>
                        <li>1.1 × 1.1 × 1.1 × 1.1 × 1.1 = 1.61</li>
                        <li>That's a 61% improvement from "small" changes!</li>
                    </ul>

                    <h3>Our Client's Compound Effect</h3>
                    <table>
                        <tr><th>Improvement</th><th>Impact</th></tr>
                        <tr><td>Mobile speed improvement</td><td>+15% mobile CR</td></tr>
                        <tr><td>Trust badges added</td><td>+8% overall CR</td></tr>
                        <tr><td>Product page optimization</td><td>+25% add-to-cart</td></tr>
                        <tr><td>Cart optimization</td><td>-17% abandonment</td></tr>
                        <tr><td>Email marketing</td><td>+40% repeat purchases</td></tr>
                    </table>

                    <h3>Revenue Impact Over 12 Months</h3>
                    <p>Projecting our client's improvements forward:</p>
                    <table>
                        <tr><th>Scenario</th><th>Monthly Revenue</th><th>Annual Revenue</th></tr>
                        <tr><td>Original (0.37% CR)</td><td>$8,500</td><td>$102,000</td></tr>
                        <tr><td>After CRO (1.97% CR)</td><td>$45,500</td><td>$546,000</td></tr>
                    </table>
                    <p><strong>5.3X revenue increase from CRO alone.</strong></p>

                    <h3>The Flywheel Effect</h3>
                    <p>Higher conversion rate enables:</p>
                    <ol>
                        <li>More profitable ads → more budget available</li>
                        <li>More customers → more reviews → more trust</li>
                        <li>More revenue → more investment in products/content</li>
                        <li>Better customer experience → more referrals</li>
                    </ol>
                    <p>It compounds on itself.</p>

                    <h3>Never Stop Optimizing</h3>
                    <p>CRO is never "done." Every quarter:</p>
                    <ul>
                        <li>Review your analytics</li>
                        <li>Watch session recordings</li>
                        <li>Test new hypotheses</li>
                        <li>Implement winners</li>
                        <li>Repeat</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 720,
                    resources: { worksheet: '/downloads/compound-effect-calculator.pdf' }
                }
            ]
        },

        // =====================================================
        // MODULE 6: CASE STUDY & ACTION PLAN
        // =====================================================
        {
            title: 'Module 6: Full Case Study & Your Action Plan',
            description: 'The complete case study breakdown plus your personalized 90-day implementation roadmap.',
            lessons: [
                {
                    title: 'Complete Case Study: 0.37% to 1.97% in 90 Days',
                    description: 'The full breakdown of our client\'s transformation with screenshots, data, and insights from each phase.',
                    content: `<h2>The Full Story</h2>
                    <p>Here's the complete journey of how we transformed our client's e-commerce store.</p>

                    <h3>The Client</h3>
                    <ul>
                        <li><strong>Industry:</strong> Fashion/Apparel</li>
                        <li><strong>Store Age:</strong> 18 months</li>
                        <li><strong>Starting Revenue:</strong> ~$8,500/month</li>
                        <li><strong>Main Problem:</strong> High ad costs, low conversion</li>
                    </ul>

                    <h3>Month 1: Discovery & Baseline</h3>
                    <p><strong>Actions Taken:</strong></p>
                    <ul>
                        <li>Set up comprehensive tracking</li>
                        <li>Ran controlled traffic ($1,200 spend)</li>
                        <li>Recorded 200+ user sessions</li>
                        <li>Identified 47 specific issues</li>
                    </ul>
                    <p><strong>Key Findings:</strong></p>
                    <ul>
                        <li>Mobile CR was 68% lower than desktop</li>
                        <li>84% cart abandonment rate</li>
                        <li>4.2s load time killing conversions</li>
                        <li>Theme limitations causing UX issues</li>
                    </ul>
                    <p><strong>Baseline CR: 0.37%</strong></p>

                    <h3>Month 2: Theme Rebuild</h3>
                    <p><strong>Actions Taken:</strong></p>
                    <ul>
                        <li>Selected and purchased premium theme ($350)</li>
                        <li>Complete redesign over 3 weeks</li>
                        <li>Mobile-first approach</li>
                        <li>Speed optimizations</li>
                        <li>New product photography</li>
                    </ul>
                    <p><strong>Results:</strong></p>
                    <ul>
                        <li>Load time: 4.2s → 1.8s</li>
                        <li>Mobile CR: 0.21% → 0.72%</li>
                        <li>Overall CR: 0.37% → 0.89%</li>
                    </ul>
                    <p><strong>Post-Rebuild CR: 0.89% (+140%)</strong></p>

                    <h3>Month 3: Optimization & Traffic Diversification</h3>
                    <p><strong>Actions Taken:</strong></p>
                    <ul>
                        <li>Page-by-page CRO improvements</li>
                        <li>Email marketing setup (5 flows)</li>
                        <li>SEO optimization</li>
                        <li>Trust element implementation</li>
                        <li>Turned off paid ads to measure true CR</li>
                    </ul>
                    <p><strong>Results:</strong></p>
                    <ul>
                        <li>Add-to-cart rate: 5.8% → 9.2%</li>
                        <li>Cart abandonment: 84% → 67%</li>
                        <li>Email revenue: 0% → 53%</li>
                        <li>Organic traffic: +62%</li>
                    </ul>
                    <p><strong>Final CR: 1.97% (+432% from baseline)</strong></p>

                    <h3>Total Investment</h3>
                    <ul>
                        <li>Premium theme: $350</li>
                        <li>Apps/tools: $200</li>
                        <li>Photography: $500</li>
                        <li>Testing traffic: $1,200</li>
                        <li><strong>Total: $2,250</strong></li>
                    </ul>

                    <h3>12-Month Projected ROI</h3>
                    <ul>
                        <li>Revenue increase: $444,000/year</li>
                        <li>Investment: $2,250</li>
                        <li><strong>ROI: 19,700%</strong></li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 1320,
                    resources: { worksheet: '/downloads/full-case-study.pdf' }
                },
                {
                    title: 'ROI Calculator: Understanding the CRO Math',
                    description: 'Calculate your potential ROI from CRO improvements and understand the financial impact on your business.',
                    content: `<h2>The Numbers Don't Lie</h2>
                    <p>Let's calculate what CRO could mean for YOUR business.</p>

                    <h3>The Basic CRO Math</h3>
                    <p>Current State:</p>
                    <ul>
                        <li>Monthly traffic: [Your number]</li>
                        <li>Current CR: [Your %]</li>
                        <li>Average Order Value: [Your $]</li>
                        <li>Monthly Revenue = Traffic × CR × AOV</li>
                    </ul>

                    <h3>Impact of CR Improvement</h3>
                    <table>
                        <tr><th>CR Improvement</th><th>Revenue Impact</th></tr>
                        <tr><td>+0.5%</td><td>+25-50%</td></tr>
                        <tr><td>+1.0%</td><td>+50-100%</td></tr>
                        <tr><td>+1.5%</td><td>+100-200%</td></tr>
                        <tr><td>2X CR</td><td>2X Revenue</td></tr>
                    </table>

                    <h3>Example Calculation</h3>
                    <p>Store with 10,000 monthly visitors, 1% CR, $75 AOV:</p>
                    <ul>
                        <li>Current: 10,000 × 1% × $75 = $7,500/mo</li>
                        <li>After 2% CR: 10,000 × 2% × $75 = $15,000/mo</li>
                        <li>Annual difference: $90,000</li>
                    </ul>

                    <h3>Hidden Benefits</h3>
                    <p>Beyond direct revenue, higher CR means:</p>
                    <ul>
                        <li>Lower customer acquisition costs</li>
                        <li>More budget for growth</li>
                        <li>Competitive advantage</li>
                        <li>Higher business valuation</li>
                    </ul>

                    <h3>Your Calculation</h3>
                    <p>Use our calculator worksheet to project:</p>
                    <ol>
                        <li>Your current monthly revenue</li>
                        <li>Revenue at +50% CR</li>
                        <li>Revenue at +100% CR</li>
                        <li>Revenue at our client's improvement (+432%)</li>
                    </ol>

                    <h3>Investment Framework</h3>
                    <p>CRO investments to consider:</p>
                    <ul>
                        <li>Premium theme: $300-500</li>
                        <li>Professional photography: $500-2,000</li>
                        <li>Review app: $15-50/month</li>
                        <li>Email marketing: $20-300/month</li>
                        <li>Heatmap tool: $0-50/month</li>
                    </ul>
                    <p>Most stores can implement this system for under $2,500 total.</p>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 780,
                    resources: { worksheet: '/downloads/roi-calculator.pdf' }
                },
                {
                    title: 'Your 90-Day CRO Action Plan',
                    description: 'Your personalized week-by-week roadmap to implement everything you\'ve learned in this course.',
                    content: `<h2>Your Implementation Roadmap</h2>
                    <p>Here's exactly what to do each week for the next 90 days.</p>

                    <h3>MONTH 1: MEASUREMENT (Weeks 1-4)</h3>

                    <h4>Week 1: Setup</h4>
                    <ul>
                        <li>☐ Verify GA4 is tracking correctly</li>
                        <li>☐ Install heatmap tool (Microsoft Clarity - free)</li>
                        <li>☐ Document current conversion rate</li>
                        <li>☐ Set up tracking spreadsheet</li>
                    </ul>

                    <h4>Week 2-3: Data Collection</h4>
                    <ul>
                        <li>☐ Run controlled traffic (if using ads)</li>
                        <li>☐ Record daily metrics</li>
                        <li>☐ Watch 10+ session recordings per day</li>
                        <li>☐ Document issues in your audit sheet</li>
                    </ul>

                    <h4>Week 4: Analysis</h4>
                    <ul>
                        <li>☐ Calculate baseline conversion rate</li>
                        <li>☐ Prioritize issues with ICE framework</li>
                        <li>☐ Decide: optimize or rebuild theme</li>
                        <li>☐ Create Month 2 plan</li>
                    </ul>

                    <h3>MONTH 2: TRANSFORMATION (Weeks 5-8)</h3>

                    <h4>Week 5: Theme Decision</h4>
                    <ul>
                        <li>☐ Select new theme (if rebuilding) OR</li>
                        <li>☐ Begin systematic optimization</li>
                        <li>☐ Start setup in development</li>
                    </ul>

                    <h4>Week 6-7: Implementation</h4>
                    <ul>
                        <li>☐ Build out new theme/make optimizations</li>
                        <li>☐ Focus on mobile experience</li>
                        <li>☐ Implement speed optimizations</li>
                        <li>☐ Add trust elements</li>
                    </ul>

                    <h4>Week 8: Launch & Measure</h4>
                    <ul>
                        <li>☐ Launch changes</li>
                        <li>☐ Monitor for issues</li>
                        <li>☐ Track new conversion rate</li>
                        <li>☐ Compare to baseline</li>
                    </ul>

                    <h3>MONTH 3: OPTIMIZATION (Weeks 9-12)</h3>

                    <h4>Week 9-10: Page Optimization</h4>
                    <ul>
                        <li>☐ Optimize homepage</li>
                        <li>☐ Optimize product pages</li>
                        <li>☐ Optimize collection pages</li>
                        <li>☐ Optimize cart/checkout</li>
                    </ul>

                    <h4>Week 11: Email & Traffic</h4>
                    <ul>
                        <li>☐ Set up email capture</li>
                        <li>☐ Build welcome sequence</li>
                        <li>☐ Set up abandoned cart emails</li>
                        <li>☐ Implement basic SEO</li>
                    </ul>

                    <h4>Week 12: Review & Scale</h4>
                    <ul>
                        <li>☐ Calculate final conversion rate</li>
                        <li>☐ Document all improvements</li>
                        <li>☐ Plan next optimization cycle</li>
                        <li>☐ Consider scaling traffic</li>
                    </ul>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 960,
                    resources: { worksheet: '/downloads/90-day-action-plan.pdf' }
                },
                {
                    title: 'Course Conclusion & What Comes Next',
                    description: 'Final thoughts, next steps, and how to continue your CRO journey beyond this course.',
                    content: `<h2>Congratulations!</h2>
                    <p>You now have the complete system to transform your store's conversion rate.</p>

                    <h3>Key Takeaways</h3>
                    <ol>
                        <li><strong>Measure First:</strong> Never optimize blind. Get your baseline.</li>
                        <li><strong>Theme Matters:</strong> Your foundation impacts everything.</li>
                        <li><strong>Mobile-First:</strong> 70%+ of your traffic is mobile.</li>
                        <li><strong>Trust Is Everything:</strong> Build confidence at every step.</li>
                        <li><strong>Compound Effect:</strong> Small improvements add up.</li>
                        <li><strong>Diversify Traffic:</strong> Don't rely solely on paid ads.</li>
                    </ol>

                    <h3>Your Potential</h3>
                    <p>If you implement this system:</p>
                    <ul>
                        <li>Expect 2-5X conversion rate improvement</li>
                        <li>Dramatically lower customer acquisition costs</li>
                        <li>More profitable paid advertising</li>
                        <li>Sustainable organic traffic growth</li>
                        <li>Higher business valuation</li>
                    </ul>

                    <h3>What Comes Next</h3>
                    <p>After your 90-day transformation:</p>
                    <ul>
                        <li><strong>Continue testing:</strong> CRO is never done</li>
                        <li><strong>Scale traffic:</strong> Your higher CR makes ads profitable</li>
                        <li><strong>Build email:</strong> Your highest-converting channel</li>
                        <li><strong>Expand SEO:</strong> Compound organic growth</li>
                        <li><strong>Add products:</strong> Your optimized store can sell more</li>
                    </ul>

                    <h3>Resources Included</h3>
                    <p>Don't forget to download all your worksheets:</p>
                    <ul>
                        <li>90-Day Action Plan</li>
                        <li>Store Audit Checklist</li>
                        <li>Issue Prioritization Matrix</li>
                        <li>Theme Evaluation Guide</li>
                        <li>Page Optimization Checklists</li>
                        <li>ROI Calculator</li>
                        <li>Email Flow Templates</li>
                        <li>SEO Checklist</li>
                    </ul>

                    <h3>Final Words</h3>
                    <p>The difference between a struggling store and a thriving one often comes down to conversion rate. You now have the exact playbook we used to achieve a 5X improvement.</p>

                    <p>The only thing left is to take action.</p>

                    <p><strong>Go optimize your store. I'll see you on the other side.</strong></p>`,
                    video_url: 'https://www.youtube.com/embed/placeholder',
                    video_duration: 600,
                    resources: { worksheet: '/downloads/all-resources-bundle.zip' }
                }
            ]
        }
    ];

    // Insert modules and lessons
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
    // SUMMARY
    // =====================================================
    console.log('\n=== CRO Course Seeding Complete ===');
    console.log('\nCourse: E-commerce CRO Blueprint: 0.37% to 2% in 90 Days');
    console.log('  6 Modules, 24 Lessons');
    console.log('\nProduct: CRO Blueprint');
    console.log('  Price: $19 (Compare at $97)');
}

seedCROCourse().catch(console.error);
