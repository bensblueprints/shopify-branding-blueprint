// Admin login with Neon database
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
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
        const admins = await sql`
            SELECT * FROM admin_users
            WHERE email = ${normalizedEmail} AND is_active = true
        `;

        if (admins.length === 0) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Invalid credentials' })
            };
        }

        const admin = admins[0];

        // Check if password is set
        if (!admin.password_hash) {
            // First login - set the password
            const hashedPassword = await bcrypt.hash(password, 10);
            await sql`
                UPDATE admin_users
                SET password_hash = ${hashedPassword}
                WHERE id = ${admin.id}
            `;
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
        await sql`
            UPDATE admin_users
            SET last_login_at = NOW()
            WHERE id = ${admin.id}
        `;

        // Create session
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Get first IP from forwarded list
        const rawIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '';
        const ipAddress = rawIp.split(',')[0].trim().substring(0, 100);
        const userAgent = (event.headers['user-agent'] || '').substring(0, 500);

        await sql`
            INSERT INTO sessions (admin_id, session_token, expires_at, ip_address, user_agent)
            VALUES (${admin.id}, ${sessionToken}, ${expiresAt.toISOString()}, ${ipAddress}, ${userAgent})
        `;

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
            body: JSON.stringify({ error: 'Login failed: ' + error.message })
        };
    }
};
