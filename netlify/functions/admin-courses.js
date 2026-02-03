// Admin courses with Neon database
//
// ⚠️  IMPORTANT: Course deletion is BLOCKED via API.
// ⚠️  Courses can ONLY be deleted manually from the admin dashboard.
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
        // GET - List courses or get single course
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};

            if (params.id) {
                // Get single course
                const courses = await sql`
                    SELECT * FROM courses WHERE id = ${params.id}
                `;

                if (courses.length === 0) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ error: 'Course not found' })
                    };
                }

                const course = courses[0];

                // Get modules with lessons
                const modules = await sql`
                    SELECT * FROM modules
                    WHERE course_id = ${params.id}
                    ORDER BY sort_order ASC
                `;

                for (const module of modules) {
                    const lessons = await sql`
                        SELECT * FROM lessons
                        WHERE module_id = ${module.id}
                        ORDER BY sort_order ASC
                    `;
                    // Add aliased fields for UI compatibility
                    module.lessons = lessons.map(lesson => ({
                        ...lesson,
                        content_html: lesson.content,
                        duration_minutes: lesson.video_duration,
                        video_provider: lesson.video_id ? 'youtube' : null
                    }));
                }

                course.modules = modules;
                return { statusCode: 200, headers, body: JSON.stringify(course) };
            }

            // List all courses
            const courses = await sql`
                SELECT c.*,
                    (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as module_count
                FROM courses c
                ORDER BY created_at DESC
            `;

            return { statusCode: 200, headers, body: JSON.stringify(courses) };
        }

        // POST - Create, update, or delete
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { action, id, title, subtitle, description, thumbnail_url, price_cents, is_published } = body;

            if (action === 'create') {
                // Generate slug
                const slug = title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');

                // Note: Using actual columns from courses table
                const newCourses = await sql`
                    INSERT INTO courses (id, slug, title, description, thumbnail_url, status, created_at, updated_at)
                    VALUES (gen_random_uuid(), ${slug}, ${title}, ${description || null}, ${thumbnail_url || null}, 'ACTIVE', NOW(), NOW())
                    RETURNING *
                `;

                const newCourse = newCourses[0];

                // AUTO-ENROLL ben@justfeatured.com in new courses
                try {
                    const benUsers = await sql`SELECT id FROM users WHERE email = 'ben@justfeatured.com'`;
                    if (benUsers.length > 0) {
                        await sql`
                            INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at)
                            VALUES (gen_random_uuid(), ${benUsers[0].id}::uuid, ${newCourse.id}, 'active', NOW())
                            ON CONFLICT (user_id, course_id) DO UPDATE SET status = 'active'
                        `;
                        console.log('Auto-enrolled ben@justfeatured.com in new course:', newCourse.title);
                    }
                } catch (enrollError) {
                    console.error('Failed to auto-enroll ben:', enrollError.message);
                }

                return { statusCode: 201, headers, body: JSON.stringify(newCourse) };
            }

            if (action === 'update' && id) {
                // Note: Using actual columns from courses table
                const updated = await sql`
                    UPDATE courses
                    SET title = COALESCE(${title}, title),
                        description = COALESCE(${description}, description),
                        thumbnail_url = COALESCE(${thumbnail_url}, thumbnail_url),
                        updated_at = NOW()
                    WHERE id = ${id}
                    RETURNING *
                `;

                return { statusCode: 200, headers, body: JSON.stringify(updated[0]) };
            }

            // DELETE ACTION - BLOCKED
            // Courses can ONLY be deleted manually from admin dashboard
            if (action === 'delete' && id) {
                console.error('🚫 BLOCKED: Course deletion attempt via API');
                console.error('Course ID:', id);
                console.error('Admin:', admin.email);

                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({
                        error: 'Course deletion is not permitted via API',
                        message: 'Courses can only be deleted manually from the admin dashboard. ' +
                                 'Use "is_published: false" to hide a course instead.',
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
        console.error('Courses error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Operation failed' })
        };
    }
};
