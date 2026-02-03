// Airwallex Product Sync - Syncs products from database to Airwallex
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const AIRWALLEX_API_URL = process.env.AIRWALLEX_ENV === 'production'
    ? 'https://api.airwallex.com'
    : 'https://api-demo.airwallex.com';

async function getAccessToken() {
    const response = await fetch(`${AIRWALLEX_API_URL}/api/v1/authentication/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-client-id': process.env.AIRWALLEX_CLIENT_ID,
            'x-api-key': process.env.AIRWALLEX_API_KEY
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to authenticate with Airwallex');
    }

    const data = await response.json();
    return data.token;
}

// Get all products from Airwallex
async function getAirwallexProducts(accessToken) {
    const response = await fetch(`${AIRWALLEX_API_URL}/api/v1/pa/products?page_size=100`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        console.log('No products in Airwallex or API not available');
        return [];
    }

    const data = await response.json();
    return data.items || [];
}

// Create product in Airwallex
async function createAirwallexProduct(accessToken, product) {
    const requestId = `prod_create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await fetch(`${AIRWALLEX_API_URL}/api/v1/pa/products/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            request_id: requestId,
            name: product.name,
            type: 'digital',
            active: product.is_active,
            metadata: {
                product_key: product.product_key,
                db_id: product.id.toString(),
                source: 'shopify_blueprint'
            }
        })
    });

    const result = await response.json();

    if (!response.ok) {
        console.error('Failed to create Airwallex product:', result);
        return null;
    }

    return result;
}

// Create price for product in Airwallex
async function createAirwallexPrice(accessToken, productId, priceData) {
    const requestId = `price_create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await fetch(`${AIRWALLEX_API_URL}/api/v1/pa/prices/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            request_id: requestId,
            product_id: productId,
            billing_period: null, // One-time payment
            currency: 'USD',
            unit_amount: priceData.price_cents,
            active: true,
            metadata: {
                product_key: priceData.product_key,
                source: 'shopify_blueprint'
            }
        })
    });

    const result = await response.json();

    if (!response.ok) {
        console.error('Failed to create Airwallex price:', result);
        return null;
    }

    return result;
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Check for admin auth (simple token check)
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const adminToken = process.env.ADMIN_SECRET || 'shopify-blueprint-admin';

    if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    try {
        const accessToken = await getAccessToken();

        // Get products from database
        const dbProducts = await sql`
            SELECT id, product_key, name, price_cents, is_active, airwallex_product_id, airwallex_price_id
            FROM products
            ORDER BY id
        `;

        // Add the main course product (not in DB, it's the entry product)
        const allProducts = [
            {
                id: 0,
                product_key: 'main_course',
                name: '7-Day Shopify Branding Blueprint',
                price_cents: 2700,
                is_active: true,
                airwallex_product_id: null,
                airwallex_price_id: null
            },
            ...dbProducts
        ];

        // Get existing Airwallex products
        const existingProducts = await getAirwallexProducts(accessToken);
        const existingByKey = {};
        existingProducts.forEach(p => {
            if (p.metadata && p.metadata.product_key) {
                existingByKey[p.metadata.product_key] = p;
            }
        });

        const results = {
            synced: [],
            created: [],
            errors: [],
            skipped: []
        };

        // Sync each product
        for (const product of allProducts) {
            try {
                // Check if already exists in Airwallex
                if (existingByKey[product.product_key]) {
                    results.skipped.push({
                        product_key: product.product_key,
                        name: product.name,
                        reason: 'Already exists in Airwallex'
                    });
                    continue;
                }

                // Create product in Airwallex
                const awProduct = await createAirwallexProduct(accessToken, product);

                if (!awProduct) {
                    results.errors.push({
                        product_key: product.product_key,
                        name: product.name,
                        error: 'Failed to create product'
                    });
                    continue;
                }

                // Create price for the product
                const awPrice = await createAirwallexPrice(accessToken, awProduct.id, product);

                if (!awPrice) {
                    results.errors.push({
                        product_key: product.product_key,
                        name: product.name,
                        error: 'Product created but price creation failed'
                    });
                    continue;
                }

                // Update database with Airwallex IDs (skip main_course as it's not in DB)
                if (product.id !== 0) {
                    await sql`
                        UPDATE products
                        SET airwallex_product_id = ${awProduct.id},
                            airwallex_price_id = ${awPrice.id},
                            updated_at = NOW()
                        WHERE id = ${product.id}
                    `;
                }

                results.created.push({
                    product_key: product.product_key,
                    name: product.name,
                    airwallex_product_id: awProduct.id,
                    airwallex_price_id: awPrice.id,
                    price: `$${product.price_cents / 100}`
                });

            } catch (productError) {
                results.errors.push({
                    product_key: product.product_key,
                    name: product.name,
                    error: productError.message
                });
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Product sync completed',
                summary: {
                    total: allProducts.length,
                    created: results.created.length,
                    skipped: results.skipped.length,
                    errors: results.errors.length
                },
                results
            })
        };

    } catch (error) {
        console.error('Sync error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Sync failed' })
        };
    }
};
