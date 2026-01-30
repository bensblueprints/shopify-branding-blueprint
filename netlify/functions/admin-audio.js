// Admin audio with Neon database
// Note: Audio upload/storage functionality requires external storage solution
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
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    try {
        const authHeader = event.headers.authorization || event.headers.Authorization;
        const admin = await validateAdminSession(authHeader);

        if (!admin) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }

        const body = event.httpMethod === 'GET' ? {} : JSON.parse(event.body || '{}');
        const { action, lessonId, audioData, filename } = body;

        // GET - Fetch audio for a lesson
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};
            const lessonIdParam = params.lessonId;

            if (!lessonIdParam) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'lessonId required' })
                };
            }

            const lessons = await sql`
                SELECT id, title, audio_url
                FROM lessons
                WHERE id = ${lessonIdParam}
            `;

            if (lessons.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Lesson not found' })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(lessons[0])
            };
        }

        // POST - Upload audio (simplified - stores URL only)
        if (action === 'upload') {
            if (!lessonId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'lessonId required' })
                };
            }

            // For now, we'll just update the audio_url field
            // Actual file storage would need a separate service like S3, Cloudinary, etc.
            const audioUrl = body.audio_url || null;

            const lessons = await sql`
                UPDATE lessons
                SET audio_url = ${audioUrl}
                WHERE id = ${lessonId}
                RETURNING *
            `;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    audio_url: audioUrl,
                    lesson: lessons[0]
                })
            };
        }

        // DELETE - Remove audio
        if (action === 'delete') {
            if (!lessonId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'lessonId required' })
                };
            }

            const lessons = await sql`
                UPDATE lessons
                SET audio_url = NULL
                WHERE id = ${lessonId}
                RETURNING *
            `;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, lesson: lessons[0] })
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action' })
        };

    } catch (error) {
        console.error('Admin audio error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
