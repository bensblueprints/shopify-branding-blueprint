// Admin Send Password Reset
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

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
        // Verify admin session
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

        const { email } = JSON.parse(event.body);

        if (!email) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email required' }) };
        }

        // Find the user
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('email', email)
            .single();

        if (userError || !user) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };
        }

        // Generate reset token
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store reset token
        await supabase.from('password_resets').insert({
            user_id: user.id,
            token: resetToken,
            expires_at: expiresAt.toISOString(),
            created_by: session.admin_id
        });

        // Send email
        const siteUrl = process.env.URL || 'http://localhost:8888';
        const resetUrl = `${siteUrl}/portal/reset-password.html?token=${resetToken}`;

        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
            from: 'Shopify Branding Blueprint <noreply@justfeatured.com>',
            to: email,
            subject: 'Reset Your Password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #d4a853;">Reset Your Password</h2>
                    <p>Hello ${user.full_name || 'there'},</p>
                    <p>An administrator has requested a password reset for your account. Click the button below to set a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background: #d4a853; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">This link will expire in 24 hours. If you didn't request this, you can ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">Shopify Branding Blueprint</p>
                </div>
            `
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Password reset email sent' })
        };

    } catch (error) {
        console.error('Password reset error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to send password reset' })
        };
    }
};
