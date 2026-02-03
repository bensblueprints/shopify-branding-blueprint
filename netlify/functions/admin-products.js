// Admin Products API with Full CRUD Operations
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const sql = neon(process.env.DATABASE_URL);

async function validateAdminSession(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const sessionToken = authHeader.replace('Bearer ', '');

    const sessions = await sql`
        SELECT s.*, a.id as admin_id, a.email, a.full_name, a.role
        FROM sessions s
        JOIN admin_users a ON s.admin_id = a.id
        WHERE s.session_token = ${sessionToken}
        AND s.expires_at > NOW()
        AND s.admin_id IS NOT NULL
    `;

    if (sessions.length === 0) return null;
    return {
        id: sessions[0].admin_id,
        email: sessions[0].email,
        full_name: sessions[0].full_name,
        role: sessions[0].role
    };
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const authHeader = event.headers.authorization || event.headers.Authorization;
        const admin = await validateAdminSession(authHeader);

        if (!admin) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        // GET - List all products
        if (event.httpMethod === 'GET') {
            const products = await sql`
                SELECT
                    id,
                    product_key,
                    name,
                    title,
                    handle,
                    body_html,
                    price_cents,
                    product_type,
                    is_active,
                    status,
                    features,
                    download_url,
                    download_filename,
                    download_size,
                    created_at,
                    updated_at
                FROM products
                ORDER BY created_at DESC
            `;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ products })
            };
        }

        // POST - Create new product
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const {
                name,
                title,
                product_key,
                body_html,
                price_cents,
                product_type,
                is_active,
                features,
                download_url,
                download_filename,
                download_size
            } = body;

            if (!name || !title) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Name and title are required' })
                };
            }

            // Generate product key from name if not provided
            const finalProductKey = product_key || name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const handle = finalProductKey;
            const id = crypto.randomUUID();

            // Parse features if it's a string
            let featuresJson = features;
            if (typeof features === 'string') {
                try {
                    featuresJson = JSON.parse(features);
                } catch (e) {
                    featuresJson = features.split('\n').filter(f => f.trim());
                }
            }

            const newProduct = await sql`
                INSERT INTO products (
                    id,
                    product_key,
                    name,
                    title,
                    handle,
                    body_html,
                    price_cents,
                    product_type,
                    is_active,
                    status,
                    features,
                    download_url,
                    download_filename,
                    download_size,
                    created_at,
                    updated_at
                ) VALUES (
                    ${id},
                    ${finalProductKey},
                    ${name},
                    ${title},
                    ${handle},
                    ${body_html || null},
                    ${price_cents || 0},
                    ${product_type || 'digital_download'},
                    ${is_active !== false},
                    'ACTIVE',
                    ${JSON.stringify(featuresJson || [])},
                    ${download_url || null},
                    ${download_filename || null},
                    ${download_size || null},
                    NOW(),
                    NOW()
                )
                RETURNING *
            `;

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    success: true,
                    product: newProduct[0]
                })
            };
        }

        // PUT - Update product
        if (event.httpMethod === 'PUT') {
            const body = JSON.parse(event.body);
            const { id } = body;

            if (!id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Product ID is required' })
                };
            }

            // Build dynamic update
            const updates = [];
            const values = { id };

            if (body.name !== undefined) {
                updates.push('name');
                values.name = body.name;
            }
            if (body.title !== undefined) {
                updates.push('title');
                values.title = body.title;
            }
            if (body.body_html !== undefined) {
                updates.push('body_html');
                values.body_html = body.body_html;
            }
            if (body.price_cents !== undefined) {
                updates.push('price_cents');
                values.price_cents = parseInt(body.price_cents) || 0;
            }
            if (body.product_type !== undefined) {
                updates.push('product_type');
                values.product_type = body.product_type;
            }
            if (body.is_active !== undefined) {
                updates.push('is_active');
                values.is_active = body.is_active;
            }
            if (body.features !== undefined) {
                updates.push('features');
                let featuresJson = body.features;
                if (typeof body.features === 'string') {
                    try {
                        featuresJson = JSON.parse(body.features);
                    } catch (e) {
                        featuresJson = body.features.split('\n').filter(f => f.trim());
                    }
                }
                values.features = JSON.stringify(featuresJson);
            }
            if (body.download_url !== undefined) {
                updates.push('download_url');
                values.download_url = body.download_url;
            }
            if (body.download_filename !== undefined) {
                updates.push('download_filename');
                values.download_filename = body.download_filename;
            }
            if (body.download_size !== undefined) {
                updates.push('download_size');
                values.download_size = body.download_size;
            }

            // Comprehensive update query
            const updated = await sql`
                UPDATE products
                SET
                    name = COALESCE(${values.name}, name),
                    title = COALESCE(${values.title}, title),
                    body_html = COALESCE(${values.body_html}, body_html),
                    price_cents = COALESCE(${values.price_cents}, price_cents),
                    product_type = COALESCE(${values.product_type}, product_type),
                    is_active = COALESCE(${values.is_active}, is_active),
                    features = COALESCE(${values.features}::jsonb, features),
                    download_url = COALESCE(${values.download_url}, download_url),
                    download_filename = COALESCE(${values.download_filename}, download_filename),
                    download_size = COALESCE(${values.download_size}, download_size),
                    updated_at = NOW()
                WHERE id = ${id}
                RETURNING *
            `;

            if (updated.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Product not found' })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    product: updated[0]
                })
            };
        }

        // DELETE - Delete product
        if (event.httpMethod === 'DELETE') {
            const body = JSON.parse(event.body || '{}');
            const id = body.id || event.queryStringParameters?.id;

            if (!id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Product ID is required' })
                };
            }

            // Check if any users own this product before deleting
            const owners = await sql`
                SELECT COUNT(*) as count FROM user_products WHERE product_id = ${id}
            `;

            if (parseInt(owners[0].count) > 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'Cannot delete product that has been purchased',
                        owned_by: parseInt(owners[0].count)
                    })
                };
            }

            await sql`DELETE FROM products WHERE id = ${id}`;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Product deleted'
                })
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (error) {
        console.error('Admin products error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to process request' })
        };
    }
};
