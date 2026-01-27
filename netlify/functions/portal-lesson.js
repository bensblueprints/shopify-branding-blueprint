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
        const { id } = params;

        if (!id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Lesson ID required' })
            };
        }

        // Get lesson with module and course info
        const { data: lesson, error: lessonError } = await supabase
            .from('lessons')
            .select(`
                *,
                modules (
                    id,
                    title,
                    course_id,
                    courses (
                        id,
                        slug,
                        title
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (lessonError || !lesson) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Lesson not found' })
            };
        }

        const courseId = lesson.modules.course_id;

        // Check enrollment
        const { data: enrollment } = await supabase
            .from('enrollments')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .eq('status', 'active')
            .single();

        if (!enrollment) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Not enrolled in this course' })
            };
        }

        // Get or create lesson progress
        let { data: progress } = await supabase
            .from('lesson_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('lesson_id', id)
            .single();

        if (!progress) {
            const { data: newProgress } = await supabase
                .from('lesson_progress')
                .insert({
                    user_id: user.id,
                    lesson_id: id,
                    enrollment_id: enrollment.id
                })
                .select()
                .single();
            progress = newProgress;
        }

        // Get next and previous lessons
        const { data: allLessons } = await supabase
            .from('lessons')
            .select('id, title, sort_order, module_id')
            .eq('module_id', lesson.module_id)
            .order('sort_order', { ascending: true });

        const currentIndex = allLessons.findIndex(l => l.id === id);
        const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
        const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                lesson: {
                    ...lesson,
                    course: lesson.modules.courses,
                    module: {
                        id: lesson.modules.id,
                        title: lesson.modules.title
                    }
                },
                progress,
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
