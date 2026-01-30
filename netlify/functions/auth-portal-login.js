// Portal login with Neon database
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

        // First check users table
        let users = await sql`
            SELECT * FROM users WHERE email = ${normalizedEmail}
        `;

        let user = users[0];

        // If not in users table, check customers table (purchases)
        if (!user) {
            const customers = await sql`
                SELECT * FROM customers WHERE email = ${normalizedEmail}
            `;

            if (customers.length > 0) {
                // Create user from customer record
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
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'No account found. Please purchase to get access.' })
            };
        }

        // Check if password is set
        if (!user.password_hash) {
            // First login - set the password
            const hashedPassword = await bcrypt.hash(password, 10);
            await sql`
                UPDATE users
                SET password_hash = ${hashedPassword}, updated_at = NOW()
                WHERE id = ${user.id}
            `;
        } else {
            // Verify password
            const validPassword = await bcrypt.compare(password, user.password_hash);
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
            UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}
        `;

        // Create session
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Get first IP from forwarded list
        const rawIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '';
        const ipAddress = rawIp.split(',')[0].trim().substring(0, 100);
        const userAgent = (event.headers['user-agent'] || '').substring(0, 500);

        await sql`
            INSERT INTO sessions (user_id, session_token, expires_at, ip_address, user_agent)
            VALUES (${user.id}, ${sessionToken}, ${expiresAt.toISOString()}, ${ipAddress}, ${userAgent})
        `;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                session_token: sessionToken,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name
                }
            })
        };

    } catch (error) {
        console.error('Portal login error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Login failed: ' + error.message })
        };
    }
};
