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
        // Get user's enrolled courses with progress
        const { data: enrollments, error } = await supabase
            .from('enrollments')
            .select(`
                *,
                courses (
                    id,
                    slug,
                    title,
                    subtitle,
                    thumbnail_url,
                    instructor_name,
                    lesson_count,
                    total_duration_minutes
                )
            `)
            .eq('user_id', user.id)
            .eq('status', 'active');

        if (error) throw error;

        // Calculate progress for each course
        const coursesWithProgress = await Promise.all(
            enrollments.map(async (enrollment) => {
                const { data: progress } = await supabase.rpc('get_course_progress', {
                    p_user_id: user.id,
                    p_course_id: enrollment.course_id
                });

                return {
                    ...enrollment.courses,
                    enrollment_id: enrollment.id,
                    enrolled_at: enrollment.enrolled_at,
                    progress: progress?.[0] || {
                        total_lessons: 0,
                        completed_lessons: 0,
                        progress_percent: 0
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
