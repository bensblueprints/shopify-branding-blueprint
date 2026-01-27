const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
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

    try {
        const { email, password } = JSON.parse(event.body);

        if (!email || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email and password required' })
            };
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Get admin user
        const { data: admin, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', normalizedEmail)
            .eq('is_active', true)
            .single();

        if (adminError || !admin) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Invalid credentials' })
            };
        }

        // Check if password is set
        if (!admin.password_hash) {
            // First login - set the password
            const hashedPassword = await bcrypt.hash(password, 10);
            await supabase
                .from('admin_users')
                .update({ password_hash: hashedPassword })
                .eq('id', admin.id);
        } else {
            // Verify password
            const validPassword = await bcrypt.compare(password, admin.password_hash);
            if (!validPassword) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid credentials' })
                };
            }
        }

        // Update last login
        await supabase
            .from('admin_users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', admin.id);

        // Create session
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await supabase.from('sessions').insert({
            admin_id: admin.id,
            session_token: sessionToken,
            expires_at: expiresAt.toISOString(),
            ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip'],
            user_agent: event.headers['user-agent']
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                session_token: sessionToken,
                admin: {
                    id: admin.id,
                    email: admin.email,
                    full_name: admin.full_name,
                    role: admin.role
                }
            })
        };

    } catch (error) {
        console.error('Admin login error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Login failed' })
        };
    }
};
