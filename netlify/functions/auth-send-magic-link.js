const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const crypto = require('crypto');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

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
        const { email } = JSON.parse(event.body);

        if (!email || !email.includes('@')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Valid email required' })
            };
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user exists
        const { data: user } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', normalizedEmail)
            .single();

        if (!user) {
            // Don't reveal if user exists or not for security
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'If an account exists, a login link has been sent.'
                })
            };
        }

        // Generate magic link token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        // Store token in database
        await supabase.from('auth_tokens').insert({
            user_id: user.id,
            email: normalizedEmail,
            token: token,
            token_type: 'magic_link',
            expires_at: expiresAt.toISOString()
        });

        // Build magic link URL
        const siteUrl = process.env.URL || 'http://localhost:8888';
        const magicLink = `${siteUrl}/portal/login.html?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

        // Send email via Resend
        await resend.emails.send({
            from: 'Shopify Branding Blueprint <noreply@advancedmarketingco.com>',
            to: normalizedEmail,
            subject: 'Your Login Link',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #C9A962;">Shopify Branding Blueprint</h2>
                    <p>Click the button below to log in to your account:</p>
                    <a href="${magicLink}" style="display: inline-block; background: #C9A962; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                        Log In to Your Account
                    </a>
                    <p style="margin-top: 20px; color: #666; font-size: 14px;">
                        This link expires in 30 minutes.<br>
                        If you didn't request this, you can safely ignore this email.
                    </p>
                </div>
            `
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'If an account exists, a login link has been sent.'
            })
        };

    } catch (error) {
        console.error('Magic link error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to send login link' })
        };
    }
};
