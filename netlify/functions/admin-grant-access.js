// Admin Grant Course Access
const { createClient } = require('@supabase/supabase-js');

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
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        // Verify admin session from Authorization header
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        const token = authHeader.substring(7);
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Verify admin session
        const { data: session, error: sessionError } = await supabase
            .from('admin_sessions')
            .select('*, admins(*)')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (sessionError || !session) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired session' }) };
        }

        const { userId, courseId } = JSON.parse(event.body);

        if (!userId || !courseId) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'User ID and Course ID required' }) };
        }

        // Check if enrollment already exists
        const { data: existing } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .single();

        if (existing) {
            // Update existing enrollment to active
            await supabase
                .from('enrollments')
                .update({ status: 'active', updated_at: new Date().toISOString() })
                .eq('id', existing.id);
        } else {
            // Create new enrollment
            const { error: insertError } = await supabase
                .from('enrollments')
                .insert({
                    user_id: userId,
                    course_id: courseId,
                    status: 'active',
                    enrolled_at: new Date().toISOString(),
                    granted_by: session.admin_id
                });

            if (insertError) {
                throw insertError;
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Course access granted' })
        };

    } catch (error) {
        console.error('Grant access error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to grant access' })
        };
    }
};
