// Portal course detail with Neon database
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function validateUserSession(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const sessionToken = authHeader.replace('Bearer ', '');

    // Note: sessions.user_id is UUID, users.id is TEXT - need to cast
    const sessions = await sql`
        SELECT s.*, u.id as user_id, u.email, u.full_name
        FROM sessions s
        JOIN users u ON s.user_id::text = u.id
        WHERE s.session_token = ${sessionToken}
        AND s.expires_at > NOW()
        AND s.user_id IS NOT NULL
    `;

    if (sessions.length === 0) return null;
    return {
        id: sessions[0].user_id,
        email: sessions[0].email,
        full_name: sessions[0].full_name
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
    const user = await validateUserSession(authHeader);

    if (!user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    try {
        const params = event.queryStringParameters || {};
        const { slug } = params;

        if (!slug) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Course slug required' })
            };
        }

        // Get course (status column instead of is_published)
        const courses = await sql`
            SELECT * FROM courses
            WHERE slug = ${slug}
        `;

        if (courses.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Course not found' })
            };
        }

        const course = courses[0];

        // Check enrollment
        const enrollments = await sql`
            SELECT * FROM enrollments
            WHERE user_id = ${user.id}
            AND course_id = ${course.id}
            AND status = 'active'
        `;

        if (enrollments.length === 0) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Not enrolled in this course' })
            };
        }

        const enrollment = enrollments[0];

        // Get modules (no is_published column)
        const modules = await sql`
            SELECT * FROM modules
            WHERE course_id = ${course.id}
            ORDER BY sort_order ASC
        `;

        // Get lessons for each module (adjusted column names)
        for (const module of modules) {
            const lessons = await sql`
                SELECT id, title, description, video_duration as duration_minutes, sort_order
                FROM lessons
                WHERE module_id = ${module.id}
                ORDER BY sort_order ASC
            `;
            module.lessons = lessons;
        }

        // Get lesson progress for this user
        // lesson_progress has video_progress instead of progress_percent
        const progressData = await sql`
            SELECT lesson_id, is_completed, video_progress
            FROM lesson_progress
            WHERE user_id = ${user.id}::uuid
        `;

        const progressMap = {};
        (progressData || []).forEach(p => {
            progressMap[p.lesson_id] = {
                is_completed: p.is_completed,
                progress_percent: p.video_progress || 0
            };
        });

        // Add progress to lessons
        modules.forEach(module => {
            module.lessons.forEach(lesson => {
                lesson.progress = progressMap[lesson.id] || {
                    is_completed: false,
                    progress_percent: 0
                };
            });
        });

        // Calculate overall progress (no is_published column)
        const [totalResult] = await sql`
            SELECT COUNT(*) as total
            FROM lessons l
            JOIN modules m ON l.module_id = m.id
            WHERE m.course_id = ${course.id}
        `;

        const [completedResult] = await sql`
            SELECT COUNT(*) as completed
            FROM lesson_progress lp
            JOIN lessons l ON lp.lesson_id = l.id
            JOIN modules m ON l.module_id = m.id
            WHERE lp.user_id = ${user.id}::uuid
            AND m.course_id = ${course.id}
            AND lp.is_completed = true
        `;

        const totalLessons = parseInt(totalResult.total) || 0;
        const completedLessons = parseInt(completedResult.completed) || 0;
        const progressPercent = totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                course: {
                    ...course,
                    modules
                },
                enrollment,
                progress: {
                    total_lessons: totalLessons,
                    completed_lessons: completedLessons,
                    progress_percent: progressPercent
                }
            })
        };

    } catch (error) {
        console.error('Course detail error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to load course' })
        };
    }
};
