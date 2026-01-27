const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Verify admin session
async function verifyAdmin(token) {
    if (!token) return null;

    const { data: session } = await supabase
        .from('sessions')
        .select('*, admin_users(*)')
        .eq('session_token', token)
        .eq('is_valid', true)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (!session || !session.admin_users) return null;
    return session.admin_users;
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
        // Verify admin
        const authHeader = event.headers.authorization || event.headers.Authorization;
        const token = authHeader?.replace('Bearer ', '');
        const admin = await verifyAdmin(token);

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

            const { data: lesson, error } = await supabase
                .from('lessons')
                .select('id, title, audio_url')
                .eq('id', lessonIdParam)
                .single();

            if (error) throw error;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(lesson)
            };
        }

        // POST - Upload audio
        if (action === 'upload') {
            if (!lessonId || !audioData) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'lessonId and audioData required' })
                };
            }

            // Decode base64 audio data
            const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            // Generate filename
            const ext = 'webm';
            const filePath = `lesson-audio/${lessonId}.${ext}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('audio')
                .upload(filePath, buffer, {
                    contentType: 'audio/webm',
                    upsert: true
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw uploadError;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('audio')
                .getPublicUrl(filePath);

            // Update lesson with audio URL
            const { data: lesson, error: updateError } = await supabase
                .from('lessons')
                .update({
                    audio_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', lessonId)
                .select()
                .single();

            if (updateError) throw updateError;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    audio_url: publicUrl,
                    lesson
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

            // Delete from storage
            const filePath = `lesson-audio/${lessonId}.webm`;
            await supabase.storage.from('audio').remove([filePath]);

            // Update lesson
            const { data: lesson, error } = await supabase
                .from('lessons')
                .update({
                    audio_url: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', lessonId)
                .select()
                .single();

            if (error) throw error;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, lesson })
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
