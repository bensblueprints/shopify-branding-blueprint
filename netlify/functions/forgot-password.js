// Forgot Password - Send reset link for both admin and users
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const sql = neon(process.env.DATABASE_URL);

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
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { email, type } = JSON.parse(event.body);

        if (!email) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email required' }) };
        }

        const normalizedEmail = email.toLowerCase().trim();
        const isAdmin = type === 'admin';

        // Find the user/admin
        let user = null;
        let userId = null;

        if (isAdmin) {
            const admins = await sql`
                SELECT id, email, full_name FROM admin_users
                WHERE email = ${normalizedEmail} AND is_active = true
            `;
            if (admins.length > 0) {
                user = admins[0];
                userId = user.id;
            }
        } else {
            const users = await sql`
                SELECT id, email, full_name FROM users WHERE email = ${normalizedEmail}
            `;
            if (users.length > 0) {
                user = users[0];
                userId = user.id;
            }
        }

        // Always return success to not reveal if account exists
        if (!user) {
            console.log('No account found for:', normalizedEmail, 'type:', type);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'If an account exists, a reset link has been sent.' })
            };
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store reset token
        await sql`
            INSERT INTO auth_tokens (user_id, email, token, token_type, expires_at)
            VALUES (${userId}, ${normalizedEmail}, ${resetToken}, ${isAdmin ? 'admin_password_reset' : 'password_reset'}, ${expiresAt.toISOString()})
        `;

        // Build reset URL
        const siteUrl = process.env.URL || 'https://shopifycourse.advancedmarketing.co';
        const resetPath = isAdmin ? '/admin/reset-password.html' : '/portal/reset-password.html';
        const resetUrl = `${siteUrl}${resetPath}?token=${resetToken}`;

        // Send email via Resend
        if (process.env.RESEND_API_KEY) {
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);

            await resend.emails.send({
                from: 'Shopify Branding Blueprint <noreply@advancedmarketing.co>',
                to: normalizedEmail,
                subject: 'Reset Your Password',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; padding: 40px; border-radius: 12px;">
                        <h2 style="color: #d4a853; margin-bottom: 24px;">Reset Your Password</h2>
                        <p style="color: #ffffff; margin-bottom: 16px;">Hello ${user.full_name || 'there'},</p>
                        <p style="color: #a0a0a0; margin-bottom: 24px;">You requested a password reset for your ${isAdmin ? 'admin ' : ''}account. Click the button below to set a new password:</p>
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4a853, #b8923f); color: #000; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Reset Password</a>
                        </div>
                        <p style="color: #666; font-size: 14px; margin-top: 32px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;">
                        <p style="color: #666; font-size: 12px;">Shopify Branding Blueprint</p>
                    </div>
                `
            });

            console.log('Password reset email sent to:', normalizedEmail);
        } else {
            console.log('No RESEND_API_KEY - reset URL:', resetUrl);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'If an account exists, a reset link has been sent.' })
        };

    } catch (error) {
        console.error('Forgot password error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to process request' })
        };
    }
};
