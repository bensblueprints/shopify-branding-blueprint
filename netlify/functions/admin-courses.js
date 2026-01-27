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
        // GET - List courses or get single course
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};

            if (params.id) {
                // Get single course with modules
                const { data: course, error } = await supabase
                    .from('courses')
                    .select('*, modules(*, lessons(*))')
                    .eq('id', params.id)
                    .single();

                if (error) throw error;
                return { statusCode: 200, headers, body: JSON.stringify(course) };
            }

            // List all courses
            const { data: courses, error } = await supabase
                .from('courses')
                .select('*, modules(count)')
                .order('sort_order', { ascending: true });

            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify(courses) };
        }

        // POST - Create, update, or delete
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { action, id, ...courseData } = body;

            if (action === 'create') {
                // Generate slug if not provided
                if (!courseData.slug) {
                    courseData.slug = courseData.title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');
                }

                const { data, error } = await supabase
                    .from('courses')
                    .insert(courseData)
                    .select()
                    .single();

                if (error) throw error;
                return { statusCode: 201, headers, body: JSON.stringify(data) };
            }

            if (action === 'update' && id) {
                courseData.updated_at = new Date().toISOString();

                const { data, error } = await supabase
                    .from('courses')
                    .update(courseData)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                return { statusCode: 200, headers, body: JSON.stringify(data) };
            }

            if (action === 'delete' && id) {
                const { error } = await supabase
                    .from('courses')
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
        console.error('Courses error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Operation failed' })
        };
    }
};
