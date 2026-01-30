// Admin Products API with Neon database
const { neon } = require('@neondatabase/serverless');

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
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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
                    body_html,
                    price_cents,
                    product_type,
                    is_active,
                    features,
                    download_url,
                    download_filename,
                    download_size,
                    created_at
                FROM products
                ORDER BY price_cents ASC
            `;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ products })
            };
        }

        // PUT - Update product
        if (event.httpMethod === 'PUT') {
            const body = JSON.parse(event.body);
            const { id, download_url, download_filename, download_size } = body;

            if (!id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Product ID is required' })
                };
            }

            // Update the product download info
            const updated = await sql`
                UPDATE products
                SET
                    download_url = ${download_url || null},
                    download_filename = ${download_filename || null},
                    download_size = ${download_size || null},
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
