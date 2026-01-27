const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function validateAdminSession(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const sessionToken = authHeader.replace('Bearer ', '');

    const { data: session } = await supabase
        .from('sessions')
        .select('*, admin_users(*)')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .not('admin_id', 'is', null)
        .single();

    return session?.admin_users || null;
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url) {
    if (!url) return null;

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
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
        // GET - List lessons or get single lesson
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};

            if (params.id) {
                const { data: lesson, error } = await supabase
                    .from('lessons')
                    .select('*, modules(title, course_id, courses(title))')
                    .eq('id', params.id)
                    .single();

                if (error) throw error;
                return { statusCode: 200, headers, body: JSON.stringify(lesson) };
            }

            if (params.moduleId) {
                const { data: lessons, error } = await supabase
                    .from('lessons')
                    .select('*')
                    .eq('module_id', params.moduleId)
                    .order('sort_order', { ascending: true });

                if (error) throw error;
                return { statusCode: 200, headers, body: JSON.stringify(lessons) };
            }

            // Get all lessons with module info
            const { data: lessons, error } = await supabase
                .from('lessons')
                .select('*, modules(title, course_id)')
                .order('sort_order', { ascending: true });

            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify(lessons) };
        }

        // POST - Create, update, or delete
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { action, id, ...lessonData } = body;

            // Extract YouTube video ID if URL provided
            if (lessonData.video_url) {
                const videoId = extractYouTubeId(lessonData.video_url);
                if (videoId) {
                    lessonData.video_id = videoId;
                    lessonData.video_provider = 'youtube';
                }
            }

            if (action === 'create') {
                // Generate slug if not provided
                if (!lessonData.slug) {
                    lessonData.slug = lessonData.title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');
                }

                // Get next sort order
                if (!lessonData.sort_order) {
                    const { data: existing } = await supabase
                        .from('lessons')
                        .select('sort_order')
                        .eq('module_id', lessonData.module_id)
                        .order('sort_order', { ascending: false })
                        .limit(1);

                    lessonData.sort_order = existing?.length ? existing[0].sort_order + 1 : 1;
                }

                const { data, error } = await supabase
                    .from('lessons')
                    .insert(lessonData)
                    .select()
                    .single();

                if (error) throw error;
                return { statusCode: 201, headers, body: JSON.stringify(data) };
            }

            if (action === 'update' && id) {
                lessonData.updated_at = new Date().toISOString();

                const { data, error } = await supabase
                    .from('lessons')
                    .update(lessonData)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                return { statusCode: 200, headers, body: JSON.stringify(data) };
            }

            if (action === 'delete' && id) {
                const { error } = await supabase
                    .from('lessons')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
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
        console.error('Lessons error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Operation failed' })
        };
    }
};
