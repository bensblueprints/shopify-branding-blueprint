const { chromium } = require('playwright');

const BASE_URL = 'https://shopifycourse.advancedmarketing.co';

async function testAdminDashboard() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('\n=== Testing Admin Dashboard ===\n');

    try {
        // 1. Navigate to admin login
        console.log('1. Navigating to admin login...');
        await page.goto(`${BASE_URL}/admin/login.html`);
        await page.waitForLoadState('networkidle');
        console.log('   ✓ Login page loaded');

        // Check what elements exist
        const emailInput = await page.$('input[type="email"], input[name="email"]');
        const passwordInput = await page.$('input[type="password"]');
        const loginBtn = await page.$('button[type="submit"], .btn-primary');

        if (!emailInput || !passwordInput) {
            console.log('   Checking page content...');
            const content = await page.content();
            console.log('   Page title:', await page.title());
            // Take a screenshot
            await page.screenshot({ path: '/tmp/admin-login.png' });
            console.log('   Screenshot saved to /tmp/admin-login.png');
        } else {
            console.log('   ✓ Found login form elements');
        }

        // 2. Check the portal login
        console.log('\n2. Testing portal login page...');
        await page.goto(`${BASE_URL}/portal/login.html`);
        await page.waitForLoadState('networkidle');
        console.log('   ✓ Portal login page loaded');

        // 3. Check the resources page (requires auth)
        console.log('\n3. Testing resources page...');
        await page.goto(`${BASE_URL}/portal/resources.html`);
        await page.waitForLoadState('networkidle');

        // Check if redirected to login
        const currentUrl = page.url();
        if (currentUrl.includes('login')) {
            console.log('   ✓ Correctly redirected to login (auth required)');
        } else {
            console.log('   Page URL:', currentUrl);
        }

        // 4. Check upsell payment endpoint
        console.log('\n4. Testing create-upsell-payment endpoint...');
        const response = await page.request.post(`${BASE_URL}/.netlify/functions/create-upsell-payment`, {
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify({ product_id: 1 }),
            failOnStatusCode: false
        });

        const status = response.status();
        const body = await response.json().catch(() => response.text());
        console.log(`   Response status: ${status}`);
        console.log(`   Response:`, body);

        if (status === 401) {
            console.log('   ✓ Correctly returns 401 (auth required)');
        }

        // 5. Check admin-products endpoint
        console.log('\n5. Testing admin-products endpoint...');
        const productsResponse = await page.request.get(`${BASE_URL}/.netlify/functions/admin-products`, {
            failOnStatusCode: false
        });
        const productsStatus = productsResponse.status();
        console.log(`   Response status: ${productsStatus}`);
        if (productsStatus === 401) {
            console.log('   ✓ Correctly returns 401 (admin auth required)');
        }

        // 6. Check portal-upsells endpoint
        console.log('\n6. Testing portal-upsells endpoint...');
        const upsellsResponse = await page.request.get(`${BASE_URL}/.netlify/functions/portal-upsells`, {
            failOnStatusCode: false
        });
        const upsellsStatus = upsellsResponse.status();
        const upsellsBody = await upsellsResponse.json().catch(() => ({}));
        console.log(`   Response status: ${upsellsStatus}`);
        console.log(`   Response:`, JSON.stringify(upsellsBody).substring(0, 200));

        console.log('\n=== Tests Complete ===\n');

    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await browser.close();
    }
}

testAdminDashboard();
