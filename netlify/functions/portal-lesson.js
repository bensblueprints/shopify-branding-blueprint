// Portal lesson with Neon database
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function validateUserSession(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const sessionToken = authHeader.replace('Bearer ', '');

    const sessions = await sql`
        SELECT s.*, u.id as user_id, u.email, u.full_name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
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
        const { id } = params;

        if (!id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Lesson ID required' })
            };
        }

        // Get lesson with module and course info
        const lessons = await sql`
            SELECT l.*, m.id as module_id, m.title as module_title, m.course_id,
                   c.id as course_id, c.slug as course_slug, c.title as course_title
            FROM lessons l
            JOIN modules m ON l.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE l.id = ${id}
        `;

        if (lessons.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Lesson not found' })
            };
        }

        const lesson = lessons[0];
        const courseId = lesson.course_id;

        // Check enrollment
        const enrollments = await sql`
            SELECT * FROM enrollments
            WHERE user_id = ${user.id}
            AND course_id = ${courseId}
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

        // Get or create lesson progress
        let progress = await sql`
            SELECT * FROM lesson_progress
            WHERE user_id = ${user.id}
            AND lesson_id = ${id}
        `;

        if (progress.length === 0) {
            progress = await sql`
                INSERT INTO lesson_progress (user_id, lesson_id)
                VALUES (${user.id}, ${id})
                RETURNING *
            `;
        }

        // Get next and previous lessons
        const allLessons = await sql`
            SELECT id, title, sort_order, module_id
            FROM lessons
            WHERE module_id = ${lesson.module_id}
            ORDER BY sort_order ASC
        `;

        const currentIndex = allLessons.findIndex(l => l.id === id);
        const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
        const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                lesson: {
                    id: lesson.id,
                    slug: lesson.slug,
                    title: lesson.title,
                    description: lesson.description,
                    video_url: lesson.video_url,
                    video_id: lesson.video_id,
                    duration_minutes: lesson.duration_minutes,
                    content_html: lesson.content_html,
                    is_preview: lesson.is_preview,
                    sort_order: lesson.sort_order,
                    course: {
                        id: lesson.course_id,
                        slug: lesson.course_slug,
                        title: lesson.course_title
                    },
                    module: {
                        id: lesson.module_id,
                        title: lesson.module_title
                    }
                },
                progress: progress[0] || null,
                navigation: {
                    prev: prevLesson,
                    next: nextLesson
                }
            })
        };

    } catch (error) {
        console.error('Lesson error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to load lesson' })
        };
    }
};
