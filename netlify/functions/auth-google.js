// Google OAuth Authentication
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const sql = neon(process.env.DATABASE_URL);

// Verify Google ID token
async function verifyGoogleToken(idToken) {
    const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    if (!response.ok) {
        throw new Error('Invalid Google token');
    }

    const payload = await response.json();

    // Verify the token is for our app
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        throw new Error('Token not intended for this app');
    }

    return {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub,
        emailVerified: payload.email_verified === 'true'
    };
}

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
        const { credential } = JSON.parse(event.body);

        if (!credential) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Google credential required' })
            };
        }

        // Verify the Google token
        const googleUser = await verifyGoogleToken(credential);
        const normalizedEmail = googleUser.email.toLowerCase().trim();

        console.log('Google login for:', normalizedEmail);

        // Check if user exists
        let users = await sql`
            SELECT * FROM users WHERE email = ${normalizedEmail}
        `;

        let user = users[0];

        if (!user) {
            // Check if they have a customer record (purchased something)
            const customers = await sql`
                SELECT * FROM customers WHERE email = ${normalizedEmail}
            `;

            if (customers.length > 0) {
                // Create user from customer
                const names = googleUser.name?.split(' ') || ['', ''];
                const firstName = names[0] || '';
                const lastName = names.slice(1).join(' ') || '';

                users = await sql`
                    INSERT INTO users (
                        id, email, first_name, last_name, full_name,
                        google_id, avatar_url, role, permissions,
                        two_factor_enabled, login_count, status,
                        created_at, updated_at
                    )
                    VALUES (
                        gen_random_uuid()::text,
                        ${normalizedEmail},
                        ${firstName},
                        ${lastName},
                        ${googleUser.name || normalizedEmail},
                        ${googleUser.googleId},
                        ${googleUser.picture},
                        'STAFF',
                        '{}',
                        false,
                        1,
                        'ACTIVE',
                        NOW(),
                        NOW()
                    )
                    RETURNING *
                `;
                user = users[0];
                console.log('Created user from customer:', user.email);
            } else {
                // No purchase record - check if this is ben (always allow)
                if (normalizedEmail === 'ben@justfeatured.com') {
                    // Ben gets auto-created
                    const names = googleUser.name?.split(' ') || ['Ben', ''];
                    users = await sql`
                        INSERT INTO users (
                            id, email, first_name, last_name, full_name,
                            google_id, avatar_url, role, permissions,
                            two_factor_enabled, login_count, status,
                            created_at, updated_at
                        )
                        VALUES (
                            gen_random_uuid()::text,
                            ${normalizedEmail},
                            ${names[0]},
                            ${names.slice(1).join(' ')},
                            ${googleUser.name || 'Ben'},
                            ${googleUser.googleId},
                            ${googleUser.picture},
                            'OWNER',
                            '{}',
                            false,
                            1,
                            'ACTIVE',
                            NOW(),
                            NOW()
                        )
                        RETURNING *
                    `;
                    user = users[0];
                } else {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({
                            error: 'No account found. Please purchase to get access.',
                            needsPurchase: true
                        })
                    };
                }
            }
        } else {
            // Update existing user with Google info
            await sql`
                UPDATE users
                SET google_id = ${googleUser.googleId},
                    avatar_url = COALESCE(${googleUser.picture}, avatar_url),
                    login_count = login_count + 1,
                    last_login_at = NOW(),
                    updated_at = NOW()
                WHERE id = ${user.id}
            `;
        }

        // Create session
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const rawIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '';
        const ipAddress = rawIp.split(',')[0].trim().substring(0, 100);
        const userAgent = (event.headers['user-agent'] || '').substring(0, 500);

        await sql`
            INSERT INTO sessions (id, user_id, session_token, expires_at, ip_address, user_agent, created_at)
            VALUES (gen_random_uuid(), ${user.id}::uuid, ${sessionToken}, ${expiresAt.toISOString()}, ${ipAddress}, ${userAgent}, NOW())
        `;

        // Auto-enroll ben in all courses
        if (normalizedEmail === 'ben@justfeatured.com') {
            try {
                const courses = await sql`SELECT id FROM courses`;
                for (const course of courses) {
                    await sql`
                        INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at)
                        VALUES (gen_random_uuid(), ${user.id}::uuid, ${course.id}, 'active', NOW())
                        ON CONFLICT (user_id, course_id) DO UPDATE SET status = 'active'
                    `;
                }
            } catch (e) {
                console.log('Auto-enroll note:', e.message);
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                session_token: sessionToken,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name || googleUser.name,
                    avatar_url: user.avatar_url || googleUser.picture
                }
            })
        };

    } catch (error) {
        console.error('Google auth error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Authentication failed: ' + error.message })
        };
    }
};
