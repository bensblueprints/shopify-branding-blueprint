// Admin lessons with Neon database
//
// ⚠️  IMPORTANT: Lesson deletion is BLOCKED via API.
// ⚠️  Lessons can ONLY be deleted manually from the admin dashboard.
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

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url) {
    if (!url) return null;

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
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
        // GET - List lessons or get single lesson
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};

            if (params.id) {
                const lessons = await sql`
                    SELECT l.*, m.title as module_title, m.course_id, c.title as course_title
                    FROM lessons l
                    JOIN modules m ON l.module_id = m.id
                    JOIN courses c ON m.course_id = c.id
                    WHERE l.id = ${params.id}
                `;

                if (lessons.length === 0) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ error: 'Lesson not found' })
                    };
                }

                const lesson = lessons[0];
                lesson.modules = {
                    title: lesson.module_title,
                    course_id: lesson.course_id,
                    courses: { title: lesson.course_title }
                };

                return { statusCode: 200, headers, body: JSON.stringify(lesson) };
            }

            if (params.moduleId) {
                const lessons = await sql`
                    SELECT * FROM lessons
                    WHERE module_id = ${params.moduleId}
                    ORDER BY sort_order ASC
                `;
                return { statusCode: 200, headers, body: JSON.stringify(lessons) };
            }

            // Get all lessons with module info
            const lessons = await sql`
                SELECT l.*, m.title as module_title, m.course_id
                FROM lessons l
                JOIN modules m ON l.module_id = m.id
                ORDER BY l.sort_order ASC
            `;

            return { statusCode: 200, headers, body: JSON.stringify(lessons) };
        }

        // POST - Create, update, or delete
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { action, id, module_id, title, description, video_url, duration_minutes, content_html, is_preview, is_published, sort_order } = body;

            // Extract YouTube video ID if URL provided
            let video_id = null;
            if (video_url) {
                video_id = extractYouTubeId(video_url);
            }

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
                        SELECT sort_order FROM lessons
                        WHERE module_id = ${module_id}
                        ORDER BY sort_order DESC
                        LIMIT 1
                    `;
                    finalSortOrder = existing.length ? existing[0].sort_order + 1 : 1;
                }

                const newLessons = await sql`
                    INSERT INTO lessons (module_id, slug, title, description, video_url, video_id, duration_minutes, content_html, is_preview, is_published, sort_order)
                    VALUES (${module_id}, ${slug}, ${title}, ${description || null}, ${video_url || null}, ${video_id}, ${duration_minutes || 0}, ${content_html || null}, ${is_preview || false}, ${is_published !== false}, ${finalSortOrder})
                    RETURNING *
                `;

                return { statusCode: 201, headers, body: JSON.stringify(newLessons[0]) };
            }

            if (action === 'update' && id) {
                const updated = await sql`
                    UPDATE lessons
                    SET title = COALESCE(${title}, title),
                        description = COALESCE(${description}, description),
                        video_url = COALESCE(${video_url}, video_url),
                        video_id = COALESCE(${video_id}, video_id),
                        duration_minutes = COALESCE(${duration_minutes}, duration_minutes),
                        content_html = COALESCE(${content_html}, content_html),
                        is_preview = COALESCE(${is_preview}, is_preview),
                        is_published = COALESCE(${is_published}, is_published),
                        sort_order = COALESCE(${sort_order}, sort_order)
                    WHERE id = ${id}
                    RETURNING *
                `;

                return { statusCode: 200, headers, body: JSON.stringify(updated[0]) };
            }

            // DELETE ACTION - BLOCKED
            // Lessons can ONLY be deleted manually from admin dashboard
            if (action === 'delete' && id) {
                console.error('🚫 BLOCKED: Lesson deletion attempt via API');
                console.error('Lesson ID:', id);
                console.error('Admin:', admin.email);

                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({
                        error: 'Lesson deletion is not permitted via API',
                        message: 'Lessons can only be deleted manually from the admin dashboard. ' +
                                 'Use "is_published: false" to hide a lesson instead.',
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
        console.error('Lessons error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Operation failed' })
        };
    }
};
