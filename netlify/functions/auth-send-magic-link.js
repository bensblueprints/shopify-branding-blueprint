// Magic link sender with Neon database (deprecated - use password login instead)
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

        // Check if user exists in users table first
        let users = await sql`
            SELECT id, email FROM users WHERE email = ${normalizedEmail}
        `;
        let user = users[0];

        // If not in users table, check customers table (purchases)
        if (!user) {
            const customers = await sql`
                SELECT id, email, full_name FROM customers WHERE email = ${normalizedEmail}
            `;

            if (customers.length > 0) {
                // Create a user record from customer
                const customer = customers[0];
                const newUsers = await sql`
                    INSERT INTO users (email, full_name)
                    VALUES (${normalizedEmail}, ${customer.full_name})
                    RETURNING *
                `;
                user = newUsers[0];
            }
        }

        if (!user) {
            console.log('No user or customer found for:', normalizedEmail);
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

        console.log('Found user:', user.email);

        // Generate magic link token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        // Store token in database
        await sql`
            INSERT INTO auth_tokens (user_id, email, token, token_type, expires_at)
            VALUES (${user.id}, ${normalizedEmail}, ${token}, 'magic_link', ${expiresAt.toISOString()})
        `;

        // Build magic link URL
        const siteUrl = process.env.URL || 'https://shopifycourse.advancedmarketing.co';
        const magicLink = `${siteUrl}/portal/login.html?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

        // Send email via Resend if available
        if (process.env.RESEND_API_KEY) {
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);

            console.log('Sending magic link email to:', normalizedEmail);
            await resend.emails.send({
                from: 'Shopify Branding Blueprint <noreply@advancedmarketing.co>',
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
        }

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
