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
        const params = event.queryStringParameters || {};
        const { slug } = params;

        if (!slug) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Course slug required' })
            };
        }

        // Get course
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('*')
            .eq('slug', slug)
            .eq('is_published', true)
            .single();

        if (courseError || !course) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Course not found' })
            };
        }

        // Check enrollment
        const { data: enrollment } = await supabase
            .from('enrollments')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', course.id)
            .eq('status', 'active')
            .single();

        if (!enrollment) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Not enrolled in this course' })
            };
        }

        // Get modules with lessons
        const { data: modules, error: modulesError } = await supabase
            .from('modules')
            .select(`
                *,
                lessons (
                    id,
                    slug,
                    title,
                    description,
                    duration_minutes,
                    is_preview,
                    sort_order
                )
            `)
            .eq('course_id', course.id)
            .eq('is_published', true)
            .order('sort_order', { ascending: true });

        if (modulesError) throw modulesError;

        // Sort lessons within each module
        modules.forEach(module => {
            module.lessons = module.lessons
                .filter(l => l.is_published !== false)
                .sort((a, b) => a.sort_order - b.sort_order);
        });

        // Get lesson progress for this user
        const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('lesson_id, is_completed, progress_percent')
            .eq('user_id', user.id)
            .eq('enrollment_id', enrollment.id);

        const progressMap = {};
        (progressData || []).forEach(p => {
            progressMap[p.lesson_id] = p;
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

        // Calculate overall progress
        const { data: overallProgress } = await supabase.rpc('get_course_progress', {
            p_user_id: user.id,
            p_course_id: course.id
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                course: {
                    ...course,
                    modules
                },
                enrollment,
                progress: overallProgress?.[0] || {
                    total_lessons: 0,
                    completed_lessons: 0,
                    progress_percent: 0
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
