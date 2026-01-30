// Portal progress with Neon database
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

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
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
        const body = JSON.parse(event.body);
        const { lessonId, progress_percent, watch_time_seconds, last_position_seconds, is_completed } = body;

        if (!lessonId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Lesson ID required' })
            };
        }

        // Get lesson to find course
        const lessons = await sql`
            SELECT l.*, m.course_id
            FROM lessons l
            JOIN modules m ON l.module_id = m.id
            WHERE l.id = ${lessonId}
        `;

        if (lessons.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Lesson not found' })
            };
        }

        const lesson = lessons[0];

        // Get enrollment
        const enrollments = await sql`
            SELECT id FROM enrollments
            WHERE user_id = ${user.id}
            AND course_id = ${lesson.course_id}
            AND status = 'active'
        `;

        if (enrollments.length === 0) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Not enrolled in this course' })
            };
        }

        // Check if progress exists
        const existingProgress = await sql`
            SELECT * FROM lesson_progress
            WHERE user_id = ${user.id}
            AND lesson_id = ${lessonId}
        `;

        let progress;

        if (existingProgress.length > 0) {
            // Update existing progress
            const updates = [];
            const values = [];

            if (typeof progress_percent === 'number') {
                const clampedPercent = Math.min(100, Math.max(0, progress_percent));
                progress = await sql`
                    UPDATE lesson_progress
                    SET progress_percent = ${clampedPercent}
                    WHERE user_id = ${user.id} AND lesson_id = ${lessonId}
                    RETURNING *
                `;
            }

            if (is_completed === true) {
                progress = await sql`
                    UPDATE lesson_progress
                    SET is_completed = true, completed_at = NOW(), progress_percent = 100
                    WHERE user_id = ${user.id} AND lesson_id = ${lessonId}
                    RETURNING *
                `;
            } else if (progress_percent !== undefined) {
                const clampedPercent = Math.min(100, Math.max(0, progress_percent));
                progress = await sql`
                    UPDATE lesson_progress
                    SET progress_percent = ${clampedPercent}
                    WHERE user_id = ${user.id} AND lesson_id = ${lessonId}
                    RETURNING *
                `;
            } else {
                progress = existingProgress;
            }
        } else {
            // Insert new progress
            const clampedPercent = typeof progress_percent === 'number'
                ? Math.min(100, Math.max(0, progress_percent))
                : 0;

            progress = await sql`
                INSERT INTO lesson_progress (user_id, lesson_id, progress_percent, is_completed, completed_at)
                VALUES (
                    ${user.id},
                    ${lessonId},
                    ${is_completed ? 100 : clampedPercent},
                    ${is_completed || false},
                    ${is_completed ? new Date().toISOString() : null}
                )
                RETURNING *
            `;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, progress: progress[0] || progress })
        };

    } catch (error) {
        console.error('Progress update error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to update progress' })
        };
    }
};
