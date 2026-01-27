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
        // GET - List customers or get single customer
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};

            if (params.id) {
                // Get single customer with enrollments and purchases
                const { data: user, error } = await supabase
                    .from('users')
                    .select(`
                        *,
                        enrollments(*, courses(title, slug)),
                        purchases(*, products(name, product_key))
                    `)
                    .eq('id', params.id)
                    .single();

                if (error) throw error;
                return { statusCode: 200, headers, body: JSON.stringify(user) };
            }

            // List customers with pagination
            const page = parseInt(params.page) || 1;
            const limit = parseInt(params.limit) || 20;
            const offset = (page - 1) * limit;

            const { data: users, error, count } = await supabase
                .from('users')
                .select('*, enrollments(count), purchases(count)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    users,
                    pagination: {
                        page,
                        limit,
                        total: count,
                        totalPages: Math.ceil(count / limit)
                    }
                })
            };
        }

        // POST - Grant or revoke access
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { action, userId, courseId } = body;

            if (action === 'grant_access') {
                // Check if enrollment already exists
                const { data: existing } = await supabase
                    .from('enrollments')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('course_id', courseId)
                    .single();

                if (existing) {
                    // Update status to active
                    await supabase
                        .from('enrollments')
                        .update({ status: 'active' })
                        .eq('id', existing.id);
                } else {
                    // Create new enrollment
                    await supabase.from('enrollments').insert({
                        user_id: userId,
                        course_id: courseId,
                        status: 'active'
                    });
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Access granted' })
                };
            }

            if (action === 'revoke_access') {
                await supabase
                    .from('enrollments')
                    .update({ status: 'revoked' })
                    .eq('user_id', userId)
                    .eq('course_id', courseId);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Access revoked' })
                };
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
        console.error('Customers error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Operation failed' })
        };
    }
};
