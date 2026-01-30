// Admin customers with Neon database
const { neon } = require('@neondatabase/serverless');
const { blockUserDeletion, softDeleteUser } = require('./utils/user-protection');

const sql = neon(process.env.DATABASE_URL);

/**
 * IMPORTANT: User records should NEVER be deleted programmatically.
 * Use soft delete (disable) instead. Only manual deletion from
 * admin dashboard is permitted.
 */

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
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const authHeader = event.headers.authorization || event.headers.Authorization;
    const admin = await validateAdminSession(authHeader);

    if (!admin) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    try {
        // GET - List customers or get single customer
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};

            if (params.id) {
                // Get single customer with enrollments and purchases
                const users = await sql`
                    SELECT * FROM users WHERE id = ${params.id}
                `;

                if (users.length === 0) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ error: 'User not found' })
                    };
                }

                const user = users[0];

                // Get enrollments
                const enrollments = await sql`
                    SELECT e.*, c.title, c.slug
                    FROM enrollments e
                    JOIN courses c ON e.course_id = c.id
                    WHERE e.user_id = ${params.id}
                `;
                user.enrollments = enrollments;

                // Get purchases
                const purchases = await sql`
                    SELECT p.*, pr.name, pr.product_key
                    FROM purchases p
                    JOIN products pr ON p.product_id = pr.id
                    WHERE p.user_id = ${params.id}
                `;
                user.purchases = purchases;

                return { statusCode: 200, headers, body: JSON.stringify(user) };
            }

            // List customers with pagination
            const page = parseInt(params.page) || 1;
            const limit = parseInt(params.limit) || 20;
            const offset = (page - 1) * limit;

            const users = await sql`
                SELECT u.*,
                    (SELECT COUNT(*) FROM enrollments WHERE user_id = u.id) as enrollment_count,
                    (SELECT COUNT(*) FROM purchases WHERE user_id = u.id) as purchase_count
                FROM users u
                ORDER BY u.created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `;

            const [countResult] = await sql`SELECT COUNT(*) as count FROM users`;
            const total = parseInt(countResult.count) || 0;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    users,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                })
            };
        }

        // POST - Grant or revoke access
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { action, userId, courseId } = body;

            if (action === 'grant_access') {
                // Check if enrollment already exists
                const existing = await sql`
                    SELECT id FROM enrollments
                    WHERE user_id = ${userId} AND course_id = ${courseId}
                `;

                if (existing.length > 0) {
                    // Update status to active
                    await sql`
                        UPDATE enrollments SET status = 'active'
                        WHERE id = ${existing[0].id}
                    `;
                } else {
                    // Create new enrollment
                    await sql`
                        INSERT INTO enrollments (user_id, course_id, status)
                        VALUES (${userId}, ${courseId}, 'active')
                    `;
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Access granted' })
                };
            }

            if (action === 'revoke_access') {
                await sql`
                    UPDATE enrollments SET status = 'revoked'
                    WHERE user_id = ${userId} AND course_id = ${courseId}
                `;

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Access revoked' })
                };
            }

            // SOFT DELETE - Disable user instead of deleting
            if (action === 'disable_user' && userId) {
                const result = await softDeleteUser(sql, userId);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(result)
                };
            }

            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid action' })
            };
        }

        // DELETE - BLOCKED for user safety
        if (event.httpMethod === 'DELETE') {
            const params = event.queryStringParameters || {};

            // Block ALL delete attempts on users
            console.error('🚫 DELETE attempt blocked on admin-customers endpoint');
            console.error('User ID:', params.id || params.userId);
            console.error('Admin:', admin.email);

            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({
                    error: 'User deletion is not permitted via API',
                    message: 'Users can only be deleted manually from the admin dashboard. ' +
                             'Use the "disable_user" action to soft-delete a user instead.',
                    blocked: true
                })
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (error) {
        console.error('Customers error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Operation failed' })
        };
    }
};
