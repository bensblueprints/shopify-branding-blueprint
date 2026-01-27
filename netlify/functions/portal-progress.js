const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function validateUserSession(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const sessionToken = authHeader.replace('Bearer ', '');

    const { data: session } = await supabase
        .from('sessions')
        .select('*, users(*)')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .not('user_id', 'is', null)
        .single();

    return session?.users || null;
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

        // Get lesson to find enrollment
        const { data: lesson } = await supabase
            .from('lessons')
            .select('*, modules(course_id)')
            .eq('id', lessonId)
            .single();

        if (!lesson) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Lesson not found' })
            };
        }

        // Get enrollment
        const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', lesson.modules.course_id)
            .eq('status', 'active')
            .single();

        if (!enrollment) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Not enrolled in this course' })
            };
        }

        // Build update data
        const updateData = {
            updated_at: new Date().toISOString()
        };

        if (typeof progress_percent === 'number') {
            updateData.progress_percent = Math.min(100, Math.max(0, progress_percent));
        }

        if (typeof watch_time_seconds === 'number') {
            updateData.watch_time_seconds = watch_time_seconds;
        }

        if (typeof last_position_seconds === 'number') {
            updateData.last_position_seconds = last_position_seconds;
        }

        if (is_completed === true) {
            updateData.is_completed = true;
            updateData.completed_at = new Date().toISOString();
            updateData.progress_percent = 100;
        }

        // Upsert progress
        const { data: progress, error } = await supabase
            .from('lesson_progress')
            .upsert({
                user_id: user.id,
                lesson_id: lessonId,
                enrollment_id: enrollment.id,
                ...updateData
            }, {
                onConflict: 'user_id,lesson_id'
            })
            .select()
            .single();

        if (error) throw error;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, progress })
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
