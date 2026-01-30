// Portal courses with Neon database
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
        // Get user's enrolled courses
        const enrollments = await sql`
            SELECT e.*, c.id as course_id, c.slug, c.title, c.subtitle,
                   c.thumbnail_url, c.lesson_count, c.total_duration_minutes
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.user_id = ${user.id}
            AND e.status = 'active'
        `;

        // Calculate progress for each course
        const coursesWithProgress = await Promise.all(
            enrollments.map(async (enrollment) => {
                // Get total lessons for course
                const [totalResult] = await sql`
                    SELECT COUNT(*) as total
                    FROM lessons l
                    JOIN modules m ON l.module_id = m.id
                    WHERE m.course_id = ${enrollment.course_id}
                    AND l.is_published = true
                `;

                // Get completed lessons for user
                const [completedResult] = await sql`
                    SELECT COUNT(*) as completed
                    FROM lesson_progress lp
                    JOIN lessons l ON lp.lesson_id = l.id
                    JOIN modules m ON l.module_id = m.id
                    WHERE lp.user_id = ${user.id}
                    AND m.course_id = ${enrollment.course_id}
                    AND lp.is_completed = true
                `;

                const totalLessons = parseInt(totalResult.total) || 0;
                const completedLessons = parseInt(completedResult.completed) || 0;
                const progressPercent = totalLessons > 0
                    ? Math.round((completedLessons / totalLessons) * 100)
                    : 0;

                return {
                    id: enrollment.course_id,
                    slug: enrollment.slug,
                    title: enrollment.title,
                    subtitle: enrollment.subtitle,
                    thumbnail_url: enrollment.thumbnail_url,
                    lesson_count: enrollment.lesson_count,
                    total_duration_minutes: enrollment.total_duration_minutes,
                    enrollment_id: enrollment.id,
                    enrolled_at: enrollment.enrolled_at,
                    progress: {
                        total_lessons: totalLessons,
                        completed_lessons: completedLessons,
                        progress_percent: progressPercent
                    }
                };
            })
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ courses: coursesWithProgress })
        };

    } catch (error) {
        console.error('Portal courses error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to load courses' })
        };
    }
};
