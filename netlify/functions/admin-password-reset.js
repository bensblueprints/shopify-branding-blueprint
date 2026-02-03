// Admin Send Password Reset with Neon database
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const sql = neon(process.env.DATABASE_URL);

async function validateAdminSession(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const sessionToken = authHeader.replace('Bearer ', '');

    const sessions = await sql`
        SELECT s.*, a.id as admin_id, a.email, a.full_name, a.role
        FROM sessions s
        JOIN admin_users a ON s.admin_id = a.id
        WHERE s.session_token = ${sessionToken}
        AND s.expires_at > NOW()
        AND s.admin_id IS NOT NULL
    `;

    if (sessions.length === 0) return null;
    return {
        id: sessions[0].admin_id,
        email: sessions[0].email,
        full_name: sessions[0].full_name,
        role: sessions[0].role
    };
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

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const authHeader = event.headers.authorization || event.headers.Authorization;
        const admin = await validateAdminSession(authHeader);

        if (!admin) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        const { email } = JSON.parse(event.body);

        if (!email) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email required' }) };
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Find the user
        const users = await sql`
            SELECT id, email, full_name FROM users WHERE email = ${normalizedEmail}
        `;

        if (users.length === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };
        }

        const user = users[0];

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store reset token
        await sql`
            INSERT INTO auth_tokens (user_id, email, token, token_type, expires_at)
            VALUES (${user.id}, ${normalizedEmail}, ${resetToken}, 'password_reset', ${expiresAt.toISOString()})
        `;

        // Send email via Resend if available
        const siteUrl = process.env.URL || 'https://shopifycourse.advancedmarketing.co';
        const resetUrl = `${siteUrl}/portal/reset-password.html?token=${resetToken}`;

        if (process.env.RESEND_API_KEY) {
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);

            await resend.emails.send({
                from: 'Shopify Branding Blueprint <noreply@advancedmarketing.co>',
                to: normalizedEmail,
                subject: 'Reset Your Password',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #d4a853;">Reset Your Password</h2>
                        <p>Hello ${user.full_name || 'there'},</p>
                        <p>A password reset was requested for your account. Click the button below to set a new password:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background: #d4a853; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
                        </div>
                        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours. If you didn't request this, you can ignore this email.</p>
                    </div>
                `
            });
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Password reset email sent', resetUrl })
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
