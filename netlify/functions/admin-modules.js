// Admin modules with Neon database
//
// ⚠️  IMPORTANT: Module deletion is BLOCKED via API.
// ⚠️  Modules can ONLY be deleted manually from the admin dashboard.
//
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
        // GET - List modules for a course
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};

            if (!params.courseId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'courseId required' })
                };
            }

            const modules = await sql`
                SELECT m.*,
                    (SELECT COUNT(*) FROM lessons WHERE module_id = m.id) as lesson_count
                FROM modules m
                WHERE m.course_id = ${params.courseId}
                ORDER BY m.sort_order ASC
            `;

            return { statusCode: 200, headers, body: JSON.stringify(modules) };
        }

        // POST - Create, update, or delete
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { action, id, course_id, title, description, sort_order, is_published } = body;

            if (action === 'create') {
                // Generate slug
                const slug = title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');

                // Get next sort order if not provided
                let finalSortOrder = sort_order;
                if (!finalSortOrder) {
                    const existing = await sql`
                        SELECT sort_order FROM modules
                        WHERE course_id = ${course_id}
                        ORDER BY sort_order DESC
                        LIMIT 1
                    `;
                    finalSortOrder = existing.length ? existing[0].sort_order + 1 : 1;
                }

                const newModules = await sql`
                    INSERT INTO modules (course_id, slug, title, description, sort_order, is_published)
                    VALUES (${course_id}, ${slug}, ${title}, ${description || null}, ${finalSortOrder}, ${is_published !== false})
                    RETURNING *
                `;

                return { statusCode: 201, headers, body: JSON.stringify(newModules[0]) };
            }

            if (action === 'update' && id) {
                const updated = await sql`
                    UPDATE modules
                    SET title = COALESCE(${title}, title),
                        description = COALESCE(${description}, description),
                        sort_order = COALESCE(${sort_order}, sort_order),
                        is_published = COALESCE(${is_published}, is_published)
                    WHERE id = ${id}
                    RETURNING *
                `;

                return { statusCode: 200, headers, body: JSON.stringify(updated[0]) };
            }

            // DELETE ACTION - BLOCKED
            // Modules can ONLY be deleted manually from admin dashboard
            if (action === 'delete' && id) {
                console.error('🚫 BLOCKED: Module deletion attempt via API');
                console.error('Module ID:', id);
                console.error('Admin:', admin.email);

                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({
                        error: 'Module deletion is not permitted via API',
                        message: 'Modules can only be deleted manually from the admin dashboard. ' +
                                 'Use "is_published: false" to hide a module instead.',
                        blocked: true
                    })
                };
            }

            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid action' })
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (error) {
        console.error('Modules error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Operation failed' })
        };
    }
};
