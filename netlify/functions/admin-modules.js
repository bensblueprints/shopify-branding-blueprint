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
        // GET - List modules for a course
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};

            if (!params.courseId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'courseId required' })
                };
            }

            const { data: modules, error } = await supabase
                .from('modules')
                .select('*, lessons(count)')
                .eq('course_id', params.courseId)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify(modules) };
        }

        // POST - Create, update, or delete
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { action, id, ...moduleData } = body;

            if (action === 'create') {
                // Generate slug if not provided
                if (!moduleData.slug) {
                    moduleData.slug = moduleData.title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');
                }

                // Get next sort order
                if (!moduleData.sort_order) {
                    const { data: existing } = await supabase
                        .from('modules')
                        .select('sort_order')
                        .eq('course_id', moduleData.course_id)
                        .order('sort_order', { ascending: false })
                        .limit(1);

                    moduleData.sort_order = existing?.length ? existing[0].sort_order + 1 : 1;
                }

                const { data, error } = await supabase
                    .from('modules')
                    .insert(moduleData)
                    .select()
                    .single();

                if (error) throw error;
                return { statusCode: 201, headers, body: JSON.stringify(data) };
            }

            if (action === 'update' && id) {
                moduleData.updated_at = new Date().toISOString();

                const { data, error } = await supabase
                    .from('modules')
                    .update(moduleData)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                return { statusCode: 200, headers, body: JSON.stringify(data) };
            }

            if (action === 'delete' && id) {
                const { error } = await supabase
                    .from('modules')
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
        console.error('Modules error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Operation failed' })
        };
    }
};
